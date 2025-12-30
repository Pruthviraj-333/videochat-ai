from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re
from youtube_transcript_api import YouTubeTranscriptApi
from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv() 

# Initialize FastAPI
app = FastAPI(title="Video Q&A RAG System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
#    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
qdrant_client = QdrantClient(path="./qdrant_storage")  # Local storage
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

COLLECTION_NAME = "video_transcripts"
VECTOR_SIZE = 384  # bge-small-en-v1.5 dimension

# Pydantic models
class VideoRequest(BaseModel):
    video_url: str

class QuestionRequest(BaseModel):
    video_url: str
    question: str

class AnswerResponse(BaseModel):
    answer: str
    relevant_chunks: List[str]

# Helper functions
def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError("Invalid YouTube URL")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[dict]:
    """Split text into overlapping chunks"""
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk:
            chunks.append({
                "text": chunk,
                "start_idx": i
            })
    
    return chunks

def create_collection_if_not_exists():
    """Create Qdrant collection if it doesn't exist"""
    try:
        qdrant_client.get_collection(COLLECTION_NAME)
    except:
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )

# API Endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize collection on startup"""
    create_collection_if_not_exists()

@app.get("/")
async def root():
    return {"message": "Video Q&A RAG System API", "status": "running"}

@app.post("/process-video")
async def process_video(request: VideoRequest):
    """
    Process a YouTube video:
    1. Extract transcript
    2. Chunk the text
    3. Generate embeddings
    4. Store in Qdrant
    """
    try:
        # Extract video ID
        video_id = extract_video_id(request.video_url)
        
        # Get transcript using the correct API
        try:
            # Initialize the API instance
            ytt_api = YouTubeTranscriptApi()
            
            # Fetch transcript with language priority
            fetched_transcript = ytt_api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
            
            # Convert to raw data and extract text
            transcript_data = fetched_transcript.to_raw_data()
            transcript_text = " ".join([item['text'] for item in transcript_data])
            
        except Exception as e:
            # Try alternative method if fetch fails
            try:
                transcript_list = ytt_api.list(video_id)
                transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
                transcript_data = transcript.fetch()
                transcript_text = " ".join([item['text'] for item in transcript_data])
            except Exception as e2:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Failed to fetch transcript: {str(e)}. Alternative method also failed: {str(e2)}"
                )
        
        if not transcript_text.strip():
            raise HTTPException(status_code=400, detail="Transcript is empty")
        
        # Chunk the transcript
        chunks = chunk_text(transcript_text)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="Failed to create chunks from transcript")
        
        # Generate embeddings
        chunk_texts = [chunk["text"] for chunk in chunks]
        embeddings = list(embedding_model.embed(chunk_texts))
        
        # Delete existing points for this video
        try:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            qdrant_client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="video_id",
                            match=MatchValue(value=video_id)
                        )
                    ]
                )
            )
        except:
            pass  # Collection might be empty
        
        # Store in Qdrant
        points = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding.tolist(),
                payload={
                    "video_id": video_id,
                    "text": chunk["text"],
                    "chunk_index": idx,
                    "video_url": request.video_url
                }
            )
            points.append(point)
        
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        
        return {
            "message": "Video processed successfully",
            "video_id": video_id,
            "chunks_created": len(chunks),
            "transcript_length": len(transcript_text)
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """
    Answer a question about the video:
    1. Generate question embedding
    2. Retrieve relevant chunks from Qdrant
    3. Use Groq LLM to generate answer
    """
    try:
        # Extract video ID
        video_id = extract_video_id(request.video_url)
        
        # Generate question embedding
        question_embedding = list(embedding_model.embed([request.question]))[0]
        
        # Search in Qdrant with proper filter
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        
        search_results = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=question_embedding.tolist(),
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="video_id",
                        match=MatchValue(value=video_id)
                    )
                ]
            ),
            limit=5
        ).points
        
        if not search_results:
            raise HTTPException(
                status_code=404, 
                detail="No content found for this video. Please process the video first."
            )
        
        # Extract relevant chunks
        relevant_chunks = [result.payload["text"] for result in search_results]
        context = "\n\n".join(relevant_chunks)
        
        # Generate answer using Groq
        prompt = f"""You are a helpful assistant that answers questions about video content.

Context from the video transcript:
{context}

Question: {request.question}

Please provide a clear, concise answer based on the context provided. If the context doesn't contain enough information to answer the question, say so."""

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that answers questions about video content based on provided transcripts."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=1024,
        )
        
        answer = chat_completion.choices[0].message.content
        
        return AnswerResponse(
            answer=answer,
            relevant_chunks=relevant_chunks
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.delete("/video/{video_id}")
async def delete_video(video_id: str):
    """Delete all data for a specific video"""
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        qdrant_client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="video_id",
                        match=MatchValue(value=video_id)
                    )
                ]
            )
        )
        return {"message": f"Video {video_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "qdrant": "connected",
        "embedding_model": "loaded"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
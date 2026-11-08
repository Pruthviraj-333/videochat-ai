from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
from youtube_transcript_api import YouTubeTranscriptApi
from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid
from groq import Groq
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("videochat-backend")

# Initialize FastAPI
app = FastAPI(title="Video Q&A RAG System")

# CORS middleware
# CORS_ORIGINS env var lets us add production origins at deploy time.
# Defaults include both Vite dev servers. In Docker, Nginx proxies /api so
# the browser origin is the same host — "*" is safe there too.
_cors_origins_raw = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# YouTube proxy support
# Format YOUTUBE_PROXY: http://user:password@proxy-host:port
# ---------------------------------------------------------------------------
YOUTUBE_PROXY = os.environ.get("YOUTUBE_PROXY")

# ---------------------------------------------------------------------------
# Public Invidious API instances (Free rotating proxy pool for YouTube transcripts)
# When direct scraping is blocked by cloud provider IPs (AWS, GCP), these
# open-source instances fetch subtitles and media metadata for free without API keys.
# ---------------------------------------------------------------------------
INVIDIOUS_INSTANCES = [
    "https://yt.chocolatemoo53.com",
    "https://invidious.tiekoetter.com",
    "https://inv.tux.pizza",
    "https://invidious.drgns.space",
    "https://invidious.flokinet.to",
]

# Initialize components
embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

# ---------------------------------------------------------------------------
# Qdrant connection -- controlled by QDRANT_URL env var so we can point to
# the Qdrant Docker container without changing any other code.
#   Docker Compose: QDRANT_URL=http://qdrant:6333
#   Local dev (no var set): falls back to local file storage
# ---------------------------------------------------------------------------
_qdrant_url = os.environ.get("QDRANT_URL")
if _qdrant_url:
    qdrant_client = QdrantClient(url=_qdrant_url)
else:
    qdrant_client = QdrantClient(path="./qdrant_storage")  # local dev fallback

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY") or "gsk_placeholder_for_init")

COLLECTION_NAME = "video_transcripts"
VECTOR_SIZE = 384  # bge-small-en-v1.5 dimension

# Pydantic models
class VideoRequest(BaseModel):
    video_url: str
    transcript: Optional[str] = None

class QuestionRequest(BaseModel):
    video_url: str
    question: str

class AnswerResponse(BaseModel):
    answer: str
    relevant_chunks: List[str]

# Helper functions
def get_ytt_client() -> YouTubeTranscriptApi:
    """Initialize YouTubeTranscriptApi with browser headers, retry adapter, and optional proxy."""
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    })
    if YOUTUBE_PROXY:
        session.proxies = {"http": YOUTUBE_PROXY, "https": YOUTUBE_PROXY}

    return YouTubeTranscriptApi(http_client=session)

def parse_vtt(vtt_text: str) -> str:
    """Parse WebVTT subtitle text into clean, concatenated speech text."""
    lines = []
    for line in vtt_text.splitlines():
        line = line.strip()
        if (
            not line
            or "-->" in line
            or line.startswith("WEBVTT")
            or line.startswith("Kind:")
            or line.startswith("Language:")
        ):
            continue
        clean = re.sub(r"<[^>]+>", "", line).strip()
        if clean:
            lines.append(clean)
    return " ".join(lines)

def fetch_transcript_from_invidious(video_id: str) -> Optional[str]:
    """
    Fetch real transcript from public Invidious API instances.
    This acts as a free, rotating proxy that bypasses AWS/GCP datacenter IP blocks.
    """
    for base_url in INVIDIOUS_INSTANCES:
        try:
            url = f"{base_url}/api/v1/videos/{video_id}"
            r = requests.get(url, timeout=4)
            if r.status_code != 200:
                continue
            data = r.json()
            captions = data.get("captions", [])
            if not captions:
                continue

            # Prioritize English captions
            chosen = None
            for cap in captions:
                lang = (cap.get("language") or "").lower()
                label = (cap.get("label") or "").lower()
                if "en" in lang or "english" in label:
                    chosen = cap
                    break
            if not chosen:
                chosen = captions[0]

            caption_url = chosen.get("url")
            if not caption_url:
                continue
            if caption_url.startswith("/"):
                caption_url = base_url + caption_url

            cap_res = requests.get(caption_url, timeout=4)
            if cap_res.status_code == 200 and cap_res.text.strip():
                clean_text = parse_vtt(cap_res.text)
                if len(clean_text) > 50:
                    logger.info("Successfully fetched real transcript from %s", base_url)
                    return clean_text
        except Exception as e:
            logger.debug("Invidious instance %s failed: %s", base_url, e)
            continue
    return None

def transcribe_with_groq_whisper(video_url: str) -> Optional[str]:
    """Download audio stream via yt-dlp and transcribe via Groq Whisper API."""
    try:
        import tempfile
        import yt_dlp

        with tempfile.TemporaryDirectory() as tmpdir:
            out_tmpl = os.path.join(tmpdir, "audio.%(ext)s")
            ydl_opts = {
                "format": "ba[ext=m4a]/ba/b",
                "outtmpl": out_tmpl,
                "quiet": True,
                "noplaylist": True,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=True)
                downloaded_file = ydl.prepare_filename(info)

            if not os.path.isfile(downloaded_file):
                return None

            with open(downloaded_file, "rb") as audio_file:
                transcription = groq_client.audio.transcriptions.create(
                    model="whisper-large-v3",
                    file=audio_file,
                    response_format="text",
                )
            return transcription
    except Exception as e:
        logger.warning("Groq Whisper transcription pipeline error: %s", e)
        return None

def extract_video_id(url: str) -> str:
    """Extract YouTube video ID or custom session identifier from URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^\&\n?#]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    # If it is an external URL but not a YouTube URL, raise ValueError
    if url.startswith("http://") or url.startswith("https://") or "://" in url:
        raise ValueError("Invalid YouTube URL")

    # If it is a custom alphanumeric session tag (e.g. "audio_12345678" or "custom_doc")
    if re.fullmatch(r"[A-Za-z0-9_-]{1,64}", url):
        return url

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
    except Exception:
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
    1. Extract transcript (via user paste, YouTube API, free Invidious API pool, or Groq Whisper)
    2. Chunk the text
    3. Generate embeddings
    4. Store in Qdrant
    """
    try:
        # Extract video ID
        video_id = extract_video_id(request.video_url)
        source_mode = "youtube_direct"

        # If user explicitly passed transcript text, use it directly
        if request.transcript and request.transcript.strip():
            transcript_text = request.transcript.strip()
            source_mode = "user_pasted"
        else:
            # 1. Try primary method: YouTubeTranscriptApi (fastest direct retrieval)
            transcript_text = ""
            try:
                ytt_api = get_ytt_client()
                fetched_transcript = ytt_api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
                transcript_data = fetched_transcript.to_raw_data()
                transcript_text = " ".join([item['text'] for item in transcript_data])
            except Exception as e:
                logger.info("Direct transcript fetch failed (%s), attempting subtitle list fallback...", e)
                try:
                    transcript_list = ytt_api.list(video_id)
                    try:
                        transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
                    except Exception:
                        transcript = transcript_list.find_generated_transcript(['en', 'en-US', 'en-GB'])
                    transcript_data = transcript.fetch()
                    transcript_text = " ".join([item['text'] for item in transcript_data])
                except Exception as e2:
                    logger.info("Subtitle list fallback failed (%s)", e2)

            # 2. If direct fetch was blocked by cloud IP, try free Invidious proxy API pool
            if not transcript_text.strip():
                logger.info("Attempting free Invidious API pool for video %s...", video_id)
                invidious_text = fetch_transcript_from_invidious(video_id)
                if invidious_text and invidious_text.strip():
                    transcript_text = invidious_text.strip()
                    source_mode = "free_invidious_api"
                    logger.info("Successfully retrieved real transcript via free Invidious API!")

            # 3. If still empty, try Groq Whisper audio pipeline via yt-dlp
            if not transcript_text.strip():
                logger.info("Attempting Groq Whisper audio pipeline for %s...", request.video_url)
                whisper_text = transcribe_with_groq_whisper(request.video_url)
                if whisper_text and whisper_text.strip():
                    transcript_text = whisper_text.strip()
                    source_mode = "groq_whisper"
                    logger.info("Successfully transcribed video using Groq Whisper!")

            # 4. If all automated methods fail, return user-friendly message prompting other content sources
            if not transcript_text.strip():
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Unable to fetch transcript from YouTube directly (cloud server IP block or video lacks subtitles). "
                        "Please switch to the 'Paste Text' tab to paste the transcript directly, or the 'Audio' tab to upload audio."
                    ),
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
        except Exception:
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
            "source_mode": source_mode,
            "video_id": video_id,
            "chunks_created": len(chunks),
            "transcript_length": len(transcript_text),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/process-audio")
async def process_audio(
    file: UploadFile = File(...),
    video_url: Optional[str] = Form(None)
):
    """
    Transcribe uploaded audio file using Groq Whisper API and index chunks into Qdrant.
    """
    try:
        import tempfile

        if video_url:
            try:
                video_id = extract_video_id(video_url)
            except Exception:
                video_id = f"audio_{uuid.uuid4().hex[:8]}"
                video_url = f"https://www.youtube.com/watch?v={video_id}"
        else:
            video_id = f"audio_{uuid.uuid4().hex[:8]}"
            video_url = f"https://www.youtube.com/watch?v={video_id}"

        suffix = os.path.splitext(file.filename or "")[1] or ".m4a"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            content = await file.read()
            tmp.write(content)

        try:
            logger.info("Transcribing audio file (%d bytes) with Groq Whisper...", len(content))
            with open(tmp_path, "rb") as audio_file:
                transcription = groq_client.audio.transcriptions.create(
                    model="whisper-large-v3",
                    file=audio_file,
                    response_format="text",
                )
            transcript_text = str(transcription).strip()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        if not transcript_text:
            raise HTTPException(status_code=400, detail="Whisper transcription produced empty text.")

        chunks = chunk_text(transcript_text)
        if not chunks:
            raise HTTPException(status_code=400, detail="Failed to create chunks from transcript")

        chunk_texts = [chunk["text"] for chunk in chunks]
        embeddings = list(embedding_model.embed(chunk_texts))

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
        except Exception:
            pass

        points = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding.tolist(),
                payload={
                    "video_id": video_id,
                    "text": chunk["text"],
                    "chunk_index": idx,
                    "video_url": video_url,
                }
            )
            points.append(point)

        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )

        return {
            "message": "Audio successfully transcribed with Groq Whisper and indexed!",
            "video_id": video_id,
            "video_url": video_url,
            "chunks_created": len(chunks),
            "transcript_length": len(transcript_text),
            "transcript_preview": transcript_text[:300] + "..." if len(transcript_text) > 300 else transcript_text,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Audio processing failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Audio processing error: {e}")

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
            model=os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b"),
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
        "embedding_model": "loaded",
        "youtube_proxy_configured": bool(YOUTUBE_PROXY),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

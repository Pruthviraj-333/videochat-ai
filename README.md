# VideoChat AI 🎥🤖

VideoChat AI is an intelligent Video Q&A system that allows users to interact with YouTube videos using natural language. By leveraging Retrieval-Augmented Generation (RAG), the system extracts transcripts, chunks the content, and allows users to ask specific questions, receiving accurate answers based directly on the video's context.

![VideoChat AI Demo](https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1000)

## ✨ Features

- **YouTube Integration**: Simply paste a URL to analyze any YouTube video with available transcripts.
- **Intelligent RAG Pipeline**: Extracts, chunks, and indexes video transcripts for high-precision retrieval.
- **Natural Language Q&A**: Powered by Groq's Llama 3.3 70B model for fast and accurate responses.
- **Conversation History**: Interactive chat interface to keep track of your questions and answers.
- **Modern UI/UX**: A sleek, responsive dashboard built with React and Tailwind CSS.
- **Local Vector Storage**: Uses Qdrant for efficient local vector search and management.

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **LLM**: Groq (Llama-3.3-70b-versatile)
- **Embeddings**: FastEmbed (BAAI/bge-small-en-v1.5)
- **Vector Database**: Qdrant (Local Storage)
- **Transcript Extraction**: YouTube Transcript API

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 📁 Project Structure

```text
videochat-ai/
├── Backend/                # Python FastAPI server
│   ├── main.py             # Main application logic & RAG pipeline
│   ├── requirements.txt    # Backend dependencies
│   ├── .env                # Environment variables (Groq API Key)
│   └── qdrant_storage/     # Local vector database files
└── video-qa-frontend/      # React frontend application
    ├── src/
    │   ├── App.jsx         # Main UI component
    │   └── main.jsx
    ├── package.json        # Frontend dependencies
    └── tailwind.config.js  # UI styling configuration
```

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- Groq API Key ([Get one here](https://console.groq.com/))

### 1. Backend Setup
1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file and add your Groq API Key:
   ```text
   GROQ_API_KEY=your_groq_api_key_here
   ```
5. Run the server:
   ```bash
   python main.py
   ```
   The backend will start at `http://localhost:8000`.

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd video-qa-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

## ⚙️ Environment Variables

### Backend (`Backend/.env`)
| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your API key for Groq Cloud LLM services |

## 📡 API Endpoints

- `POST /process-video`: Analyzes a YouTube video URL and stores transcripts.
- `POST /ask`: Answers questions based on the processed video context.
- `GET /health`: Checks if the system and models are running correctly.



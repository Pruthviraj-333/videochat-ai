"""
=============================================================================
API Unit Tests for VideoChat AI Backend
=============================================================================
These tests validate FastAPI endpoints in isolation:
1. Health check (/health)
2. Root endpoint (/)
3. Schema validation errors on /process-video and /ask
4. Process video logic with YouTube transcript API mocked
5. Question-answering logic with Groq LLM and Qdrant retrieval mocked

Why mock external services?
- CI pipelines must be fast, deterministic, and free from external network
  dependencies (YouTube IP rate-limits, Groq API quotas).
- Allows verifying error handling, status codes, and JSON schemas safely.
=============================================================================
"""

import os
# Ensure test environment variables are set before importing app
os.environ.setdefault("GROQ_API_KEY", "gsk_test_mock_api_key_12345")
os.environ.setdefault("GROQ_MODEL", "qwen/qwen3.8-27b")

from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Import app from main
from main import app

client = TestClient(app)


# -----------------------------------------------------------------------------
# 1. Health and Status Endpoints
# -----------------------------------------------------------------------------

def test_health_endpoint():
    """Verify that /health returns 200 OK and expected component statuses."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["qdrant"] == "connected"
    assert data["embedding_model"] == "loaded"


def test_root_endpoint():
    """Verify that GET / returns 200 and running status."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "Video Q&A RAG System" in data["message"]


# -----------------------------------------------------------------------------
# 2. Input Validation Tests (Negative Scenarios)
# -----------------------------------------------------------------------------

def test_process_video_missing_payload():
    """Verify that /process-video returns 422 when required body is missing."""
    response = client.post("/process-video", json={})
    assert response.status_code == 422  # Pydantic validation error


def test_process_video_invalid_url():
    """Verify that an invalid YouTube URL returns 400 Bad Request."""
    response = client.post(
        "/process-video",
        json={"video_url": "https://example.com/not-a-youtube-video"}
    )
    assert response.status_code == 400
    assert "Invalid YouTube URL" in response.json()["detail"]


def test_ask_missing_fields():
    """Verify that /ask returns 422 when required fields are missing."""
    # Missing 'question' field
    response = client.post(
        "/ask",
        json={"video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
    )
    assert response.status_code == 422

    # Missing 'video_url' field
    response = client.post(
        "/ask",
        json={"question": "What is this video about?"}
    )
    assert response.status_code == 422


# -----------------------------------------------------------------------------
# 3. Mocked Workflow Tests (Positive Scenarios)
# -----------------------------------------------------------------------------

@patch("main.get_ytt_client")
@patch("main.qdrant_client")
def test_process_video_success_mocked(mock_qdrant, mock_get_ytt):
    """
    Test /process-video end-to-end with YouTube API and Qdrant mocked.
    Verifies that chunks and embeddings are created and stored properly.
    """
    # 1. Mock YouTubeTranscriptApi response
    mock_fetched = MagicMock()
    mock_fetched.to_raw_data.return_value = [
        {"text": "Hello and welcome to this tutorial on DevOps and Docker."},
        {"text": "Today we are learning how to containerize FastAPI applications."}
    ]
    mock_ytt_instance = MagicMock()
    mock_ytt_instance.fetch.return_value = mock_fetched
    mock_get_ytt.return_value = mock_ytt_instance

    # 2. Mock Qdrant upsert and delete
    mock_qdrant.delete.return_value = None
    mock_qdrant.upsert.return_value = None

    response = client.post(
        "/process-video",
        json={"video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Video processed successfully"
    assert data["video_id"] == "dQw4w9WgXcQ"
    assert data["chunks_created"] >= 1
    assert data["transcript_length"] > 0
    assert mock_qdrant.upsert.called


@patch("main.get_ytt_client")
@patch("main.qdrant_client")
def test_process_video_ip_blocked_fallback(mock_qdrant, mock_get_ytt):
    """
    Test /process-video automatically falls back to the demo transcript
    when YouTube blocks requests from cloud provider IPs, keeping RAG operational.
    """
    from youtube_transcript_api._errors import IpBlocked
    mock_ytt_instance = MagicMock()
    mock_ytt_instance.fetch.side_effect = IpBlocked("qAF1NjEVHhY")
    mock_ytt_instance.list.side_effect = IpBlocked("qAF1NjEVHhY")
    mock_get_ytt.return_value = mock_ytt_instance
    mock_qdrant.delete.return_value = None
    mock_qdrant.upsert.return_value = None

    response = client.post(
        "/process-video",
        json={"video_url": "https://www.youtube.com/watch?v=qAF1NjEVHhY"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["fallback_used"] is True
    assert data["chunks_created"] >= 1
    assert data["video_id"] == "qAF1NjEVHhY"
    assert mock_qdrant.upsert.called


@patch("main.groq_client")
@patch("main.qdrant_client")
def test_ask_question_success_mocked(mock_qdrant, mock_groq):
    """
    Test /ask endpoint with Qdrant vector retrieval and Groq LLM completion mocked.
    Verifies context injection into LLM prompt and response formatting.
    """
    # 1. Mock Qdrant query results (simulated relevant chunks)
    mock_point = MagicMock()
    mock_point.payload = {
        "text": "Docker simplifies software delivery by packaging apps into containers."
    }
    mock_search_results = MagicMock()
    mock_search_results.points = [mock_point]
    mock_qdrant.query_points.return_value = mock_search_results

    # 2. Mock Groq Chat Completion
    mock_choice = MagicMock()
    mock_choice.message.content = "Docker simplifies software delivery by using containers."
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    mock_groq.chat.completions.create.return_value = mock_completion

    response = client.post(
        "/ask",
        json={
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "question": "What does Docker simplify?"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert "Docker simplifies" in data["answer"]
    assert len(data["relevant_chunks"]) == 1
    assert "Docker simplifies software delivery" in data["relevant_chunks"][0]
    assert mock_groq.chat.completions.create.called


from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
import io
from datetime import datetime

app = FastAPI(title="Chatterbox TTS Proxy Server")

CHATTERBOX_API_KEY = os.getenv("CHATTERBOX_API_KEY", "")
CHATTERBOX_BASE_URL = "https://api.chatterbox.io/v1"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextToSpeechRequest(BaseModel):
    text: str
    voice_id: str
    speed: Optional[float] = 1.0
    pitch: Optional[float] = 1.0
    emotion: Optional[str] = "neutral"

class VoiceCloneRequest(BaseModel):
    voice_name: str
    description: Optional[str] = None

class VoiceListResponse(BaseModel):
    voices: List[dict]

@app.get("/")
async def root():
    return {
        "service": "Chatterbox TTS Proxy",
        "version": "1.0.0",
        "status": "active",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    api_key_configured = bool(CHATTERBOX_API_KEY and CHATTERBOX_API_KEY != "")

    return {
        "status": "healthy",
        "api_key_configured": api_key_configured,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/voices")
async def list_voices():
    if not CHATTERBOX_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Chatterbox API key not configured"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CHATTERBOX_BASE_URL}/voices",
                headers={
                    "Authorization": f"Bearer {CHATTERBOX_API_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Chatterbox API error: {response.text}"
                )

            data = response.json()
            return data

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Chatterbox API timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Chatterbox API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/voices/{voice_id}")
async def get_voice(voice_id: str):
    if not CHATTERBOX_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Chatterbox API key not configured"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CHATTERBOX_BASE_URL}/voices/{voice_id}",
                headers={
                    "Authorization": f"Bearer {CHATTERBOX_API_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )

            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Voice not found")

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Chatterbox API error: {response.text}"
                )

            return response.json()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Chatterbox API timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Chatterbox API: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/tts")
async def text_to_speech(request: TextToSpeechRequest):
    if not CHATTERBOX_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Chatterbox API key not configured"
        )

    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if len(request.text) > 10000:
        raise HTTPException(status_code=400, detail="Text too long (max 10000 characters)")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CHATTERBOX_BASE_URL}/tts",
                headers={
                    "Authorization": f"Bearer {CHATTERBOX_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "text": request.text,
                    "voice_id": request.voice_id,
                    "speed": request.speed,
                    "pitch": request.pitch,
                    "emotion": request.emotion
                },
                timeout=120.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Chatterbox API error: {response.text}"
                )

            audio_content = response.content

            return StreamingResponse(
                io.BytesIO(audio_content),
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": "attachment; filename=speech.mp3"
                }
            )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="TTS generation timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Chatterbox API: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/voices/clone")
async def clone_voice(
    voice_name: str = Form(...),
    description: str = Form(None),
    audio_files: List[UploadFile] = File(...)
):
    if not CHATTERBOX_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Chatterbox API key not configured"
        )

    if not audio_files:
        raise HTTPException(status_code=400, detail="At least one audio file is required")

    if len(audio_files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 audio files allowed")

    try:
        form_data = {
            "voice_name": voice_name,
            "description": description or ""
        }

        files = []
        for idx, file in enumerate(audio_files):
            content = await file.read()

            if len(content) > 50 * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} is too large (max 50MB per file)"
                )

            files.append(
                ("audio_files", (file.filename or f"sample_{idx}.mp3", content, file.content_type or "audio/mpeg"))
            )

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CHATTERBOX_BASE_URL}/voices/clone",
                headers={
                    "Authorization": f"Bearer {CHATTERBOX_API_KEY}",
                },
                data=form_data,
                files=files,
                timeout=300.0
            )

            if response.status_code != 200 and response.status_code != 201:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Chatterbox API error: {response.text}"
                )

            return response.json()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Voice cloning request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Chatterbox API: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/voices/clone/{job_id}/status")
async def get_clone_status(job_id: str):
    if not CHATTERBOX_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Chatterbox API key not configured"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CHATTERBOX_BASE_URL}/voices/clone/{job_id}/status",
                headers={
                    "Authorization": f"Bearer {CHATTERBOX_API_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )

            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Clone job not found")

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Chatterbox API error: {response.text}"
                )

            return response.json()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Chatterbox API timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Chatterbox API: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.delete("/voices/{voice_id}")
async def delete_voice(voice_id: str):
    if not CHATTERBOX_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Chatterbox API key not configured"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{CHATTERBOX_BASE_URL}/voices/{voice_id}",
                headers={
                    "Authorization": f"Bearer {CHATTERBOX_API_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )

            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Voice not found")

            if response.status_code != 200 and response.status_code != 204:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Chatterbox API error: {response.text}"
                )

            return {"message": "Voice deleted successfully", "voice_id": voice_id}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Chatterbox API timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Chatterbox API: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)

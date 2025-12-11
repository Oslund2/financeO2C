# Chatterbox TTS Proxy Server

A FastAPI-based proxy server for integrating Chatterbox TTS API with the animation production platform.

## Features

- Voice listing and retrieval
- Text-to-speech generation with customizable parameters
- Voice cloning from audio samples
- Clone job status tracking
- Voice management (delete cloned voices)
- Health check and API key validation

## Setup

### Prerequisites

- Python 3.9 or higher
- Chatterbox API key

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export CHATTERBOX_API_KEY="your_api_key_here"
export PORT=8001  # Optional, defaults to 8001
```

3. Run the server:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

### Health Check
- `GET /health` - Check server and API key status

### Voice Management
- `GET /voices` - List all available voices
- `GET /voices/{voice_id}` - Get specific voice details
- `DELETE /voices/{voice_id}` - Delete a cloned voice

### Text-to-Speech
- `POST /tts` - Generate speech from text
  ```json
  {
    "text": "Hello, world!",
    "voice_id": "voice_id_here",
    "speed": 1.0,
    "pitch": 1.0,
    "emotion": "neutral"
  }
  ```

### Voice Cloning
- `POST /voices/clone` - Clone a voice from audio samples (multipart/form-data)
  - `voice_name`: Name for the cloned voice
  - `description`: Optional description
  - `audio_files`: 1-10 audio files (max 50MB each)

- `GET /voices/clone/{job_id}/status` - Check cloning job status

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CHATTERBOX_API_KEY` | Chatterbox API key | Yes | - |
| `PORT` | Server port | No | 8001 |

### CORS

CORS is configured to allow all origins in development. For production, update the `allow_origins` in `main.py`.

## Error Handling

The server handles various error scenarios:
- API key not configured (500)
- Invalid requests (400)
- API errors (502/504)
- Resource not found (404)
- Internal server errors (500)

## Development

### Running in Development Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### API Documentation
When running, visit:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Production Deployment

For production deployment:

1. Update CORS settings in `main.py`
2. Use a production ASGI server like Gunicorn:
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
   ```
3. Set up proper environment variable management
4. Consider adding rate limiting and authentication
5. Use HTTPS/TLS for secure communication

## Integration with Frontend

The frontend should make requests to this proxy server instead of directly to Chatterbox API. This provides:

- Secure API key management (not exposed to client)
- Consistent error handling
- Request/response transformation if needed
- Future caching capabilities

Example frontend integration:
```typescript
const response = await fetch('http://localhost:8001/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello, world!',
    voice_id: 'voice_123',
    speed: 1.0,
    pitch: 1.0,
    emotion: 'neutral'
  })
});

const audioBlob = await response.blob();
```

## Troubleshooting

### Server won't start
- Check Python version (3.9+)
- Verify all dependencies are installed
- Ensure port 8001 is available

### API requests failing
- Verify CHATTERBOX_API_KEY is set correctly
- Check API key permissions in Chatterbox dashboard
- Review server logs for detailed error messages

### CORS errors
- Update `allow_origins` in main.py to include your frontend URL
- Ensure frontend is making requests to correct server URL

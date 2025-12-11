# Chatterbox TTS Integration Guide

This document provides complete instructions for integrating Chatterbox TTS as an alternative voice provider alongside ElevenLabs.

## Overview

The animation production platform now supports dual voice providers:
- **ElevenLabs**: Premium voice synthesis with a wide library of pre-made voices
- **Chatterbox**: Voice cloning capabilities for custom character voices

## Architecture

### Backend: Python TTS Server
Located in `/python-tts-server/`, this FastAPI server proxies requests to Chatterbox API:
- Manages API key security (not exposed to client)
- Provides RESTful endpoints for voice operations
- Handles file uploads for voice cloning
- Tracks cloning job status

### Database Schema
New tables and columns added to support Chatterbox:

#### `characters` table updates:
- `voice_provider`: 'elevenlabs' or 'chatterbox' (default: 'elevenlabs')
- `chatterbox_voice_id`: Stores Chatterbox voice ID

#### New tables:
- `voice_samples`: Tracks uploaded audio samples for cloning
- `voice_cloning_jobs`: Monitors voice cloning job progress

### Frontend Services
- `chatterboxService.ts`: Direct integration with Python TTS server
- `voiceService.ts`: Unified interface for both providers
- `VoiceSelector` component: Multi-provider voice selection UI
- `VoiceCloningModal` component: Voice cloning interface

## Setup Instructions

### 1. Python TTS Server Setup

Navigate to the Python server directory:
```bash
cd python-tts-server
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Create environment configuration:
```bash
cp .env.example .env
```

Edit `.env` and add your Chatterbox API key:
```env
CHATTERBOX_API_KEY=your_api_key_here
PORT=8001
```

Start the server:
```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Frontend Configuration

Update your `.env` file to include the Chatterbox server URL:

For development:
```env
VITE_CHATTERBOX_SERVER_URL=http://localhost:8001
```

For production:
```env
VITE_CHATTERBOX_SERVER_URL=https://your-production-server.com/api/chatterbox
```

If not set, the frontend defaults to:
- Development: `http://localhost:8001`
- Production: `/api/chatterbox` (relative URL)

### 3. Database Migration

The database migration has been automatically applied. It includes:
- New columns on `characters` table
- New `voice_samples` and `voice_cloning_jobs` tables
- Proper indexes and RLS policies

## Usage Guide

### For Users

#### Selecting Voices
1. Open the Characters page
2. Create or edit a character
3. Scroll to the Voice Selection section
4. Use the provider filter buttons to switch between:
   - All Providers
   - ElevenLabs
   - Chatterbox
5. Search and preview voices
6. Click a voice to select it

#### Cloning Custom Voices
1. In the Voice Selection section, click "Clone Custom Voice"
2. Enter a name for the voice
3. (Optional) Add a description
4. Upload 1-10 audio samples (max 50MB each)
   - Better quality = better clones
   - More samples = more accurate clones
5. Click "Clone Voice"
6. Wait for processing to complete
7. The cloned voice automatically appears in the Chatterbox provider list

### For Developers

#### Using Voice Service
```typescript
import { getVoiceService } from './services/voiceService';

const service = getVoiceService();

// Get all voices from both providers
const voices = await service.getAllVoices();

// Get voices from specific provider
const elevenLabsVoices = await service.getVoicesByProvider('elevenlabs');
const chatterboxVoices = await service.getVoicesByProvider('chatterbox');

// Generate speech
const audioBlob = await service.generateSpeech(
  'Hello, world!',
  voiceId,
  'chatterbox',
  { speed: 1.0, pitch: 1.0, emotion: 'happy' }
);

// Check provider health
const health = await service.checkProviderHealth();
console.log(health.elevenlabs.available); // true/false
console.log(health.chatterbox.available); // true/false
```

#### Using Chatterbox Service Directly
```typescript
import { getChatterboxService } from './services/chatterboxService';

const service = getChatterboxService();

// List voices
const voices = await service.getVoices();

// Clone voice
const job = await service.cloneVoice(
  'Character Name',
  [audioFile1, audioFile2],
  'Optional description'
);

// Check cloning status
const status = await service.getCloneJobStatus(job.job_id);

// Generate speech
const audioBlob = await service.generateSpeech(
  'Hello!',
  voiceId,
  { speed: 1.0, pitch: 1.0, emotion: 'neutral' }
);
```

## API Endpoints

### Python TTS Server

#### Health Check
```
GET /health
```
Returns server status and API key configuration status.

#### List Voices
```
GET /voices
```
Returns all available Chatterbox voices.

#### Get Voice Details
```
GET /voices/{voice_id}
```
Returns details for a specific voice.

#### Text-to-Speech
```
POST /tts
Content-Type: application/json

{
  "text": "Hello, world!",
  "voice_id": "voice_id_here",
  "speed": 1.0,
  "pitch": 1.0,
  "emotion": "neutral"
}
```
Returns audio file (MP3).

#### Clone Voice
```
POST /voices/clone
Content-Type: multipart/form-data

voice_name: "Character Name"
description: "Optional description"
audio_files: [file1.mp3, file2.mp3, ...]
```
Returns cloning job details with job_id.

#### Check Cloning Status
```
GET /voices/clone/{job_id}/status
```
Returns job status and progress.

#### Delete Voice
```
DELETE /voices/{voice_id}
```
Deletes a cloned voice.

## Troubleshooting

### Python Server Issues

**Server won't start:**
- Check Python version (3.9+)
- Verify all dependencies installed: `pip install -r requirements.txt`
- Ensure port 8001 is available

**API requests failing:**
- Verify `CHATTERBOX_API_KEY` is set correctly
- Check API key permissions in Chatterbox dashboard
- Review server logs for detailed error messages

**CORS errors:**
- Update `allow_origins` in `main.py` if using custom frontend URL
- Ensure frontend is making requests to correct server URL

### Frontend Issues

**Voices not loading:**
- Check Python server is running
- Verify `VITE_CHATTERBOX_SERVER_URL` is set correctly
- Check browser console for network errors
- Test health endpoint: `http://localhost:8001/health`

**Voice cloning fails:**
- Verify audio files are valid formats (MP3, WAV, etc.)
- Check file sizes (max 50MB per file)
- Ensure no more than 10 files uploaded
- Check Python server logs for errors

**Selected voice not saving:**
- Verify database migration completed successfully
- Check that both `voice_provider` and appropriate `*_voice_id` are being saved
- Review browser console for errors during form submission

## Production Deployment

### Python Server Deployment

#### Using Docker (Recommended)

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

Build and run:
```bash
docker build -t tts-server .
docker run -p 8001:8001 -e CHATTERBOX_API_KEY=your_key tts-server
```

#### Using Process Manager

With systemd:
```ini
[Unit]
Description=Chatterbox TTS Proxy Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/tts-server
Environment="CHATTERBOX_API_KEY=your_key"
ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

### Nginx Reverse Proxy

```nginx
location /api/chatterbox {
    proxy_pass http://localhost:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Increase timeouts for long-running requests
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

### Security Considerations

1. **API Key Protection**
   - Never expose Chatterbox API key in frontend code
   - Use environment variables only
   - Rotate keys regularly

2. **Rate Limiting**
   - Implement rate limiting on Python server endpoints
   - Consider using Redis for distributed rate limiting

3. **HTTPS/TLS**
   - Always use HTTPS in production
   - Use valid SSL certificates

4. **File Upload Validation**
   - Validate file types server-side
   - Enforce file size limits
   - Scan uploaded files for malware

5. **Authentication**
   - Consider adding authentication to Python server
   - Validate requests from frontend application

## Cost Optimization

### Chatterbox Usage
- Voice cloning: One-time cost per voice
- TTS generation: Per-character or per-request pricing
- Monitor usage through Chatterbox dashboard

### Caching Strategy
- Voice lists cached for 5 minutes
- Consider caching generated audio for common phrases
- Store frequently used audio in Supabase storage

### Best Practices
- Clone voices once, reuse many times
- Use appropriate voice for each character (don't over-clone)
- Batch TTS requests when possible
- Monitor costs through production_jobs table

## Support

### Resources
- Chatterbox API Documentation: [Link to Chatterbox docs]
- Python Server README: `/python-tts-server/README.md`
- Database Schema: See migration files in `/supabase/migrations/`

### Common Questions

**Q: Can I use both providers for the same character?**
A: No, each character uses one provider at a time, but you can change providers by selecting a different voice.

**Q: How long does voice cloning take?**
A: Typically 1-5 minutes depending on the number and quality of samples.

**Q: What audio formats are supported for cloning?**
A: MP3, WAV, and most common audio formats. Higher quality audio produces better clones.

**Q: Can I delete a cloned voice?**
A: Yes, but ensure no characters are using it first.

**Q: What happens if the Python server is down?**
A: ElevenLabs voices continue working. Chatterbox voices show as unavailable until server is restored.

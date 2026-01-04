# Vertex AI Veo 3 Edge Function Setup

This guide explains how to configure and use the `generate-video` edge function for generating videos with Google Vertex AI Veo 3.

## Overview

The edge function provides a secure proxy to Google Vertex AI's Veo 3 API, handling authentication server-side using GCP service account credentials. This keeps your private keys secure and avoids CORS issues.

## Prerequisites

1. A Google Cloud Platform (GCP) project with Vertex AI API enabled
2. A GCP service account with the following permissions:
   - `aiplatform.endpoints.predict`
   - `aiplatform.operations.get`
   - Vertex AI User role or equivalent

## Configuration Steps

### 1. Create a GCP Service Account

1. Go to the [GCP Console](https://console.cloud.google.com)
2. Navigate to **IAM & Admin > Service Accounts**
3. Click **Create Service Account**
4. Name it (e.g., "vertex-ai-veo-production")
5. Grant the **Vertex AI User** role
6. Click **Done**

### 2. Create Service Account Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key > Create New Key**
4. Choose **JSON** format
5. Download the key file

### 3. Configure Supabase Edge Function Secrets

1. Open the downloaded JSON key file
2. Copy the `client_email` value
3. Copy the `private_key` value (including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines)
4. Go to your Supabase Dashboard
5. Navigate to **Project Settings > Edge Functions**
6. Add the following secrets:
   - **GCP_CLIENT_EMAIL**: Paste the client email
   - **GCP_PRIVATE_KEY**: Paste the entire private key (the function handles `\n` replacement automatically)

## Usage

### From the Frontend

The edge function is automatically integrated into the `vertexAIService`. When you call `submitVeo3Request`, it will use the edge function:

```typescript
import { submitVeo3Request } from './services/vertexAIService';

const jobId = await submitVeo3Request(
  shotPlanId,
  organizationId,
  {
    prompt: 'A cat walking on the beach at sunset',
    parameters: {
      durationSeconds: 8,
      sampleCount: 1,
      aspectRatio: '16:9',
      resolution: '720p',
      generateAudio: false,
    },
  }
);
```

### Health Check

Test if the edge function is properly configured:

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video?path=/health`,
  {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  }
);
const status = await response.json();
console.log(status);
```

Expected response:
```json
{
  "status": "ok",
  "edge_function_deployed": true,
  "gcp_client_email_configured": true,
  "gcp_private_key_configured": true,
  "timestamp": "2025-01-04T12:00:00.000Z"
}
```

## Supported Parameters

The edge function accepts the following request body:

```typescript
{
  prompt: string;                    // Required: Video generation prompt
  negativePrompt?: string;           // Optional: What to avoid in the video
  image?: {                          // Optional: Image-to-video generation
    bytesBase64Encoded: string;
    mimeType: 'image/jpeg' | 'image/png';
  };
  referenceImages?: Array<{          // Optional: Character/style references
    image: {
      bytesBase64Encoded: string;
      mimeType: 'image/jpeg' | 'image/png';
    };
    referenceType: 'asset' | 'style';
  }>;
  parameters: {
    model?: string;                  // Default: 'veo-3.1-generate-001'
    durationSeconds: 4 | 6 | 8;      // Video length
    sampleCount: 1 | 2 | 3 | 4;      // Number of variations
    aspectRatio: '16:9' | '9:16';    // Video aspect ratio
    resolution?: '720p' | '1080p';   // Video resolution
    generateAudio?: boolean;         // Include audio generation
    seed?: number;                   // For reproducibility
    personGeneration?: 'allow_adult' | 'dont_allow' | 'allow_all';
    compressionQuality?: 'optimized' | 'lossless';
    resizeMode?: 'pad' | 'crop';     // For image-to-video
    storageUri?: string;             // GCS bucket for output
  };
}
```

## Error Codes

The edge function returns structured error responses:

- **MISSING_GCP_CREDENTIALS**: GCP secrets not configured in Supabase
- **AUTH_ERROR**: GCP authentication failed (check credentials and permissions)
- **INVALID_REQUEST**: Invalid parameters or prompt
- **RATE_LIMIT_EXCEEDED**: Vertex AI rate limit hit
- **VERTEX_AI_ERROR**: General Vertex AI API error
- **INTERNAL_ERROR**: Edge function internal error

## Security Notes

1. **Never expose GCP private keys in client-side code**
2. The edge function uses JWT verification (requires authentication)
3. Private keys are stored as Supabase secrets and never logged
4. All API calls are authenticated using service account credentials

## Troubleshooting

### "GCP credentials not configured"
- Verify secrets are added in Supabase Dashboard
- Check secret names are exactly `GCP_CLIENT_EMAIL` and `GCP_PRIVATE_KEY`
- Restart edge function if secrets were just added

### "Authentication failed"
- Verify service account has Vertex AI User role
- Check if Vertex AI API is enabled in your GCP project
- Ensure the private key is complete (including BEGIN/END markers)

### "Invalid request"
- Check parameter validation (duration must be 4, 6, or 8 for Veo 3)
- Verify aspect ratio is either '16:9' or '9:16'
- Ensure prompt is a non-empty string

## Project Configuration

The edge function is configured for:
- **Project ID**: `scripps-ai`
- **Location**: `us-central1`
- **Default Model**: `veo-3.1-generate-001`

To use a different project, update the constants in `supabase/functions/generate-video/index.ts`:

```typescript
const VERTEX_AI_PROJECT = "your-project-id";
const VERTEX_AI_LOCATION = "your-location";
```

Then redeploy using:
```bash
npm run deploy:functions
```

# ElevenLabs Voice Generation Setup Guide

This guide will help you configure ElevenLabs voice generation for your animation production platform.

## Overview

The ElevenLabs integration uses a Supabase Edge Function to securely proxy API requests, keeping your API key safe on the server side. This setup requires:

1. An ElevenLabs API key
2. Deployment of the edge function to Supabase
3. Configuration of the API key as a Supabase secret

## Prerequisites

- Active ElevenLabs account ([sign up here](https://elevenlabs.io))
- Supabase project (already configured in this application)
- Access to Supabase Dashboard or CLI

## Setup Methods

Choose one of the following methods based on your preferences:

### Method 1: Interactive Setup Wizard (Recommended)

The easiest way to set up ElevenLabs is through the built-in setup wizard:

1. Navigate to **AI Studio → Voice Generation**
2. Click the **"Setup ElevenLabs"** button in the ElevenLabs status card
3. Follow the step-by-step wizard that will guide you through:
   - Verifying your API key
   - Deploying the edge function
   - Configuring secrets
   - Testing the connection

### Method 2: Supabase Dashboard (Manual)

If you prefer to configure manually:

#### Step 1: Get Your ElevenLabs API Key

1. Go to [elevenlabs.io](https://elevenlabs.io) and sign in
2. Navigate to your Profile Settings
3. Copy your API key
4. Add it to your `.env` file:
   ```env
   VITE_ELEVENLABS_API_KEY=your_api_key_here
   ELEVENLABS_API_KEY=your_api_key_here
   ```

#### Step 2: Deploy the Edge Function

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions** in the left sidebar
4. Click **"Deploy new function"**
5. Name it: `elevenlabs-proxy`
6. Copy the code from `supabase/functions/elevenlabs-proxy/index.ts`
7. Paste it into the function editor
8. Click **"Deploy"**

#### Step 3: Configure the Secret

1. In the Supabase Dashboard, go to **Project Settings → Edge Functions**
2. Scroll to the **"Secrets"** section
3. Click **"Add new secret"**
4. Name: `ELEVENLABS_API_KEY`
5. Value: Your ElevenLabs API key
6. Click **"Add secret"**

#### Step 4: Verify the Setup

1. Return to the application
2. Go to **AI Studio → Voice Generation**
3. The ElevenLabs status should show as "Connected"
4. Try generating a voice preview to confirm

### Method 3: Supabase CLI (For Developers)

If you have the Supabase CLI installed:

#### Prerequisites

Install Supabase CLI if you haven't already:

```bash
npm install -g supabase
```

#### Quick Setup

Run our automated deployment script:

```bash
npm run verify:setup    # Verify configuration
npm run deploy:functions # Deploy edge function and configure secrets
```

#### Manual CLI Setup

1. **Link your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. **Deploy the edge function:**
   ```bash
   supabase functions deploy elevenlabs-proxy
   ```

3. **Set the secret:**
   ```bash
   supabase secrets set ELEVENLABS_API_KEY=your_api_key_here
   ```

4. **Verify deployment:**
   ```bash
   supabase functions list
   ```

## Testing Your Setup

### Health Check Endpoint

The edge function includes a health check endpoint you can test:

```bash
curl "https://your-project.supabase.co/functions/v1/elevenlabs-proxy?path=/health" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY"
```

Expected response:
```json
{
  "status": "ok",
  "edge_function_deployed": true,
  "api_key_configured": true,
  "timestamp": "2024-12-12T..."
}
```

### In-App Testing

1. Navigate to **AI Studio → Voice Generation**
2. Check the status indicators:
   - **Edge Function Deployed**: ✓ Green checkmark
   - **API Key Configured**: ✓ Green checkmark
   - **ElevenLabs API**: ✓ Connected
3. Go to the **Character Voices** tab
4. Select a character and click **"Assign Voice"**
5. Choose an ElevenLabs voice
6. Click **"Preview"** to test voice generation

## Troubleshooting

### Error: "Edge function not accessible"

**Cause**: The edge function hasn't been deployed or is unreachable.

**Solution**:
1. Verify deployment in Supabase Dashboard under Edge Functions
2. Check that the function is named exactly `elevenlabs-proxy`
3. Redeploy using the dashboard or CLI

### Error: "ElevenLabs API key not configured in Supabase"

**Cause**: The `ELEVENLABS_API_KEY` secret is missing or incorrect.

**Solution**:
1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add or update the `ELEVENLABS_API_KEY` secret
3. Restart the edge function (redeploy if necessary)

### Error: "Invalid API key"

**Cause**: The API key is invalid or expired.

**Solution**:
1. Verify your API key in [ElevenLabs Dashboard](https://elevenlabs.io/app/settings)
2. Generate a new API key if needed
3. Update the secret in Supabase Dashboard
4. Update your `.env` file

### Error: "Rate limit exceeded"

**Cause**: You've exceeded your ElevenLabs API rate limit.

**Solution**:
1. Wait for the rate limit to reset (usually 1 minute)
2. Consider upgrading your ElevenLabs plan for higher limits
3. Check your usage in the ElevenLabs Dashboard

### Error: "Insufficient quota"

**Cause**: You've run out of character quota on your ElevenLabs plan.

**Solution**:
1. Check your remaining quota in the ElevenLabs Dashboard
2. Upgrade your plan if needed
3. Wait for quota reset (monthly for most plans)

## Configuration Files

### Environment Variables (.env)

```env
# Required for client-side status checking
VITE_ELEVENLABS_API_KEY=your_api_key_here

# Required for deployment scripts
ELEVENLABS_API_KEY=your_api_key_here

# Supabase configuration (already set up)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Edge Function Location

```
supabase/functions/elevenlabs-proxy/index.ts
```

## Features

Once configured, you can:

- ✅ Browse all available ElevenLabs voices
- ✅ Preview voices with custom text
- ✅ Assign voices to characters
- ✅ Generate dialogue audio for scenes
- ✅ Use voices in production workflows
- ✅ Monitor usage and health status

## Security Notes

- Your ElevenLabs API key is stored securely as a Supabase secret
- The key is never exposed to the client/browser
- All API requests are proxied through the edge function
- The edge function validates requests using your Supabase authentication

## Cost Considerations

ElevenLabs pricing is based on:
- Character count for generated audio
- Voice quality tier (standard vs professional)
- Number of voice clones

Check your usage regularly in the ElevenLabs Dashboard to monitor costs.

## Need Help?

- **Setup Wizard**: Available in AI Studio → Voice Generation
- **Status Dashboard**: Shows real-time connection status
- **Error Messages**: Include specific instructions for resolution
- **Health Check**: Test endpoint available at `/health`

## Additional Resources

- [ElevenLabs Documentation](https://docs.elevenlabs.io/)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

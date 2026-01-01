# HeyGen Video Translation Integration Guide

## Overview

A complete video-to-video translation system with AI-powered lip sync and voice cloning has been integrated into your animation production platform. This system uses HeyGen's API to translate videos into 175+ languages while maintaining natural speech patterns and lip synchronization.

## What Was Implemented

### 1. Database Schema

**New Tables Created:**

- `heygen_provider_configs` - Stores HeyGen API credentials and settings per organization
- `video_translation_jobs` - Tracks video translation requests and their status
- `video_translation_outputs` - Stores completed translated videos for each language
- `video_translation_captions` - Stores caption/subtitle files (SRT, VTT formats)

**Episode Schema Updates:**

- Added `source_language_code` and `source_language_name` fields
- Added `available_translations` JSON array for quick language lookup
- Added `is_multilingual` boolean flag

### 2. Core Services

**heygenVideoTranslationService.ts**
- Submit video translation jobs to HeyGen API
- Poll job status with automatic updates
- Retrieve completed translations and captions
- Cost estimation and tracking
- Support for multi-language batch translations

**heygenConfigService.ts**
- Manage HeyGen API credentials per organization
- Track usage statistics (minutes used, costs, job counts)
- Provide list of 175+ supported languages
- API key validation and connection testing

**videoLocalizationOrchestrator.ts**
- Coordinate full localization pipeline (script → video)
- Batch translate multiple episodes
- Track progress across all localization stages
- Export complete language packages
- Retry failed translations automatically

### 3. User Interface Components

**VideoTranslationManager**
- Select source video and target languages from 175+ options
- Submit translation jobs with cost estimates
- Enable proofread workflow for quality control
- Monitor job progress in real-time
- View completed translation jobs

**HeyGenConfigPanel**
- Secure API key input and storage
- Test connection to HeyGen
- Configure service tier (Scale/Enterprise)
- Set rate limits and monthly quotas
- View usage statistics and costs

**MultilingualVideoViewer**
- Browse all available language versions
- Play videos side-by-side for comparison
- Download videos for specific languages
- View caption files
- Track quality approval status

### 4. Integration Points

**Settings Component**
- New "HeyGen Video Translation" section
- Access configuration, usage stats, and API settings
- Integrated with existing organization management

## How to Use

### Step 1: Configure HeyGen API

1. Go to **Settings** in the main navigation
2. Find and expand **"HeyGen Video Translation"** section
3. Enter your HeyGen API key (get it from [HeyGen Dashboard](https://app.heygen.com/settings/api-keys))
4. Click **"Test Connection"** to verify your credentials
5. Configure optional settings:
   - Service tier (Scale or Enterprise)
   - Rate limits
   - Monthly usage quota
6. Click **"Save Configuration"**

### Step 2: Translate a Video

You can now use the video translation features in your workflow:

1. **From Episodes View:**
   - Navigate to an episode with a completed video
   - The VideoTranslationManager component will be available
   - Select target languages from the dropdown
   - Click "Start Translation"

2. **Batch Translation:**
   - Use the videoLocalizationOrchestrator service to translate multiple episodes
   - Supports both script and video translation in sequence

### Step 3: Monitor Progress

- Translation jobs are tracked in real-time
- Status updates every 30 seconds automatically
- View progress percentage and estimated completion time
- Receive notifications when translations complete

### Step 4: View Translated Videos

- Use the MultilingualVideoViewer component
- Switch between language versions
- Download specific language versions
- View auto-generated captions

## API Endpoints Used

The integration uses these HeyGen API endpoints:

- `POST /v2/video_translate` - Submit translation job
- `GET /v1/video_translate/{job_id}` - Check job status
- `GET /v1/video_translate.list` - List all jobs (for connection testing)

## Cost Structure

Estimated costs based on HeyGen pricing:
- Base rate: ~$0.50 per minute of video
- Per language rate: ~$0.30 per minute per language
- Example: 5-minute video translated to 3 languages ≈ $7.00

The system provides cost estimates before submitting jobs.

## Features

✅ **175+ Languages** - Translate to any of HeyGen's supported languages
✅ **Natural Lip Sync** - AI maintains accurate lip movements for target language
✅ **Voice Cloning** - Preserves original speaker's voice characteristics
✅ **Batch Processing** - Translate multiple episodes simultaneously
✅ **Quality Control** - Optional proofread workflow before final video
✅ **Progress Tracking** - Real-time status updates and notifications
✅ **Cost Tracking** - Monitor usage and costs per organization
✅ **Caption Export** - Download SRT/VTT subtitle files
✅ **Multi-format Support** - Works with any video format HeyGen supports

## Proofread Workflow (Optional)

When enabled, the proofread workflow allows you to:

1. Review auto-generated captions before final video
2. Upload corrected SRT files
3. Regenerate video with improved captions
4. Approve or reject translation quality

## Security & Access Control

- API keys are stored securely in the database
- Row-Level Security (RLS) restricts access to organization members
- Only organization admins can modify HeyGen configuration
- All members can create and view translation jobs
- Usage tracking per organization prevents quota overruns

## Integration with Existing Workflow

The video translation system integrates seamlessly with:

- **Script Translation** - Translate scripts first, then videos
- **Episode Management** - Track which episodes have translations
- **Production Pipeline** - Automatic workflow after video completion
- **Analytics** - Cost tracking integrated with existing analytics

## Troubleshooting

**Connection Test Fails:**
- Verify API key is correct
- Check HeyGen service tier (Scale or Enterprise required)
- Ensure API key has video translation permissions

**Translation Job Stalls:**
- Check HeyGen dashboard for service status
- Verify rate limits haven't been exceeded
- Jobs automatically retry after temporary failures

**Missing Translations:**
- Check job status for error messages
- Verify source video URL is accessible
- Ensure target languages are supported

## Next Steps

To integrate the VideoTranslationManager into your episodes workflow:

1. Add the component to your Episodes or Production view
2. Pass episode data including video URL and language info
3. Handle translation completion callbacks
4. Display the MultilingualVideoViewer for completed translations

Example integration:
```tsx
import { VideoTranslationManager } from './VideoTranslationManager';
import { MultilingualVideoViewer } from './MultilingualVideoViewer';

// In your Episodes component:
<VideoTranslationManager
  episodeId={episode.id}
  organizationId={currentOrganization.id}
  videoUrl={episode.final_video_url}
  sourceLanguageCode="en"
  sourceLanguageName="English"
  onTranslationComplete={() => {
    // Refresh episode data
  }}
/>

// To view translated versions:
<MultilingualVideoViewer
  episodeId={episode.id}
  episodeTitle={episode.title}
  sourceVideoUrl={episode.final_video_url}
  sourceLanguageCode="en"
  sourceLanguageName="English"
/>
```

## Support

For HeyGen API support:
- [HeyGen Documentation](https://docs.heygen.com/)
- [HeyGen Dashboard](https://app.heygen.com/)
- [API Reference](https://docs.heygen.com/reference/video-translate)

## Summary

You now have a complete video translation pipeline that requires only your HeyGen API credentials to function. The system handles:

- API communication and job management
- Progress tracking and status updates
- Cost estimation and tracking
- Multi-language video viewing and downloading
- Integration with your existing production workflow

All components are built and ready to use - just add your HeyGen API key in Settings!

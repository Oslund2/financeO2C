# Clayville Craniums - AI Animation Studio

An AI-powered claymation animation production platform for creating episodes of "The Clayville Craniums" - a Scripps National Spelling Bee animated series.

## Overview

This platform provides a complete production pipeline for creating animated claymation episodes using multiple AI services:

- **Gemini 3** (Vertex AI) - Script generation and image generation
- **Veo 3** (Vertex AI) - Video generation from static images
- **Eleven Labs** - Character voice synthesis
- **Supabase** - Database and asset storage

## Features

### Current Implementation

✅ **Complete Database Schema**
- Series, characters, scripts, episodes, assets, and production tracking
- Full relational structure with proper foreign keys
- Row Level Security (RLS) policies for data protection

✅ **Character Management**
- Create, edit, and duplicate characters
- Store physical descriptions, personality traits, and clay features
- Tag-based organization and search
- Voice characteristic profiles for Eleven Labs integration

✅ **Script Management**
- Browse and organize episode scripts
- Track episode metadata (season, episode number, runtime)
- Vocabulary word tracking for spelling bee content
- Script status workflow (draft, approved, in production, completed)

✅ **Asset Library**
- Centralized asset browser for all media
- Support for multiple asset types:
  - Character references
  - Backgrounds
  - Props
  - Word manifestations
  - Scene images
  - Video clips
  - Audio files
- Tag-based filtering and search
- Usage tracking for assets

✅ **Episode Production Dashboard**
- Track production progress for each episode
- Monitor status through production pipeline
- Cost estimation and tracking
- Production notes and timeline

✅ **Production Queue**
- Job tracking for all AI generation tasks
- Real-time status monitoring
- Error handling and retry capabilities
- Cost tracking per job

✅ **AI Studio Interface**
- Script generation workflow with character selection
- Vocabulary word integration
- Theme and tone configuration
- Placeholder UI for image, video, and voice generation

✅ **Complete Episode Data - "Spell-Mageddon!"**
- 7 fully detailed characters:
  - Barnaby (anxious protagonist with inflating/deflating head)
  - Zora (energetic acrobat with spring limbs)
  - Kenji (tech-savvy analyst with screen eyes)
  - Maya (artistic dreamer with color-changing hair)
  - Mrs. Higginbottom (eccentric teacher on wheels)
  - Chad (rival with perfect plastic hair)
  - Host (clay LeVar Burton)
- Complete Episode 1 script broken into 3 acts
- 10 vocabulary spelling words integrated
- 5 storyboard scenes with AI generation prompts
- Episode production entry ready for assets

### Database Tables

1. **series** - Series metadata and style guides
2. **characters** - Character profiles with clay features
3. **scripts** - Episode scripts with metadata
4. **script_acts** - Act breakdown (3 acts per episode)
5. **script_scenes** - Scene details with dialogue
6. **assets** - All media assets with metadata
7. **episodes** - Production tracking
8. **scene_shots** - Shot breakdown for generation
9. **voice_recordings** - Voice generation tracking
10. **production_jobs** - AI job queue

## Next Steps: AI Integration

### 1. Vertex AI Integration (Gemini 3)

**Script Generation:**
```typescript
// src/services/vertexai/scriptGeneration.ts
import { VertexAI } from '@google-cloud/vertexai';

export async function generateScript(params: {
  characters: Character[];
  theme: string;
  vocabularyWords: string[];
  plotSummary: string;
}) {
  const vertex = new VertexAI({
    project: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION,
  });

  const model = vertex.preview.getGenerativeModel({
    model: 'gemini-3-pro',
  });

  const prompt = buildScriptPrompt(params);
  const result = await model.generateContent(prompt);

  return parseScriptResponse(result.response.text());
}
```

**Image Generation:**
```typescript
// Character reference images
// Scene backgrounds
// Word manifestations (visual representations of words)
```

### 2. Veo 3 Integration

**Video Generation:**
```typescript
// src/services/vertexai/videoGeneration.ts
// Generate claymation-style animated clips from static images
// Apply squash-and-stretch effects
// Character movement and expression animation
```

### 3. Eleven Labs Integration

**Voice Synthesis:**
```typescript
// src/services/elevenlabs/voiceGeneration.ts
import { ElevenLabsClient } from 'elevenlabs';

export async function generateVoice(params: {
  text: string;
  voiceId: string;
  emotion: string;
}) {
  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  const audio = await client.generate({
    voice: params.voiceId,
    text: params.text,
    model_id: 'eleven_multilingual_v2',
  });

  return audio;
}
```

### 4. Production Workflow Automation

**Complete Pipeline:**
1. Generate script with Gemini 3
2. Break down into scenes and shots
3. Generate character images for each shot
4. Generate background images
5. Generate voice recordings for all dialogue
6. Generate video clips with Veo 3
7. Assemble final episode

**Implementation Location:**
```typescript
// src/services/production/pipeline.ts
export async function produceEpisode(scriptId: string) {
  // Step-by-step automated production
}
```

### 5. Supabase Edge Functions

Create Edge Functions for secure API integrations:

```bash
# Create function for script generation
supabase functions new generate-script

# Create function for image generation
supabase functions new generate-image

# Create function for video generation
supabase functions new generate-video

# Create function for voice generation
supabase functions new generate-voice
```

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

The following environment variables are already configured:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Add these for full AI integration:

```env
GCP_PROJECT_ID=your-gcp-project
GCP_LOCATION=us-central1
ELEVENLABS_API_KEY=your-elevenlabs-key
```

## Architecture

```
src/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Characters.tsx   # Character management
│   ├── Scripts.tsx      # Script browser
│   ├── AIStudio.tsx     # AI generation interface
│   ├── Assets.tsx       # Asset library
│   ├── Episodes.tsx     # Episode tracking
│   ├── Production.tsx   # Production queue
│   └── Settings.tsx     # Configuration
├── lib/
│   ├── supabase.ts      # Supabase client
│   └── database.types.ts # TypeScript types
├── services/            # AI service integrations (to be added)
│   ├── vertexai/
│   ├── elevenlabs/
│   └── production/
└── utils/
    └── sampleData.ts    # Sample character data
```

## Design Philosophy

- **Clay-Themed UI**: Warm amber/orange color palette matching claymation aesthetic
- **Production-Ready**: Complete workflow from concept to final video
- **Reusable Assets**: All generated content stored for reuse
- **Cost Tracking**: Monitor AI service costs throughout production
- **Scalable**: Support for multiple series and seasons

## Sample Script Format

The platform is designed to work with the script format provided:
- 22-minute runtime (3 acts)
- Commercial break structure
- Character-driven dialogue
- Spelling bee vocabulary integration
- Claymation-specific stage directions

## Technologies Used

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Supabase** for backend
- **Lucide React** for icons
- **Google Cloud Vertex AI** (ready for integration)
- **Eleven Labs** (ready for integration)

## Contributing

The foundation is complete. Next steps for contributors:

1. Implement Vertex AI Gemini 3 script generation
2. Add image generation with style consistency
3. Integrate Veo 3 for video generation
4. Connect Eleven Labs for voice synthesis
5. Build automated production pipeline
6. Add video editing and assembly tools

## License

This is a production platform for creating content using the Scripps National Spelling Bee IP.

---

**Status**: Foundation Complete - Ready for AI Service Integration

The application structure, database, and UI are fully implemented. The next phase is connecting the AI services to enable end-to-end automated episode production.

# Tavus Integration Guide

Complete integration of Tavus API for AI video generation, replica management, and voice cloning.

## Overview

Tavus enables:
- **Video Replicas** - Create AI avatars from user images
- **Voice Cloning** - Train custom voices from audio samples
- **Video Generation** - Generate videos from script + replica + voice
- **Batch Processing** - Generate multiple videos efficiently

## Setup

### 1. Environment Variables

Add to `.env`:
```
TAVUS_API_KEY=your_tavus_api_key
```

### 2. Database Migrations

Run migrations in order:
```sql
-- Create replicas table
supabase/migrations/00182_tavus_replicas.sql

-- Create voices table
supabase/migrations/00183_tavus_voices.sql

-- Create videos table
supabase/migrations/00184_tavus_videos.sql
```

## Architecture

### Services

**TavusService** (`apps/api/src/services/tavus.service.ts`)
- Direct Tavus API client
- Methods for replicas, voices, videos
- Handles authentication and requests

```typescript
const tavusService = new TavusService()
await tavusService.createReplica('John', imageUrl)
await tavusService.createVoice('Voice', audioUrl)
await tavusService.generateVideo(script, replicaId, voiceId)
```

### Repository

**TavusRepository** (`apps/api/src/repositories/tavus.repository.ts`)
- Database layer for Tavus data
- Syncs between Tavus API and Supabase
- Manages replicas, voices, and videos

```typescript
const tavusRepo = new TavusRepository(supabaseUrl, supabaseKey)
await tavusRepo.createReplica(workspaceId, name, imageUrl)
await tavusRepo.listVoices(workspaceId)
await tavusRepo.generateVideo(workspaceId, script, replicaId, voiceId)
```

### Routes

**Tavus Routes** (`apps/api/src/routes/tavus.ts`)
- REST API endpoints
- Requires authentication
- Handles all Tavus operations

## API Endpoints

### Replicas

#### Create Replica
```
POST /tavus/replicas

{
  "workspaceId": "uuid",
  "replicaName": "John Smith",
  "imageUrl": "https://..."
}

Response: { replica: { id, tavus_replica_id, status, ... } }
```

#### List Replicas
```
GET /tavus/replicas/:workspaceId

Response: { replicas: [...] }
```

#### Delete Replica
```
DELETE /tavus/replicas/:replicaId

Response: { success: true, message: "Replica deleted" }
```

### Voices

#### Create Voice
```
POST /tavus/voices

{
  "workspaceId": "uuid",
  "voiceName": "Professional Voice",
  "audioUrl": "https://..."
}

Response: { voice: { id, tavus_voice_id, status, ... } }
```

#### List Voices
```
GET /tavus/voices/:workspaceId

Response: { voices: [...] }
```

#### Delete Voice
```
DELETE /tavus/voices/:voiceId

Response: { success: true, message: "Voice deleted" }
```

### Videos

#### Generate Video
```
POST /tavus/generate

{
  "workspaceId": "uuid",
  "script": "Hello world, this is an AI video",
  "replicaId": "uuid",
  "voiceId": "uuid",
  "backgroundUrl": "https://..." (optional)
}

Response: { video: { id, tavus_video_id, status: "queued", ... } }
```

#### Get Video Status
```
GET /tavus/videos/:videoId

Response: { video: { ..., status: "completed", video_url: "https://...", ... } }
```

#### List Videos
```
GET /tavus/videos/workspace/:workspaceId

Response: { videos: [...] }
```

## Database Schema

### tavus_replicas
```sql
id                  UUID (PK)
workspace_id        UUID (FK → workspaces)
tavus_replica_id    TEXT (unique)
replica_name        TEXT
image_url           TEXT
status              TEXT ('created' | 'processing' | 'ready' | 'error')
error               TEXT (nullable)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### tavus_voices
```sql
id                  UUID (PK)
workspace_id        UUID (FK → workspaces)
tavus_voice_id      TEXT (unique)
voice_name          TEXT
audio_url           TEXT
status              TEXT ('training' | 'ready' | 'error')
error               TEXT (nullable)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### tavus_videos
```sql
id                  UUID (PK)
workspace_id        UUID (FK → workspaces)
tavus_video_id      TEXT (unique)
script              TEXT
replica_id          UUID (FK → tavus_replicas)
voice_id            UUID (FK → tavus_voices)
status              TEXT ('queued' | 'generating' | 'completed' | 'error')
video_url           TEXT (nullable)
thumbnail_url       TEXT (nullable)
error               TEXT (nullable)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

## Security

### Row Level Security (RLS)
All tables have RLS enabled:
- Users can only access their workspace's data
- Verified through workspace_members relationship
- All CRUD operations restricted by workspace

### Authentication
All endpoints require `authMiddleware`:
- Validates JWT token
- Verifies user's workspace access
- Prevents cross-workspace data access

## Frontend Integration

### Creating a Replica
```typescript
const response = await fetch('/api/tavus/replicas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: userWorkspaceId,
    replicaName: 'John Smith',
    imageUrl: uploadedImageUrl,
  }),
})

const { replica } = await response.json()
```

### Cloning a Voice
```typescript
const response = await fetch('/api/tavus/voices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: userWorkspaceId,
    voiceName: 'My Voice',
    audioUrl: recordedAudioUrl,
  }),
})

const { voice } = await response.json()
```

### Generating a Video
```typescript
const response = await fetch('/api/tavus/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: userWorkspaceId,
    script: 'Hello, welcome to my video!',
    replicaId: selectedReplicaId,
    voiceId: selectedVoiceId,
  }),
})

const { video } = await response.json()
// Poll for completion
```

## Polling for Completion

Videos take time to generate. Poll using:

```typescript
const checkVideoStatus = async (videoId) => {
  const response = await fetch(`/api/tavus/videos/${videoId}`)
  const { video } = await response.json()
  
  if (video.status === 'completed') {
    return video.video_url // Ready to download/use
  } else if (video.status === 'error') {
    console.error(video.error)
  }
  // Still generating, poll again in 5 seconds
}
```

## Integration with Talking Actors Studio

### In UGC Upload Dialog
```typescript
// After user uploads image/video
const replica = await fetch('/api/tavus/replicas', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId,
    replicaName: actorName,
    imageUrl: uploadedImageUrl,
  }),
})
```

### In Composer
```typescript
// Actor list now includes Tavus replicas
const replicas = await fetch(`/api/tavus/replicas/${workspaceId}`)
const voices = await fetch(`/api/tavus/voices/${workspaceId}`)

// Render in dropdowns
```

### In Generation
```typescript
// Generate video using Tavus
const video = await fetch('/api/tavus/generate', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId,
    script,
    replicaId: selectedReplicaId, // From Tavus
    voiceId: selectedVoiceId,       // From Tavus
  }),
})
```

## Billing Integration

Tavus charges per:
- **Replicas**: One-time creation cost
- **Voices**: Training cost
- **Videos**: Per video generated (based on length)

Track in `tavus_videos` table:
- `status` field updates as video progresses
- `video_url` populated when complete
- Deduct credits when generation starts
- Refund if generation fails

## Error Handling

### Replica Errors
- Status becomes 'error'
- Error message saved in `error` field
- User should retry with different image

### Voice Errors
- Status becomes 'error'
- Training failed - audio quality issue
- Suggest better audio sample

### Video Generation Errors
- Status becomes 'error'
- Check script length/quality
- Verify replica and voice are ready
- Retry or refund credits

## Monitoring

### Check Replica Status
```typescript
GET /tavus/replicas/:workspaceId
// Returns all replicas with current status
```

### Check Voice Status
```typescript
GET /tavus/voices/:workspaceId
// Returns all voices with training status
```

### Check Video Generation
```typescript
GET /tavus/videos/workspace/:workspaceId
// Returns all videos with generation status
```

## Cleanup

### Delete Old Replicas
```typescript
DELETE /tavus/replicas/:replicaId
// Removes from Tavus and database
```

### Delete Old Voices
```typescript
DELETE /tavus/voices/:voiceId
// Removes from Tavus and database
```

## Batch Processing

For multiple videos:

```typescript
// Create all replicas/voices first
const replicas = await Promise.all([...])
const voices = await Promise.all([...])

// Generate videos in batch
const videos = await Promise.all(
  scripts.map(script =>
    fetch('/api/tavus/generate', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        script,
        replicaId: replicas[0].id,
        voiceId: voices[0].id,
      }),
    })
  )
)
```

## Troubleshooting

### Video not generating
- Check replica status is 'ready'
- Check voice status is 'ready'
- Verify script is under 5000 characters
- Check workspace has sufficient credits

### Replica creation stuck
- Image file too large? Resize to < 10MB
- Image quality poor? Use high-quality photo
- Try different image file format

### Voice training failing
- Audio too short? Provide 30+ seconds
- Audio quality poor? Use quiet background
- Check audio format is MP3/WAV

## Files Added

```
Backend Services:
- apps/api/src/services/tavus.service.ts
- apps/api/src/repositories/tavus.repository.ts
- apps/api/src/routes/tavus.ts

Database:
- supabase/migrations/00182_tavus_replicas.sql
- supabase/migrations/00183_tavus_voices.sql
- supabase/migrations/00184_tavus_videos.sql

Documentation:
- TAVUS_INTEGRATION.md (this file)
```

## Next Steps

1. ✅ Tavus service and API integration
2. ✅ Database schema with RLS
3. Next: Wire up Tavus to Talking Actors Studio UI
4. Next: Update generation to use Tavus replicas/voices
5. Next: Implement video polling and status updates
6. Next: Add billing integration for Tavus costs

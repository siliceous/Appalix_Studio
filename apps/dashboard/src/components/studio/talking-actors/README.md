# Talking Actors Studio

Premium AI-powered talking actor video generation feature for the Appalix SaaS platform.

## Overview

The Talking Actors Studio is a comprehensive, professional-grade feature that allows users to create high-quality talking actor videos with:

- **12 Professional Actors** - Business, medical, legal, and media professionals
- **11 Built-in Backgrounds** - Corporate, residential, medical, and studio environments
- **10+ Premium Voices** - ElevenLabs, OpenAI, Cartesia, HeyGen, and Appalix voice providers
- **10 Emotions & Tones** - Professional to conversational delivery styles
- **Advanced Video Settings** - Multiple aspect ratios, quality levels, and camera movements
- **AI Script Tools** - Generate, improve, shorten, and expand scripts

## Architecture

### File Structure

```
talking-actors/
├── types.ts              # TypeScript interfaces and type definitions
├── data.ts               # Actor, background, voice, and settings data
├── index.tsx             # Main studio component (workspace + composer)
├── composer.tsx          # Bottom floating composer with script input & settings
├── library.tsx           # Library UI component (extensible)
├── export.ts             # Public exports
└── README.md             # This file
```

### Components

#### TalkingActorsStudio (index.tsx)
- Main studio component
- Manages generation state and asset library
- Displays video cards grid
- Empty state messaging

#### TalkingActorComposer (composer.tsx)
- Bottom floating UI
- Script input area with quick AI tools
- Settings panel with all controls:
  - Actor selection
  - Background selection
  - Voice selection
  - Emotion selection
  - Video format (aspect ratio)
  - Quality level
  - Camera style
- Cost and duration estimates
- Generate button

## Features

### Actor Library

12 professional actors across multiple categories:

**Business**
- Business Woman
- Business Man
- Corporate Executive

**Professional Services**
- Doctor
- Lawyer
- Real Estate Agent
- Solar Consultant

**Service Industry**
- Restaurant Owner
- Tradie

**Media & Entertainment**
- Influencer
- Presenter
- News Anchor

### Background Library

11 built-in professional backgrounds:

**Corporate**
- Corporate Office
- Modern Boardroom

**Real Estate**
- Luxury Home
- Sydney Skyline

**Service**
- Medical Clinic
- Restaurant Interior
- Cafe Environment

**Industrial**
- Construction Site
- Warehouse

**Studio**
- Studio Background
- Green Screen

### Voice System

Multi-provider voice support with 10+ professional voices:

- **ElevenLabs** - Natural, expressive voices
- **OpenAI** - High-quality TTS
- **Cartesia** - Premium voice synthesis
- **HeyGen** - Synchronized voices
- **Appalix** - Native voice engine

Each voice includes:
- Language selection
- Accent options
- Gender and age range
- Speaking speed control
- Pitch adjustment
- Energy level

### Emotions & Delivery Styles

10 distinct emotional tones:
- Professional
- Friendly
- Confident
- Excited
- Serious
- Luxury
- Persuasive
- Conversational
- Motivational
- Authoritative

### Video Settings

**Aspect Ratios:**
- 9:16 (TikTok / Reels)
- 16:9 (YouTube)
- 1:1 (Social Posts)
- 4:5 (Facebook / Instagram)

**Quality Levels:**
- Standard (720p)
- HD (1080p)
- Full HD (1440p)
- 4K (2160p)

**Camera Movements:**
- Static (no movement)
- Zoom In (slow zoom)
- Zoom Out (slow zoom)
- Dynamic (automated movement)
- Pan (virtual camera pan)
- Cinematic (cinematic movement)

### Script Tools

Quick AI-powered script enhancement:
- **Generate Script** - Create script from prompt
- **Improve Script** - Enhance existing script
- **Shorten Script** - Condense script
- **Expand Script** - Add more detail

## Data Structures

### Types (types.ts)

```typescript
interface TalkingActorGeneration {
  id: string
  script: string
  actor: Actor
  background: Background
  voice: Voice
  emotion: Emotion
  aspectRatio: AspectRatio
  quality: OutputQuality
  cameraStyle: CameraStyle
  lipSyncEnabled: boolean
  speed: number
  energy: number
  confidence: number
  videoUrl?: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  duration?: number
  createdAt: Date
  updatedAt: Date
}
```

### Data (data.ts)

- ACTORS - Array of professional actors
- BACKGROUNDS - Array of background scenes
- VOICES - Array of voice options
- EMOTIONS - Array of emotion/tone strings
- ASPECT_RATIOS - Video format options
- OUTPUT_QUALITIES - Quality settings
- CAMERA_STYLES - Camera movement options

## Usage

### In Studio Layout

```typescript
import { TalkingActorsStudio } from './talking-actors'

<TalkingActorsStudio
  walletBalance={userBalance}
  estimatedCost={2.5}
/>
```

### Extending

To add new actors, backgrounds, or voices:

1. Add to `data.ts` in the respective array
2. Export from `export.ts`
3. Reuse in `composer.tsx` dropdowns

## UI/UX Patterns

### Empty State
- Shows when no videos generated
- Call-to-action messaging
- Guides user to use composer below

### Video Cards
- Actor preview with emoji
- Script excerpt (truncated)
- Duration estimate
- Status badge (Generating/Ready)
- Play button on hover
- Action menu (Duplicate, Download, Delete)

### Composer Layout
- **Left**: Script input + quick tools
- **Right**: Settings panel (7 dropdowns)
- **Bottom**: Cost, duration, Generate button

### Status Management
- Pending → Generating → Completed/Failed
- Real-time UI updates
- Estimated video duration calculation

## Performance Considerations

- Lazy load actors/backgrounds on demand
- Memoize large lists
- Optimize video card rendering with keys
- Debounce script input if needed

## Future Enhancements

- [ ] Advanced audio controls (lip sync, facial expressions)
- [ ] Custom actor upload (image/video)
- [ ] AI-generated backgrounds
- [ ] Multi-actor support
- [ ] Scene transitions
- [ ] Background music integration
- [ ] Captions and subtitles
- [ ] Export templates
- [ ] Video analytics
- [ ] White-label options

## Styling

- TailwindCSS with dark mode support
- Clean, minimal aesthetic
- Professional premium appearance
- Consistent with Arcads, HeyGen, Synthesia design language

## Error Handling

- Network errors during generation
- Invalid script input
- Insufficient wallet balance
- Video processing failures

## Testing

### Manual Testing Checklist

- [ ] Script input and character counter
- [ ] Actor selection changes preview
- [ ] All dropdowns functional
- [ ] Generate button disabled when balance insufficient
- [ ] Generation workflow (pending → completed)
- [ ] Video card actions
- [ ] Empty state displays correctly
- [ ] Dark mode styling
- [ ] Responsive layout

## Dependencies

- React 18+
- Next.js 15+
- TailwindCSS 3+
- Lucide React (icons)

## License

Part of Appalix SaaS platform - All rights reserved

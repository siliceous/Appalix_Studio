export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5'
export type OutputQuality = 'standard' | 'hd' | 'full_hd' | '4k'
export type CameraStyle = 'static' | 'zoom_in' | 'zoom_out' | 'dynamic' | 'pan' | 'cinematic'
export type Emotion = 'professional' | 'friendly' | 'confident' | 'excited' | 'serious' | 'luxury' | 'persuasive' | 'conversational' | 'motivational' | 'authoritative'
export type VoiceProvider = 'elevenlabs' | 'openai' | 'cartesia' | 'heygen' | 'appalix'
export type BackgroundType = 'builtin' | 'uploaded' | 'ai_generated'

export interface Actor {
  id: string
  name: string
  image: string
  category: string
  description?: string
}

export interface Background {
  id: string
  name: string
  image: string
  type: BackgroundType
}

export interface Voice {
  id: string
  name: string
  provider: VoiceProvider
  language: string
  accent: string
  gender: string
  ageRange: string
}

export interface TalkingActorGeneration {
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

export interface ScriptGeneration {
  id: string
  prompt: string
  script: string
  variations: string[]
  wordCount: number
  characterCount: number
  estimatedDuration: number
}

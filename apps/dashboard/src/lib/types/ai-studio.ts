export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed'
export type GenerationType = 'image' | 'video' | 'product-ad' | 'talking-ad'
export type AspectRatio = '9:16' | '1:1' | '16:9' | '4:5'
export type Platform = 'tiktok' | 'instagram' | 'facebook' | 'linkedin' | 'google-ads'

export interface GenerationResult {
  id: string
  status: GenerationStatus
  outputUrl: string
  imageUrls?: string[]
  type: GenerationType
  createdAt: Date
  estimatedCredits: number
}

export interface Project {
  id: string
  name: string
  type: GenerationType
  thumbnail: string
  createdAt: Date
  updatedAt: Date
  assets: GenerationResult[]
}

export interface AIModel {
  id: string
  name: string
  description: string
  category: 'image' | 'video' | 'voice' | 'text'
  creditsPerGeneration: number
  icon: string
  featured: boolean
}

export interface CreditUsage {
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  refreshDate: Date
}

export interface ImageGenerationParams {
  prompt: string
  negativePrompt?: string
  style: string
  lighting?: string
  aspectRatio: AspectRatio
  temperature?: number
  resolution?: string
  referenceImage?: string
  model: string
  quantity: number
}

export interface VideoGenerationParams {
  type: 'image-to-video' | 'prompt-to-video'
  imageUrl?: string
  prompt: string
  duration: number
  cameraMovement?: string
  aspectRatio: AspectRatio
  model: string
}

export interface ProductAdParams {
  productImage: string
  productName: string
  targetAudience: string
  offer: string
  cta: string
  platform: Platform
  outputType: 'video' | 'cinematic' | 'usage' | 'holding' | 'lifestyle'
  sceneStyle: string
  brandTone: string
}

export interface TalkingAdParams {
  avatarId: string
  script: string
  voiceId: string
  language: string
  backgroundId: string
  logoUrl?: string
  showCaptions: boolean
  ctaText?: string
}

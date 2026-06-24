import {
  GenerationResult,
  ImageGenerationParams,
  VideoGenerationParams,
  ProductAdParams,
  TalkingAdParams,
  Project,
  AIModel,
  CreditUsage,
} from '../types/ai-studio'

// Mock data
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Summer Campaign',
    type: 'product-ad',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=300&fit=crop',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    assets: [],
  },
  {
    id: '2',
    name: 'Product Showcase',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1611339555312-e607c90352fd?w=400&h=300&fit=crop',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    assets: [],
  },
  {
    id: '3',
    name: 'Brand Assets',
    type: 'image',
    thumbnail: 'https://images.unsplash.com/photo-1559056199-641a0ac8b3f7?w=400&h=300&fit=crop',
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    assets: [],
  },
]

const mockModels: AIModel[] = [
  // Image Models
  {
    id: '6bef9f1b-29cb-40c7-b9df-32b51c1f755f',
    name: 'Image',
    description: 'Foundation model for high-quality image generation',
    category: 'image',
    creditsPerGeneration: 10,
    icon: '🎨',
    featured: true,
  },
  {
    id: '6e0702f6-d77a-403a-81c5-d8c8ae0e71d9',
    name: 'Kino XL',
    description: 'High-quality cinematic images',
    category: 'image',
    creditsPerGeneration: 15,
    icon: '🎬',
    featured: true,
  },
  {
    id: 'aa77f04e-3685-4dc3-a24c-20577eaf9d0d',
    name: 'Vision XL',
    description: 'Advanced vision model for detailed images',
    category: 'image',
    creditsPerGeneration: 12,
    icon: '👁️',
    featured: true,
  },
  {
    id: 'b63d91a5-e89b-4ab9-bb00-741318d7d9d3',
    name: 'PhotoReal',
    description: 'Photorealistic image generation',
    category: 'image',
    creditsPerGeneration: 20,
    icon: '📷',
    featured: true,
  },
  {
    id: 'e71a1c2a-6611-4d6d-ad0a-a3e599c52864',
    name: 'Anime',
    description: 'Specialized for anime and manga style',
    category: 'image',
    creditsPerGeneration: 8,
    icon: '🎨',
    featured: false,
  },
  {
    id: '291be633-0c5d-4cb8-83fb-01da739872ab',
    name: '3D',
    description: '3D model and illustration generation',
    category: 'image',
    creditsPerGeneration: 18,
    icon: '🎲',
    featured: false,
  },
  {
    id: 'f8bfb5e8-6e7c-4a6d-9e8a-8c9b8d7e6f5g',
    name: 'Nano',
    description: 'Fast, lightweight model for quick generation',
    category: 'image',
    creditsPerGeneration: 5,
    icon: '⚡',
    featured: false,
  },
  {
    id: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    name: 'Banana 2',
    description: 'Advanced generation with optimizations',
    category: 'image',
    creditsPerGeneration: 14,
    icon: '🍌',
    featured: false,
  },
  {
    id: 'x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4',
    name: 'Seedence',
    description: 'Seed-based consistency model',
    category: 'image',
    creditsPerGeneration: 11,
    icon: '🌱',
    featured: false,
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    description: 'Advanced image generation with exceptional detail',
    category: 'image',
    creditsPerGeneration: 15,
    icon: '🖼️',
    featured: false,
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    description: 'Artistic and creative image generation',
    category: 'image',
    creditsPerGeneration: 20,
    icon: '🌈',
    featured: false,
  },
  {
    id: 'stable-diffusion-3',
    name: 'Stable Diffusion 3',
    description: 'Fast and efficient image generation',
    category: 'image',
    creditsPerGeneration: 8,
    icon: '⚡',
    featured: false,
  },

  // Video Models
  {
    id: 'sora',
    name: 'Sora',
    description: 'Advanced text-to-video generation',
    category: 'video',
    creditsPerGeneration: 80,
    icon: '🎬',
    featured: true,
  },
  {
    id: 'kling-video',
    name: 'Kling Video',
    description: 'Professional video generation',
    category: 'video',
    creditsPerGeneration: 50,
    icon: '🎥',
    featured: true,
  },
  {
    id: 'runway-video',
    name: 'Runway Gen 3',
    description: 'AI video generation and editing',
    category: 'video',
    creditsPerGeneration: 40,
    icon: '🎞️',
    featured: true,
  },
  {
    id: 'pika-labs',
    name: 'Pika Labs',
    description: 'Quick video generation from images',
    category: 'video',
    creditsPerGeneration: 35,
    icon: '🎭',
    featured: false,
  },

  // Voice/Avatar Models
  {
    id: 'tavus-video',
    name: 'Tavus',
    description: 'AI talking avatar videos',
    category: 'video',
    creditsPerGeneration: 60,
    icon: '👤',
    featured: true,
  },
  {
    id: 'gemini-voice',
    name: 'Gemini Voice',
    description: 'Natural voice synthesis and lip-sync',
    category: 'voice',
    creditsPerGeneration: 5,
    icon: '🎙️',
    featured: true,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Premium voice synthesis',
    category: 'voice',
    creditsPerGeneration: 8,
    icon: '🔊',
    featured: false,
  },

  // Text Models
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Advanced text generation and analysis',
    category: 'text',
    creditsPerGeneration: 2,
    icon: '✍️',
    featured: true,
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    description: 'Intelligent text generation',
    category: 'text',
    creditsPerGeneration: 2,
    icon: '🤖',
    featured: false,
  },
]

// Mock credit usage
let creditUsage: CreditUsage = {
  totalCredits: 1000,
  usedCredits: 342,
  remainingCredits: 658,
  refreshDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
}

// Mock generation function - returns queued status
const createMockResult = (type: any, creditsNeeded: number): GenerationResult => {
  return {
    id: `gen_${Date.now()}`,
    status: 'queued',
    outputUrl: '',
    type,
    createdAt: new Date(),
    estimatedCredits: creditsNeeded,
  }
}

// Sample Leonardo images (using public URLs)
const sampleLeonardoImages = [
  'https://images.unsplash.com/photo-1579783902614-e3fb5141b0cb?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1611339555312-e607c90352fd?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1559056199-641a0ac8b3f7?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1578321272176-01ba971c63a7?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1581822261290-991b38693d1b?w=500&h=500&fit=crop',
]

// API Functions
export const aiStudioAPI = {
  // Get available image generation models from backend
  async getImageModels(): Promise<AIModel[]> {
    try {
      const response = await fetch('/api/ai-studio/models/image')
      if (!response.ok) {
        console.error('Failed to fetch models from backend')
        return mockModels.filter((m) => m.category === 'image')
      }
      const data = await response.json()

      // Convert backend model format to frontend AIModel format
      const models = data.models.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description || 'Stable Diffusion model',
        category: 'image' as const,
        creditsPerGeneration: 10,
        icon: '🎨',
        featured: m.id === 'sd3-large-turbo',
      }))

      return models.length > 0 ? models : mockModels.filter((m) => m.category === 'image')
    } catch (error) {
      console.error('Error fetching models:', error)
      return mockModels.filter((m) => m.category === 'image')
    }
  },

  // Get sample images for preview
  async getSampleImages(): Promise<string[]> {
    return Promise.resolve(sampleLeonardoImages)
  },

  // Image Generation
  async generateImage(params: ImageGenerationParams & { workspaceId?: string }): Promise<GenerationResult> {
    let workspaceId = params.workspaceId

    if (!workspaceId && typeof window !== 'undefined') {
      workspaceId = localStorage.getItem('workspaceId') ?? undefined
    }

    if (!workspaceId) {
      throw new Error('Workspace ID not found')
    }

    const { workspaceId: _ignore, ...bodyParams } = params

    const response = await fetch('/api/ai-studio/generate/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify(bodyParams),
    })

    const responseText = await response.text()
    console.log('[generateImage] Response status:', response.status)
    console.log('[generateImage] Response text (first 200 chars):', responseText.substring(0, 200))

    if (!response.ok) {
      try {
        const error = JSON.parse(responseText)
        throw new Error(error.error || 'Image generation failed')
      } catch (parseError) {
        throw new Error(`Request failed with status ${response.status}: ${responseText.substring(0, 100)}`)
      }
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      throw new Error(`Failed to parse response as JSON: ${responseText.substring(0, 100)}`)
    }
    creditUsage.usedCredits += 10 * params.quantity
    creditUsage.remainingCredits -= 10 * params.quantity
    return result
  },

  // Video Generation
  async generateVideo(params: VideoGenerationParams): Promise<GenerationResult> {
    // In production: POST to /api/ai-studio/generate/video
    // Backend will call Kling/Runway API
    const creditsNeeded = params.type === 'image-to-video' ? 40 : 50
    const result = createMockResult('video', creditsNeeded)
    creditUsage.usedCredits += creditsNeeded
    creditUsage.remainingCredits -= creditsNeeded
    return result
  },

  // Product Ad Generation
  async generateProductAd(params: ProductAdParams): Promise<GenerationResult> {
    // In production: POST to /api/ai-studio/generate/product-ad
    // Backend will orchestrate multiple API calls
    const result = createMockResult('product-ad', 75)
    creditUsage.usedCredits += 75
    creditUsage.remainingCredits -= 75
    return result
  },

  // Talking Ad Generation
  async generateTalkingAd(params: TalkingAdParams): Promise<GenerationResult> {
    // In production: POST to /api/ai-studio/generate/talking-ad
    // Backend will call Tavus + Gemini Voice APIs
    const result = createMockResult('talking-ad', 100)
    creditUsage.usedCredits += 100
    creditUsage.remainingCredits -= 100
    return result
  },

  // Upload Asset
  async uploadAsset(file: File): Promise<string> {
    // In production: POST to /api/ai-studio/upload
    // Backend will upload to cloud storage
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://storage.example.com/${Date.now()}_${file.name}`)
      }, 1000)
    })
  },

  // Get Projects
  async getProjects(): Promise<Project[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockProjects)
      }, 500)
    })
  },

  // Get Models
  async getModels(): Promise<AIModel[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockModels)
      }, 300)
    })
  },

  // Get Credit Usage
  async getCreditUsage(): Promise<CreditUsage> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(creditUsage)
      }, 200)
    })
  },

  // Get Generation Status
  async getGenerationStatus(generationId: string, workspaceId?: string): Promise<GenerationResult> {
    let wsId = workspaceId

    if (!wsId && typeof window !== 'undefined') {
      wsId = localStorage.getItem('workspaceId') ?? undefined
    }

    if (!wsId) {
      throw new Error('Workspace ID not found')
    }

    const response = await fetch(`/api/ai-studio/generations/${generationId}`, {
      headers: {
        'x-workspace-id': wsId,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get generation status')
    }

    return await response.json()
  },

  // Poll generation until complete
  async pollGeneration(
    generationId: string,
    maxWaitMs: number = 300000,
    workspaceId?: string
  ): Promise<GenerationResult> {
    const startTime = Date.now()
    const pollInterval = 2000 // 2 seconds

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        if (Date.now() - startTime > maxWaitMs) {
          clearInterval(interval)
          reject(new Error('Generation timeout'))
          return
        }

        try {
          const result = await this.getGenerationStatus(generationId, workspaceId)

          if (result.status === 'completed' || result.status === 'failed') {
            clearInterval(interval)
            resolve(result)
          }
        } catch (error) {
          // Continue polling on error
        }
      }, pollInterval)
    })
  },
}

// Export types for components
export type { GenerationResult, Project, AIModel, CreditUsage }

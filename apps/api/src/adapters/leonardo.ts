import { config } from '../config.js'

export interface LeonardoGenerationParams {
  prompt: string
  negativePrompt?: string
  style?: string
  aspectRatio?: string
  width?: number
  height?: number
  numImages: number
  modelId?: string
}

export interface LeonardoGenerationResponse {
  sdGenerationJob: {
    generationId: string
    status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
  }
}

export interface LeonardoJobStatusResponse {
  generationsByStatus: Array<{
    status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
    generated_images?: Array<{
      id: string
      url: string
    }>
  }>
}

export interface LeonardoModel {
  id: string
  name: string
  description?: string
  instanceType?: string
  category?: string
}

export interface LeonardoModelsResponse {
  models?: LeonardoModel[]
  custom_models?: LeonardoModel[]
}

class LeonardoAdapter {
  private apiKey: string
  private baseUrl = 'https://api.leonardo.ai/rest/v1'

  constructor() {
    this.apiKey = config.LEONARDO_API_KEY || ''
    if (!this.apiKey) {
      console.warn('[Leonardo] API key not configured. Image generation will fail.')
    }
  }

  async generateImage(params: LeonardoGenerationParams): Promise<string> {
    // For testing: return mock job IDs that will complete
    // In production, this would call the real Leonardo API
    const mockJobId = `mock-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    console.log('[Leonardo] Mock generation request:', {
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      numImages: params.numImages,
    })
    console.log('[Leonardo] Mock job ID created:', mockJobId)

    return mockJobId
  }

  async getGenerationStatus(generationId: string): Promise<{
    status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
    imageUrls: string[]
  }> {
    // For testing: simulate job completion after 2 seconds
    // Return mock image URLs that show colored placeholders
    if (!generationId.startsWith('mock-job-')) {
      throw new Error('Invalid job ID')
    }

    // Simulate job completion
    const jobTimestamp = parseInt(generationId.split('-')[2], 10)
    const currentTime = Date.now()
    const elapsedSeconds = (currentTime - jobTimestamp) / 1000

    if (elapsedSeconds < 2) {
      // Still processing
      return {
        status: 'PROCESSING',
        imageUrls: [],
      }
    }

    // Job is complete - return mock image URLs with SVG data URLs
    // This creates a properly formatted SVG that represents a generated image
    // The SVG dimensions are 896x504 which is 16:9 aspect ratio
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    const randomColor2 = colors[(colors.indexOf(randomColor) + 1) % colors.length]

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="896" height="504" viewBox="0 0 896 504">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#${randomColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#${randomColor2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="896" height="504" fill="url(#grad)"/>
      <text x="448" y="252" font-size="28" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial">
        Generated Image (16:9)
      </text>
    </svg>`

    const encodedSvg = Buffer.from(svg).toString('base64')
    const dataUrl = `data:image/svg+xml;base64,${encodedSvg}`

    return {
      status: 'COMPLETE',
      imageUrls: [dataUrl],
    }
  }

  async getAvailableModels(): Promise<LeonardoModel[]> {
    if (!this.apiKey) {
      console.warn('[Leonardo] API key not configured. Cannot fetch models.')
      return []
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        console.error(`[Leonardo] Error fetching models: ${response.status}`)
        return []
      }

      const data = (await response.json()) as LeonardoModelsResponse
      const models = [...(data.models || []), ...(data.custom_models || [])]

      return models
    } catch (error) {
      console.error('[Leonardo] Error fetching models:', error)
      return []
    }
  }

  private getAspectRatioDimensions(aspectRatio?: string): {
    width: number
    height: number
  } {
    const dimensions: Record<string, { width: number; height: number }> = {
      '1:1': { width: 512, height: 512 },
      '4:5': { width: 512, height: 640 },
      '16:9': { width: 896, height: 504 },
      '9:16': { width: 504, height: 896 },
    }

    return dimensions[aspectRatio || '1:1'] || dimensions['1:1']
  }
}

export const leonardo = new LeonardoAdapter()

import { config } from '../config.js'

export interface NanoBananaGenerationParams {
  prompt: string
  negativePrompt?: string
  style?: string
  lighting?: string
  aspectRatio?: string
  numImages: number
  modelId?: string
  temperature?: number
}

class NanoBananaAdapter {
  private apiKey: string
  private generatedImages: Map<string, string[]> = new Map()

  constructor() {
    this.apiKey = config.GEMINI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('[Nano Banana] Gemini API key not configured. Image generation will fail.')
    }
  }

  async generateImage(params: NanoBananaGenerationParams): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured')
    }

    const prompt = this.buildPrompt(params.prompt, params.style, params.lighting)
    const modelId = params.modelId || 'nano-banana'

    // Map Nano Banana models to Gemini endpoints
    let geminiModel = 'gemini-2.5-flash-image' // Default for nano-banana
    if (modelId === 'nano-banana-2') {
      geminiModel = 'gemini-3.1-flash-image'
    } else if (modelId === 'nano-banana-pro') {
      geminiModel = 'gemini-3-pro-image'
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${this.apiKey}`

    // Gemini API payload format
    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        temperature: params.temperature ?? 0.7,
      },
    }

    console.log('[Nano Banana] Sending generation request to Gemini endpoint')
    console.log('[Nano Banana] Model:', modelId, '-> Gemini:', geminiModel)
    console.log('[Nano Banana] Prompt:', prompt)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log(`[Nano Banana] Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Nano Banana] Error response: ${errorText.substring(0, 300)}`)
        throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 100)}`)
      }

      const data = await response.json() as any
      console.log('[Nano Banana] Response received, processing...')

      // Extract image from candidates[0].content.parts[].inlineData.data
      let imageUrls: string[] = []

      if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
        const candidate = data.candidates[0]
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              // Found base64 image data
              const base64Data = part.inlineData.data
              const mimeType = part.inlineData.mimeType || 'image/png'
              const dataUrl = `data:${mimeType};base64,${base64Data}`
              imageUrls.push(dataUrl)
              console.log('[Nano Banana] Found image in inlineData')
            }
          }
        }
      }

      if (imageUrls.length === 0) {
        console.error('[Nano Banana] No images found in response. Response structure:', JSON.stringify(data).substring(0, 500))
        throw new Error('No images returned from Gemini API')
      }

      // Store the images with a job ID
      const jobId = `nano-banana-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      this.generatedImages.set(jobId, imageUrls)

      console.log('[Nano Banana] Generated', imageUrls.length, 'image(s) with ID:', jobId)
      return jobId
    } catch (error) {
      console.error('[Nano Banana] Error:', error)
      throw error
    }
  }

  async getGenerationStatus(jobId: string): Promise<{
    status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
    imageUrls: string[]
  }> {
    if (!jobId.startsWith('nano-banana-')) {
      return {
        status: 'FAILED',
        imageUrls: [],
      }
    }

    const storedImages = this.generatedImages.get(jobId)

    if (storedImages) {
      console.log('[Nano Banana] Returning stored images for job:', jobId)
      return {
        status: 'COMPLETE',
        imageUrls: storedImages,
      }
    }

    console.log('[Nano Banana] Images not found for job:', jobId)
    return {
      status: 'FAILED',
      imageUrls: [],
    }
  }

  async getAvailableModels(): Promise<Array<{ id: string; name: string }>> {
    return [
      {
        id: 'nano-banana',
        name: 'Nano Banana',
      },
      {
        id: 'nano-banana-2',
        name: 'Nano Banana 2',
      },
      {
        id: 'nano-banana-pro',
        name: 'Nano Banana Pro',
      },
    ]
  }

  private buildPrompt(userPrompt: string, style?: string, lighting?: string): string {
    let fullPrompt = userPrompt
    if (style && style !== 'Photorealistic') {
      const styleMap: Record<string, string> = {
        'Cinematic': 'cinematic composition, professional color grading, cinematic depth of field',
        'Anime': 'anime style, hand-drawn, manga art',
        'Illustration': 'digital illustration, vector art, illustrated style',
        'Oil Painting': 'oil painting, brush strokes, textured, renaissance style',
        'Abstract': 'abstract art, surreal, modern art',
        'Watercolor': 'watercolor painting, wet paint, flowing colors',
      }
      const styleDescription = styleMap[style] || ` in ${style} style`
      fullPrompt += `, ${styleDescription}`
    }
    if (lighting && lighting !== 'Daylight') {
      const lightingMap: Record<string, string> = {
        'Sunset': 'with golden hour sunset lighting, warm tones',
        'Dramatic': 'with dramatic lighting, high contrast shadows',
        'Studio': 'with studio lighting, professional setup',
        'Neon': 'with neon lighting, cyberpunk aesthetic',
        'Soft': 'with soft, diffused lighting, gentle shadows',
      }

      // Handle multiple lighting options (comma-separated)
      const lightingOptions = lighting.split(',').map(l => l.trim())
      const lightingDescriptions = lightingOptions
        .filter(l => l !== 'Daylight')
        .map(l => lightingMap[l] || l)
        .filter(Boolean)

      if (lightingDescriptions.length > 0) {
        fullPrompt += `, ${lightingDescriptions.join(', ')}`
      }
    }
    return fullPrompt
  }
}

export const nanoBanana = new NanoBananaAdapter()

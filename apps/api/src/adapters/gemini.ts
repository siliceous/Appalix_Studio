import { config } from '../config.js'

export interface GeminiGenerationParams {
  prompt: string
  negativePrompt?: string
  style?: string
  lighting?: string
  aspectRatio?: string
  numImages: number
  modelId?: string
  temperature?: number
}

class GeminiAdapter {
  private apiKey: string
  private generatedImages: Map<string, string[]> = new Map()

  constructor() {
    this.apiKey = config.GEMINI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('[Gemini] API key not configured. Image generation will fail.')
    }
  }

  async generateImage(params: GeminiGenerationParams): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured')
    }

    const prompt = this.buildPrompt(params.prompt, params.style, params.lighting, params.aspectRatio)

    // Gemini Image Generation API payload
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

    console.log('[Gemini] Sending image generation request')
    console.log('[Gemini] Prompt:', prompt)

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      console.log(`[Gemini] Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Gemini] Error response (${response.status}):`, errorText.substring(0, 300))
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json() as any
      console.log('[Gemini] Response received, processing...')

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
              console.log('[Gemini] Found image in inlineData')
            }
          }
        }
      }

      if (imageUrls.length === 0) {
        console.error('[Gemini] No images found in response. Response structure:', JSON.stringify(data).substring(0, 500))
        throw new Error('No images returned from Gemini API')
      }

      // Store the images with a job ID
      const jobId = `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      this.generatedImages.set(jobId, imageUrls)

      console.log('[Gemini] Generated', imageUrls.length, 'image(s) with ID:', jobId)
      return jobId
    } catch (error) {
      console.error('[Gemini] Error:', error)
      throw error
    }
  }

  async getGenerationStatus(jobId: string): Promise<{
    status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
    imageUrls: string[]
  }> {
    if (!jobId.startsWith('gemini-')) {
      return {
        status: 'FAILED',
        imageUrls: [],
      }
    }

    // Check if we have the generated image stored
    const storedImages = this.generatedImages.get(jobId)

    if (storedImages) {
      console.log('[Gemini] Returning stored images for job:', jobId)
      return {
        status: 'COMPLETE',
        imageUrls: storedImages,
      }
    }

    console.log('[Gemini] Images not found for job:', jobId)
    return {
      status: 'FAILED',
      imageUrls: [],
    }
  }

  async getAvailableModels(): Promise<Array<{ id: string; name: string }>> {
    return [
      {
        id: 'gemini-3.1-flash-image',
        name: 'Gemini 3.1 Flash Image',
      },
    ]
  }

  private buildPrompt(userPrompt: string, style?: string, lighting?: string, aspectRatio?: string): string {
    let fullPrompt = userPrompt

    // Add style if specified
    if (style && style !== 'Photorealistic') {
      const styleMap: Record<string, string> = {
        'Cinematic': 'cinematic composition, professional color grading, cinematic depth of field',
        'Anime': 'anime style, hand-drawn, manga art, cel shading',
        'Illustration': 'digital illustration, vector art, illustrated style',
        'Oil Painting': 'oil painting, brush strokes, textured, renaissance style',
        'Abstract': 'abstract art, surreal, modern art, expressionist',
        'Watercolor': 'watercolor painting, wet paint, flowing colors, artistic',
      }
      const styleDescription = styleMap[style] || ` in ${style} style`
      fullPrompt += `, ${styleDescription}`
    }

    // Add lighting if specified (can be comma-separated for multiple)
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

    // Add aspect ratio guidance
    if (aspectRatio === '16:9') {
      fullPrompt += ', landscape orientation (16:9 aspect ratio)'
    } else if (aspectRatio === '9:16') {
      fullPrompt += ', portrait orientation (9:16 aspect ratio)'
    } else if (aspectRatio === '4:5') {
      fullPrompt += ', portrait orientation (4:5 aspect ratio)'
    } else if (aspectRatio === '1:1') {
      fullPrompt += ', square composition (1:1 aspect ratio)'
    }

    return fullPrompt
  }
}

export const gemini = new GeminiAdapter()

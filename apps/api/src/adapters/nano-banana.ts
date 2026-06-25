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
    this.apiKey = config.NANO_BANANA_API_KEY || config.GEMINI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('[Nano Banana] API key not configured. Image generation will fail.')
    }
  }

  async generateImage(params: NanoBananaGenerationParams): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured')
    }

    const prompt = this.buildPrompt(params.prompt, params.style, params.lighting)
    const modelId = params.modelId || 'nano-banana'
    const numImages = params.numImages || 1

    // Map Nano Banana models to Gemini endpoints
    let geminiModel = 'gemini-2.5-flash-image' // Default for nano-banana
    if (modelId === 'nano-banana-2') {
      geminiModel = 'gemini-3.1-flash-image'
    } else if (modelId === 'nano-banana-pro') {
      geminiModel = 'gemini-3-pro-image'
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${this.apiKey}`
    const allImageUrls: string[] = []

    console.log(`[Nano Banana] Generating ${numImages} image(s)`)
    console.log('[Nano Banana] Model:', modelId, '-> Gemini:', geminiModel)

    for (let i = 0; i < numImages; i++) {
      try {
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

        console.log(`[Nano Banana] Sending request ${i + 1}/${numImages}`)
        console.log('[Nano Banana] Prompt:', prompt)

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
          throw new Error(`Gemini API error: ${response.status}`)
        }

        const data = await response.json() as any

        // Extract image from candidates[0].content.parts[].inlineData.data
        if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
          const candidate = data.candidates[0]
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.data) {
                // Found base64 image data
                const base64Data = part.inlineData.data
                const mimeType = part.inlineData.mimeType || 'image/png'
                const dataUrl = `data:${mimeType};base64,${base64Data}`
                allImageUrls.push(dataUrl)
                console.log(`[Nano Banana] Found image ${i + 1}/${numImages}`)
              }
            }
          }
        }

        // Small delay between requests to avoid rate limiting
        if (i < numImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`[Nano Banana] Error generating image ${i + 1}:`, error)
        // Continue with other images even if one fails
      }
    }

    if (allImageUrls.length === 0) {
      throw new Error('No images returned from Gemini API')
    }

    // Store the images with a job ID
    const jobId = `nano-banana-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.generatedImages.set(jobId, allImageUrls)

    console.log('[Nano Banana] Generated', allImageUrls.length, 'image(s) with ID:', jobId)
    return jobId
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
        'Anime': 'anime style, hand-drawn, manga art, cel shading',
        'Illustration': 'digital illustration, vector art, illustrated style',
        'Oil Painting': 'oil painting, brush strokes, textured, renaissance style',
        'Abstract': 'abstract art, surreal, modern art, expressionist',
        'Watercolor': 'watercolor painting, wet paint, flowing colors, artistic',
        '3D': '3D render, 3D modeling, volumetric lighting, octane render',
        'Digital Painting': 'digital painting, brushwork, digital art, paint texture',
        'Sketch': 'pencil sketch, line drawing, charcoal sketch, detailed linework',
        'Comic Book': 'comic book art, comic style, speech bubbles, bold outlines',
        'Game Art': 'video game art, game engine graphics, stylized game',
        'Pixel Art': 'pixel art, 8-bit, retro pixel, pixelated',
        'Low Poly': 'low poly art, geometric shapes, faceted 3D',
        'Isometric': 'isometric view, isometric art, isometric perspective',
        'Cartoon': 'cartoon style, animated, cel animation',
        'Storybook': 'storybook illustration, children\'s book art, whimsical',
        'Gothic': 'gothic style, dark gothic, gothic architecture',
        'Cyberpunk': 'cyberpunk aesthetic, neon lights, futuristic',
        'Steampunk': 'steampunk style, Victorian machinery, brass gears',
        'Art Deco': 'art deco style, geometric patterns, luxury, 1920s',
        'Retro': 'retro style, vintage aesthetic, nostalgic, 70s',
        'Vintage': 'vintage photograph, aged film, antique, faded',
        'Renaissance': 'renaissance art, classical painting, renaissance master',
        'Baroque': 'baroque art, ornate, dramatic lighting, rich colors',
        'Impressionist': 'impressionist painting, impressionism, brushstroke, light',
        'Surreal': 'surreal art, surrealism, dreamlike, impossible geometry',
        'Minimalist': 'minimalist art, simple forms, minimalism, clean',
        'Street Art': 'street art, mural art, graffiti style, urban',
        'Graffiti': 'graffiti art, spray paint, street graffiti, tagging',
        'Marble Sculpture': 'marble sculpture, classical sculpture, carved marble',
        'Paper Cut': 'paper cut art, paper sculpture, layered paper',
        'Mosaic': 'mosaic art, tile mosaic, mosaic pattern',
        'Stained Glass': 'stained glass art, stained glass window, colored glass',
        'Neon': 'neon art, neon glow, glowing neon signs',
        'Holographic': 'holographic art, iridescent, hologram effect',
        'Glamour': 'glamour photography, luxury, high fashion, elegant',
        'Fashion': 'fashion illustration, designer fashion, haute couture',
        'Anatomical': 'anatomical drawing, medical illustration, scientific',
        'Blueprint': 'blueprint style, technical blueprint, engineering',
        'Technical Drawing': 'technical drawing, architectural drawing, CAD style',
      }
      const styleDescription = styleMap[style] || ` in ${style} style`
      fullPrompt = `${styleDescription}. ${fullPrompt}`
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

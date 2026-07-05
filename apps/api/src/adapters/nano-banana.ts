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
  resolution?: string
}

class NanoBananaAdapter {
  private apiKey: string
  private generatedImages: Map<string, string[]> = new Map()

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('[Nano Banana] Gemini API key not configured. Image generation will fail.')
    }
    console.log('[Nano Banana] Adapter initialized with Gemini API')
  }

  async generateImage(params: NanoBananaGenerationParams): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured')
    }

    const prompt = this.buildPrompt(params.prompt, params.style, params.lighting, params.resolution, params.aspectRatio)
    const numImages = params.numImages || 1
    const allImageUrls: string[] = []

    console.log('[Nano Banana] Sending generation request to Gemini 3 Pro Image:', {
      prompt: params.prompt.substring(0, 100),
      aspectRatio: params.aspectRatio,
      numImages,
    })

    // Use Gemini 3 Pro Image for image generation (proper image generation API)
    for (let i = 0; i < numImages; i++) {
      try {
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: params.temperature ?? 0.7,
          },
        }

        console.log(`[Nano Banana] Sending Gemini 3 Pro Image request ${i + 1}/${numImages}`)

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        )

        console.log(`[Nano Banana] Response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Nano Banana] Error response: ${errorText.substring(0, 300)}`)
          throw new Error(`Gemini API error: ${response.status}`)
        }

        const data = await response.json() as any

        // Extract image from response
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

        if (i < numImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`[Nano Banana] Error generating image ${i + 1}:`, error)
        throw error
      }
    }

    if (allImageUrls.length === 0) {
      throw new Error('No images returned from Gemini 3 Pro Image API')
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

  private buildPrompt(userPrompt: string, style?: string, lighting?: string, resolution?: string, aspectRatio?: string): string {
    let fullPrompt = userPrompt

    // Add aspect ratio to prompt for proper image dimensions
    if (aspectRatio) {
      const aspectMap: Record<string, string> = {
        '1:1': '1:1 square aspect ratio',
        '16:9': '16:9 widescreen landscape aspect ratio',
        '9:16': '9:16 portrait tall vertical aspect ratio',
        '3:4': '3:4 portrait vertical aspect ratio',
        '4:3': '4:3 landscape horizontal aspect ratio',
        '21:9': '21:9 ultra-wide cinematic aspect ratio',
        '2:3': '2:3 portrait vertical aspect ratio',
      }
      const aspectHint = aspectMap[aspectRatio] || ''
      if (aspectHint) {
        fullPrompt = `${aspectHint}, ${fullPrompt}`
      }
    }

    if (resolution) {
      const resolutionMap: Record<string, string> = {
        '720': 'high quality 720p resolution',
        '1080': 'high quality 1080p full HD resolution',
        '2k': 'high quality 2K resolution',
        '4k': 'ultra high quality 4K resolution',
      }
      const resHint = resolutionMap[resolution] || ''
      if (resHint) {
        fullPrompt = `${resHint}, ${fullPrompt}`
      }
    }

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

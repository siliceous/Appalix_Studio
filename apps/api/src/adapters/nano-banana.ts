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
  private stabilityApiKey: string
  private baseUrl = 'https://api.stability.ai/v2beta'
  private generatedImages: Map<string, string[]> = new Map()

  constructor() {
    this.stabilityApiKey = config.STABILITY_API_KEY || ''
    if (!this.stabilityApiKey) {
      console.warn('[Nano Banana] Stability API key not configured. Image generation will fail.')
    }
  }

  async generateImage(params: NanoBananaGenerationParams): Promise<string> {
    if (!this.stabilityApiKey) {
      throw new Error('Nano Banana API key not configured')
    }

    const dimensions = this.getAspectRatioDimensions(params.aspectRatio)
    const aspectRatioPrompt = this.buildAspectRatioPrompt(params.aspectRatio)
    const basePrompt = this.buildPrompt(params.prompt, params.style, params.lighting, params.resolution)
    const prompt = aspectRatioPrompt ? `${aspectRatioPrompt}. ${basePrompt}` : basePrompt
    const numImages = params.numImages || 1

    const allImageUrls: string[] = []

    console.log('[Nano Banana] Sending generation request to Stability:', {
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      numImages,
    })

    for (let i = 0; i < numImages; i++) {
      try {
        const formData = new FormData()
        formData.append('prompt', prompt)
        if (params.negativePrompt) {
          formData.append('negative_prompt', params.negativePrompt)
        }
        formData.append('aspect_ratio', params.aspectRatio || '1:1')
        formData.append('output_format', 'png')
        formData.append('model', 'sd3.5-large')

        const response = await fetch(`${this.baseUrl}/stable-image/generate/sd3`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.stabilityApiKey}`,
            'Accept': 'image/*',
          },
          body: formData as any,
        })

        console.log(`[Nano Banana] Response status: ${response.status}`)

        if (!response.ok) {
          const responseText = await response.text()
          console.error(`[Nano Banana] Error response: ${responseText.substring(0, 200)}`)
          throw new Error(`Stability API error: ${response.status}`)
        }

        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const dataUrl = `data:image/png;base64,${base64}`
        allImageUrls.push(dataUrl)
        console.log(`[Nano Banana] Generated image ${i + 1}/${numImages}`)

        if (i < numImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`[Nano Banana] Error generating image ${i + 1}:`, error)
        throw error
      }
    }

    if (allImageUrls.length === 0) {
      throw new Error('No images returned from Nano Banana API')
    }

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

  private buildPrompt(userPrompt: string, style?: string, lighting?: string, resolution?: string): string {
    let fullPrompt = userPrompt

    // Add resolution quality hint
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

  private buildAspectRatioPrompt(aspectRatio?: string): string {
    if (aspectRatio === '16:9') {
      return 'wide landscape format, 16:9 horizontal orientation'
    } else if (aspectRatio === '9:16') {
      return 'tall portrait format, 9:16 vertical orientation, taller than wide'
    } else if (aspectRatio === '4:5') {
      return 'portrait orientation, 4:5 aspect ratio, taller than wide'
    } else if (aspectRatio === '1:1') {
      return 'square composition, 1:1 aspect ratio'
    }
    return ''
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

export const nanoBanana = new NanoBananaAdapter()

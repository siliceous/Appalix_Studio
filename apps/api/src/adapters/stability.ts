import { config } from '../config.js'

export interface StabilityGenerationParams {
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

export interface StabilityGenerationResponse {
  result: {
    requestId: string
  }
}

export interface StabilityJobStatusResponse {
  images: Array<{
    base64: string
    finishReason?: string
  }>
  result?: {
    requestId: string
  }
}

class StabilityAdapter {
  private apiKey: string
  private baseUrl = 'https://api.stability.ai/v2beta'
  private generatedImages: Map<string, string> = new Map() // Store generated image data URLs

  constructor() {
    this.apiKey = config.STABILITY_API_KEY || ''
    if (!this.apiKey) {
      console.warn('[Stability] API key not configured. Image generation will fail.')
    }
  }

  async generateImage(params: StabilityGenerationParams): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Stability API key not configured')
    }

    const dimensions = this.getAspectRatioDimensions(params.aspectRatio)
    const aspectRatioPrompt = this.buildAspectRatioPrompt(params.aspectRatio)
    const basePrompt = this.buildPrompt(params.prompt, params.style, params.lighting, params.resolution)
    const prompt = aspectRatioPrompt ? `${aspectRatioPrompt}. ${basePrompt}` : basePrompt

    // Build FormData for multipart/form-data request
    const formData = new FormData()
    formData.append('prompt', prompt)
    if (params.negativePrompt) {
      formData.append('negative_prompt', params.negativePrompt)
    }
    formData.append('aspect_ratio', params.aspectRatio || '1:1')
    formData.append('output_format', 'png')
    formData.append('model', params.modelId || 'sd3-large-turbo')

    console.log('[Stability] Sending generation request with prompt:', prompt)

    const response = await fetch(`${this.baseUrl}/stable-image/generate/sd3`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'image/*',
      },
      body: formData as any,
    })

    console.log(`[Stability] Response status: ${response.status}`)

    if (!response.ok) {
      const responseText = await response.text()
      console.error(`[Stability] Error response: ${responseText.substring(0, 200)}`)
      throw new Error(`Stability API error: ${response.status} - ${responseText.substring(0, 100)}`)
    }

    // Response is the image as PNG binary
    const imageBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64Image}`

    // Store the image data URL with a job ID
    const jobId = `stability-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.generatedImages.set(jobId, dataUrl)

    console.log('[Stability] Generated image stored with ID:', jobId)
    return jobId
  }

  async getGenerationStatus(jobId: string): Promise<{
    status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
    imageUrls: string[]
  }> {
    if (!jobId.startsWith('stability-')) {
      return {
        status: 'FAILED',
        imageUrls: [],
      }
    }

    // Check if we have the generated image stored
    const storedImage = this.generatedImages.get(jobId)

    if (storedImage) {
      console.log('[Stability] Returning stored image for job:', jobId)
      return {
        status: 'COMPLETE',
        imageUrls: [storedImage],
      }
    }

    // Image should be ready immediately since we generate synchronously
    // If not found, it failed
    console.log('[Stability] Image not found for job:', jobId)
    return {
      status: 'FAILED',
      imageUrls: [],
    }
  }

  async getAvailableModels(): Promise<Array<{ id: string; name: string }>> {
    // Real working image generation models
    return [
      // Nano Banana (using Gemini models)
      {
        id: 'nano-banana-pro',
        name: 'Nano Banana Pro',
      },
      {
        id: 'nano-banana-2',
        name: 'Nano Banana 2',
      },
      {
        id: 'nano-banana',
        name: 'Nano Banana',
      },
      // Stability AI - Stable Diffusion 3.5
      {
        id: 'sd3.5-large-turbo',
        name: 'Stable Diffusion 3.5 Large Turbo',
      },
      {
        id: 'sd3.5-large',
        name: 'Stable Diffusion 3.5 Large',
      },
      {
        id: 'sd3.5-medium',
        name: 'Stable Diffusion 3.5 Medium',
      },
      // Google Gemini
      {
        id: 'gemini-3.1-flash-image',
        name: 'Gemini 3.1 Flash Image',
      },
      // Seedence
      {
        id: 'seedence-2',
        name: 'Seedence 2',
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
        '3D': '3D render, 3D modeling, volumetric lighting, octane render quality',
        'Digital Painting': 'digital painting, brushwork, digital art, paint texture',
        'Sketch': 'pencil sketch, line drawing, charcoal sketch, detailed linework',
        'Comic Book': 'comic book art, comic style, speech bubbles, bold outlines, vibrant colors',
        'Game Art': 'video game art, game engine graphics, stylized game character',
        'Pixel Art': 'pixel art, 8-bit, retro pixel, pixelated art',
        'Low Poly': 'low poly art, geometric shapes, faceted 3D, minimalist geometry',
        'Isometric': 'isometric view, isometric art, isometric perspective, technical illustration',
        'Cartoon': 'cartoon style, animated, cel animation, family-friendly',
        'Storybook': 'storybook illustration, children\'s book art, whimsical, colorful',
        'Gothic': 'gothic style, dark gothic, gothic architecture, mysterious',
        'Cyberpunk': 'cyberpunk aesthetic, neon lights, futuristic, dystopian',
        'Steampunk': 'steampunk style, Victorian machinery, brass gears, industrial',
        'Art Deco': 'art deco style, geometric patterns, luxury, 1920s design',
        'Retro': 'retro style, vintage aesthetic, nostalgic, 70s design',
        'Vintage': 'vintage photograph, aged film, antique, faded colors',
        'Renaissance': 'renaissance art, classical painting, renaissance master, fine art',
        'Baroque': 'baroque art, ornate, dramatic lighting, rich colors',
        'Impressionist': 'impressionist painting, impressionism, brushstroke texture, light study',
        'Surreal': 'surreal art, surrealism, dreamlike, impossible geometry',
        'Minimalist': 'minimalist art, simple forms, minimalism, clean composition',
        'Street Art': 'street art, mural art, graffiti style, urban art',
        'Graffiti': 'graffiti art, spray paint, street graffiti, tagging style',
        'Marble Sculpture': 'marble sculpture, classical sculpture, carved marble, white stone',
        'Paper Cut': 'paper cut art, paper sculpture, layered paper, intricate cutwork',
        'Mosaic': 'mosaic art, tile mosaic, mosaic pattern, colored tiles',
        'Stained Glass': 'stained glass art, stained glass window, glass mosaic, colored glass',
        'Neon': 'neon art, neon glow, glowing neon signs, neon aesthetic',
        'Holographic': 'holographic art, iridescent, hologram effect, chromatic',
        'Glamour': 'glamour photography, luxury, high fashion, elegant',
        'Fashion': 'fashion illustration, designer fashion, haute couture, runway',
        'Anatomical': 'anatomical drawing, medical illustration, scientific illustration',
        'Blueprint': 'blueprint style, technical blueprint, engineering drawing, schematic',
        'Technical Drawing': 'technical drawing, architectural drawing, mechanical blueprint, CAD style',
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

export const stability = new StabilityAdapter()

import { config } from '../config.js'

export interface SeedenceGenerationParams {
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

class SeedenceAdapter {
  private apiKey: string
  private baseUrl = 'https://api.seedence.io'
  private generatedImages: Map<string, string[]> = new Map()

  constructor() {
    this.apiKey = config.SEEDENCE_API_KEY || ''
    if (!this.apiKey) {
      console.warn('[Seedence] API key not configured. Image generation will fail.')
    }
  }

  async generateImage(params: SeedenceGenerationParams): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Seedence API key not configured')
    }

    const prompt = this.buildPrompt(params.prompt, params.style, params.lighting, params.resolution)

    const payload = {
      prompt: prompt,
      negative_prompt: params.negativePrompt || '',
      number_of_images: params.numImages || 1,
      aspect_ratio: params.aspectRatio || '1:1',
    }

    console.log('[Seedence] Sending generation request:', {
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      numImages: params.numImages,
    })

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log(`[Seedence] Response status: ${response.status}`)

    if (!response.ok) {
      console.error(`[Seedence] Error response: ${responseText.substring(0, 200)}`)
      throw new Error(`Seedence API error: ${response.status} - ${responseText.substring(0, 100)}`)
    }

    const data = JSON.parse(responseText) as any

    // Extract image data from response
    // Seedence returns images in various formats, handle them
    let imageUrls: string[] = []

    // Handle direct image URLs
    if (data.images && Array.isArray(data.images)) {
      imageUrls = data.images.map((img: any) => {
        if (typeof img === 'string') return img
        if (img.url) return img.url
        if (img.data) return `data:image/png;base64,${img.data}`
        return null
      }).filter((url: string | null) => url !== null)
    }

    // Handle base64 encoded images
    if (data.data && Array.isArray(data.data)) {
      imageUrls = data.data.map((base64: string) => `data:image/png;base64,${base64}`)
    }

    // Handle single image response
    if (data.url) {
      imageUrls = [data.url]
    }

    if (data.data && typeof data.data === 'string') {
      imageUrls = [`data:image/png;base64,${data.data}`]
    }

    if (imageUrls.length === 0) {
      console.error('[Seedence] No images found in response. Full response:', JSON.stringify(data).substring(0, 500))
      throw new Error('No images returned from Seedence API')
    }

    // Store the images with a job ID
    const jobId = `seedence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.generatedImages.set(jobId, imageUrls)

    console.log('[Seedence] Generated', imageUrls.length, 'images with ID:', jobId)
    return jobId
  }

  async getGenerationStatus(jobId: string): Promise<{
    status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
    imageUrls: string[]
  }> {
    if (!jobId.startsWith('seedence-')) {
      return {
        status: 'FAILED',
        imageUrls: [],
      }
    }

    // Check if we have the generated images stored
    const storedImages = this.generatedImages.get(jobId)

    if (storedImages) {
      console.log('[Seedence] Returning stored images for job:', jobId)
      return {
        status: 'COMPLETE',
        imageUrls: storedImages,
      }
    }

    // Images should be ready immediately since we generate synchronously
    // If not found, it failed
    console.log('[Seedence] Images not found for job:', jobId)
    return {
      status: 'FAILED',
      imageUrls: [],
    }
  }

  async getAvailableModels(): Promise<Array<{ id: string; name: string }>> {
    // Seedence models
    return [
      {
        id: 'seedence-2.0',
        name: 'Seedence 2.0',
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
}

export const seedence = new SeedenceAdapter()

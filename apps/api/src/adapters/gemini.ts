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
  resolution?: string
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

    const prompt = this.buildPrompt(params.prompt, params.style, params.lighting, params.aspectRatio, params.resolution)
    const numImages = params.numImages || 1

    // Gemini API only generates 1 image per request, so we need to make multiple requests
    const allImageUrls: string[] = []
    console.log(`[Gemini] Generating ${numImages} image(s)`)

    for (let i = 0; i < numImages; i++) {
      try {
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

        console.log(`[Gemini] Sending image generation request ${i + 1}/${numImages}`)

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
                console.log(`[Gemini] Found image ${i + 1}/${numImages} in inlineData`)
              }
            }
          }
        }

        // Small delay between requests to avoid rate limiting
        if (i < numImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`[Gemini] Error generating image ${i + 1}:`, error)
        // Continue with other images even if one fails
      }
    }

    if (allImageUrls.length === 0) {
      throw new Error('No images returned from Gemini API')
    }

    // Store the images with a job ID
    const jobId = `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.generatedImages.set(jobId, allImageUrls)

    console.log('[Gemini] Generated', allImageUrls.length, 'image(s) with ID:', jobId)
    return jobId
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

  private buildPrompt(userPrompt: string, style?: string, lighting?: string, aspectRatio?: string, resolution?: string): string {
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

    // Add style if specified
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

    // Add aspect ratio guidance - be explicit
    if (aspectRatio === '16:9') {
      fullPrompt = `wide landscape format, 16:9 horizontal orientation. ${fullPrompt}`
    } else if (aspectRatio === '9:16') {
      fullPrompt = `tall portrait format, 9:16 vertical orientation, taller than wide. ${fullPrompt}`
    } else if (aspectRatio === '4:5') {
      fullPrompt = `portrait orientation, 4:5 aspect ratio, taller than wide. ${fullPrompt}`
    } else if (aspectRatio === '1:1') {
      fullPrompt = `square composition, 1:1 aspect ratio. ${fullPrompt}`
    }

    return fullPrompt
  }
}

export const gemini = new GeminiAdapter()

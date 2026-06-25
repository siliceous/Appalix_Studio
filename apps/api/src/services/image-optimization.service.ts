import sharp from 'sharp'
import { supabase } from '../lib/supabase.js'
import { v4 as uuid } from 'uuid'

/**
 * Image Optimization Service
 * Handles:
 * 1. Base64 -> WebP compression (30-50% smaller)
 * 2. Upload to Supabase Storage
 * 3. Return signed URL for database storage
 */

interface OptimizeResult {
  url: string // Signed URL for display
  storageKey: string // Path in bucket
  sizeBytes: number
  format: 'webp'
}

class ImageOptimizationService {
  private bucket = 'ai-image-generations'

  /**
   * Convert base64 image to WebP and upload to Supabase Storage
   */
  async optimizeAndStore(
    base64Image: string,
    workspaceId: string,
    generationId: string,
    imageIndex: number = 0
  ): Promise<OptimizeResult> {
    try {
      console.log(`[Image Optimization] Processing image ${imageIndex} for generation ${generationId}`)

      // Extract base64 data and mime type
      const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        throw new Error('Invalid base64 image format')
      }

      const mimeType = matches[1]
      const base64Data = matches[2]

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64')
      console.log(`[Image Optimization] Original size: ${(imageBuffer.length / 1024).toFixed(2)}KB (${mimeType})`)

      // Compress to WebP with high quality
      const webpBuffer = await sharp(imageBuffer)
        .webp({ quality: 88 }) // 88 = near-lossless quality
        .toBuffer()

      const compressionRatio = (1 - webpBuffer.length / imageBuffer.length) * 100
      console.log(
        `[Image Optimization] Compressed to WebP: ${(webpBuffer.length / 1024).toFixed(2)}KB (${compressionRatio.toFixed(1)}% reduction)`
      )

      // Upload to Supabase Storage
      const storageKey = `${workspaceId}/${generationId}/${imageIndex}-${uuid()}.webp`
      console.log(`[Image Optimization] Uploading to Supabase: ${storageKey}`)

      const { data, error } = await supabase.storage.from(this.bucket).upload(storageKey, webpBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000', // 1 year cache
      })

      if (error) {
        console.error('[Image Optimization] Upload error:', error)
        throw new Error(`Failed to upload image: ${error.message}`)
      }

      // Get signed URL (valid for 1 year)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(this.bucket)
        .createSignedUrl(storageKey, 31536000) // 1 year

      if (signedUrlError) {
        console.error('[Image Optimization] Signed URL error:', signedUrlError)
        throw new Error(`Failed to create signed URL: ${signedUrlError.message}`)
      }

      const signedUrl = signedUrlData.signedUrl

      console.log(`[Image Optimization] Success! WebP uploaded and signed URL generated`)
      console.log(`[Image Optimization] URL preview: ${signedUrl.substring(0, 80)}...`)

      return {
        url: signedUrl,
        storageKey,
        sizeBytes: webpBuffer.length,
        format: 'webp',
      }
    } catch (error) {
      console.error('[Image Optimization] Error:', error)
      throw error
    }
  }

  /**
   * Batch optimize multiple images
   */
  async optimizeAndStoreMultiple(
    base64Images: string[],
    workspaceId: string,
    generationId: string
  ): Promise<OptimizeResult[]> {
    const results: OptimizeResult[] = []

    for (let i = 0; i < base64Images.length; i++) {
      try {
        const result = await this.optimizeAndStore(base64Images[i], workspaceId, generationId, i)
        results.push(result)
      } catch (error) {
        console.error(`[Image Optimization] Failed to optimize image ${i}:`, error)
        // Continue with other images
      }
    }

    return results
  }

  /**
   * Delete image from storage
   */
  async deleteImage(storageKey: string): Promise<void> {
    try {
      console.log(`[Image Optimization] Deleting: ${storageKey}`)
      const { error } = await supabase.storage.from(this.bucket).remove([storageKey])

      if (error) {
        console.error('[Image Optimization] Delete error:', error)
        throw error
      }

      console.log('[Image Optimization] Delete successful')
    } catch (error) {
      console.error('[Image Optimization] Error deleting image:', error)
      throw error
    }
  }

  /**
   * Get image URL from storage key
   */
  async getSignedUrl(storageKey: string, expiresIn: number = 31536000): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }
}

export const imageOptimization = new ImageOptimizationService()

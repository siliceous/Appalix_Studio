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
  url: string // Public URL (permanent, never expires)
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

      // Generate permanent public URL (never expires, no signing needed)
      const supabaseUrl = process.env.SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL environment variable not set')
      }

      // Extract project ID from Supabase URL (https://projectid.supabase.co)
      const projectId = supabaseUrl.split('//')[1].split('.')[0]
      const publicUrl = `https://${projectId}.supabase.co/storage/v1/object/public/${this.bucket}/${storageKey}`

      console.log(`[Image Optimization] Success! WebP uploaded with permanent public URL`)
      console.log(`[Image Optimization] URL preview: ${publicUrl.substring(0, 80)}...`)

      return {
        url: publicUrl,
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
   * Get image URL from storage key (generates public URL - no expiration)
   */
  getPublicUrl(storageKey: string): string {
    const supabaseUrl = process.env.SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable not set')
    }
    // Extract project ID from Supabase URL (https://projectid.supabase.co)
    const projectId = supabaseUrl.split('//')[1].split('.')[0]
    return `https://${projectId}.supabase.co/storage/v1/object/public/${this.bucket}/${storageKey}`
  }
}

export const imageOptimization = new ImageOptimizationService()

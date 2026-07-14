import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../../lib/supabase.js'
import { stability } from '../../adapters/stability.js'
import { gemini } from '../../adapters/gemini.js'
import { nanoBanana } from '../../adapters/nano-banana.js'
import { seedence } from '../../adapters/seedence.js'
import { imageOptimization } from '../../services/image-optimization.service.js'
import { v4 as uuid } from 'uuid'

interface ImageGenerationRequest {
  prompt: string
  negativePrompt?: string
  style?: string
  lighting?: string
  aspectRatio?: string
  model: string
  quantity: number
  referenceImage?: string
  temperature?: number
  resolution?: string // 720, 1080, 2k, 4k
}

async function checkStorageQuota(workspaceId: string, estimatedNewSizeBytes: number): Promise<{ allowed: boolean; error?: string }> {
  try {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('storage_limit_bytes, extra_storage_gb')
      .eq('id', workspaceId)
      .single()

    if (!workspace || workspace.storage_limit_bytes === null) {
      // Enterprise (unlimited) or workspace not found
      return { allowed: true }
    }

    const limitBytes = workspace.storage_limit_bytes + (workspace.extra_storage_gb ?? 0) * 10 * 1024 * 1024 * 1024

    // Sum storage used by all images and videos in workspace
    const { data: imageUsage } = await supabase
      .from('ai_image_generations')
      .select('compressed_size_bytes')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')

    const { data: videoUsage } = await supabase
      .from('ai_video_generations')
      .select('file_size_bytes')
      .eq('workspace_id', workspaceId)
      .in('status', ['completed', 'ready'])

    const { data: sourceUsage } = await supabase
      .from('sources')
      .select('file_size_bytes')
      .eq('workspace_id', workspaceId)
      .not('file_size_bytes', 'is', null)

    const usedBytes =
      (imageUsage ?? []).reduce((sum: number, row: any) => sum + (row.compressed_size_bytes ?? 0), 0) +
      (videoUsage ?? []).reduce((sum: number, row: any) => sum + (row.file_size_bytes ?? 0), 0) +
      (sourceUsage ?? []).reduce((sum: number, row: any) => sum + (row.file_size_bytes ?? 0), 0)

    if (usedBytes + estimatedNewSizeBytes > limitBytes) {
      const limitGb = (limitBytes / (1024 ** 3)).toFixed(0)
      const usedMb = (usedBytes / (1024 ** 2)).toFixed(1)
      return {
        allowed: false,
        error: `Storage limit reached (${usedMb} MB used of ${limitGb} GB). Purchase extra storage in Settings → Upgrade.`,
      }
    }

    return { allowed: true }
  } catch (err) {
    console.error('[Storage Quota] Error checking quota:', err)
    // On error, allow generation but log it
    return { allowed: true }
  }
}

export async function imageRoutes(app: FastifyInstance) {
  // Get available models
  app.get('/models/image', async (request, reply) => {
    try {
      console.log('[Image Models] Fetching available models...')
      const models = await stability.getAvailableModels()
      console.log('[Image Models] Models fetched:', models?.length || 0)

      if (!models || models.length === 0) {
        console.warn('[Image Models] No models available')
        return reply.status(200).send({
          models: [],
          message: 'No models available. Check Stability API configuration.',
        })
      }

      console.log('[Image Models] Returning models:', models.map(m => m.id))
      return reply.send({ models })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : ''
      console.error('[Image Models] Error:', errorMsg)
      console.error('[Image Models] Stack:', errorStack)
      console.error('[Image Models] Full error object:', error)
      return reply.status(500).send({ error: 'Failed to fetch models', details: errorMsg })
    }
  })

  // Generate image
  app.post<{ Body: ImageGenerationRequest }>('/generate/image', async (request, reply) => {
    try {
      let { prompt, style, lighting, aspectRatio, model, quantity, negativePrompt, temperature, resolution } = request.body
      const workspaceId = request.headers['x-workspace-id'] as string

      console.log('[Image Generation] POST /generate/image called with prompt:', prompt.substring(0, 50), 'quantity:', quantity)

      if (!workspaceId) {
        return reply.status(400).send({ error: 'Missing workspace ID' })
      }

      if (!prompt?.trim()) {
        return reply.status(400).send({ error: 'Prompt is required' })
      }

      // Sanitize prompt for Stability API's strict content filter
      // Only sanitize explicit terms, not body type descriptors
      const sanitizePrompt = (p: string): string => {
        let sanitized = p
          // Only replace standalone explicit terms, not body type phrases
          .replace(/\bbikini\b/gi, 'swimwear')
          .replace(/\bg string\b/gi, 'swimwear')
          .replace(/\bno shirt\b/gi, 'shirtless')
          .replace(/\bstring bikini\b/gi, 'swimwear')
          .replace(/\bnude\b/gi, 'bare')
          .replace(/\bnaked\b/gi, 'undressed')
        return sanitized
      }

      prompt = sanitizePrompt(prompt)

      // Check workspace has Leonardo API configured
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .single()

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' })
      }

      // Estimate storage needed (average 300KB per image, conservative estimate)
      const estimatedSizePerImage = 300 * 1024
      const estimatedTotalSize = estimatedSizePerImage * quantity
      const quotaCheck = await checkStorageQuota(workspaceId, estimatedTotalSize)
      if (!quotaCheck.allowed) {
        return reply.status(507).send({ error: quotaCheck.error })
      }

      // Create generation record with unique constraint on (workspace_id, prompt, created_at)
      // to prevent duplicate generations from the same request
      const createdAt = new Date().toISOString()
      const { data: generation, error: insertError } = await (supabase
        .from('ai_image_generations')
        .insert({
          workspace_id: workspaceId,
          prompt,
          negative_prompt: negativePrompt,
          style,
          aspect_ratio: aspectRatio,
          model,
          quantity,
          status: 'queued',
          provider: 'leonardo',
          created_at: createdAt,
        } as any)
        .select() as any)

      if (insertError || !generation || generation.length === 0) {
        console.error('[Image Generation] DB insert error:', insertError)
        return reply.status(500).send({ error: 'Failed to create generation record' })
      }

      const generationId = generation[0].id
      console.log('[Image Generation] Created generation record:', generationId, 'at', createdAt)

      // Determine provider based on model ID
      const isGeminiModel = model?.startsWith('gemini-')
      const isNanoBananaModel = model?.startsWith('nano-banana')
      const isSeedenceModel = model?.startsWith('seedence-')
      let provider = 'stability' // default

      if (isGeminiModel) {
        provider = 'gemini'
      } else if (isNanoBananaModel) {
        provider = 'nano-banana'
      } else if (isSeedenceModel) {
        provider = 'seedence'
      }

      let jobId: string

      try {
        if (isGeminiModel) {
          console.log('[Image Generation] Calling Gemini for generation:', generationId)
          jobId = await gemini.generateImage({
            prompt,
            negativePrompt,
            style,
            lighting,
            aspectRatio,
            temperature,
            numImages: quantity,
            modelId: model,
          })
          console.log('[Image Generation] Gemini job created:', jobId)
        } else if (isNanoBananaModel) {
          console.log('[Image Generation] Calling Nano Banana (Gemini 3 Pro Image) for generation:', generationId)
          jobId = await nanoBanana.generateImage({
            prompt,
            negativePrompt,
            style,
            lighting,
            aspectRatio,
            temperature,
            numImages: quantity,
            modelId: model,
          })
          console.log('[Image Generation] Nano Banana job created:', jobId)
        } else if (isSeedenceModel) {
          console.log('[Image Generation] Calling Seedence for generation:', generationId)
          jobId = await seedence.generateImage({
            prompt,
            negativePrompt,
            style,
            lighting,
            aspectRatio,
            temperature,
            numImages: quantity,
            modelId: model,
          })
          console.log('[Image Generation] Seedence job created:', jobId)
        } else {
          // Default to Stability API for all other models
          console.log('[Image Generation] Calling Stability AI for generation:', generationId, 'model:', model)

          jobId = await stability.generateImage({
            prompt,
            negativePrompt,
            style,
            lighting,
            aspectRatio,
            temperature,
            numImages: quantity,
            modelId: model || 'sd3.5-large-turbo',
          })
          console.log('[Image Generation] Stability AI job created:', jobId)
        }

        // Update generation record with job ID
        await (supabase
          .from('ai_image_generations')
          .update({
            provider_job_id: jobId,
            status: 'processing',
            provider: provider,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', generationId) as any)

        return reply.send({
          id: generationId,
          status: 'processing',
          outputUrl: '',
          type: 'image',
          createdAt: new Date().toISOString(),
          estimatedCredits: 10 * quantity,
          aspectRatio: aspectRatio,
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('[Image Generation] Error:', errorMsg)
        await (supabase.from('ai_image_generations').update({ status: 'failed' } as any).eq('id', generationId) as any)
        return reply.status(500).send({ error: `Image generation failed: ${errorMsg}` })
      }
    } catch (error) {
      console.error('[Image Generation] Unexpected error:', error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get generation status
  app.get<{ Params: { id: string } }>('/generations/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const workspaceId = request.headers['x-workspace-id'] as string

      if (!workspaceId) {
        return reply.status(400).send({ error: 'Missing workspace ID' })
      }

      // Get generation record
      const { data: generation, error } = await supabase
        .from('ai_image_generations')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()

      if (error || !generation) {
        return reply.status(404).send({ error: 'Generation not found' })
      }

      // If already completed, return cached result
      if (generation.status === 'completed' || generation.status === 'failed') {
        const imageUrls = generation.output_urls ? JSON.parse(generation.output_urls) : []
        return reply.send({
          id: generation.id,
          status: generation.status,
          outputUrl: generation.output_url || '',
          imageUrls: imageUrls.length > 0 ? imageUrls : [generation.output_url || ''],
          type: 'image',
          createdAt: generation.created_at,
          estimatedCredits: generation.quantity * 10,
        })
      }

      // Poll Leonardo for status
      if (!generation.provider_job_id) {
        return reply.send({
          id: generation.id,
          status: 'processing',
          outputUrl: '',
          type: 'image',
          createdAt: generation.created_at,
          estimatedCredits: generation.quantity * 10,
        })
      }

      try {
        let status: any

        if (generation.provider === 'gemini') {
          // Poll Gemini
          console.log('[Image Generation] Polling Gemini for job:', generation.provider_job_id)
          status = await gemini.getGenerationStatus(generation.provider_job_id)
          console.log('[Image Generation] Gemini status:', status.status, 'Images:', status.imageUrls.length)
        } else if (generation.provider === 'nano-banana') {
          // Poll Nano Banana
          console.log('[Image Generation] Polling Nano Banana for job:', generation.provider_job_id)
          status = await nanoBanana.getGenerationStatus(generation.provider_job_id)
          console.log('[Image Generation] Nano Banana status:', status.status, 'Images:', status.imageUrls.length)
        } else if (generation.provider === 'seedence') {
          // Poll Seedence
          console.log('[Image Generation] Polling Seedence for job:', generation.provider_job_id)
          status = await seedence.getGenerationStatus(generation.provider_job_id)
          console.log('[Image Generation] Seedence status:', status.status, 'Images:', status.imageUrls.length)
        } else {
          // Poll Stability AI
          console.log('[Image Generation] Polling Stability AI for job:', generation.provider_job_id)
          status = await stability.getGenerationStatus(generation.provider_job_id)
          console.log('[Image Generation] Stability status:', status.status, 'Images:', status.imageUrls.length)
        }

        // Update database if complete
        if (status.status === 'COMPLETE' && status.imageUrls.length > 0) {
          console.log('[Image Generation] Generation complete, optimizing and storing images...')

          try {
            // Optimize images: Convert to WebP and upload to Supabase Storage
            const optimizedImages = await imageOptimization.optimizeAndStoreMultiple(
              status.imageUrls,
              workspaceId,
              id
            )

            console.log(`[Image Generation] Optimized ${optimizedImages.length} images`)

            // Get signed URLs for frontend display
            const signedUrls = optimizedImages.map(img => img.url)

            // Store metadata in database (not the actual image data)
            await supabase
              .from('ai_image_generations')
              .update({
                status: 'completed',
                output_url: signedUrls[0], // First image URL
                output_urls: JSON.stringify(signedUrls), // All image URLs
                storage_keys: JSON.stringify(optimizedImages.map(img => ({ key: img.storageKey, size: img.sizeBytes }))),
                image_format: 'webp',
                compressed_size_bytes: optimizedImages.reduce((sum, img) => sum + img.sizeBytes, 0),
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)

            return reply.send({
              id: generation.id,
              status: 'completed',
              outputUrl: signedUrls[0],
              imageUrls: signedUrls,
              type: 'image',
              createdAt: generation.created_at,
              estimatedCredits: generation.quantity * 10,
            })
          } catch (optimizationError) {
            console.error('[Image Generation] Optimization failed:', optimizationError)
            // Fallback: Store original base64 images directly (most reliable)
            const originalUrls = status.imageUrls // These are base64 data URLs from the API

            await supabase
              .from('ai_image_generations')
              .update({
                status: 'completed',
                output_url: originalUrls[0],
                output_urls: JSON.stringify(originalUrls),
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)

            console.log('[Image Generation] Stored original base64 images, count:', originalUrls.length)

            return reply.send({
              id: generation.id,
              status: 'completed',
              outputUrl: originalUrls[0],
              imageUrls: originalUrls,
              type: 'image',
              createdAt: generation.created_at,
              estimatedCredits: generation.quantity * 10,
            })
          }
        }

        if (status.status === 'FAILED') {
          await supabase.from('ai_image_generations').update({ status: 'failed' }).eq('id', id)
          return reply.send({
            id: generation.id,
            status: 'failed',
            outputUrl: '',
            type: 'image',
            createdAt: generation.created_at,
            estimatedCredits: generation.quantity * 10,
          })
        }

        // Still processing
        return reply.send({
          id: generation.id,
          status: 'processing',
          outputUrl: '',
          type: 'image',
          createdAt: generation.created_at,
          estimatedCredits: generation.quantity * 10,
        })
      } catch (error) {
        console.error('[Image Generation] Polling error:', error)
        // If polling fails, return processing status (will retry)
        return reply.send({
          id: generation.id,
          status: 'processing',
          outputUrl: '',
          type: 'image',
          createdAt: generation.created_at,
          estimatedCredits: generation.quantity * 10,
        })
      }
    } catch (error) {
      console.error('[Image Generation] Status endpoint error:', error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get all completed images for a workspace
  app.get('/all-images', async (request, reply) => {
    try {
      const workspaceId = request.headers['x-workspace-id'] as string

      if (!workspaceId) {
        return reply.status(400).send({ error: 'Missing workspace ID' })
      }

      // Fetch all completed image generations
      const { data: allGenerations, error } = await supabase
        .from('ai_image_generations')
        .select('id, prompt, created_at, output_url, output_urls, storage_keys, status, quantity, aspect_ratio')
        .eq('workspace_id', workspaceId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1000)

      // Deduplicate by ID - keep only first occurrence
      const seen = new Map<string, any>()
      const generations = (allGenerations || []).filter((gen: any) => {
        if (seen.has(gen.id)) {
          console.log('[Image Generation] Duplicate found - filtering:', gen.id)
          return false
        }
        seen.set(gen.id, true)
        return true
      })

      if (error) {
        console.error('[Image Generation] DB error:', error)
        return reply.status(500).send({ error: 'Failed to fetch images' })
      }

      console.log('[Image Generation] Fetched', generations?.length || 0, 'completed generations from DB')
      if (generations && generations.length > 0) {
        console.log('[Image Generation] First generation ID:', generations[0].id, 'Created:', generations[0].created_at)
      }

      // Return each image individually (handle multiple images per generation)
      const images: any[] = []

      for (const gen of generations) {
        let urls: string[] = []

        // Prefer storage_keys (permanent public URLs) over output_urls (may be expired signed URLs)
        if (gen.storage_keys && typeof gen.storage_keys === 'string') {
          try {
            const storageKeysData = JSON.parse(gen.storage_keys)
            if (Array.isArray(storageKeysData) && storageKeysData.length > 0) {
              // Reconstruct public URLs from storage keys
              urls = storageKeysData.map((item: any) => imageOptimization.getPublicUrl(item.key))
              console.log('[Image Generation] Using', urls.length, 'URLs from storage_keys for generation', gen.id)
            }
          } catch (e) {
            console.warn('[Image Generation] Failed to parse storage_keys:', e)
          }
        }

        // Fallback to output_urls if storage_keys not available
        if (urls.length === 0 && gen.output_urls && typeof gen.output_urls === 'string') {
          try {
            const parsed = JSON.parse(gen.output_urls)
            if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].startsWith('data:') || parsed[0].startsWith('http'))) {
              urls = parsed
              console.log('[Image Generation] Using', urls.length, 'URLs from output_urls for generation', gen.id)
            }
          } catch (e) {
            // If parsing fails, try single output_url
          }
        }

        // Fallback to single output_url if it's a valid URL
        if (urls.length === 0 && gen.output_url && (gen.output_url.startsWith('data:') || gen.output_url.startsWith('http'))) {
          urls = [gen.output_url]
          console.log('[Image Generation] Using single output_url for generation', gen.id)
        }

        // Only include images that have valid URLs
        if (urls.length === 0) {
          console.log('[Image Generation] Skipping generation', gen.id, '- no valid URLs')
          continue
        }

        // Create a separate image entry for each URL
        urls.forEach((url: string, idx: number) => {
          images.push({
            id: urls.length > 1 ? `${gen.id}-${idx}` : gen.id,
            prompt: gen.prompt,
            created_at: gen.created_at,
            output_url: url,
            aspect_ratio: gen.aspect_ratio,
            status: gen.status,
          })
        })
      }

      console.log('[Image Generation] Returning', images.length, 'images')
      if (images.length > 0) {
        console.log('[Image Generation] First image URL:', images[0].output_url)
      }
      return reply.send({
        images: images,
        total: images.length,
      })
    } catch (error) {
      console.error('[Image Generation] All images endpoint error:', error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}

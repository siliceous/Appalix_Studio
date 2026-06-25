import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../../lib/supabase.js'
import { stability } from '../../adapters/stability.js'
import { gemini } from '../../adapters/gemini.js'
import { nanoBanana } from '../../adapters/nano-banana.js'
import { seedence } from '../../adapters/seedence.js'
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

export async function imageRoutes(app: FastifyInstance) {
  // Get available models
  app.get('/models/image', async (request, reply) => {
    try {
      const models = await stability.getAvailableModels()

      if (!models || models.length === 0) {
        return reply.status(200).send({
          models: [],
          message: 'No models available. Check Stability API configuration.',
        })
      }

      return reply.send({ models })
    } catch (error) {
      console.error('[Image Models] Error:', error)
      return reply.status(500).send({ error: 'Failed to fetch models' })
    }
  })

  // Generate image
  app.post<{ Body: ImageGenerationRequest }>('/generate/image', async (request, reply) => {
    try {
      const { prompt, style, lighting, aspectRatio, model, quantity, negativePrompt, temperature, resolution } = request.body
      const workspaceId = request.headers['x-workspace-id'] as string

      if (!workspaceId) {
        return reply.status(400).send({ error: 'Missing workspace ID' })
      }

      if (!prompt?.trim()) {
        return reply.status(400).send({ error: 'Prompt is required' })
      }

      // Check workspace has Leonardo API configured
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .single()

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' })
      }

      // Create generation record
      const { data: generation, error: insertError } = await supabase
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
          created_at: new Date().toISOString(),
        })
        .select()

      if (insertError || !generation || generation.length === 0) {
        console.error('[Image Generation] DB insert error:', insertError)
        return reply.status(500).send({ error: 'Failed to create generation record' })
      }

      const generationId = generation[0].id

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
          console.log('[Image Generation] Calling Nano Banana for generation:', generationId)
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
          console.log('[Image Generation] Calling Stability AI for generation:', generationId)
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

        // For immediate adapters, check if we already have images
        // Otherwise, store job ID for polling
        const immediateResults = await (async () => {
          if (isGeminiModel || isNanoBananaModel || isSeedenceModel) {
            // These adapters return immediately with images
            // Check the status right away
            try {
              if (isGeminiModel) {
                const status = await gemini.getGenerationStatus(jobId)
                if (status.status === 'COMPLETE' && status.imageUrls.length > 0) {
                  return status.imageUrls
                }
              } else if (isNanoBananaModel) {
                const status = await nanoBanana.getGenerationStatus(jobId)
                if (status.status === 'COMPLETE' && status.imageUrls.length > 0) {
                  return status.imageUrls
                }
              } else if (isSeedenceModel) {
                const status = await seedence.getGenerationStatus(jobId)
                if (status.status === 'COMPLETE' && status.imageUrls.length > 0) {
                  return status.imageUrls
                }
              }
            } catch (err) {
              console.error('[Image Generation] Error checking immediate results:', err)
            }
          }
          return null
        })()

        // If we got immediate results, save them now
        if (immediateResults && immediateResults.length > 0) {
          await supabase
            .from('ai_image_generations')
            .update({
              status: 'completed',
              output_url: immediateResults[0],
              output_urls: JSON.stringify(immediateResults),
              provider_job_id: jobId,
              provider: provider,
              updated_at: new Date().toISOString(),
            })
            .eq('id', generationId)

          return reply.send({
            id: generationId,
            status: 'completed',
            outputUrl: immediateResults[0],
            imageUrls: immediateResults,
            type: 'image',
            createdAt: new Date().toISOString(),
            estimatedCredits: 10 * quantity,
            aspectRatio: aspectRatio,
          })
        }

        // Otherwise, store job ID for polling
        await supabase
          .from('ai_image_generations')
          .update({
            provider_job_id: jobId,
            status: 'processing',
            provider: provider,
            updated_at: new Date().toISOString(),
          })
          .eq('id', generationId)

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
        await supabase.from('ai_image_generations').update({ status: 'failed' }).eq('id', generationId)
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
          await supabase
            .from('ai_image_generations')
            .update({
              status: 'completed',
              output_url: status.imageUrls[0],
              output_urls: JSON.stringify(status.imageUrls),
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)

          return reply.send({
            id: generation.id,
            status: 'completed',
            outputUrl: status.imageUrls[0],
            imageUrls: status.imageUrls,
            type: 'image',
            createdAt: generation.created_at,
            estimatedCredits: generation.quantity * 10,
          })
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
}

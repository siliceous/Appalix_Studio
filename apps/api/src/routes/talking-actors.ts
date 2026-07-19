import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

let supabase: any

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }
  return supabase
}

export async function talkingActorsRoutes(server: FastifyInstance) {
  /**
   * List all actors for workspace
   */
  server.get<{ Params: { workspaceId: string } }>(
    '/workspace/:workspaceId',
    async (req: FastifyRequest<{ Params: { workspaceId: string } }>, reply: FastifyReply) => {
      try {
        const { workspaceId } = req.params as any
        const sb = getSupabase()

        console.log('[TalkingActors] Fetching actors for workspace:', workspaceId)

        const { data: actors, error } = await sb
          .from('talking_actors')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })

        console.log('[TalkingActors] Query result:', { error: error?.message, count: actors?.length })

        if (error) throw error

        reply.send({
          success: true,
          actors: actors || [],
          count: actors?.length || 0,
        })
      } catch (error) {
        console.error('[TalkingActors] Error fetching actors:', error)
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to fetch actors',
        })
      }
    }
  )

  /**
   * Get single actor
   */
  server.get<{ Params: { actorId: string } }>(
    '/:actorId',
    async (req: FastifyRequest<{ Params: { actorId: string } }>, reply: FastifyReply) => {
      try {
        const { actorId } = req.params as any
        const sb = getSupabase()

        const { data: actor, error } = await sb
          .from('talking_actors')
          .select('*')
          .eq('id', actorId)
          .single()

        if (error) throw error

        reply.send({
          success: true,
          actor,
        })
      } catch (error) {
        reply.status(404).send({
          error: 'Actor not found',
        })
      }
    }
  )

  /**
   * Upload new actor
   */
  server.post<{ Body: { workspaceId: string; actorName: string; uploadType: 'image' | 'video' } }>(
    '/upload',
    async (req: FastifyRequest<{ Body: { workspaceId: string; actorName: string; uploadType: 'image' | 'video' } }>, reply: FastifyReply) => {
      try {
        const data = await (req.file() as any)

        if (!data) {
          return reply.status(400).send({
            error: 'No file provided',
          })
        }

        const { fields } = data
        const workspaceId = (fields as any).workspaceId?.value as string
        const actorName = (fields as any).actorName?.value as string
        const uploadType = (fields as any).uploadType?.value as 'image' | 'video'

        if (!workspaceId || !actorName || !uploadType) {
          return reply.status(400).send({
            error: 'Missing required fields: workspaceId, actorName, uploadType',
          })
        }

        // Validate file
        const buffer = await data.toBuffer()
        const maxSize = uploadType === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024

        if (buffer.length > maxSize) {
          return reply.status(400).send({
            error: `File too large. Max ${uploadType === 'image' ? '10MB' : '100MB'}`,
          })
        }

        // Validate MIME type
        const validMimes =
          uploadType === 'image'
            ? ['image/jpeg', 'image/png', 'image/webp']
            : ['video/mp4', 'video/quicktime', 'video/webm']

        if (!validMimes.includes(data.mimetype)) {
          return reply.status(400).send({
            error: `Invalid ${uploadType} format`,
          })
        }

        // Upload to Supabase Storage
        const fileId = uuidv4()
        const fileExt = data.filename.split('.').pop()
        const filePath = `${workspaceId}/${fileId}.${fileExt}`
        const bucketName = uploadType === 'image' ? 'actor-images' : 'actor-videos'

        const { error: uploadError } = await getSupabase().storage
          .from(bucketName)
          .upload(filePath, buffer, {
            contentType: data.mimetype,
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Get signed URL
        const { data: signedUrlData, error: urlError } = await getSupabase().storage
          .from(bucketName)
          .createSignedUrl(filePath, 365 * 24 * 60 * 60) // 1 year

        if (urlError) throw urlError

        const fileUrl = signedUrlData?.signedUrl

        // Create database record
        const sb = getSupabase()
        const { data: actor, error: dbError } = await sb
          .from('talking_actors')
          .insert({
            workspace_id: workspaceId,
            actor_name: actorName,
            [uploadType === 'image' ? 'image_url' : 'video_url']: fileUrl,
            type: 'custom',
          })
          .select()
          .single()

        if (dbError) throw dbError

        reply.status(201).send({
          success: true,
          actor,
        })
      } catch (error) {
        console.error('Upload error:', error)
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Upload failed',
        })
      }
    }
  )

  /**
   * Update actor
   */
  server.patch<{
    Params: { actorId: string }
    Body: { actorName?: string }
  }>('/:actorId', async (req: FastifyRequest<{
    Params: { actorId: string }
    Body: { actorName?: string }
  }>, reply: FastifyReply) => {
    try {
      const { actorId } = req.params as { actorId: string }
      const { actorName } = req.body as { actorName?: string }
      const sb = getSupabase()

      if (!actorName) {
        return reply.status(400).send({
          error: 'Actor name is required',
        })
      }

      const { data: actor, error } = await sb
        .from('talking_actors')
        .update({
          actor_name: actorName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actorId)
        .select()
        .single()

      if (error) throw error

      reply.send({
        success: true,
        actor,
      })
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : 'Update failed',
      })
    }
  })

  /**
   * Save actor from imported image (no file upload)
   */
  server.post<{ Body: { workspaceId: string; name: string; imageUrl: string; description?: string } }>(
    '/save-actor',
    async (req: FastifyRequest<{ Body: { workspaceId: string; name: string; imageUrl: string; description?: string } }>, reply: FastifyReply) => {
      try {
        const { workspaceId, name, imageUrl, description } = req.body

        console.log('[SaveActor] Request body:', { workspaceId, name, imageUrl: imageUrl?.substring(0, 50) })

        if (!workspaceId || !name || !imageUrl) {
          return reply.status(400).send({
            error: 'Missing required fields: workspaceId, name, imageUrl',
          })
        }

        const sb = getSupabase()
        console.log('[SaveActor] Supabase client initialized')

        const { data: actor, error } = await sb
          .from('talking_actors')
          .insert({
            workspace_id: workspaceId,
            name: name.trim(),
            image_url: imageUrl,
            description: description || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        console.log('[SaveActor] Insert result:', { error, actor: actor?.id })

        if (error) {
          console.error('[SaveActor] Database error:', error)
          throw error
        }

        reply.send({
          success: true,
          actor,
          message: 'Actor saved to database',
        })
      } catch (error) {
        console.error('[SaveActor] Exception:', error)
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to save actor',
        })
      }
    }
  )

  /**
   * Delete actor
   */
  server.delete<{ Params: { actorId: string } }>(
    '/:actorId',
    async (req: FastifyRequest<{ Params: { actorId: string } }>, reply: FastifyReply) => {
      try {
        const { actorId } = req.params as { actorId: string }

        // Get actor to find file paths
        const sb = getSupabase()
        const { data: actor, error: fetchError } = await sb
          .from('talking_actors')
          .select('image_url, video_url')
          .eq('id', actorId)
          .single()

        if (fetchError) throw fetchError

        // Delete files from storage
        if (actor?.image_url) {
          const imagePath = actor.image_url.split('/').slice(-2).join('/')
          await sb.storage.from('actor-images').remove([imagePath])
        }

        if (actor?.video_url) {
          const videoPath = actor.video_url.split('/').slice(-2).join('/')
          await sb.storage.from('actor-videos').remove([videoPath])
        }

        // Delete database record
        const { error: deleteError } = await sb
          .from('talking_actors')
          .delete()
          .eq('id', actorId)

        if (deleteError) throw deleteError

        reply.send({
          success: true,
          message: 'Actor deleted',
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Delete failed',
        })
      }
    }
  )

  /**
   * Get preset actors (available to all workspaces)
   */
  server.get(
    '/presets',
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const sb = getSupabase()
        const { data: actors, error } = await sb
          .from('talking_actors')
          .select('*')
          .eq('is_preset', true)
          .order('created_at', { ascending: false })

        if (error) throw error

        reply.send({
          success: true,
          presets: actors || [],
          count: actors?.length || 0,
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to fetch presets',
        })
      }
    }
  )

  /**
   * Publish actor as preset
   */
  server.post<{ Body: { actorId: string; workspaceId: string } }>(
    '/publish-preset',
    async (req: FastifyRequest<{ Body: { actorId: string; workspaceId: string } }>, reply: FastifyReply) => {
      try {
        const { actorId, workspaceId } = req.body
        const sb = getSupabase()

        console.log('[PublishPreset] Request:', { actorId, workspaceId })

        // Get the actor first (no workspace filter, it should exist)
        const { data: actor, error: actorError } = await sb
          .from('talking_actors')
          .select('*')
          .eq('id', actorId)
          .single()

        console.log('[PublishPreset] Actor lookup:', { error: actorError?.message, found: !!actor })

        if (actorError || !actor) {
          return reply.status(404).send({
            error: `Actor not found: ${actorError?.message || 'unknown'}`,
          })
        }

        // Publish as preset (set is_preset to true)
        const { data: updated, error: updateError } = await sb
          .from('talking_actors')
          .update({
            is_preset: true,
            preset_created_by: workspaceId,
          })
          .eq('id', actorId)
          .select()
          .single()

        console.log('[PublishPreset] Update result:', { error: updateError?.message, updated: !!updated })

        if (updateError) throw updateError

        reply.send({
          success: true,
          message: 'Actor published as preset',
          actor: updated,
        })
      } catch (error) {
        console.error('[PublishPreset] Error:', error)
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to publish preset',
        })
      }
    }
  )

  /**
   * Unpublish actor from presets
   */
  server.post<{ Body: { actorId: string; workspaceId: string } }>(
    '/unpublish-preset',
    async (req: FastifyRequest<{ Body: { actorId: string; workspaceId: string } }>, reply: FastifyReply) => {
      try {
        const { actorId, workspaceId } = req.body
        const sb = getSupabase()

        // Verify this is from info@gorank workspace
        const { data: workspace, error: wsError } = await sb
          .from('workspaces')
          .select('id, owner_email')
          .eq('id', workspaceId)
          .single()

        if (wsError || workspace?.owner_email !== 'info@gorank.com.au') {
          return reply.status(403).send({
            error: 'Only info@gorank.com.au workspace can unpublish presets',
          })
        }

        // Unpublish
        const { error: updateError } = await sb
          .from('talking_actors')
          .update({
            is_preset: false,
            preset_created_by: null,
          })
          .eq('id', actorId)

        if (updateError) throw updateError

        reply.send({
          success: true,
          message: 'Actor unpublished from presets',
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to unpublish preset',
        })
      }
    }
  )

  /**
   * Copy preset actor to workspace
   */
  server.post<{ Body: { presetActorId: string; workspaceId: string; newName?: string } }>(
    '/copy-preset',
    async (req: FastifyRequest<{ Body: { presetActorId: string; workspaceId: string; newName?: string } }>, reply: FastifyReply) => {
      try {
        const { presetActorId, workspaceId, newName } = req.body
        const sb = getSupabase()

        // Get the preset actor
        const { data: presetActor, error: presetError } = await sb
          .from('talking_actors')
          .select('*')
          .eq('id', presetActorId)
          .eq('is_preset', true)
          .single()

        if (presetError || !presetActor) {
          return reply.status(404).send({
            error: 'Preset actor not found',
          })
        }

        // Create a copy in the requesting workspace
        const newActorId = uuidv4()
        const copyName = newName || `${presetActor.name} (Copy)`

        const { error: insertError } = await sb
          .from('talking_actors')
          .insert({
            id: newActorId,
            workspace_id: workspaceId,
            name: copyName,
            image_url: presetActor.image_url,
            video_url: presetActor.video_url,
            description: presetActor.description,
            tags: presetActor.tags,
            preset_source_id: presetActorId, // Track which preset this came from
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (insertError) throw insertError

        reply.send({
          success: true,
          message: 'Preset actor copied to workspace',
          actor_id: newActorId,
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to copy preset',
        })
      }
    }
  )
}

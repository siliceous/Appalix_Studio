import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { getCurrentWorkspaceContext, MASTER_WORKSPACE_ID } from '../lib/workspace-context.js'
import { getActor, getAvailableActors, getWorkspaceActors, getGlobalActors, getMasterWorkspaceIds } from '../lib/tenant-repositories.js'
import { STORAGE_PATHS, generatePublicUrl, deleteStorageObject } from '../lib/storage-isolation.js'

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
   * List all actors available to workspace
   * Returns: workspace's private actors + global master actors
   * SECURITY: Validates user workspace membership before returning data
   */
  server.get<{ Params: { workspaceId: string } }>(
    '/workspace/:workspaceId',
    async (req: FastifyRequest<{ Params: { workspaceId: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const sb = getSupabase()

        // SECURITY: Verify the requested workspace matches authenticated user's workspace
        // (user cannot list actors from other workspaces)
        if (context.workspaceId !== req.params.workspaceId) {
          return reply.status(403).send({
            error: 'Access denied to this workspace',
          })
        }

        console.log('[TalkingActors] Fetching available actors for workspace:', context.workspaceId)

        // Fetch workspace-specific actors AND global master actors
        const actors = await getAvailableActors(context)

        console.log('[TalkingActors] Query result:', { total: actors.length })

        reply.send({
          success: true,
          actors,
          count: actors.length,
        })
      } catch (error) {
        console.error('[TalkingActors] Error fetching actors:', error)
        reply.status(403).send({
          error: error instanceof Error ? error.message : 'Failed to fetch actors',
        })
      }
    }
  )

  /**
   * Get single actor
   * SECURITY: Only returns actors user has access to (private or global)
   */
  server.get<{ Params: { actorId: string } }>(
    '/:actorId',
    async (req: FastifyRequest<{ Params: { actorId: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const { actorId } = req.params as any

        const actor = await getActor(context, actorId)

        reply.send({
          success: true,
          actor,
        })
      } catch (error) {
        reply.status(404).send({
          error: 'Actor not found or access denied',
        })
      }
    }
  )

  /**
   * Upload new actor
   * SECURITY: Validates user can upload to the requested workspace
   */
  server.post<{ Body: { workspaceId: string; actorName: string; uploadType: 'image' | 'video' } }>(
    '/upload',
    async (req: FastifyRequest<{ Body: { workspaceId: string; actorName: string; uploadType: 'image' | 'video' } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const data = await (req.file() as any)

        if (!data) {
          return reply.status(400).send({
            error: 'No file provided',
          })
        }

        const { fields } = data
        const requestedWorkspaceId = (fields as any).workspaceId?.value as string
        const actorName = (fields as any).actorName?.value as string
        const uploadType = (fields as any).uploadType?.value as 'image' | 'video'

        if (!requestedWorkspaceId || !actorName || !uploadType) {
          return reply.status(400).send({
            error: 'Missing required fields: workspaceId, actorName, uploadType',
          })
        }

        // SECURITY: Verify user can upload to this workspace
        if (context.workspaceId !== requestedWorkspaceId) {
          return reply.status(403).send({
            error: 'Cannot upload to other workspaces',
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

        // Upload to Supabase Storage with workspace-scoped path
        const fileId = uuidv4()
        const fileExt = data.filename.split('.').pop()
        const bucketName = uploadType === 'image' ? 'actor-images' : 'actor-videos'

        // SECURITY: Use workspace-scoped path format
        const storagePath = `${STORAGE_PATHS.actorUploads(context.workspaceId)}/${fileId}.${fileExt}`

        const { error: uploadError } = await getSupabase().storage
          .from(bucketName)
          .upload(storagePath, buffer, {
            contentType: data.mimetype,
            cacheControl: '31536000', // 1 year cache
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Generate permanent public URL (stored in database for permanent access)
        const fileUrl = generatePublicUrl(context.workspaceId, bucketName, storagePath)

        // Create database record
        const sb = getSupabase()
        const { data: actor, error: dbError } = await sb
          .from('talking_actors')
          .insert({
            workspace_id: context.workspaceId,
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
   * SECURITY: Only updates actors in user's workspace
   */
  server.patch<{
    Params: { actorId: string }
    Body: { actorName?: string }
  }>('/:actorId', async (req: FastifyRequest<{
    Params: { actorId: string }
    Body: { actorName?: string }
  }>, reply: FastifyReply) => {
    try {
      const context = await getCurrentWorkspaceContext(req)
      const { actorId } = req.params as { actorId: string }
      const { actorName } = req.body as { actorName?: string }
      const sb = getSupabase()

      if (!actorName) {
        return reply.status(400).send({
          error: 'Actor name is required',
        })
      }

      // SECURITY: Verify actor belongs to user's workspace before updating
      const existingActor = await getActor(context, actorId)
      if (!existingActor) {
        return reply.status(404).send({
          error: 'Actor not found or access denied',
        })
      }

      const { data: actor, error } = await sb
        .from('talking_actors')
        .update({
          actor_name: actorName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actorId)
        .eq('workspace_id', context.workspaceId)
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
   * SECURITY: Only saves to user's workspace
   */
  server.post<{ Body: { workspaceId: string; name: string; imageUrl: string; description?: string; aspectRatio?: string } }>(
    '/save-actor',
    async (req: FastifyRequest<{ Body: { workspaceId: string; name: string; imageUrl: string; description?: string; aspectRatio?: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const { workspaceId, name, imageUrl, description, aspectRatio } = req.body

        console.log('[SaveActor] Request body:', { name, imageUrl: imageUrl?.substring(0, 50), aspectRatio })

        if (!name || !imageUrl) {
          return reply.status(400).send({
            error: 'Missing required fields: name, imageUrl',
          })
        }

        // SECURITY: Verify user can save to this workspace
        if (context.workspaceId !== workspaceId) {
          return reply.status(403).send({
            error: 'Cannot save to other workspaces',
          })
        }

        const sb = getSupabase()
        console.log('[SaveActor] Saving actor to workspace:', context.workspaceId)

        const { data: actor, error } = await sb
          .from('talking_actors')
          .insert({
            workspace_id: context.workspaceId,
            name: name.trim(),
            image_url: imageUrl,
            description: description || '',
            aspect_ratio: aspectRatio || '1:1',
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
   * SECURITY: Only deletes actors from user's workspace
   */
  server.delete<{ Params: { actorId: string } }>(
    '/:actorId',
    async (req: FastifyRequest<{ Params: { actorId: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const { actorId } = req.params as { actorId: string }

        // SECURITY: Verify actor belongs to user's workspace before deleting
        const actor = await getActor(context, actorId)
        if (!actor) {
          return reply.status(404).send({
            error: 'Actor not found or access denied',
          })
        }

        // Delete files from storage using workspace-scoped isolation
        if (actor?.image_url) {
          try {
            // Extract storage path from URL
            const urlParts = actor.image_url.split('/').slice(-3).join('/')
            const storagePath = `${STORAGE_PATHS.actorUploads(context.workspaceId)}/${urlParts.split('/').slice(-1)[0]}`
            await deleteStorageObject(context, 'actor-images', storagePath)
          } catch (err) {
            console.warn('[TalkingActors] Failed to delete image from storage:', err)
          }
        }

        if (actor?.video_url) {
          try {
            const urlParts = actor.video_url.split('/').slice(-3).join('/')
            const storagePath = `${STORAGE_PATHS.actorUploads(context.workspaceId)}/${urlParts.split('/').slice(-1)[0]}`
            await deleteStorageObject(context, 'actor-videos', storagePath)
          } catch (err) {
            console.warn('[TalkingActors] Failed to delete video from storage:', err)
          }
        }

        // Delete database record with workspace filter
        const sb = getSupabase()
        const { error: deleteError } = await sb
          .from('talking_actors')
          .delete()
          .eq('id', actorId)
          .eq('workspace_id', context.workspaceId)

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
   * Get global preset actors (available to all workspaces)
   */
  server.get(
    '/presets',
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const masterWorkspaceIds = await getMasterWorkspaceIds()
        const sb = getSupabase()

        const { data: actors, error } = await sb
          .from('talking_actors')
          .select('*')
          .eq('is_global', true)
          .eq('is_active', true)
          .in('workspace_id', masterWorkspaceIds)
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
   * Publish actor as preset (MASTER WORKSPACE ONLY)
   * SECURITY: Only info@gorank.com.au admin can publish presets
   */
  server.post<{ Body: { actorId: string; workspaceId: string } }>(
    '/publish-preset',
    async (req: FastifyRequest<{ Body: { actorId: string; workspaceId: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const { actorId, workspaceId } = req.body
        const sb = getSupabase()

        console.log('[PublishPreset] Request:', { actorId, workspaceId })

        // SECURITY: Only master workspace admins can publish presets
        if (!context.isMasterWorkspace || !context.isAdmin) {
          return reply.status(403).send({
            error: 'Only master workspace admins can publish presets',
          })
        }

        // Verify actor exists and belongs to master workspace
        const { data: actor, error: actorError } = await sb
          .from('talking_actors')
          .select('*')
          .eq('id', actorId)
          .eq('workspace_id', MASTER_WORKSPACE_ID)
          .single()

        console.log('[PublishPreset] Actor lookup:', { error: actorError?.message, found: !!actor })

        if (actorError || !actor) {
          return reply.status(404).send({
            error: `Actor not found in master workspace: ${actorError?.message || 'unknown'}`,
          })
        }

        // Publish as global preset
        const { data: updated, error: updateError } = await sb
          .from('talking_actors')
          .update({
            is_global: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', actorId)
          .eq('workspace_id', MASTER_WORKSPACE_ID)
          .select()
          .single()

        console.log('[PublishPreset] Update result:', { error: updateError?.message, updated: !!updated })

        if (updateError) throw updateError

        reply.send({
          success: true,
          message: 'Actor published as global preset',
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
   * SECURITY: Only copies global actors to user's workspace
   */
  server.post<{ Body: { presetActorId: string; workspaceId: string; newName?: string } }>(
    '/copy-preset',
    async (req: FastifyRequest<{ Body: { presetActorId: string; workspaceId: string; newName?: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const { presetActorId, workspaceId, newName } = req.body
        const sb = getSupabase()

        // SECURITY: Can only copy to user's workspace
        if (context.workspaceId !== workspaceId) {
          return reply.status(403).send({
            error: 'Cannot copy to other workspaces',
          })
        }

        // Get the global preset actor from master workspace
        const { data: presetActor, error: presetError } = await sb
          .from('talking_actors')
          .select('*')
          .eq('id', presetActorId)
          .eq('workspace_id', MASTER_WORKSPACE_ID)
          .eq('is_global', true)
          .single()

        if (presetError || !presetActor) {
          return reply.status(404).send({
            error: 'Preset actor not found',
          })
        }

        // Create a copy in the user's workspace
        const newActorId = uuidv4()
        const copyName = newName || `${presetActor.name} (Copy)`

        const { error: insertError } = await sb
          .from('talking_actors')
          .insert({
            id: newActorId,
            workspace_id: context.workspaceId,
            name: copyName,
            image_url: presetActor.image_url,
            video_url: presetActor.video_url,
            description: presetActor.description,
            tags: presetActor.tags,
            preset_source_id: presetActorId,
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

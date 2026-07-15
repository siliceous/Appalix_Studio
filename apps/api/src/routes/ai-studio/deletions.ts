import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../../lib/supabase.js'

export async function deletionRoutes(app: FastifyInstance) {
  // Mark an image as deleted/trashed
  app.post<{ Body: { image_id: string } }>('/trash-image', async (request, reply) => {
    try {
      const workspaceId = request.headers['x-workspace-id'] as string
      const { image_id } = request.body

      if (!workspaceId) {
        return reply.status(400).send({ error: 'Missing workspace ID' })
      }

      if (!image_id) {
        return reply.status(400).send({ error: 'Missing image_id' })
      }

      // Check if deletion already exists for this image
      const { data: existingDeletion } = await supabase
        .from('ai_image_deletions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('image_id', image_id)
        .single()

      // If deletion already exists, just return success
      if (existingDeletion) {
        console.log('[Image Deletion] Image already marked as deleted:', image_id)
        return reply.send({ success: true, message: 'Image already in trash' })
      }

      // Insert deletion record
      const { error } = await supabase
        .from('ai_image_deletions')
        .insert({
          workspace_id: workspaceId,
          image_id: image_id,
        })

      if (error) {
        console.error('[Image Deletion] Database error:', error)
        return reply.status(500).send({ error: 'Failed to trash image' })
      }

      console.log('[Image Deletion] Image marked as deleted:', image_id)
      return reply.send({ success: true, message: 'Image moved to trash' })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[Image Deletion] Error:', errorMsg)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Restore an image from trash
  app.post<{ Body: { image_id: string } }>('/restore-image', async (request, reply) => {
    try {
      const workspaceId = request.headers['x-workspace-id'] as string
      const { image_id } = request.body

      if (!workspaceId) {
        return reply.status(400).send({ error: 'Missing workspace ID' })
      }

      if (!image_id) {
        return reply.status(400).send({ error: 'Missing image_id' })
      }

      // Delete the deletion record
      const { error } = await supabase
        .from('ai_image_deletions')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('image_id', image_id)

      if (error) {
        console.error('[Image Restoration] Database error:', error)
        return reply.status(500).send({ error: 'Failed to restore image' })
      }

      console.log('[Image Restoration] Image restored from trash:', image_id)
      return reply.send({ success: true, message: 'Image restored from trash' })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[Image Restoration] Error:', errorMsg)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get all deleted image IDs for a workspace
  app.get('/deleted-images', async (request, reply) => {
    try {
      const workspaceId = request.headers['x-workspace-id'] as string

      if (!workspaceId) {
        return reply.status(400).send({ error: 'Missing workspace ID' })
      }

      // Fetch all deletion records for this workspace
      const { data: deletions, error } = await supabase
        .from('ai_image_deletions')
        .select('image_id')
        .eq('workspace_id', workspaceId)

      if (error) {
        console.error('[Image Deletions Fetch] Database error:', error)
        return reply.status(500).send({ error: 'Failed to fetch deleted images' })
      }

      const deletedImageIds = (deletions || []).map((d: any) => d.image_id)
      console.log('[Image Deletions Fetch] Found', deletedImageIds.length, 'deleted images for workspace')

      return reply.send({
        deleted_image_ids: deletedImageIds,
        count: deletedImageIds.length,
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[Image Deletions Fetch] Error:', errorMsg)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Permanently delete a trashed image from database (cleanup)
  app.delete<{ Body: { image_id: string } }>('/permanently-delete', async (request, reply) => {
    try {
      const workspaceId = request.headers['x-workspace-id'] as string
      const { image_id } = request.body

      if (!workspaceId) {
        return reply.status(400).send({ error: 'Missing workspace ID' })
      }

      if (!image_id) {
        return reply.status(400).send({ error: 'Missing image_id' })
      }

      // Delete the deletion record
      const { error } = await supabase
        .from('ai_image_deletions')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('image_id', image_id)

      if (error) {
        console.error('[Permanent Delete] Database error:', error)
        return reply.status(500).send({ error: 'Failed to permanently delete image' })
      }

      console.log('[Permanent Delete] Image record deleted:', image_id)
      return reply.send({ success: true, message: 'Image permanently deleted' })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[Permanent Delete] Error:', errorMsg)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../../lib/supabase.js'
import { ensureDeletionTableExists } from '../../lib/init-deletion-table.js'
import { getCurrentWorkspaceContext } from '../../lib/workspace-context.js'

export async function deletionRoutes(app: FastifyInstance) {
  // Initialize table on startup
  await ensureDeletionTableExists()

  // Mark an image as deleted/trashed
  // SECURITY: Validates user can trash images in this workspace
  app.post<{ Body: { image_id: string } }>('/trash-image', async (request, reply) => {
    try {
      const context = await getCurrentWorkspaceContext(request)
      const { image_id } = request.body

      if (!image_id) {
        return reply.status(400).send({ error: 'Missing image_id' })
      }

      // Check if deletion already exists for this image
      const { data: existingDeletion, error: selectError } = await supabase
        .from('ai_image_deletions')
        .select('id')
        .eq('workspace_id', context.workspaceId)
        .eq('image_id', image_id)
        .single()

      // If table doesn't exist, return 503 to indicate feature unavailable
      if (selectError?.code === 'PGRST205' || selectError?.message?.includes('not found')) {
        console.warn('[Image Deletion] Table not yet created, falling back to client-side deletion tracking')
        return reply.status(202).send({ success: true, message: 'Deletion tracked locally (cross-browser sync unavailable)', warning: 'table_not_found' })
      }

      // If deletion already exists, just return success
      if (existingDeletion) {
        console.log('[Image Deletion] Image already marked as deleted:', image_id)
        return reply.send({ success: true, message: 'Image already in trash' })
      }

      // Insert deletion record
      const { error } = await supabase
        .from('ai_image_deletions')
        .insert({
          workspace_id: context.workspaceId,
          image_id: image_id,
        })

      if (error) {
        // If it's a table-not-found error, return success with warning
        if (error.code === 'PGRST205' || error.message?.includes('not found')) {
          console.warn('[Image Deletion] Deletion table not found, using client-side tracking')
          return reply.status(202).send({ success: true, message: 'Deletion tracked locally (cross-browser sync unavailable)', warning: 'table_not_found' })
        }

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
  // SECURITY: Validates user can restore images in this workspace
  app.post<{ Body: { image_id: string } }>('/restore-image', async (request, reply) => {
    try {
      const context = await getCurrentWorkspaceContext(request)
      const { image_id } = request.body

      if (!image_id) {
        return reply.status(400).send({ error: 'Missing image_id' })
      }

      // Delete the deletion record
      const { error } = await supabase
        .from('ai_image_deletions')
        .delete()
        .eq('workspace_id', context.workspaceId)
        .eq('image_id', image_id)

      // If table doesn't exist, still return success (client already removed from local)
      if (error?.code === 'PGRST205' || error?.message?.includes('not found')) {
        console.warn('[Image Restoration] Table not yet created, but restoration synced locally')
        return reply.status(202).send({ success: true, message: 'Image restored locally (cross-browser sync unavailable)', warning: 'table_not_found' })
      }

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
  // SECURITY: Validates user can view deletions for this workspace
  app.get('/deleted-images', async (request, reply) => {
    try {
      const context = await getCurrentWorkspaceContext(request)

      // Fetch all deletion records for this workspace
      const { data: deletions, error } = await supabase
        .from('ai_image_deletions')
        .select('image_id')
        .eq('workspace_id', context.workspaceId)

      // If table doesn't exist, return empty list (client will use localStorage fallback)
      if (error?.code === 'PGRST205' || error?.message?.includes('not found')) {
        console.warn('[Image Deletions Fetch] Table not yet created, returning empty list')
        return reply.send({
          deleted_image_ids: [],
          count: 0,
          warning: 'table_not_found',
        })
      }

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

  // Schedule permanent deletion of a trashed image (deletion in 3 days)
  // SECURITY: Validates user can permanently delete images in this workspace
  app.post<{ Body: { image_id: string } }>('/permanently-delete', async (request, reply) => {
    try {
      const context = await getCurrentWorkspaceContext(request)
      const { image_id } = request.body

      if (!image_id) {
        return reply.status(400).send({ error: 'Missing image_id' })
      }

      // Schedule deletion in 3 days (72 hours from now)
      const scheduledDeletionTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase
        .from('ai_image_deletions')
        .update({ scheduled_for_deletion_at: scheduledDeletionTime })
        .eq('workspace_id', context.workspaceId)
        .eq('image_id', image_id)

      if (error?.code === 'PGRST205' || error?.message?.includes('not found')) {
        console.warn('[Permanent Delete] Table not found, returning success anyway')
        return reply.status(202).send({ success: true, message: 'Scheduled for deletion in 3 days', warning: 'table_not_found' })
      }

      if (error) {
        console.error('[Permanent Delete] Database error:', error)
        return reply.status(500).send({ error: 'Failed to schedule deletion' })
      }

      console.log('[Permanent Delete] Image scheduled for deletion:', image_id, 'at', scheduledDeletionTime)
      return reply.send({ success: true, message: 'Image scheduled for permanent deletion in 3 days', scheduled_at: scheduledDeletionTime })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[Permanent Delete] Error:', errorMsg)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}

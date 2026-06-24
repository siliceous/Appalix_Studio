import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../../lib/supabase.js'

export async function cleanupRoutes(app: FastifyInstance) {
  // Delete all mock images (SVG data URLs) from a workspace
  app.delete<{ Params: { workspaceId: string } }>('/cleanup/mock-images/:workspaceId', async (request, reply) => {
    try {
      const { workspaceId } = request.params

      if (!workspaceId) {
        return reply.status(400).send({ error: 'Workspace ID required' })
      }

      console.log('[Cleanup] Removing mock images for workspace:', workspaceId)

      // First, fetch all mock images
      const { data: mockImages, error: fetchError } = await supabase
        .from('ai_image_generations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .or("output_url.like.%data:image/svg+xml%,output_urls.like.%data:image/svg+xml%")

      if (fetchError) {
        console.error('[Cleanup] Fetch error:', fetchError)
        return reply.status(500).send({ error: 'Failed to fetch mock images' })
      }

      if (!mockImages || mockImages.length === 0) {
        return reply.send({
          success: true,
          deletedCount: 0,
          message: 'No mock images found',
        })
      }

      // Delete the mock images by ID
      const ids = mockImages.map((img) => img.id)
      const { error: deleteError } = await supabase
        .from('ai_image_generations')
        .delete()
        .in('id', ids)

      if (deleteError) {
        console.error('[Cleanup] Delete error:', deleteError)
        return reply.status(500).send({ error: 'Failed to delete mock images' })
      }

      const deletedCount = ids.length
      console.log('[Cleanup] Deleted', deletedCount, 'mock images')

      return reply.send({
        success: true,
        deletedCount,
        message: `Removed ${deletedCount} mock images`,
      })
    } catch (error) {
      console.error('[Cleanup] Unexpected error:', error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}

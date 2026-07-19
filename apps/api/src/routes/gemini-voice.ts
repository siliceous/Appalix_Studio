import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { geminiVoiceService } from '../services/gemini-voice.service.js'
import { getCurrentWorkspaceContext } from '../lib/workspace-context.js'
import { getActor } from '../lib/tenant-repositories.js'

export async function geminiVoiceRoutes(server: FastifyInstance) {
  /**
   * Get all available Gemini voices (global)
   */
  server.get('/voices/all', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const voices = await geminiVoiceService.listAllGeminiVoices()

      reply.send({
        success: true,
        voices,
        count: voices.length,
      })
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : 'Failed to fetch voices',
      })
    }
  })

  /**
   * Get Gemini voices for workspace
   */
  server.get(
    '/voices/workspace/:workspaceId',
    async (req: FastifyRequest<{ Params: { workspaceId: string } }>, reply: FastifyReply) => {
      try {
        const { workspaceId } = req.params

        const voices = await geminiVoiceService.listGeminiVoices(workspaceId)

        reply.send({
          success: true,
          voices,
          count: voices.length,
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to fetch voices',
        })
      }
    }
  )

  /**
   * Get voices by language
   */
  server.get(
    '/voices/language/:languageCode',
    async (req: FastifyRequest<{ Params: { languageCode: string }; Querystring: { workspaceId?: string } }>, reply: FastifyReply) => {
      try {
        const { languageCode } = req.params
        const { workspaceId } = req.query

        const voices = await geminiVoiceService.getVoicesByLanguage(
          languageCode,
          workspaceId
        )

        reply.send({
          success: true,
          voices,
          count: voices.length,
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to fetch voices',
        })
      }
    }
  )

  /**
   * Get available languages
   */
  server.get('/languages', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const languages = await geminiVoiceService.getAvailableLanguages()

      reply.send({
        success: true,
        languages,
        count: languages.length,
      })
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : 'Failed to fetch languages',
      })
    }
  })

  /**
   * Link Gemini voice to talking actor
   * SECURITY: Only links voices to actors in user's workspace
   */
  server.post(
    '/actors/:actorId/voices/:voiceId',
    async (req: FastifyRequest<{ Params: { actorId: string; voiceId: string }; Body: { workspaceId: string; lipSyncStrength?: number } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const { actorId, voiceId } = req.params
        const { workspaceId, lipSyncStrength = 0.8 } = req.body

        // SECURITY: Can only link voices to actors in user's workspace
        if (context.workspaceId !== workspaceId) {
          return reply.status(403).send({
            error: 'Cannot link voices to actors in other workspaces',
          })
        }

        // SECURITY: Verify actor exists and belongs to user's workspace
        const actor = await getActor(context, actorId)
        if (!actor) {
          return reply.status(404).send({
            error: 'Actor not found or access denied',
          })
        }

        const link = await geminiVoiceService.linkVoiceToActor(
          context.workspaceId,
          actorId,
          voiceId,
          lipSyncStrength
        )

        reply.send({
          success: true,
          link,
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to link voice to actor',
        })
      }
    }
  )

  /**
   * Get voices linked to an actor
   */
  server.get(
    '/actors/:actorId/voices',
    async (req: FastifyRequest<{ Params: { actorId: string } }>, reply: FastifyReply) => {
      try {
        const { actorId } = req.params

        const voices = await geminiVoiceService.getActorVoices(actorId)

        reply.send({
          success: true,
          voices,
          count: voices.length,
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to fetch actor voices',
        })
      }
    }
  )

  /**
   * Get actors using a specific voice
   */
  server.get(
    '/voices/:voiceId/actors',
    async (req: FastifyRequest<{ Params: { voiceId: string } }>, reply: FastifyReply) => {
      try {
        const { voiceId } = req.params

        const actorIds = await geminiVoiceService.getVoiceActors(voiceId)

        reply.send({
          success: true,
          actorIds,
          count: actorIds.length,
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to fetch voice actors',
        })
      }
    }
  )

  /**
   * Update lip-sync strength for actor-voice combination
   * SECURITY: Only updates settings for actors in user's workspace
   */
  server.patch(
    '/actors/:actorId/voices/:voiceId/lip-sync',
    async (req: FastifyRequest<{ Params: { actorId: string; voiceId: string }; Body: { lipSyncStrength: number } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const { actorId, voiceId } = req.params
        const { lipSyncStrength } = req.body

        if (typeof lipSyncStrength !== 'number' || lipSyncStrength < 0 || lipSyncStrength > 1) {
          return reply.status(400).send({
            error: 'lipSyncStrength must be a number between 0 and 1',
          })
        }

        // SECURITY: Verify actor belongs to user's workspace
        const actor = await getActor(context, actorId)
        if (!actor) {
          return reply.status(404).send({
            error: 'Actor not found or access denied',
          })
        }

        await geminiVoiceService.updateLipSyncStrength(
          actorId,
          voiceId,
          lipSyncStrength
        )

        reply.send({
          success: true,
          message: 'Lip-sync strength updated',
          lipSyncStrength,
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to update lip-sync strength',
        })
      }
    }
  )

  /**
   * Unlink voice from actor
   * SECURITY: Only unlinks voices from actors in user's workspace
   */
  server.delete(
    '/actors/:actorId/voices/:voiceId',
    async (req: FastifyRequest<{ Params: { actorId: string; voiceId: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const { actorId, voiceId } = req.params

        // SECURITY: Verify actor belongs to user's workspace
        const actor = await getActor(context, actorId)
        if (!actor) {
          return reply.status(404).send({
            error: 'Actor not found or access denied',
          })
        }

        await geminiVoiceService.unlinkVoiceFromActor(actorId, voiceId)

        reply.send({
          success: true,
          message: 'Voice unlinked from actor',
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to unlink voice from actor',
        })
      }
    }
  )

  /**
   * Synthesize speech with lip-sync data
   * SECURITY: Only synthesizes with actors in user's workspace
   */
  server.post(
    '/synthesize-with-lipsync',
    async (req: FastifyRequest<{ Body: { script: string; geminiVoiceId: string; talkingActorId: string } }>, reply: FastifyReply) => {
      try {
        const context = await getCurrentWorkspaceContext(req)
        const { script, geminiVoiceId, talkingActorId } = req.body

        if (!script || !geminiVoiceId || !talkingActorId) {
          return reply.status(400).send({
            error: 'script, geminiVoiceId, and talkingActorId are required',
          })
        }

        // SECURITY: Verify actor belongs to user's workspace
        const actor = await getActor(context, talkingActorId)
        if (!actor) {
          return reply.status(404).send({
            error: 'Actor not found or access denied',
          })
        }

        const result = await geminiVoiceService.synthesizeWithLipSync(
          script,
          geminiVoiceId,
          talkingActorId
        )

        reply.send({
          success: true,
          ...result,
        })
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to synthesize speech',
        })
      }
    }
  )
}

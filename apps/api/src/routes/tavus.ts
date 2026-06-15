import { Router, Request, Response } from 'express'
import { TavusRepository } from '../repositories/tavus.repository'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const tavusRepo = new TavusRepository(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

/**
 * Create a replica from image
 */
router.post('/replicas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { workspaceId, replicaName, imageUrl } = req.body

    if (!workspaceId || !replicaName || !imageUrl) {
      return res.status(400).json({
        error: 'Missing required fields: workspaceId, replicaName, imageUrl',
      })
    }

    const replica = await tavusRepo.createReplica(
      workspaceId,
      replicaName,
      imageUrl
    )

    res.json({
      success: true,
      replica,
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create replica',
    })
  }
})

/**
 * Get all replicas for workspace
 */
router.get(
  '/replicas/:workspaceId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params

      const replicas = await tavusRepo.listReplicas(workspaceId)

      res.json({
        success: true,
        replicas,
      })
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to fetch replicas',
      })
    }
  }
)

/**
 * Create a voice from audio
 */
router.post('/voices', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { workspaceId, voiceName, audioUrl } = req.body

    if (!workspaceId || !voiceName || !audioUrl) {
      return res.status(400).json({
        error: 'Missing required fields: workspaceId, voiceName, audioUrl',
      })
    }

    const voice = await tavusRepo.createVoice(
      workspaceId,
      voiceName,
      audioUrl
    )

    res.json({
      success: true,
      voice,
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create voice',
    })
  }
})

/**
 * Get all voices for workspace
 */
router.get(
  '/voices/:workspaceId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params

      const voices = await tavusRepo.listVoices(workspaceId)

      res.json({
        success: true,
        voices,
      })
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch voices',
      })
    }
  }
)

/**
 * Generate video
 */
router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { workspaceId, script, replicaId, voiceId, backgroundUrl } =
      req.body

    if (!workspaceId || !script || !replicaId || !voiceId) {
      return res.status(400).json({
        error:
          'Missing required fields: workspaceId, script, replicaId, voiceId',
      })
    }

    const video = await tavusRepo.generateVideo(
      workspaceId,
      script,
      replicaId,
      voiceId,
      backgroundUrl
    )

    res.json({
      success: true,
      video,
    })
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to generate video',
    })
  }
})

/**
 * Get video status
 */
router.get('/videos/:videoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params

    const video = await tavusRepo.syncVideoStatus(videoId)

    res.json({
      success: true,
      video,
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch video',
    })
  }
})

/**
 * Get all videos for workspace
 */
router.get(
  '/videos/workspace/:workspaceId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params

      const videos = await tavusRepo.listVideos(workspaceId)

      res.json({
        success: true,
        videos,
      })
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch videos',
      })
    }
  }
)

/**
 * Delete replica
 */
router.delete(
  '/replicas/:replicaId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { replicaId } = req.params

      await tavusRepo.deleteReplica(replicaId)

      res.json({
        success: true,
        message: 'Replica deleted',
      })
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to delete replica',
      })
    }
  }
)

/**
 * Delete voice
 */
router.delete(
  '/voices/:voiceId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { voiceId } = req.params

      await tavusRepo.deleteVoice(voiceId)

      res.json({
        success: true,
        message: 'Voice deleted',
      })
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete voice',
      })
    }
  }
)

export default router

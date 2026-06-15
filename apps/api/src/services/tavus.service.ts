import axios, { AxiosInstance } from 'axios'

interface TavusReplicaResponse {
  replica_id: string
  replica_name: string
  status: 'created' | 'error'
  error?: string
}

interface TavusVideoResponse {
  video_id: string
  status: 'queued' | 'generating' | 'completed' | 'error'
  download_url?: string
  error?: string
}

interface TavusVoiceResponse {
  voice_id: string
  voice_name: string
  status: 'created' | 'training' | 'ready' | 'error'
  error?: string
}

export class TavusService {
  private client: AxiosInstance
  private apiKey: string
  private baseUrl = 'https://api.tavusapi.com/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVUS_API_KEY || ''

    if (!this.apiKey) {
      console.warn('TAVUS_API_KEY not configured')
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Create a video replica from an image
   */
  async createReplica(
    replicaName: string,
    imageUrl: string
  ): Promise<TavusReplicaResponse> {
    try {
      const response = await this.client.post('/replicas', {
        replica_name: replicaName,
        video_url: imageUrl, // Tavus uses video_url for image input
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to create Tavus replica: ${error}`)
    }
  }

  /**
   * Create a voice replica from audio
   */
  async createVoice(
    voiceName: string,
    audioUrl: string
  ): Promise<TavusVoiceResponse> {
    try {
      const response = await this.client.post('/voices', {
        voice_name: voiceName,
        audio_url: audioUrl,
      })
      return response.data
    } catch (error) {
      throw new Error(`Failed to create Tavus voice: ${error}`)
    }
  }

  /**
   * Generate video from script, replica, and voice
   */
  async generateVideo(
    script: string,
    replicaId: string,
    voiceId: string,
    backgroundUrl?: string
  ): Promise<TavusVideoResponse> {
    try {
      const payload: any = {
        script,
        replica_id: replicaId,
        voice_id: voiceId,
        video_resolution: '1080p',
        ensure_audio_sync: true,
      }

      if (backgroundUrl) {
        payload.background_url = backgroundUrl
      }

      const response = await this.client.post('/generate-video', payload)
      return response.data
    } catch (error) {
      throw new Error(`Failed to generate Tavus video: ${error}`)
    }
  }

  /**
   * Get video status and download URL
   */
  async getVideoStatus(videoId: string): Promise<TavusVideoResponse> {
    try {
      const response = await this.client.get(`/videos/${videoId}`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get video status: ${error}`)
    }
  }

  /**
   * Get replica status
   */
  async getReplicaStatus(replicaId: string): Promise<TavusReplicaResponse> {
    try {
      const response = await this.client.get(`/replicas/${replicaId}`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get replica status: ${error}`)
    }
  }

  /**
   * Get voice status
   */
  async getVoiceStatus(voiceId: string): Promise<TavusVoiceResponse> {
    try {
      const response = await this.client.get(`/voices/${voiceId}`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get voice status: ${error}`)
    }
  }

  /**
   * List all replicas
   */
  async listReplicas(): Promise<TavusReplicaResponse[]> {
    try {
      const response = await this.client.get('/replicas')
      return response.data.replicas
    } catch (error) {
      throw new Error(`Failed to list replicas: ${error}`)
    }
  }

  /**
   * List all voices
   */
  async listVoices(): Promise<TavusVoiceResponse[]> {
    try {
      const response = await this.client.get('/voices')
      return response.data.voices
    } catch (error) {
      throw new Error(`Failed to list voices: ${error}`)
    }
  }

  /**
   * Delete a replica
   */
  async deleteReplica(replicaId: string): Promise<void> {
    try {
      await this.client.delete(`/replicas/${replicaId}`)
    } catch (error) {
      throw new Error(`Failed to delete replica: ${error}`)
    }
  }

  /**
   * Delete a voice
   */
  async deleteVoice(voiceId: string): Promise<void> {
    try {
      await this.client.delete(`/voices/${voiceId}`)
    } catch (error) {
      throw new Error(`Failed to delete voice: ${error}`)
    }
  }

  /**
   * Batch process videos
   */
  async generateBatchVideos(
    videos: Array<{
      script: string
      replicaId: string
      voiceId: string
      backgroundUrl?: string
    }>
  ): Promise<TavusVideoResponse[]> {
    try {
      const response = await this.client.post('/generate-videos-batch', {
        videos,
      })
      return response.data.videos
    } catch (error) {
      throw new Error(`Failed to generate batch videos: ${error}`)
    }
  }
}

// Export singleton instance
export const tavusService = new TavusService()

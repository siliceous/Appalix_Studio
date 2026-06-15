import { createClient } from '@supabase/supabase-js'
import { tavusService } from '../services/tavus.service'

interface TavusReplica {
  id: string
  workspace_id: string
  tavus_replica_id: string
  replica_name: string
  image_url: string
  status: 'created' | 'processing' | 'ready' | 'error'
  error?: string
  created_at: Date
  updated_at: Date
}

interface TavusVoice {
  id: string
  workspace_id: string
  tavus_voice_id: string
  voice_name: string
  audio_url: string
  status: 'training' | 'ready' | 'error'
  error?: string
  created_at: Date
  updated_at: Date
}

interface TavusVideo {
  id: string
  workspace_id: string
  tavus_video_id: string
  script: string
  replica_id: string
  voice_id: string
  status: 'queued' | 'generating' | 'completed' | 'error'
  video_url?: string
  thumbnail_url?: string
  error?: string
  created_at: Date
  updated_at: Date
}

export class TavusRepository {
  private supabase: ReturnType<typeof createClient>

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Create replica in database and Tavus
   */
  async createReplica(
    workspaceId: string,
    replicaName: string,
    imageUrl: string
  ): Promise<TavusReplica> {
    try {
      // Create in Tavus
      const tavusResponse = await tavusService.createReplica(
        replicaName,
        imageUrl
      )

      // Store in database
      const { data, error } = await this.supabase
        .from('tavus_replicas')
        .insert({
          workspace_id: workspaceId,
          tavus_replica_id: tavusResponse.replica_id,
          replica_name: replicaName,
          image_url: imageUrl,
          status: 'created',
        })
        .select()
        .single()

      if (error) throw error

      return data as TavusReplica
    } catch (error) {
      throw new Error(`Failed to create replica: ${error}`)
    }
  }

  /**
   * Create voice in database and Tavus
   */
  async createVoice(
    workspaceId: string,
    voiceName: string,
    audioUrl: string
  ): Promise<TavusVoice> {
    try {
      // Create in Tavus
      const tavusResponse = await tavusService.createVoice(voiceName, audioUrl)

      // Store in database
      const { data, error } = await this.supabase
        .from('tavus_voices')
        .insert({
          workspace_id: workspaceId,
          tavus_voice_id: tavusResponse.voice_id,
          voice_name: voiceName,
          audio_url: audioUrl,
          status: 'training',
        })
        .select()
        .single()

      if (error) throw error

      return data as TavusVoice
    } catch (error) {
      throw new Error(`Failed to create voice: ${error}`)
    }
  }

  /**
   * Generate video
   */
  async generateVideo(
    workspaceId: string,
    script: string,
    replicaId: string,
    voiceId: string,
    backgroundUrl?: string
  ): Promise<TavusVideo> {
    try {
      // Get replica and voice info
      const replica = await this.getReplica(replicaId)
      const voice = await this.getVoice(voiceId)

      if (!replica || !voice) {
        throw new Error('Replica or voice not found')
      }

      // Generate in Tavus
      const tavusResponse = await tavusService.generateVideo(
        script,
        replica.tavus_replica_id,
        voice.tavus_voice_id,
        backgroundUrl
      )

      // Store in database
      const { data, error } = await this.supabase
        .from('tavus_videos')
        .insert({
          workspace_id: workspaceId,
          tavus_video_id: tavusResponse.video_id,
          script,
          replica_id: replicaId,
          voice_id: voiceId,
          status: 'queued',
        })
        .select()
        .single()

      if (error) throw error

      return data as TavusVideo
    } catch (error) {
      throw new Error(`Failed to generate video: ${error}`)
    }
  }

  /**
   * Get replica by ID
   */
  async getReplica(id: string): Promise<TavusReplica | null> {
    const { data } = await this.supabase
      .from('tavus_replicas')
      .select()
      .eq('id', id)
      .single()

    return data as TavusReplica | null
  }

  /**
   * Get voice by ID
   */
  async getVoice(id: string): Promise<TavusVoice | null> {
    const { data } = await this.supabase
      .from('tavus_voices')
      .select()
      .eq('id', id)
      .single()

    return data as TavusVoice | null
  }

  /**
   * Get video by ID
   */
  async getVideo(id: string): Promise<TavusVideo | null> {
    const { data } = await this.supabase
      .from('tavus_videos')
      .select()
      .eq('id', id)
      .single()

    return data as TavusVideo | null
  }

  /**
   * List workspace replicas
   */
  async listReplicas(workspaceId: string): Promise<TavusReplica[]> {
    const { data } = await this.supabase
      .from('tavus_replicas')
      .select()
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    return (data || []) as TavusReplica[]
  }

  /**
   * List workspace voices
   */
  async listVoices(workspaceId: string): Promise<TavusVoice[]> {
    const { data } = await this.supabase
      .from('tavus_voices')
      .select()
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    return (data || []) as TavusVoice[]
  }

  /**
   * List workspace videos
   */
  async listVideos(workspaceId: string): Promise<TavusVideo[]> {
    const { data } = await this.supabase
      .from('tavus_videos')
      .select()
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    return (data || []) as TavusVideo[]
  }

  /**
   * Update video status
   */
  async updateVideoStatus(
    videoId: string,
    status: string,
    videoUrl?: string,
    error?: string
  ): Promise<void> {
    const updates: any = { status, updated_at: new Date() }
    if (videoUrl) updates.video_url = videoUrl
    if (error) updates.error = error

    const { error: updateError } = await this.supabase
      .from('tavus_videos')
      .update(updates)
      .eq('id', videoId)

    if (updateError) throw updateError
  }

  /**
   * Delete replica
   */
  async deleteReplica(id: string): Promise<void> {
    const replica = await this.getReplica(id)
    if (!replica) throw new Error('Replica not found')

    // Delete from Tavus
    await tavusService.deleteReplica(replica.tavus_replica_id)

    // Delete from database
    const { error } = await this.supabase
      .from('tavus_replicas')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Delete voice
   */
  async deleteVoice(id: string): Promise<void> {
    const voice = await this.getVoice(id)
    if (!voice) throw new Error('Voice not found')

    // Delete from Tavus
    await tavusService.deleteVoice(voice.tavus_voice_id)

    // Delete from database
    const { error } = await this.supabase
      .from('tavus_voices')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Sync video status from Tavus
   */
  async syncVideoStatus(videoId: string): Promise<TavusVideo> {
    const video = await this.getVideo(videoId)
    if (!video) throw new Error('Video not found')

    // Get status from Tavus
    const tavusVideo = await tavusService.getVideoStatus(
      video.tavus_video_id
    )

    // Update in database
    await this.updateVideoStatus(
      videoId,
      tavusVideo.status,
      tavusVideo.download_url,
      tavusVideo.error
    )

    return (await this.getVideo(videoId))!
  }
}

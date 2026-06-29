import { supabase } from '../../lib/supabase.js';
import { VideoGenerationService } from './video-generation.service.js';

/**
 * Poll for pending video generation jobs
 * Runs every 30 seconds to check status and update database
 * Acts as fallback if webhook is not received
 */
export async function pollPendingVideoJobs() {
  try {
    // Find jobs that are still processing and need polling
    const { data: jobs, error } = await (supabase
      .from('video_generation_jobs')
      .select('*')
      .in('status', ['pending', 'submitted', 'processing'])
      .lt('next_poll_at', new Date().toISOString())
      .limit(10) as any); // Process max 10 jobs per poll to avoid overload

    if (error) {
      console.error('Error fetching pending video jobs:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.debug('No pending video jobs to poll');
      return;
    }

    console.log(`Polling ${jobs.length} pending video generation jobs`);

    // Process each job
    const service = new VideoGenerationService();
    for (const job of jobs) {
      try {
        await service.checkJobStatus(job.id);
      } catch (jobError) {
        console.error(`Error polling job ${job.id}:`, jobError);
        // Continue to next job even if one fails
      }
    }
  } catch (error) {
    console.error('Fatal error in pollPendingVideoJobs:', error);
  }
}

/**
 * Clean up stale jobs
 * Mark jobs as failed if they've been pending for > 4 hours
 */
export async function cleanupStaleVideoJobs() {
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    const { data: staleJobs, error } = await (supabase
      .from('video_generation_jobs')
      .select('*')
      .in('status', ['pending', 'submitted', 'processing'])
      .lt('created_at', fourHoursAgo) as any);

    if (error) {
      console.error('Error fetching stale jobs:', error);
      return;
    }

    if (!staleJobs || staleJobs.length === 0) {
      return;
    }

    console.log(`Cleaning up ${staleJobs.length} stale video generation jobs`);

    // Mark as failed
    for (const job of staleJobs) {
      await (supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Job timeout: Generation did not complete within 4 hours',
          completed_at: new Date().toISOString(),
        } as any)
        .eq('id', job.id) as any);

      // Update video
      await (supabase
        .from('video_generations')
        .update({ status: 'failed' } as any)
        .eq('id', job.video_id) as any);
    }
  } catch (error) {
    console.error('Fatal error in cleanupStaleVideoJobs:', error);
  }
}

export function startVideoJobPolling() {
  // Poll for pending jobs every 30 seconds
  setInterval(pollPendingVideoJobs, 30_000);

  // Clean up stale jobs every 5 minutes
  setInterval(cleanupStaleVideoJobs, 5 * 60 * 1000);

  console.log('Video job polling started');
}

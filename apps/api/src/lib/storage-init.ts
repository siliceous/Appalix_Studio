import { supabase } from './supabase.js'

/**
 * Initialize Supabase Storage buckets
 * Run on API startup
 */
export async function initializeStorage() {
  try {
    console.log('[Storage Init] Checking buckets...')

    // Check if ai-image-generations bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('[Storage Init] Error listing buckets:', listError)
      return
    }

    const imageBucketExists = buckets.some(b => b.name === 'ai-image-generations')

    if (!imageBucketExists) {
      console.log('[Storage Init] Creating ai-image-generations bucket...')
      const { data, error } = await supabase.storage.createBucket('ai-image-generations', {
        public: false, // Private bucket - access via signed URLs
      })

      if (error) {
        console.error('[Storage Init] Error creating bucket:', error)
        return
      }

      console.log('[Storage Init] Bucket created successfully')
    } else {
      console.log('[Storage Init] ai-image-generations bucket already exists')
    }
  } catch (error) {
    console.error('[Storage Init] Initialization failed:', error)
  }
}

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

    const imageBucket = buckets.find(b => b.name === 'ai-image-generations')

    if (!imageBucket) {
      console.log('[Storage Init] Creating ai-image-generations bucket...')
      const { data, error } = await supabase.storage.createBucket('ai-image-generations', {
        public: true, // Public bucket - permanent URLs that never expire
      })

      if (error) {
        console.error('[Storage Init] Error creating bucket:', error)
        return
      }

      console.log('[Storage Init] Bucket created successfully')
    } else {
      console.log('[Storage Init] ai-image-generations bucket already exists')

      // Ensure the bucket is public
      if (!imageBucket.public) {
        console.log('[Storage Init] Bucket is private, updating to public...')
        const { error: updateError } = await supabase.storage.updateBucket('ai-image-generations', {
          public: true,
        })

        if (updateError) {
          console.error('[Storage Init] Error updating bucket to public:', updateError)
          return
        }

        console.log('[Storage Init] Bucket updated to public successfully')
      } else {
        console.log('[Storage Init] Bucket is already public')
      }
    }
  } catch (error) {
    console.error('[Storage Init] Initialization failed:', error)
  }
}

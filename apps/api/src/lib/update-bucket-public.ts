import { supabase } from './supabase.js'

/**
 * Update ai-image-generations bucket to be public
 * This allows public URLs to be accessed directly from browsers without authentication
 */
export async function updateBucketToPublic() {
  try {
    console.log('[Bucket Update] Checking current bucket status...')

    // First, get the current bucket status
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('[Bucket Update] Error listing buckets:', listError)
      return false
    }

    const imageBucket = buckets.find(b => b.name === 'ai-image-generations')

    if (!imageBucket) {
      console.error('[Bucket Update] Bucket "ai-image-generations" does not exist')
      return false
    }

    console.log(`[Bucket Update] Current bucket status:`, {
      name: imageBucket.name,
      public: imageBucket.public,
      created_at: imageBucket.created_at,
    })

    if (imageBucket.public) {
      console.log('[Bucket Update] Bucket is already public ✓')
      return true
    }

    console.log('[Bucket Update] Updating bucket to be public...')

    // Update the bucket to be public
    const { data, error } = await supabase.storage.updateBucket('ai-image-generations', {
      public: true,
    })

    if (error) {
      console.error('[Bucket Update] Error updating bucket:', error)
      return false
    }

    console.log('[Bucket Update] Bucket updated successfully ✓')

    // Verify the update
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets()

    if (verifyError) {
      console.error('[Bucket Update] Error verifying bucket:', verifyError)
      return false
    }

    const updatedBucket = verifyBuckets.find(b => b.name === 'ai-image-generations')

    if (updatedBucket?.public) {
      console.log('[Bucket Update] Verification successful! Bucket is now public ✓')
      return true
    } else {
      console.error('[Bucket Update] Verification failed - bucket is still not public')
      return false
    }
  } catch (error) {
    console.error('[Bucket Update] Error:', error)
    return false
  }
}

// If this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running bucket update script...')
  updateBucketToPublic().then(success => {
    process.exit(success ? 0 : 1)
  })
}

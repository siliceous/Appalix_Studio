import { supabase } from './supabase.js'

/**
 * Verify that the ai-image-generations bucket is public and accessible
 * Tests: bucket status, public URL construction, and basic access
 */
export async function verifyBucketAccess() {
  try {
    console.log('[Bucket Verification] Starting verification...\n')

    // 1. Check bucket status
    console.log('[Step 1] Checking bucket configuration...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('[Error] Failed to list buckets:', listError)
      return false
    }

    const imageBucket = buckets.find(b => b.name === 'ai-image-generations')

    if (!imageBucket) {
      console.error('[Error] Bucket "ai-image-generations" not found')
      return false
    }

    console.log('✓ Bucket exists')
    console.log(`✓ Bucket is ${imageBucket.public ? 'PUBLIC' : 'PRIVATE'}`)
    console.log(`✓ Created: ${imageBucket.created_at}\n`)

    if (!imageBucket.public) {
      console.error('[Error] Bucket must be public for direct browser access')
      return false
    }

    // 2. List files in the bucket
    console.log('[Step 2] Listing files in bucket...')
    const { data: files, error: listFilesError } = await supabase.storage
      .from('ai-image-generations')
      .list()

    if (listFilesError) {
      console.error('[Error] Failed to list files:', listFilesError)
      return false
    }

    console.log(`✓ Found ${files.length} files in bucket\n`)

    // 3. Construct and display public URLs for first few files
    if (files.length > 0) {
      console.log('[Step 3] Constructing public URLs...')
      const { data: { publicUrl: supabaseUrl } } = supabase.storage
        .from('ai-image-generations')
        .getPublicUrl('sample.jpg') // This won't exist but shows the URL structure

      console.log('✓ Public URL format:')
      console.log(`  ${supabaseUrl}\n`)

      // Show first 3 files and their URLs
      console.log('[Step 4] Sample public URLs:')
      const sampleFiles = files.slice(0, 3)
      sampleFiles.forEach(file => {
        const { data } = supabase.storage
          .from('ai-image-generations')
          .getPublicUrl(file.name)
        console.log(`  • ${file.name}`)
        console.log(`    → ${data.publicUrl}`)
      })
      console.log()
    }

    // 4. Summary
    console.log('[Summary]')
    console.log('✓ Bucket is PUBLIC - direct browser access enabled')
    console.log('✓ Public URLs will work without authentication')
    console.log('✓ Images are permanently accessible (no expiration)')
    console.log('\n[Status] Verification PASSED ✓')

    return true
  } catch (error) {
    console.error('[Error] Verification failed:', error)
    return false
  }
}

// If this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running bucket verification script...\n')
  verifyBucketAccess().then(success => {
    process.exit(success ? 0 : 1)
  })
}

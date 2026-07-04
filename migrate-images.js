/**
 * Image Migration Script
 * Migrates base64-encoded images from database to Supabase Storage with signed URLs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rudeaapjryxcswvsqida.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
const WORKSPACE_ID = '075c869d-86bd-4c25-acae-fa1b90bac532'
const BATCH_SIZE = 10 // Process 10 images at a time to avoid overload
const BUCKET_NAME = 'ai-image-generations'

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY or SUPABASE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function getBase64Images() {
  console.log('📊 Fetching base64 images from database...')

  const { data, error } = await supabase
    .from('ai_image_generations')
    .select('id, output_url, prompt, created_at, aspect_ratio, status')
    .eq('workspace_id', WORKSPACE_ID)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Database error:', error)
    process.exit(1)
  }

  // Filter for base64 images
  const base64Images = (data || []).filter(img =>
    img.output_url && img.output_url.startsWith('data:')
  )

  console.log(`📦 Found ${base64Images.length} base64 images to migrate`)
  console.log(`   Status breakdown:`)
  const statuses = {}
  base64Images.forEach(img => {
    statuses[img.status] = (statuses[img.status] || 0) + 1
  })
  Object.entries(statuses).forEach(([status, count]) => {
    console.log(`   - ${status}: ${count}`)
  })

  return base64Images
}

async function uploadImageToStorage(imageId, base64Data, filename) {
  try {
    // Extract MIME type and remove data: prefix
    const mimeMatch = base64Data.match(/^data:([^;]+);base64,/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const base64Content = base64Data.replace(/^data:[^;]+;base64,/, '')

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, 'base64')

    // Create storage path
    const storagePath = `${WORKSPACE_ID}/${imageId}/${filename}`

    console.log(`  ⬆️  Uploading ${storagePath} (${(buffer.length / 1024).toFixed(1)}KB)...`)

    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false
      })

    if (error) {
      console.error(`  ❌ Upload failed:`, error.message)
      return null
    }

    // Generate signed URL (24 hour expiry)
    const { data: signedUrl, error: signError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 24 * 60 * 60)

    if (signError) {
      console.error(`  ❌ Failed to generate signed URL:`, signError.message)
      return null
    }

    return signedUrl.signedUrl
  } catch (err) {
    console.error(`  ❌ Error uploading image:`, err.message)
    return null
  }
}

async function updateDatabaseRecord(imageId, newUrl) {
  const { error } = await supabase
    .from('ai_image_generations')
    .update({
      output_url: newUrl,
      output_urls: JSON.stringify([newUrl]),
      updated_at: new Date().toISOString()
    })
    .eq('id', imageId)

  if (error) {
    console.error(`  ❌ Database update failed:`, error.message)
    return false
  }

  return true
}

async function migrateImages() {
  const images = await getBase64Images()

  if (images.length === 0) {
    console.log('✅ No base64 images to migrate!')
    return
  }

  let successful = 0
  let failed = 0

  // Process in batches
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE)
    console.log(`\n📋 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(images.length / BATCH_SIZE)}...`)

    await Promise.all(batch.map(async (img) => {
      try {
        const filename = `image-${Date.now()}.jpg`
        const signedUrl = await uploadImageToStorage(img.id, img.output_url, filename)

        if (signedUrl) {
          const updated = await updateDatabaseRecord(img.id, signedUrl)
          if (updated) {
            console.log(`  ✅ Image ${img.id.substring(0, 8)}... migrated`)
            successful++
          } else {
            failed++
          }
        } else {
          failed++
        }
      } catch (err) {
        console.error(`  ❌ Migration failed for ${img.id}:`, err.message)
        failed++
      }
    }))

    // Wait between batches to avoid rate limiting
    if (i + BATCH_SIZE < images.length) {
      console.log('⏳ Waiting 2 seconds before next batch...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log(`\n📊 Migration Summary:`)
  console.log(`   ✅ Successful: ${successful}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📦 Total: ${images.length}`)

  if (successful === images.length) {
    console.log('\n🎉 All images migrated successfully!')
  } else {
    console.log(`\n⚠️  ${failed} images failed. You can re-run this script to retry.`)
  }
}

// Run migration
console.log('🚀 Starting image migration...\n')
migrateImages().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})

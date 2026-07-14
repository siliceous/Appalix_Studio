#!/usr/bin/env node

/**
 * Script to update the ai-image-generations bucket to public
 * Usage: node --env-file=.env run-update-bucket.js
 */

import('./dist/lib/update-bucket-public.js').then(module => {
  const { updateBucketToPublic } = module
  updateBucketToPublic().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}).catch(error => {
  console.error('Failed to load module:', error)
  process.exit(1)
})

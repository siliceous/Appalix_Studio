#!/usr/bin/env node

/**
 * Script to verify the ai-image-generations bucket is public and accessible
 * Usage: node --env-file=.env run-verify-bucket.js
 */

import('./dist/lib/verify-bucket-access.js').then(module => {
  const { verifyBucketAccess } = module
  verifyBucketAccess().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}).catch(error => {
  console.error('Failed to load module:', error)
  process.exit(1)
})

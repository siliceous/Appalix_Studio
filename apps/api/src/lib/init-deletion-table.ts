import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

let tableInitialized = false

/**
 * Ensure the ai_image_deletions table exists.
 * This runs once per server startup as a safety measure
 * since migrations may not be auto-applied to the remote database.
 */
export async function ensureDeletionTableExists() {
  if (tableInitialized) return

  try {
    const supabase = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Try a simple query to see if table exists
    const { error } = await supabase
      .from('ai_image_deletions')
      .select('id')
      .limit(1)

    // If the table doesn't exist, the error code will indicate this
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found') || error.code === 'PGRST205') {
        console.warn('[Init] ai_image_deletions table not found. This must be created via Supabase migrations.')
        console.warn('[Init] Run: supabase migration up --project-ref <ref>')
        tableInitialized = true
        return
      }
      // If it's a different error, log it but continue
      console.warn('[Init] Error checking ai_image_deletions table:', error.message)
    } else {
      console.log('[Init] ai_image_deletions table verified')
    }

    tableInitialized = true
  } catch (err) {
    console.error('[Init] Unexpected error in table initialization:', err)
    tableInitialized = true
  }
}

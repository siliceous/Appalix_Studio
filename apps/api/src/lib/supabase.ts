import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

/**
 * Supabase service-role client.
 * Bypasses Row Level Security — use ONLY on the server.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to any client.
 */
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

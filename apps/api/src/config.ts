import { z } from 'zod'

const schema = z.object({
  // Server
  PORT:                      z.string().default('3001'),
  NODE_ENV:                  z.enum(['development', 'production', 'test']).default('development'),

  // Supabase (service-role — never expose to browser)
  SUPABASE_URL:              z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI providers
  ANTHROPIC_API_KEY:         z.string().startsWith('sk-ant-'),
  OPENAI_API_KEY:            z.string().startsWith('sk-'),  // used for embeddings
  GEMINI_API_KEY:            z.string().optional(),         // used for Sage Voice (Gemini Live)
  LEONARDO_API_KEY:          z.string().optional(),         // used for image generation
  STABILITY_API_KEY:         z.string().optional(),         // used for image generation with Stable Diffusion
  SEEDENCE_API_KEY:          z.string().optional(),         // used for image generation with Seedence
  NANO_BANANA_API_KEY:       z.string().optional(),         // used for image generation with Nano Banana

  // Redis (Upstash) — rate limiting + job queue (optional for local dev)
  UPSTASH_REDIS_REST_URL:    z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN:  z.string().min(1).optional(),

  // Platform app credentials
  SLACK_SIGNING_SECRET:      z.string().optional(),
  FACEBOOK_APP_SECRET:       z.string().optional(),
  WHATSAPP_APP_SECRET:       z.string().optional(),
  GOOGLE_CHAT_SERVICE_ACCOUNT: z.string().optional(),  // JSON string

  // Webhook shared secret for WordPress adapter
  WORDPRESS_WEBHOOK_SECRET:  z.string().optional(),
})

function loadConfig() {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    console.error('[config] Missing or invalid environment variables:')
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  return result.data
}

export const config = loadConfig()
export type Config = typeof config

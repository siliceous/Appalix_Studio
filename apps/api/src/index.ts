import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'url'
import path from 'path'
import { config } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import { slackRoutes }       from './routes/webhooks/slack.js'
import { ingestSource }      from './services/rag/ingestion.js'
import { supabase }          from './lib/supabase.js'
import { facebookRoutes }    from './routes/webhooks/facebook.js'
import { whatsappRoutes }    from './routes/webhooks/whatsapp.js'
import { googleChatRoutes }  from './routes/webhooks/google-chat.js'
import { wordpressRoutes }   from './routes/webhooks/wordpress.js'
import { telegramRoutes }    from './routes/webhooks/telegram.js'
import { chatRoutes }        from './routes/chat/index.js'
import { copilotRoutes }     from './routes/copilot/index.js'
import { sageEmailRoutes }  from './routes/sage/emails.js'
import { botRoutes }        from './routes/bots/index.js'
import { formRoutes }       from './routes/forms/index.js'
import { startIdleManager, stopIdleManager }        from './services/sage-email-idle.js'
import { reanalyzePendingEmails }                   from './services/sage-email-sync.js'
import { analyzeConversationsForWorkspace }         from './services/conversation-analyze.js'
import { runMailchimpTwoWaySync }                   from './services/mailchimp-two-way-sync.js'

const server = Fastify({
  logger: {
    level:     config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  // Store raw body for webhook signature verification
  // (requires rawBody option per route via config: { rawBody: true })
  bodyLimit: 10 * 1024 * 1024,  // 10 MB
})

// ---------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------

await server.register(helmet, {
  contentSecurityPolicy:        false,  // handled by Next.js dashboard
  crossOriginResourcePolicy:    { policy: 'cross-origin' },  // allow widget.js to load on any domain
})

// Serve static files from /public (widget.js lives here)
// wildcard: false prevents the catch-all GET /* from shadowing API routes
await server.register(fastifyStatic, {
  root:           path.join(__dirname, '..', 'public'),
  prefix:         '/',
  decorateReply:  false,
  wildcard:       false,
})

await server.register(cors, {
  origin: (_origin, cb) => {
    // Allow all origins for webhook endpoints.
    // Chat endpoints enforce per-integration allowed_origins internally.
    cb(null, true)
  },
  methods: ['GET', 'POST', 'OPTIONS'],
})

// Raw body for signature verification
server.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (req, body, done) => {
    ;(req as never as { rawBody: string }).rawBody = body as string
    try {
      done(null, JSON.parse(body as string))
    } catch (err) {
      done(err as Error, undefined)
    }
  },
)

// ---------------------------------------------------------------
// Routes
// ---------------------------------------------------------------

server.get('/health', async () => ({
  status: 'ok',
  ts:     new Date().toISOString(),
  env:    config.NODE_ENV,
}))

// Platform webhooks — all mounted under /webhooks
await server.register(slackRoutes,      { prefix: '/webhooks' })
await server.register(facebookRoutes,   { prefix: '/webhooks' })
await server.register(whatsappRoutes,   { prefix: '/webhooks' })
await server.register(googleChatRoutes, { prefix: '/webhooks' })
await server.register(wordpressRoutes,  { prefix: '/webhooks' })
await server.register(telegramRoutes,   { prefix: '/webhooks' })

// Chat + ingestion endpoints
await server.register(chatRoutes, { prefix: '/chat' })

// Internal copilot endpoint (server-to-server, service-key auth)
await server.register(copilotRoutes, { prefix: '/copilot' })

// Sage email routes (sync, send, rewrite — service-key auth)
await server.register(sageEmailRoutes, { prefix: '/sage/emails' })

// Bot conversation routes (AI analysis — service-key auth)
await server.register(botRoutes,  { prefix: '/bots' })
await server.register(formRoutes, { prefix: '/forms' })

// ---------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------
server.setErrorHandler((error: { statusCode?: number; message: string; code?: string }, request, reply) => {
  server.log.error({ err: error, url: request.url }, 'Unhandled error')
  reply.status(error.statusCode ?? 500).send({
    error: error.message,
    code:  error.code,
  })
})

// ---------------------------------------------------------------
// Start
// ---------------------------------------------------------------
const port = parseInt(config.PORT, 10)

try {
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`\n🚀  API server running on http://0.0.0.0:${port}`)
  console.log(`   GET  /health`)
  console.log(`   POST /webhooks/slack/:id`)
  console.log(`   POST /webhooks/facebook/:id`)
  console.log(`   POST /webhooks/whatsapp/:id`)
  console.log(`   POST /webhooks/google-chat/:id`)
  console.log(`   POST /webhooks/wordpress/:id`)
  console.log(`   POST /webhooks/telegram/:id`)
  console.log(`   POST /chat/:id            (web widget)`)
  console.log(`   POST /chat/custom/:id     (custom API)`)
  console.log(`   POST /chat/ingest/:id     (RAG ingestion)\n`)

  // ---------------------------------------------------------------
  // Background ingestion poller
  // Picks up any sources stuck in 'pending' every 30 s.
  // This is a safety net — the dashboard also triggers ingest via HTTP,
  // but if that call is dropped (cold start, network error) this catches it.
  // ---------------------------------------------------------------
  async function pollPendingSources() {
    try {
      const { data: pending } = await supabase
        .from('sources')
        .select('id, name')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5)

      if (pending && pending.length > 0) {
        console.log(`[poller] found ${pending.length} pending source(s) — ingesting`)
        for (const source of pending) {
          console.log(`[poller] ingesting source ${source.id} (${source.name})`)
          ingestSource(source.id).catch((err: unknown) => {
            console.error(`[poller] ingest failed for ${source.id}:`, err)
          })
        }
      }
    } catch (err) {
      console.error('[poller] error checking pending sources:', err)
    }
  }

  // Run once on startup then every 30 s
  void pollPendingSources()
  setInterval(pollPendingSources, 30_000)

  // ---------------------------------------------------------------
  // IMAP IDLE manager
  // Opens a persistent IMAP connection for every connected Gmail /
  // Outlook workspace. When the mail server signals a new message the
  // loop immediately syncs it — no manual "Sync" button needed.
  // ---------------------------------------------------------------
  void startIdleManager()

  // ---------------------------------------------------------------
  // Email re-analysis poller
  // Catches emails whose AI analysis failed silently (e.g. Claude API
  // error, JSON truncation) — they sit with ai_priority = null.
  // Runs once on startup and every 10 minutes to backfill them.
  // ---------------------------------------------------------------
  async function pollUnanalyzedEmails() {
    try {
      // Find all workspaces that have unanalyzed inbound emails
      const { data: rows } = await supabase
        .from('sage_emails')
        .select('workspace_id')
        .eq('direction', 'inbound')
        .is('ai_analyzed_at', null)
        .limit(100)

      if (!rows || rows.length === 0) return

      const workspaceIds = [...new Set(rows.map(r => r.workspace_id as string))]
      console.log(`[email-poller] found unanalyzed emails in ${workspaceIds.length} workspace(s)`)

      for (const wsId of workspaceIds) {
        reanalyzePendingEmails(wsId, 20).catch((err: unknown) => {
          console.error(`[email-poller] reanalyze failed for workspace=${wsId}:`, err)
        })
      }
    } catch (err) {
      console.error('[email-poller] error:', err)
    }
  }

  // Run once on startup, then every 1 minute
  void pollUnanalyzedEmails()
  setInterval(pollUnanalyzedEmails, 60 * 1000)

  // ---------------------------------------------------------------
  // Conversation analysis poller
  // Mirrors the email poller — picks up bot conversations whose
  // AI analysis hasn't run yet (ai_analyzed_at IS NULL).
  // Runs once on startup and every 2 minutes.
  // ---------------------------------------------------------------
  async function pollUnanalyzedConversations() {
    try {
      const { data: rows } = await supabase
        .from('conversations')
        .select('workspace_id')
        .is('ai_analyzed_at', null)
        .limit(100)

      if (!rows || rows.length === 0) return

      const workspaceIds = [...new Set(rows.map(r => r.workspace_id as string))]
      console.log(`[conv-poller] found unanalyzed conversations in ${workspaceIds.length} workspace(s)`)

      for (const wsId of workspaceIds) {
        analyzeConversationsForWorkspace(wsId, 20).catch((err: unknown) => {
          console.error(`[conv-poller] analyze failed for workspace=${wsId}:`, err)
        })
      }
    } catch (err) {
      console.error('[conv-poller] error:', err)
    }
  }

  void pollUnanalyzedConversations()
  setInterval(pollUnanalyzedConversations, 2 * 60 * 1000)

  // ---------------------------------------------------------------
  // Mailchimp two-way sync poller
  // Runs every 5 minutes for workspaces with sync_enabled = true.
  // Pulls Mailchimp changes → Appalix, pushes Appalix changes →
  // Mailchimp, and processes pending soft-deletes after 5-min grace.
  // ---------------------------------------------------------------
  void runMailchimpTwoWaySync()
  setInterval(() => void runMailchimpTwoWaySync(), 5 * 60 * 1000)

  // Graceful shutdown — release IMAP connections before process exits
  const shutdown = () => { stopIdleManager(); process.exit(0) }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT',  shutdown)

} catch (err) {
  server.log.error(err)
  process.exit(1)
}

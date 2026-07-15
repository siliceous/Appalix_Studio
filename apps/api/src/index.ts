import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import { fileURLToPath } from 'url'
import path from 'path'
import { config } from './config.js'
import { initializeStorage } from './lib/storage-init.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import { slackRoutes }       from './routes/webhooks/slack.js'
import { ingestSource }      from './services/rag/ingestion.js'
import { supabase }          from './lib/supabase.js'
import { facebookRoutes }    from './routes/webhooks/facebook.js'
import { whatsappRoutes }    from './routes/webhooks/whatsapp.js'
import { googleChatRoutes }  from './routes/webhooks/google-chat.js'
import { wordpressRoutes }   from './routes/webhooks/wordpress.js'
import { telegramRoutes }    from './routes/webhooks/telegram.js'
import { shopifyRoutes }     from './routes/webhooks/shopify.js'
import { instagramRoutes }   from './routes/webhooks/instagram.js'
import { smsRoutes }                from './routes/webhooks/sms.js'
import { telnyxMessagingRoutes }   from './routes/webhooks/telnyx-messaging.js'
import { telnyxSmsRoutes }         from './routes/telnyx-sms.js'
import { shopifyOAuthRoutes } from './routes/shopify-oauth.js'
import { chatRoutes }        from './routes/chat/index.js'
import { copilotRoutes }     from './routes/copilot/index.js'
import { sageEmailRoutes }  from './routes/sage/emails.js'
import { botRoutes }        from './routes/bots/index.js'
import { formRoutes }       from './routes/forms/index.js'
import { startIdleManager, stopIdleManager }        from './services/sage-email-idle.js'
import { reanalyzePendingEmails }                   from './services/sage-email-sync.js'
import { analyzeConversationsForWorkspace }         from './services/conversation-analyze.js'
import { runMailchimpTwoWaySync }                   from './services/mailchimp-two-way-sync.js'
import { notificationRoutes }                       from './routes/notifications/index.js'
import { pollDueNotifications }                     from './services/sage-notifications.js'
import { liveRoutes }                               from './routes/live/index.js'
import { internalTrackRoutes }                      from './routes/internal/track.js'
import { walletInitRoutes }                         from './routes/internal/wallet-init.js'
import { billingRenewNumbersRoute }                 from './routes/internal/billing-renew-numbers.js'
import { complianceRoutes }                         from './routes/compliance.js'
import { handleLiveWsConnection }                   from './live/session-manager.js'
import { handleWidgetVoiceWs }                      from './live/widget-voice-handler.js'
import { telnyxVoiceRoutes }                        from './routes/webhooks/telnyx-voice.js'
import { handleTelnyxCallWs }                       from './live/telnyx-call-handler.js'
import { outboundCallRoutes }                       from './routes/outbound-calls.js'
import { resendWebhookRoutes }                      from './routes/webhooks/resend.js'
import { emailCampaignRoutes }                      from './routes/email/campaigns.js'
import { startAutomationScheduler }                 from './modules/automations/automationScheduler.js'
import { videoRoutes }                             from './routes/videos.js'
import { klingWebhookRoutes }                      from './routes/webhooks/kling.js'
import { startVideoJobPolling }                    from './modules/video-generation/job-poller.js'
// import { geminiVoiceRoutes }                       from './routes/gemini-voice.js'
import { talkingActorsRoutes }                     from './routes/talking-actors.js'
import { imageRoutes }                             from './routes/ai-studio/images.js'
import { videoRoutes as aiStudioVideoRoutes }      from './routes/ai-studio/videos.js'
import { cleanupRoutes }                           from './routes/ai-studio/cleanup.js'
import { deletionRoutes }                          from './routes/ai-studio/deletions.js'

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

await server.register(multipart, {
  limits: {
    fileSize: 104857600, // 100 MB
  },
})

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

// Debug: log all incoming POST requests to /webhooks/*
server.addHook('onRequest', async (request) => {
  if (request.method === 'POST' && request.url?.startsWith('/webhooks')) {
    console.log('[debug] incoming POST:', request.url, '| ip:', request.ip)
  }
})

// Platform webhooks — all mounted under /webhooks
await server.register(slackRoutes,      { prefix: '/webhooks' })
await server.register(facebookRoutes,   { prefix: '/webhooks' })
await server.register(whatsappRoutes,   { prefix: '/webhooks' })
await server.register(googleChatRoutes, { prefix: '/webhooks' })
await server.register(wordpressRoutes,  { prefix: '/webhooks' })
await server.register(telegramRoutes,   { prefix: '/webhooks' })
await server.register(shopifyRoutes,    { prefix: '/webhooks' })
await server.register(instagramRoutes,  { prefix: '/webhooks' })
await server.register(smsRoutes,              { prefix: '/webhooks' })
await server.register(telnyxMessagingRoutes,  { prefix: '/webhooks' })
await server.register(telnyxVoiceRoutes,      { prefix: '/webhooks' })
await server.register(resendWebhookRoutes,    { prefix: '/webhooks' })
await server.register(klingWebhookRoutes,     { prefix: '/webhooks' })
await server.register(telnyxSmsRoutes,        { prefix: '/telnyx' })
await server.register(shopifyOAuthRoutes)

// Chat + ingestion endpoints
await server.register(chatRoutes, { prefix: '/chat' })

// Internal copilot endpoint (server-to-server, service-key auth)
await server.register(copilotRoutes, { prefix: '/copilot' })

// Sage email routes (sync, send, rewrite — service-key auth)
await server.register(sageEmailRoutes, { prefix: '/sage/emails' })

// Bot conversation routes (AI analysis — service-key auth)
await server.register(botRoutes,  { prefix: '/bots' })
await server.register(formRoutes, { prefix: '/forms' })

// Notification push-token registration
await server.register(notificationRoutes, { prefix: '/notifications' })

// Sage Live Gateway — session creation (REST) + WebSocket bridge
await server.register(liveRoutes, { prefix: '/live' })

// Internal tracking endpoint — behavioral events from tracker.js
await server.register(internalTrackRoutes,        { prefix: '/internal' })
await server.register(walletInitRoutes,           { prefix: '/internal' })
await server.register(billingRenewNumbersRoute,   { prefix: '/internal' })
await server.register(complianceRoutes)

// Email marketing — campaigns, send, stats (service-key auth)
await server.register(emailCampaignRoutes, { prefix: '/email' })

// Video generation — text-to-video, image-to-video (Pro+ feature)
await server.register(videoRoutes, { prefix: '/api/videos' })

// Gemini voice integration — link voices to talking actors with lip-sync
// await server.register(geminiVoiceRoutes, { prefix: '/gemini-voice' })

// Talking actors management — upload and manage custom actors
await server.register(talkingActorsRoutes, { prefix: '/api/talking-actors' })

// AI Studio — image/video/avatar generation
await server.register(imageRoutes, { prefix: '/api/ai-studio' })
await server.register(aiStudioVideoRoutes, { prefix: '/api/ai-studio' })
await server.register(cleanupRoutes, { prefix: '/api/ai-studio' })
await server.register(deletionRoutes, { prefix: '/api/ai-studio' })

// Outbound voice calls — initiate campaigns and single calls
await server.register(outboundCallRoutes)

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

// tsx --watch restarts the process before the OS releases the socket.
// Retry once after a short wait to let the old process fully exit.
async function listenWithRetry() {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await server.listen({ port, host: '0.0.0.0' })
      return
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE' && attempt < 5) {
        console.warn(`[startup] Port ${port} in use — retrying in ${attempt * 300}ms (attempt ${attempt}/5)…`)
        await new Promise(r => setTimeout(r, attempt * 300))
      } else {
        throw err
      }
    }
  }
}

try {
  await listenWithRetry()
  console.log(`\n🚀  API server running on http://0.0.0.0:${port}`)

  // Initialize storage buckets
  await initializeStorage()

  // ── Gemini Live WebSocket gateway ──────────────────────────────────────
  // Fastify v5 doesn't use @fastify/websocket here — we hook the raw Node
  // http.Server upgrade event so WS lives on the same port as the REST API.
  // -----------------------------------------------------------------------
  try {
    const { WebSocketServer } = await import('ws')
    const wss = new WebSocketServer({ noServer: true })

    // Second WSS for widget voice — separate server so connections are routed cleanly
    const wssWidget = new WebSocketServer({ noServer: true })

    // Third WSS for Telnyx call media streaming (Telnyx connects TO us)
    const wssTelnyx = new WebSocketServer({ noServer: true })

    server.server.on('upgrade', (request: import('http').IncomingMessage, socket: import('net').Socket, head: Buffer) => {
      const url = new URL(request.url ?? '/', `http://localhost:${port}`)
      if (url.pathname === '/live/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request)
        })
      } else if (url.pathname === '/chat/voice-ws') {
        wssWidget.handleUpgrade(request, socket, head, (ws) => {
          wssWidget.emit('connection', ws, request)
        })
      } else if (url.pathname === '/telnyx/call-ws') {
        wssTelnyx.handleUpgrade(request, socket, head, (ws) => {
          wssTelnyx.emit('connection', ws, request)
        })
      } else {
        socket.destroy()
      }
    })

    wss.on('connection', handleLiveWsConnection)
    wssWidget.on('connection', (ws, req) => { void handleWidgetVoiceWs(ws, req) })
    wssTelnyx.on('connection', (ws, req) => { void handleTelnyxCallWs(ws, req) })

    // Keep-alive: ping every 30 s so Render's 55 s idle timeout never fires
    function keepAlive(server: InstanceType<typeof WebSocketServer>) {
      setInterval(() => {
        server.clients.forEach((ws) => {
          if ((ws as { isAlive?: boolean }).isAlive === false) { ws.terminate(); return }
          ;(ws as { isAlive?: boolean }).isAlive = false
          ws.ping()
        })
      }, 30_000)
      server.on('connection', (ws) => {
        ;(ws as { isAlive?: boolean }).isAlive = true
        ws.on('pong', () => { ;(ws as { isAlive?: boolean }).isAlive = true })
      })
    }
    keepAlive(wss)
    keepAlive(wssWidget)
    keepAlive(wssTelnyx)

    console.log(`   WS   /live/ws               (Sage Voice gateway)`)
    console.log(`   WS   /chat/voice-ws          (Widget Voice gateway)`)
    console.log(`   WS   /telnyx/call-ws         (Telnyx inbound call bridge)`)
  } catch {
    console.warn('[live-gateway] ws package not found — voice disabled. Run: npm i ws @google/genai in apps/api')
  }
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
  // Automation execution scheduler
  // Polls automation_executions for steps due to run.
  // ---------------------------------------------------------------
  startAutomationScheduler()

  // ---------------------------------------------------------------
  // Video generation job poller
  // Polls pending video generation jobs every 30s
  // (acts as fallback if webhook not received)
  // ---------------------------------------------------------------
  startVideoJobPolling()

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

  // ---------------------------------------------------------------
  // Activity & reminder pre-notification poller
  // Fires push + email 15 minutes before any scheduled activity or
  // reminder. Runs every 5 minutes so nothing is missed.
  // ---------------------------------------------------------------
  void pollDueNotifications()
  setInterval(() => void pollDueNotifications(), 5 * 60 * 1000)

  // Graceful shutdown — close HTTP server first so port is released before
  // the process exits. This prevents EADDRINUSE when tsx --watch restarts.
  const shutdown = async () => {
    stopIdleManager()
    try { await server.close() } catch {}
    process.exit(0)
  }
  process.once('SIGTERM', () => { void shutdown() })
  process.once('SIGINT',  () => { void shutdown() })

} catch (err) {
  server.log.error(err)
  process.exit(1)
}

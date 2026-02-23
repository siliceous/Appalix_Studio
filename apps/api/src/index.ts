import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { config } from './config.js'
import { slackRoutes }       from './routes/webhooks/slack.js'
import { facebookRoutes }    from './routes/webhooks/facebook.js'
import { whatsappRoutes }    from './routes/webhooks/whatsapp.js'
import { googleChatRoutes }  from './routes/webhooks/google-chat.js'
import { wordpressRoutes }   from './routes/webhooks/wordpress.js'
import { chatRoutes }        from './routes/chat/index.js'

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
  contentSecurityPolicy: false,  // handled by Next.js dashboard
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

// Chat + ingestion endpoints
await server.register(chatRoutes, { prefix: '/chat' })

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
  console.log(`   POST /chat/:id            (web widget)`)
  console.log(`   POST /chat/custom/:id     (custom API)`)
  console.log(`   POST /chat/ingest/:id     (RAG ingestion)\n`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}

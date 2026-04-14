/**
 * Sage Live Session Manager
 *
 * - createSession(): mints a one-time session token for the dashboard
 * - handleLiveWsConnection(): bridges client WebSocket ↔ Gemini Live session
 *
 * Protocol (client ↔ gateway):
 *   Client → { type: "audio", data: "<base64 PCM 16kHz mono>" }
 *   Client → { type: "text",  content: "..." }
 *   Gateway → { type: "audio",        data, mimeType }
 *   Gateway → { type: "text",         content }
 *   Gateway → { type: "tool_call",    name, args }
 *   Gateway → { type: "tool_result",  name, result }
 *   Gateway → { type: "turn_complete" }
 *   Gateway → { type: "interrupted" }
 *   Gateway → { type: "ready" }
 *   Gateway → { type: "error",        message }
 */

import { randomUUID }                from 'crypto'
import { WebSocket }                 from 'ws'
import type { IncomingMessage }      from 'http'
import { supabase }                  from '../lib/supabase.js'
import { routeToolCall, type ToolContext } from './tool-router.js'
import { SAGE_LIVE_FUNCTION_DECLARATIONS } from './tool-schema.js'

// ── In-memory session store (one-time tokens) ───────────────────────────────

interface VoiceConfig {
  voice_name?:              string
  language_code?:           string
  temperature?:             number
  output_transcription?:    boolean
  input_transcription?:     boolean
  enable_affective_dialog?: boolean
}

interface SessionMeta {
  workspaceId:   string
  userId:        string
  role:          string
  userName:      string
  workspaceName: string
  pageContext:   string
  voiceConfig:   VoiceConfig | null
  createdAt:     Date
}

const sessions = new Map<string, SessionMeta>()

// Purge sessions older than 5 minutes (tokens expire fast — they're one-time use)
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000
  for (const [id, meta] of sessions) {
    if (meta.createdAt.getTime() < cutoff) sessions.delete(id)
  }
}, 60_000)

export function createSession(meta: Omit<SessionMeta, 'createdAt'>): string {
  const id = `live_${randomUUID().replace(/-/g, '').slice(0, 16)}`
  sessions.set(id, { ...meta, createdAt: new Date() })
  return id
}


// ── WebSocket connection handler ────────────────────────────────────────────

export async function handleLiveWsConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const url       = new URL(req.url ?? '/', 'http://localhost')
  const sessionId = url.searchParams.get('session')

  if (!sessionId || !sessions.has(sessionId)) {
    send({ type: 'error', message: 'Invalid or expired session' })
    ws.close(1008, 'Unauthorised')
    return
  }

  // Consume the one-time token immediately
  const meta = sessions.get(sessionId)!
  sessions.delete(sessionId)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    send({ type: 'error', message: 'Voice AI not configured on this server. Add GEMINI_API_KEY.' })
    ws.close(1011, 'Server error')
    return
  }

  const ctx: ToolContext = {
    workspaceId: meta.workspaceId,
    userId:      meta.userId,
    role:        meta.role,
    userName:    meta.userName,
  }

  // Parse structured page context for entity resolution
  let pageCtxNote = `Page context: ${meta.pageContext}.`
  let focusedEntityNote = ''
  try {
    const ctxObj = JSON.parse(meta.pageContext) as Record<string, unknown>
    pageCtxNote = `Current page: ${String(ctxObj.route ?? '/')} (${String(ctxObj.pageType ?? 'unknown')}).`
    const fe = ctxObj.focusedEntity as { type: string; id: string } | undefined
    if (fe) {
      focusedEntityNote =
        `The user is currently viewing a ${fe.type} (id="${fe.id}"). ` +
        `When they say "this ${fe.type}", "this one", "the current one", or similar, resolve it to id="${fe.id}" — ` +
        `pass the id directly in tool args as ${fe.type}_id.`
    }
    // Append any counts/visible entities for awareness
    const counts = ctxObj.counts as Record<string, unknown> | undefined
    if (counts) pageCtxNote += ` Visible counts: ${JSON.stringify(counts)}.`
    const visibleEntities = ctxObj.visibleEntities as unknown[] | undefined
    if (visibleEntities?.length) {
      pageCtxNote += ` Visible entities: ${JSON.stringify(visibleEntities.slice(0, 10))}.`
    }
  } catch { /* non-JSON context — use raw string */ }

  const currentRoute = (() => {
    try { return (JSON.parse(meta.pageContext) as Record<string, unknown>).route as string ?? '/' } catch { return '/' }
  })()
  const onDashboard = currentRoute === '/dashboard'

  const systemPrompt =
    `You are Sage, a fast voice assistant for ${meta.workspaceName}. ` +
    `User: ${meta.userName}. Today: ${new Date().toISOString().slice(0, 10)}. ` +
    `${pageCtxNote} ` +
    `${focusedEntityNote} ` +
    `Rules: Be very brief (1-2 sentences max). Call tools immediately without preamble. ` +
    `Never guess at live data — always use tools for CRM queries. ` +
    `STAY-ON-PAGE RULE: Do NOT call navigate_to unless the user explicitly says "go to", "take me to", "open the X page", or "navigate to X". ` +
    `Asking about data (emails, SMS, calls, tickets, reminders, tasks, deals, stats) is NEVER a navigation request — use the right query tool and answer in place. ` +
    `EXPLICIT NAVIGATION TEST: Before calling navigate_to, verify the user's message contains a navigation verb ("go to", "take me to", "navigate to", "open the … page"). If absent, do NOT navigate. ` +
    `DASHBOARD-FIRST RULE: When on the dashboard, always show results in the activity feed (filter_activity_feed + list_* tools) rather than navigating away. ` +
    `Saying "show me SMS" → call filter_activity_feed with filter=sms. Saying "show emails today" → call filter_activity_feed with filter=email, date_range=today. ` +
    `SMS AWARENESS: The dashboard activity feed includes 6 types — email, bot (chat), sms, call (phone), form, ticket. ` +
    `Use list_sms to fetch SMS conversation summaries, list_phone_calls for phone/voice call summaries. ` +
    `These are stored as conversations with platform=sms or platform=voice respectively. ` +
    (onDashboard
      ? `DASHBOARD CONTEXT: The user is on the main dashboard which shows the activity feed (emails, bot chats, SMS, phone calls, forms, tickets) and the right-bar reminders/tasks feed. ` +
        `When they ask about counts or summaries (e.g. "how many emails", "any SMS?", "what calls came in", "what tickets are open", "any reminders"), ` +
        `call the appropriate tool (list_emails, list_sms, list_phone_calls, list_tickets, list_reminders, list_tasks, get_workspace_stats, get_today_plate) and answer verbally — stay on the dashboard. ` +
        `DASHBOARD OPEN RULE: When the user says "open", "show me", "pull up", or "show the email/bot/form/ticket from X" on the dashboard, ` +
        `call open_feed_item immediately with kind=email/bot/form/ticket and the query — this opens a popup on the current page without navigating away. ` +
        `Do NOT call list_emails first when the user just wants to open/view an item — call open_feed_item directly. ` +
        `Only navigate away if the user explicitly says "go to the email page" or similar. `
      : '') +
    `For navigation requests only, call navigate_to, open_deal, or open_pipeline immediately then confirm in one sentence. ` +
    `CONFIRMATION RULE: Before calling any mutation tool (move_deal_stage, assign_deal, create_deal, create_ticket, ` +
    `create_project_from_won_deal, create_reminder, update_contact, update_ticket, add_note, snooze_reminder, ` +
    `complete_task, add_deal_task, rename_conversation, assign_lead, set_lead_priority, update_lead, ` +
    `create_ticket_from_lead, create_deal_from_lead, delete_lead), ` +
    `first state what you are about to do in one sentence and ask "shall I go ahead?". ` +
    `Only call the tool after the user says yes, confirmed, or go ahead. ` +
    `For read-only tools (get_today_plate, get_workspace_stats, list_deals, list_tickets, list_projects, list_tasks, list_reminders, find_contact, navigate_to, open_deal, open_pipeline, list_emails, list_sms, list_phone_calls, read_email, open_email, open_feed_item, filter_activity_feed) call immediately — no confirmation needed. ` +
    `reply_to_email is a ONE-SHOT action — call it exactly once to open the reply compose window. Do NOT call it multiple times. ` +
    `EMAIL WORKFLOW: When asked to reply to, prioritize, assign, or delete a specific email and you don't have the email_id, call list_emails first. ` +
    `Exception: on the dashboard or email page, use open_feed_item or open_email directly — no list_emails needed for opening. ` +
    `When the user says "reply to this" without an email_id context, call list_emails first. ` +
    `BOT CREATION WALKTHROUGH: When the user says "create a bot", "help me create a bot", "walk me through creating a bot", "how do I make a bot", or anything similar, ` +
    `immediately call navigate_to with path="/bots/new", then begin guiding them through the 4-step wizard one step at a time. ` +
    `Speak each step out loud as one or two short sentences, pause and wait for the user to say "next", "done", "continue", or describe their choice before moving on. ` +
    `Here is the exact walkthrough script — follow it precisely: ` +
    `STEP 1 — Bot Type: Say "Step 1: choose your bot type. Do you want a customer-facing chatbot for your website or channels like WhatsApp and Slack, or an internal assistant just for your team?" ` +
    `Customer-facing = select Widget. Internal team assistant = select Internal (requires Pro plan). Wait for answer, then say "Got it — select [their choice] on screen, then say next." ` +
    `STEP 2 — Name & Description: Say "Step 2: give your bot a name — something like Support Bot or Sales Assistant. You can also add a short description of what it does. Say next when you've filled that in." ` +
    `STEP 3 — Behaviour: Say "Step 3: the system prompt — this tells the bot how to behave. For a [their bot type], a good starting point is already filled in. You can customise it or leave it as is. ` +
    `You can also set the response language here — leave it on auto to match the user's language, or pick a specific one. Say next when ready." ` +
    `If the user asks for help writing their system prompt, ask "What should the bot focus on — support, sales, FAQs, something else?" then suggest a concise prompt based on their answer. ` +
    `STEP 4 — Features & Fine-tuning: Say "Step 4, the last one: features. ` +
    `Knowledge Base lets the bot answer from your uploaded docs — great for FAQs. ` +
    `Memory keeps conversation history so the bot remembers context. ` +
    `Agent Mode lets it do multi-step tasks. ` +
    `Max tokens controls response length — 1024 is a good default. ` +
    `The creativity slider goes from 0 (precise and consistent) to 1 (more varied) — 0.7 is the default. ` +
    `Set what you need and hit Create Bot." ` +
    `After all 4 steps: Say "That's it! Hit Create Bot and your bot will be live. I can help you connect it to your website or channels next if you like." ` +
    `IMPORTANT: During the walkthrough, keep each step to 2-3 sentences max. Never skip ahead. Never summarise all steps at once. ` +
    `WALKTHROUGH STEP RULE — CRITICAL: Whenever you are in a walkthrough (integration setup, bot creation, or any guided flow), ` +
    `you MUST speak ONLY ONE step at a time, then STOP and say "Say 'next' when you're ready." ` +
    `Do NOT speak the next step until the user says 'next', 'ready', 'continue', 'done', 'ok', or 'go ahead'. ` +
    `This rule overrides everything else. No exceptions. Do not list multiple steps. Do not summarise the remaining steps. Speak one, stop, wait. ` +

    `INTEGRATION WALKTHROUGH: When the user asks to connect any platform or integration, ` +
    `first ask which platform if not already stated. Once they name it, call navigate_to to the correct path, ` +
    `then speak Step 1 only and STOP. Wait for confirmation before speaking Step 2, and so on. ` +

    `[SLACK] path=/integrations/new?platform=slack | ` +
    `Step 1: "Enter a name for this integration — like 'Slack Support' — and choose which bot should handle Slack messages. Say next when done." STOP. ` +
    `Step 2: "Click Connect with Slack. You'll be redirected to Slack — log in and approve the permissions. Say next once you're back." STOP. ` +
    `Step 3: "You're on the setup page now. You can optionally pick specific Slack channels for the bot to listen to using the channel picker. That's it — your bot is live on Slack." END. ` +

    `[FACEBOOK MESSENGER] path=/integrations/new?platform=facebook_messenger | ` +
    `Step 1: "Enter a name and choose which bot should handle Messenger. Say next when done." STOP. ` +
    `Step 2: "Click Connect with Facebook. A login window will appear — log in and approve the messaging permissions. Say next once approved." STOP. ` +
    `Step 3: "If you manage multiple Facebook pages, pick the one you want the bot on. Say next when selected." STOP. ` +
    `Step 4: "On the setup page you'll see a webhook URL and verify token. Go to your Meta App, open Messenger Settings, Webhooks, paste them in, and subscribe to the messages field. Say next when done." STOP. ` +
    `Step 5: "All set — your bot is now live on Facebook Messenger." END. ` +

    `[WHATSAPP] path=/integrations/new?platform=whatsapp | ` +
    `Step 1: "Enter a name and choose your bot. Say next when done." STOP. ` +
    `Step 2: "Click Connect with WhatsApp. Log in to your Meta account and approve WhatsApp Business permissions. Say next once approved." STOP. ` +
    `Step 3: "On the setup page you'll see a callback URL and verify token. Go to your Meta App, open WhatsApp, Configuration, Webhooks, paste them in and subscribe to the messages field. Say next when done." STOP. ` +
    `Step 4: "Make sure your WhatsApp Business phone number ID is saved in the integration settings. Your bot is now live on WhatsApp." END. ` +

    `[WORDPRESS] path=/integrations/new?platform=wordpress | ` +
    `Step 1: "Enter your WordPress site URL and a name, then click Create Integration. Say next when done." STOP. ` +
    `Step 2: "On the setup page, download the Appalix Chat plugin ZIP. Say next when you have it." STOP. ` +
    `Step 3: "In WordPress Admin, go to Plugins, Add New, Upload Plugin, and upload the ZIP. Activate it. Say next when activated." STOP. ` +
    `Step 4: "Go to Settings, Appalix Chat, and paste the API Endpoint URL and API Key shown on this page. Save. Your chat widget is now live." END. ` +

    `[WEB WIDGET] path=/integrations/new?platform=web_widget | ` +
    `Step 1: "Enter a name, choose your bot, and optionally set allowed origins to restrict which domains can load the widget. Click Create Integration. Say next when done." STOP. ` +
    `Step 2: "On the setup page you'll see a two-line embed snippet. Copy it and paste it just before the closing body tag on your website. The widget will appear immediately — no restart needed." END. ` +

    `[TELEGRAM] path=/integrations/new?platform=telegram | ` +
    `Step 1: "Open Telegram and message @BotFather. Send /newbot, give it a name and username. BotFather will give you a bot token. Say next when you have it." STOP. ` +
    `Step 2: "Paste that bot token in the form, give the integration a name, choose your bot, and click Create Integration. Say next when done." STOP. ` +
    `Step 3: "The webhook is registered automatically. Open Telegram, find your bot, and send it a message — it will respond through Appalix." END. ` +

    `[SHOPIFY] path=/integrations/new?platform=shopify | ` +
    `Note: requires Pro plan or higher — if user is on a lower plan say "Shopify requires a Pro plan. You can upgrade in Settings." ` +
    `Step 1: "Enter your Shopify store domain — just the store name like 'mystore' is fine. Choose your bot and click Connect with Shopify. Say next when done." STOP. ` +
    `Step 2: "You'll be redirected to Shopify — log in and approve permissions for orders, customers, and the chat widget. Say next once approved." STOP. ` +
    `Step 3: "Appalix has automatically registered order webhooks and injected the chat widget into your store — no theme editing needed. Say next to continue." STOP. ` +
    `Step 4: "On the setup page, enable Tools on your bot so it can answer order and shipping questions, and add a Shopify context line to your bot's system prompt. You're all set." END. ` +

    `[GOOGLE CHAT] path=/integrations/new?platform=google_chat | ` +
    `Step 1: "Go to Google Cloud Console, create a service account, and download its JSON key file. Say next when you have it." STOP. ` +
    `Step 2: "Paste the full JSON content into the form, give the integration a name, choose your bot, and click Create Integration. Say next when done." STOP. ` +
    `Step 3: "On the setup page you'll see an HTTP endpoint URL. In Google Cloud Console, open Chat API configuration, set Connection type to HTTP Endpoint URL and paste it in. Done." END. ` +

    `[CUSTOM API] path=/integrations/new?platform=custom_api | ` +
    `Step 1: "Enter a name, choose your bot, and click Create Integration — an API key is generated automatically. Say next when done." STOP. ` +
    `Step 2: "On the setup page you'll see your endpoint URL and API key. Include the API key in the x-api-key header on all your HTTP requests. You're ready to send and receive messages programmatically." END. ` +

    `[GMAIL] path=/integrations | ` +
    `Step 1: "On the integrations page, find the Email section and click Connect Gmail. Say next when you see the Google login." STOP. ` +
    `Step 2: "Sign in to your Google account and approve access. Sage will start syncing your inbox automatically. You can also set your email signature from this page." END. ` +

    `[MICROSOFT / OUTLOOK] path=/integrations | ` +
    `Step 1: "On the integrations page, find the Email section and click Connect Microsoft. Say next when you see the Microsoft login." STOP. ` +
    `Step 2: "Sign in with your Microsoft or Office 365 account and approve the permissions. Sage will sync your Outlook inbox and let you send from your address." END. ` +

    `[STRIPE] path=/integrations | ` +
    `Step 1: "On the integrations page, find the Payments section and click Connect Stripe. Say next when redirected to Stripe." STOP. ` +
    `Step 2: "Log in to Stripe and authorise the connection. Once done, you can create and send invoices directly from your deals in Sage." END. ` +
    `Alternate: "If you prefer, paste your Stripe Secret Key and Publishable Key from Stripe Dashboard under Developers, API Keys." ` +

    `[HUBSPOT] path=/integrations | Step 1: "In the CRM section of any integration's settings, paste your HubSpot Private App token. Get it from HubSpot under Settings, Integrations, Private Apps — you need the crm.objects.contacts.write scope. Say next when done." STOP. Step 2: "Save the settings. New leads captured by your bot will now sync automatically to HubSpot contacts." END. ` +
    `[SALESFORCE] path=/integrations | Step 1: "Paste your Salesforce OAuth access token and your instance URL — like yourorg.my.salesforce.com. Say next when done." STOP. Step 2: "Save. Lead records will now be created in Salesforce automatically." END. ` +
    `[ZOHO CRM] path=/integrations | Step 1: "Paste your Zoho OAuth access token from Zoho Developer Console, Self Client. You need the ZohoCRM.modules.leads.CREATE scope. Say next when done." STOP. Step 2: "Save. Leads will now be pushed to Zoho CRM automatically." END. ` +
    `[INTERCOM] path=/integrations | Step 1: "Paste your Intercom Access Token from Intercom Settings, Developer Hub, Your App, Authentication. Say next when done." STOP. Step 2: "Save. Visitors who share contact details will be created as Intercom leads instantly." END. ` +
    `[MONDAY] path=/integrations | Step 1: "Paste your Monday API token and the Board ID where you want leads to appear. Say next when done." STOP. Step 2: "Save. New leads will create board items in Monday automatically." END. ` +
    `[ZAPIER AUTOMATION] path=/integrations | Step 1: "In Zapier, create a new Zap and choose Webhooks by Zapier as the trigger — select Catch Hook and copy the URL it gives you. Say next when you have the URL." STOP. Step 2: "Paste that URL into the Zapier field on the integrations page and save. Sage will now trigger your Zap on events like lead captured, deal created, and stage changed." END. ` +
    `[MAKE] path=/integrations | Step 1: "In Make, create a scenario and add a Custom Webhook module. Copy the webhook URL and say next." STOP. Step 2: "Paste the URL into the Make field on the integrations page and save. Your scenario will now trigger on Sage events." END. ` +
    `[FRESHDESK] path=/integrations | Step 1: "Enter your Freshdesk domain — like yourcompany.freshdesk.com. Say next when done." STOP. Step 2: "Enter your API key from Freshdesk Profile Settings and save. Sage can now create tickets and sync status to your timeline." END. ` +
    `[ZENDESK] path=/integrations | Step 1: "Enter your Zendesk subdomain and agent email. Say next when done." STOP. Step 2: "Enter your API token from Zendesk Admin under Channels, API and save. Tickets will now sync between Sage and Zendesk." END. ` +
    `[MAILCHIMP] path=/integrations | Step 1: "Click Connect Mailchimp on the integrations page. You'll be redirected to Mailchimp — log in and approve access. Say next when back." STOP. Step 2: "Toggle auto-sync to keep your Mailchimp audience updated automatically as new contacts come in." END. ` +
    `[ACTIVECAMPAIGN] path=/integrations | Step 1: "Paste your ActiveCampaign API URL — like youraccountname.api-us1.com. Say next when done." STOP. Step 2: "Paste your API key from ActiveCampaign Settings and save. Toggle auto-sync to push contacts to your lists." END. ` +
    `[KIT / CONVERTKIT] path=/integrations | Step 1: "Paste your Kit v4 API key from Kit Settings under Developer. Important: use a v4 key, not the older v3 key. Say next when done." STOP. Step 2: "Save and toggle auto-sync. New contacts will be added as subscribers automatically." END. ` +
    `[KLAVIYO] path=/integrations | Step 1: "Paste your Klaviyo Private API key — it needs Lists and Profiles Full Access. Say next when done." STOP. Step 2: "Paste your List ID from the list's URL in Klaviyo and save. Toggle auto-sync to keep your list updated." END. ` +
    `[CONSTANT CONTACT] path=/integrations | Step 1: "Click Connect Constant Contact. Log in and approve contact data access. Done." END. ` +
    `[TYPEFORM] path=/integrations | Step 1: "Paste your Typeform Personal Access Token from Typeform Account settings. Say next when done." STOP. Step 2: "Paste your form URL or ID. Appalix registers the webhook automatically — no manual setup in Typeform needed. Save and you're done." END. ` +
    `[GRAVITY FORMS] path=/integrations | Step 1: "Copy your Gravity Forms webhook URL from the integrations page. Say next when you have it." STOP. Step 2: "In WordPress, install the Gravity Forms Webhooks Add-On. Add a Webhook feed on your form and paste the URL in. Save." END. ` +
    `[GOOGLE FORMS] path=/integrations | Step 1: "Copy your Google Forms webhook URL from the integrations page. Say next when you have it." STOP. Step 2: "In Google Forms, open the script editor and add an Apps Script form-submit trigger pointing to that URL. No paid add-ons needed." END. ` +
    `[FLUENT FORMS] path=/integrations | Step 1: "Copy your Fluent Forms webhook URL from the integrations page. Say next when you have it." STOP. Step 2: "In Fluent Forms, add a Webhook feed on your form and paste the URL in. Save. Use the Test button on the integrations page to verify." END. ` +
    `[GOOGLE ADS LEADS] path=/integrations | Step 1: "Copy the webhook URL and key from the integrations page. Say next when you have them." STOP. Step 2: "In Google Ads, go to your Lead Form Extension settings, find the Webhook section, and paste them in. Leads will now arrive in real time." END. ` +
    `[META LEAD ADS] path=/integrations | Step 1: "Click Connect Meta Leads on the integrations page. A popup will appear — log in to Facebook and approve leads retrieval and ads management permissions. Say next when done." STOP. Step 2: "Leads from your Facebook and Instagram Lead Ad forms will now flow in automatically." END. ` +
    `[LINKEDIN LEADS] Say "LinkedIn Lead Gen Forms is coming soon — click Connect LinkedIn to register your interest." ` +
    `[TIKTOK LEADS] Say "TikTok Lead Ads is coming soon — click Connect TikTok to register your interest." ` +

    `GENERAL INTEGRATION HELP: When the user asks "what integrations do you have", "what can I connect", or "show me integrations", navigate to /integrations and say: ` +
    `"We have over 35 integrations: chat channels — Slack, WhatsApp, Facebook Messenger, Telegram, WordPress, Web Widget; ` +
    `email — Gmail and Outlook; payments — Stripe; CRM — HubSpot, Salesforce, Zoho, Intercom, Monday; ` +
    `tickets — Freshdesk and Zendesk; automation — Zapier and Make; ` +
    `email marketing — Mailchimp, ActiveCampaign, Kit, Klaviyo, Constant Contact; ` +
    `forms — Typeform, Gravity Forms, Google Forms, Fluent Forms; ` +
    `lead ads — Google, Meta, LinkedIn, TikTok. Which one would you like to set up?"`

  let geminiWs: WebSocket | null = null
  let closed = false

  function send(data: unknown) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  function sendToGemini(data: unknown) {
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.send(JSON.stringify(data))
    }
  }

  // ── Connect to Gemini Live via raw WebSocket ──────────────────────────────

  const voiceName = meta.voiceConfig?.voice_name ?? 'Aoede'

  const geminiUrl =
    'wss://generativelanguage.googleapis.com' +
    '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent' +
    `?key=${apiKey}`

  try {
    geminiWs = new WebSocket(geminiUrl)
  } catch (err) {
    console.error('[live-gateway] Gemini connect failed:', err)
    send({ type: 'error', message: 'Failed to start voice session. Check GEMINI_API_KEY.' })
    ws.close(1011, 'Upstream error')
    return
  }

  geminiWs.on('open', () => {
    sendToGemini({
      setup: {
        model: 'models/gemini-3.1-flash-live-preview',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ functionDeclarations: SAGE_LIVE_FUNCTION_DECLARATIONS }],
      },
    })
  })

  geminiWs.on('error', (err) => {
    console.error('[gemini-live] ws error:', err)
    if (!closed) {
      send({ type: 'error', message: 'Gemini session error — please reconnect.' })
    }
  })

  geminiWs.on('close', (code, reason) => {
    const r = Buffer.isBuffer(reason) ? reason.toString() : String(reason ?? '')
    console.warn(`[gemini-live] closed — code=${code} reason="${r}"`)
    if (!closed) {
      closed = true
      send({ type: 'error', message: r || 'Voice session ended unexpectedly — please reconnect.' })
      if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'Session ended')
    }
  })

  geminiWs.on('message', async (raw: Buffer | string) => {
    try {
      const message = JSON.parse(
        typeof raw === 'string' ? raw : raw.toString(),
      ) as Record<string, unknown>

      // Setup complete
      if ('setupComplete' in message) {
        send({ type: 'ready' })
        return
      }

      // ── Tool calls ────────────────────────────────────────────────────
      const toolCall = message.toolCall as {
        functionCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>
      } | undefined

          // Tools that mutate state and should trigger a UI refresh
          const MUTATION_TOOLS = new Set([
            'move_deal_stage', 'assign_deal', 'create_deal',
            'create_ticket', 'create_project_from_won_deal', 'create_reminder',
            'update_contact', 'update_ticket', 'add_note', 'snooze_reminder',
            'ignore_email', 'set_email_priority', 'assign_email', 'delete_email', 'reply_to_email',
            'complete_task', 'add_deal_task', 'rename_conversation',
            'assign_lead', 'set_lead_priority', 'create_ticket_from_lead', 'create_deal_from_lead', 'delete_lead', 'update_lead',
          ])

          if (toolCall?.functionCalls?.length) {
            for (const call of toolCall.functionCalls) {
              send({ type: 'tool_call', name: call.name, args: call.args })

              // Navigate: push URL to client browser before routing
              if (call.name === 'navigate_to' && call.args?.path) {
                send({ type: 'navigate', url: String(call.args.path) })
              }

              // Open email: open popup on dashboard/email-page, or navigate elsewhere
              if (call.name === 'open_email') {
                const emailId = call.args?.email_id ? String(call.args.email_id) : null
                let eid = emailId
                if (!eid && call.args?.sender_name) {
                  const { data: emails } = await supabase
                    .from('sage_emails')
                    .select('id')
                    .eq('workspace_id', ctx.workspaceId)
                    .eq('direction', 'inbound')
                    .eq('is_trashed', false)
                    .or(`from_name.ilike.%${String(call.args.sender_name)}%,from_address.ilike.%${String(call.args.sender_name)}%`)
                    .order('received_at', { ascending: false })
                    .limit(1)
                  eid = emails?.[0]?.id ?? null
                }
                if (eid) {
                  const onEmailPage = currentRoute.startsWith('/dashboard/email')
                  ;(onDashboard || onEmailPage)
                    ? send({ type: 'open_dashboard_item', kind: 'email', id: eid })
                    : send({ type: 'navigate', url: `/dashboard/email?emailId=${eid}` })
                } else {
                  send({ type: 'navigate', url: '/dashboard/email' })
                }
              }

              // open_feed_item: open popup on dashboard, navigate elsewhere
              if (call.name === 'open_feed_item') {
                const kind  = call.args?.kind  ? String(call.args.kind)  : null
                const query = call.args?.query ? String(call.args.query).trim() : null
                let itemId  = call.args?.item_id ? String(call.args.item_id) : null

                if (!itemId && query && kind) {
                  if (kind === 'email') {
                    const { data } = await supabase
                      .from('sage_emails').select('id')
                      .eq('workspace_id', ctx.workspaceId).eq('direction', 'inbound').eq('is_trashed', false)
                      .or(`from_name.ilike.%${query}%,from_address.ilike.%${query}%,subject.ilike.%${query}%`)
                      .order('received_at', { ascending: false }).limit(1)
                    itemId = data?.[0]?.id ?? null
                  } else if (kind === 'bot') {
                    const { data } = await supabase
                      .from('conversations').select('id')
                      .eq('workspace_id', ctx.workspaceId)
                      .ilike('title', `%${query}%`)
                      .order('last_activity_at', { ascending: false }).limit(1)
                    itemId = data?.[0]?.id ?? null
                  } else if (kind === 'form') {
                    const { data } = await supabase
                      .from('sage_form_submissions').select('id')
                      .eq('workspace_id', ctx.workspaceId)
                      .or(`fields->>name.ilike.%${query}%,fields->>email.ilike.%${query}%`)
                      .order('created_at', { ascending: false }).limit(1)
                    itemId = data?.[0]?.id ?? null
                  } else if (kind === 'ticket') {
                    const { data } = await supabase
                      .from('sage_tickets').select('id')
                      .eq('workspace_id', ctx.workspaceId)
                      .ilike('title', `%${query}%`)
                      .order('created_at', { ascending: false }).limit(1)
                    itemId = data?.[0]?.id ?? null
                  }
                }

                if (itemId && kind) {
                  const onEmailPage = currentRoute.startsWith('/dashboard/email')
                  const canPopup = onDashboard || (onEmailPage && kind === 'email')
                  if (canPopup) {
                    send({ type: 'open_dashboard_item', kind, id: itemId })
                  } else {
                    const urlMap: Record<string, string> = {
                      email:  `/dashboard/email?emailId=${itemId}`,
                      bot:    `/dashboard/bots`,
                      form:   `/dashboard/forms`,
                      ticket: `/dashboard/tickets`,
                    }
                    send({ type: 'navigate', url: urlMap[kind] ?? '/dashboard' })
                  }
                }
              }

              // Reply to email: open compose popup on dashboard/email-page
              if (call.name === 'reply_to_email' && call.args?.email_id) {
                const onEmailPage = currentRoute.startsWith('/dashboard/email')
                ;(onDashboard || onEmailPage)
                  ? send({ type: 'open_dashboard_item', kind: 'email', id: String(call.args.email_id), action: 'reply' })
                  : send({ type: 'navigate', url: `/dashboard/email?emailId=${String(call.args.email_id)}&action=reply` })
              }

              // Filter activity feed: switch feed view to show a specific type (+ optional date range)
              if (call.name === 'filter_activity_feed' && call.args?.filter) {
                send({
                  type:       'filter_activity_feed',
                  filter:     String(call.args.filter),
                  date_range: call.args.date_range ? String(call.args.date_range) : undefined,
                })
              }

              // Open deal: look up pipeline and navigate to board with deal slide-over
              if (call.name === 'open_deal' && call.args?.deal_name) {
                const { data: deals } = await supabase
                  .from('sage_deals')
                  .select('id, title, pipeline_id')
                  .eq('workspace_id', ctx.workspaceId)
                  .ilike('title', `%${String(call.args.deal_name)}%`)
                  .limit(1)
                const deal = deals?.[0] as { id: string; title: string; pipeline_id: string | null } | undefined
                if (deal?.pipeline_id) {
                  send({ type: 'navigate', url: `/sage/pipelines/${deal.pipeline_id}?deal=${deal.id}` })
                } else if (deal) {
                  send({ type: 'navigate', url: `/sage/pipelines` })
                }
              }

              // Open pipeline by name: look up and navigate to its board
              if (call.name === 'open_pipeline' && call.args?.pipeline_name) {
                const { data: pipelines } = await supabase
                  .from('sage_pipelines')
                  .select('id, name')
                  .eq('workspace_id', ctx.workspaceId)
                  .ilike('name', `%${String(call.args.pipeline_name)}%`)
                  .limit(1)
                const pipeline = pipelines?.[0] as { id: string; name: string } | undefined
                if (pipeline) {
                  send({ type: 'navigate', url: `/sage/pipelines/${pipeline.id}` })
                } else {
                  send({ type: 'navigate', url: `/sage/pipelines` })
                }
              }

              const result = await routeToolCall(call.name, call.args ?? {}, ctx)
              send({ type: 'tool_result', name: call.name, result })

              sendToGemini({
                toolResponse: {
                  functionResponses: [{ id: call.id, name: call.name, response: { output: result } }],
                },
              })

              // Refresh the UI after mutations so changes are visible immediately
              if (MUTATION_TOOLS.has(call.name)) {
                setTimeout(() => send({ type: 'refresh' }), 800)
              }

              // Activity log (non-blocking — void intentional)
              void supabase.from('sage_activity_log').insert({
                workspace_id: ctx.workspaceId,
                entity_type:  'voice',
                entity_id:    null,
                event_type:   'voice_tool_call',
                payload:      { tool: call.name, args: call.args, result: result.slice(0, 300) },
                user_id:      ctx.userId,
              })
            }
          }

          // ── Audio + text response ───────────────────────────────────────
          const serverContent = message.serverContent as {
            modelTurn?: {
              parts?: Array<{
                text?:       string
                inlineData?: { mimeType: string; data: string }
              }>
            }
            turnComplete?: boolean
            interrupted?:  boolean
          } | undefined

          if (serverContent?.modelTurn?.parts) {
            for (const part of serverContent.modelTurn.parts) {
              if (part.inlineData) {
                send({ type: 'audio', data: part.inlineData.data, mimeType: part.inlineData.mimeType })
              }
              if (part.text) {
                send({ type: 'text', content: part.text })
              }
            }
          }

          if (serverContent?.turnComplete) send({ type: 'turn_complete' })
          if (serverContent?.interrupted)  send({ type: 'interrupted' })
    } catch {
      // Ignore malformed frames
    }
  })

  // ── Forward client → Gemini ───────────────────────────────────────────────

  ws.on('message', (data: Buffer) => {
    if (!geminiWs || closed || geminiWs.readyState !== WebSocket.OPEN) return
    try {
      const msg = JSON.parse(data.toString()) as {
        type: string; data?: string; content?: string
      }

      if (msg.type === 'audio' && msg.data) {
        sendToGemini({
          realtimeInput: { audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' } },
        })
      } else if (msg.type === 'text' && msg.content) {
        sendToGemini({ realtimeInput: { text: msg.content } })
      }
    } catch {
      // Ignore malformed frames
    }
  })

  ws.on('close', () => {
    closed = true
    try { geminiWs?.close() } catch {}
  })

  ws.on('error', (err) => {
    console.error('[live-gateway] client ws error:', err)
    closed = true
    try { geminiWs?.close() } catch {}
  })
}

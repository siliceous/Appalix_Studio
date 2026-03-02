/**
 * Sage Guide Tools
 *
 * Two tools for the Sage copilot:
 *
 * 1. sageGetGuide(topic) — returns structured step-by-step setup content for
 *    any Appalix feature. Content mirrors the resource tutorial pages so the AI
 *    can walk users through every setup flow conversationally.
 *
 * 2. sageCheckFeatureStatus(workspaceId, feature) — queries the live database
 *    to verify whether a specific feature is configured/connected, enabling the
 *    AI to perform real-time progress checks after each step.
 */

import { supabase } from '../lib/supabase.js'

// -----------------------------------------------------------------------
// Guide content — mirrors /resources/* tutorial pages
// To add a future tutorial: add a new key to GUIDES below.
// -----------------------------------------------------------------------

interface GuideStep {
  step:   number
  title:  string
  detail: string
}

interface Guide {
  title:      string
  summary:    string
  requires?:  string        // prerequisite note
  steps:      GuideStep[]
  tips?:      string[]
  verifyWith?: string       // sage_check_feature_status feature key to confirm
}

const GUIDES: Record<string, Guide> = {

  // ────────────────────────────────────────────────────────────────
  // Email connections
  // ────────────────────────────────────────────────────────────────

  gmail: {
    title:     'Connect Gmail to Sage',
    summary:   'Connecting Gmail gives you a full AI-powered email inbox inside Sage. Sage reads your inbound emails via IMAP, scores each for priority, generates three AI reply drafts, and sends outbound email via SMTP — all using a single App Password.',
    requires:  'Pro plan or above. 2-Step Verification must be enabled on your Google Account.',
    verifyWith: 'gmail',
    steps: [
      {
        step:   1,
        title:  'Enable 2-Step Verification on your Google Account',
        detail: 'Go to myaccount.google.com → Security → 2-Step Verification and turn it on. If it is already enabled, skip this step.',
      },
      {
        step:   2,
        title:  'Generate a Gmail App Password',
        detail: 'Go to myaccount.google.com/apppasswords → type "Appalix Sage" as the app name → click Create. Google will show a 16-character password (four groups of four letters). Copy it — it is only shown once.',
      },
      {
        step:   3,
        title:  'Paste credentials into Sage',
        detail: 'In Appalix, go to Sage → Integrations. Find the Gmail card under Email and click Connect. Enter your Gmail address and paste the App Password. Click Save & Connect. A green Connected badge will appear if successful.',
      },
      {
        step:   4,
        title:  'Open the AI Email Inbox',
        detail: 'In the Sage sidebar, click Emails. Click the Sync button. Sage fetches your latest emails from Gmail, runs AI analysis on each (priority score, summary, key insights), and shows them with High / Medium / Low badges.',
      },
      {
        step:   5,
        title:  'Reply with AI drafts and attachments',
        detail: 'Click any email. The right panel shows AI Insights and three pre-written reply drafts (Professional, Friendly, Concise). Click a tone to load it. Use AI Rewrite with a custom instruction (e.g. "make it shorter"). Attach files with the File button, Stripe invoices with the Invoice button, or branded proposals with the Proposal button. Click Send.',
      },
    ],
    tips: [
      'The App Password only grants IMAP/SMTP access — not full Google Account access.',
      'Sage syncs on demand. Click Sync whenever you want to pull new emails.',
      'AI analysis uses workspace credits — each email analysed costs a small amount.',
    ],
  },

  microsoft: {
    title:     'Connect Microsoft Outlook to Sage',
    summary:   'Connecting Outlook or Office 365 gives you the same full AI email inbox as Gmail. Sage reads inbound emails via IMAP (outlook.office365.com:993) and sends via SMTP (smtp.office365.com:587).',
    requires:  'Pro plan or above. Two-step verification must be enabled on your Microsoft Account.',
    verifyWith: 'microsoft',
    steps: [
      {
        step:   1,
        title:  'Enable two-step verification on your Microsoft Account',
        detail: 'Go to account.microsoft.com → Security → Advanced security options → turn on Two-step verification. Skip if already enabled.',
      },
      {
        step:   2,
        title:  'Generate a Microsoft App Password',
        detail: 'In your Microsoft Account, go to Security → Advanced security options → App passwords → Create a new app password. Name it "Appalix Sage". Copy the generated password.',
      },
      {
        step:   3,
        title:  'Paste credentials into Sage',
        detail: 'In Appalix, go to Sage → Integrations. Find the Microsoft / Outlook card and click Connect. Enter your email address and the App Password. Click Save & Connect.',
      },
      {
        step:   4,
        title:  'Sync and use the AI Email Inbox',
        detail: 'Go to Sage → Emails → click Sync. Your Outlook emails appear with priority scores and AI reply drafts. Reply directly from Sage with text or attachments. Sent emails appear in your Outlook Sent Items.',
      },
    ],
    tips: [
      'Microsoft 365 admins may need to enable SMTP AUTH and IMAP access for your mailbox in Exchange Admin Centre.',
      'Shared mailboxes do not support App Passwords — connect an individual account with Send As permission instead.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // CRM Pipeline
  // ────────────────────────────────────────────────────────────────

  pipeline: {
    title:     'Create a Sage CRM Pipeline',
    summary:   'A pipeline is a Kanban board of stages that deals (leads) move through — for example Prospecting → Qualified → Proposal → Closed Won. You can create multiple pipelines (e.g. Sales, Support, Recruitment).',
    verifyWith: 'has_pipelines',
    steps: [
      {
        step:   1,
        title:  'Open Sage → Pipelines',
        detail: 'In the Sage sidebar, click Pipelines. If you have no pipelines yet, you will see a prompt to create your first one.',
      },
      {
        step:   2,
        title:  'Choose a template',
        detail: 'Click New Pipeline. Choose a template (Sales, Support, Recruitment, Custom, etc.) that matches your use case. Templates pre-fill stage names you can customise.',
      },
      {
        step:   3,
        title:  'Name the pipeline',
        detail: 'Type a name for your pipeline (e.g. "Q1 Sales", "Enterprise Pipeline"). Click Next.',
      },
      {
        step:   4,
        title:  'Customise stages',
        detail: 'You will see the default stages from the template. You can rename, reorder (drag the ⠿ handle), add new stages (+ Add Stage), or delete stages (× button). Click Create Pipeline when done.',
      },
      {
        step:   5,
        title:  'Add your first deal',
        detail: 'On the pipeline board, click "+ Add a Lead" in the header. Fill in the deal name, contact, value, close date, priority, and any other fields. Click Save. The deal appears as a card in the first stage.',
      },
    ],
    tips: [
      'You can drag deal cards between columns to move them through stages.',
      'Use Manage Stages in the board header to rename or add stages after creation.',
      'The AI can move deals for you — try saying "Move Acme to Qualified".',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Contacts
  // ────────────────────────────────────────────────────────────────

  contacts: {
    title:     'Add and Manage Contacts in Sage',
    summary:   'Contacts are the people you do business with. Deals link to contacts, emails auto-match contacts by email address, and the AI can search contacts by name or email.',
    verifyWith: 'has_contacts',
    steps: [
      {
        step:   1,
        title:  'Go to Sage → Contacts',
        detail: 'Click Contacts in the Sage sidebar.',
      },
      {
        step:   2,
        title:  'Add a contact',
        detail: 'Click New Contact. Fill in name (required), email, phone, company, and any tags. Click Save.',
      },
      {
        step:   3,
        title:  'Link to deals',
        detail: 'When creating or editing a deal, use the Primary Contact dropdown to link it to a contact. This enables the AI to generate proposals for that contact and auto-match inbound emails.',
      },
      {
        step:   4,
        title:  'Search contacts via the AI',
        detail: 'You can ask the Sage AI "find contact Alex", "look up contacts at Acme Corp", or "show me John\'s email address" — the AI will query your contacts in real time.',
      },
    ],
    tips: [
      'Contacts are auto-created when the chat widget captures a visitor\'s name and email (if AI Lead Capture is enabled on your bot).',
      'Email sync auto-links inbound emails to contacts by matching the sender email address.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Deals
  // ────────────────────────────────────────────────────────────────

  deals: {
    title:     'Create and Manage Deals',
    summary:   'A deal (or lead) represents an opportunity in your pipeline. Each deal has a stage, value, close date, priority, and activity log. The AI can create notes, move deals, update details, and set reminders.',
    verifyWith: 'has_deals',
    steps: [
      {
        step:   1,
        title:  'Create a deal',
        detail: 'On the pipeline board, click "+ Add a Lead". Fill in: Name (required), Pipeline, Primary Contact, Close Date, Value, Priority (low/medium/high), Source, and Description. Click Save.',
      },
      {
        step:   2,
        title:  'Move a deal through stages',
        detail: 'Drag the deal card to a new column, or tell the AI "Move [deal name] to [stage name]" and it will do it for you.',
      },
      {
        step:   3,
        title:  'Log a call note',
        detail: 'Click on a deal card → Activity tab → Add Note. Or tell the AI "I spoke to Alex at Acme, they need a proposal by Friday" and it will log a note and optionally update the close date.',
      },
      {
        step:   4,
        title:  'Set a reminder',
        detail: 'Tell the AI "Remind me Monday to follow up with Acme" and it will create a reminder with the due date. Reminders appear in the AI\'s daily overview.',
      },
      {
        step:   5,
        title:  'Mark as won or lost',
        detail: 'Tell the AI "Mark Acme as won" or "Close the XYZ deal as lost". The AI updates the status and the kanban badge changes immediately.',
      },
    ],
    tips: [
      'Win percentage helps forecast revenue. Ask the AI "set win percentage for Acme to 80%".',
      'You can filter and sort the board by Value, Close Date, Created, or Priority using the header controls.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Email attachments + proposals
  // ────────────────────────────────────────────────────────────────

  attachments: {
    title:     'Send Emails with Attachments, Invoices & Proposals',
    summary:   'When composing a reply in Sage Emails, you can attach any file, a live Stripe invoice PDF, or an auto-generated branded proposal PDF — all without leaving the CRM.',
    requires:  'Gmail or Outlook connected. Stripe connected for invoice attachments.',
    steps: [
      {
        step:   1,
        title:  'Open a conversation and start composing',
        detail: 'Go to Sage → Emails → click an email → the compose area appears at the bottom.',
      },
      {
        step:   2,
        title:  'Attach a file',
        detail: 'Click the "📎 File" button below the compose area. Pick any file from your computer. It appears as a chip (filename + × remove button) below the compose area.',
      },
      {
        step:   3,
        title:  'Attach a Stripe invoice (requires Stripe connected)',
        detail: 'Click the "🧾 Invoice" button. A dropdown shows your open Stripe invoices with customer name and amount. Click one to auto-download its PDF and attach it.',
      },
      {
        step:   4,
        title:  'Generate a proposal PDF',
        detail: 'If the email\'s contact has a linked deal, a "📄 Proposal: [deal name]" button appears. Click it to generate a branded A4 proposal PDF instantly. The proposal includes your workspace name, client details, deal title, value, close date, and description.',
      },
      {
        step:   5,
        title:  'Send',
        detail: 'The Send button shows the attachment count (e.g. "Send + 2 attachments"). Click it to deliver. All attachments are included in the email.',
      },
    ],
    tips: [
      'You can combine all three attachment types in one email.',
      'Proposal PDFs are generated instantly on the server — no external PDF service needed.',
      'Stripe invoices must have a PDF URL generated by Stripe. Draft invoices without a PDF URL will show an error.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Stripe integration
  // ────────────────────────────────────────────────────────────────

  stripe: {
    title:     'Connect Stripe to Sage',
    summary:   'Connecting Stripe lets you browse open invoices directly inside Sage and attach invoice PDFs to outgoing emails with a single click.',
    verifyWith: 'stripe',
    steps: [
      {
        step:   1,
        title:  'Get your Stripe Secret Key',
        detail: 'Log in to your Stripe Dashboard at dashboard.stripe.com. Go to Developers → API keys. Copy the Secret key (starts with sk_live_ for production or sk_test_ for test mode).',
      },
      {
        step:   2,
        title:  'Paste key into Sage Integrations',
        detail: 'In Appalix, go to Sage → Integrations. Find the Stripe card and click Connect. Paste your Secret key. Click Save & Connect. A green Connected badge appears.',
      },
      {
        step:   3,
        title:  'Attach invoices to emails',
        detail: 'In Sage → Emails → compose area → click "🧾 Invoice". Your open Stripe invoices appear. Click any invoice to attach its PDF automatically.',
      },
    ],
    tips: [
      'Use a Restricted Key with only Invoices (read) permission for better security instead of the full Secret Key.',
      'Only invoices with status "open" are shown in the invoice picker.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Knowledge base sources
  // ────────────────────────────────────────────────────────────────

  'knowledge-base': {
    title:     'Add a Knowledge Source to your Bot',
    summary:   'A knowledge source is content your bot learns from — a website URL, a PDF, a document, or plain text. The bot uses this to answer customer questions accurately.',
    verifyWith: 'has_sources',
    steps: [
      {
        step:   1,
        title:  'Go to Knowledge Base',
        detail: 'In the main sidebar, click Knowledge Base.',
      },
      {
        step:   2,
        title:  'Click Add Source',
        detail: 'Click "+ New Source". Choose a source type: URL (a webpage), Sitemap (all pages from a sitemap.xml), File (PDF, DOCX, TXT), or Text (paste content directly).',
      },
      {
        step:   3,
        title:  'Fill in the source details',
        detail: 'For URL: paste the page URL. For Sitemap: paste the sitemap.xml URL. For File: upload the file. For Text: paste the content. Give it a descriptive name.',
      },
      {
        step:   4,
        title:  'Ingest the source',
        detail: 'Click Save. Appalix will automatically process the content (chunking, embedding). The status will change from Pending → Processing → Ready. This usually takes under a minute for most sources.',
      },
      {
        step:   5,
        title:  'Test the bot',
        detail: 'Once the source shows Ready status, test your bot using the Preview button. Ask a question that should be answered from the source and verify the bot responds correctly.',
      },
    ],
    tips: [
      'Add multiple sources — the bot searches across all of them simultaneously.',
      'Re-ingest a source after updating the underlying content to keep the bot current.',
      'Pro+ plans support cloud connectors: Notion, Google Drive, Dropbox, SharePoint, GitBook.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Bots
  // ────────────────────────────────────────────────────────────────

  bot: {
    title:     'Create and Configure a Bot',
    summary:   'A bot is the AI assistant you deploy to your customers. You configure its name, persona, knowledge sources, supported platforms, and appearance.',
    verifyWith: 'has_bots',
    steps: [
      {
        step:   1,
        title:  'Go to Bots → New Bot',
        detail: 'Click Bots in the main sidebar. Click "+ New Bot". Enter a bot name (e.g. "Support Agent") and choose a type (Support, Sales, HR, etc.).',
      },
      {
        step:   2,
        title:  'Write a system prompt',
        detail: 'The system prompt defines the bot\'s personality and rules. Example: "You are a helpful support agent for Acme Corp. Be friendly and concise. Only answer questions related to our products. If you don\'t know, say so." Click Save.',
      },
      {
        step:   3,
        title:  'Link knowledge sources',
        detail: 'In the bot edit page, find the Knowledge Sources section. Select the sources you added earlier. The bot will search these when answering questions.',
      },
      {
        step:   4,
        title:  'Configure appearance',
        detail: 'Choose a widget skin (Light, Dark, Forest, Ocean, etc.) or use Custom colours. The preview updates live so you can see exactly how the widget will look.',
      },
      {
        step:   5,
        title:  'Connect a channel',
        detail: 'Go to Integrations. Connect the channel(s) you want: Web Widget, Slack, WhatsApp, Facebook Messenger, Telegram, etc. Each channel gets a unique bot assigned.',
      },
    ],
    tips: [
      'Enable Tools / Agent Mode on the bot to unlock CRM tools, email sending, document generation, etc.',
      'You can have multiple bots — each with different personas and knowledge sources.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Web widget embed
  // ────────────────────────────────────────────────────────────────

  widget: {
    title:     'Embed the Chat Widget on Your Website',
    summary:   'The Appalix web widget is a floating chat bubble you embed on any website with a small JavaScript snippet. It works with any site — HTML, WordPress, Webflow, Shopify, etc.',
    verifyWith: 'has_widget',
    steps: [
      {
        step:   1,
        title:  'Create a Web Widget integration',
        detail: 'Go to Integrations → click "New Integration" → choose Web Widget. Select the bot you want, give it a name, and click Save. You\'ll receive a unique Integration ID.',
      },
      {
        step:   2,
        title:  'Copy the embed snippet',
        detail: 'In the integration detail page, copy the embed code. It looks like: <script>window.AppalixConfig={integrationId:"YOUR_ID"}</script><script src="https://api.appalix.ai/widget.js" async></script>',
      },
      {
        step:   3,
        title:  'Paste before </body>',
        detail: 'Paste the snippet into your website HTML just before the closing </body> tag. On WordPress, use the "Insert Headers and Footers" plugin and paste it in the Footer Scripts section.',
      },
      {
        step:   4,
        title:  'Verify the widget appears',
        detail: 'Open your website in a browser. You should see an orange chat bubble in the bottom-right corner. Click it to open the chat window. Send a test message and confirm the bot replies.',
      },
    ],
    tips: [
      'The widget supports 8 skin themes plus custom colours — configure in the bot edit page.',
      'The widget has three states: bubble (minimised), standard (380×560px), and expanded (60vw × 70vh).',
      'For WordPress, the Appalix plugin handles installation automatically — no manual code needed.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Slack
  // ────────────────────────────────────────────────────────────────

  slack: {
    title:     'Connect Slack to Your Bot',
    summary:   'Connecting Slack lets your bot respond to messages in any Slack channel or DM. Customers or team members can chat with your bot directly in Slack.',
    verifyWith: 'slack',
    steps: [
      {
        step:   1,
        title:  'Create a Slack App',
        detail: 'Go to api.slack.com/apps → Create New App → From scratch. Name it (e.g. "Appalix Bot") and select your Slack workspace.',
      },
      {
        step:   2,
        title:  'Enable Event Subscriptions',
        detail: 'In your Slack App settings → Event Subscriptions → turn on. Paste the webhook URL from your Appalix integration page (format: https://api.appalix.ai/webhooks/slack/YOUR_ID). Subscribe to the event: message.channels.',
      },
      {
        step:   3,
        title:  'Add Bot Token Scopes',
        detail: 'Go to OAuth & Permissions → Bot Token Scopes → add: app_mentions:read, channels:history, chat:write, im:history.',
      },
      {
        step:   4,
        title:  'Install and paste the Bot Token',
        detail: 'Click Install to Workspace → allow. Copy the Bot User OAuth Token (starts with xoxb-). In Appalix → Integrations → Slack card → paste the token and your Signing Secret. Click Save.',
      },
      {
        step:   5,
        title:  'Invite the bot to a channel',
        detail: 'In Slack, go to any channel → type /invite @YourBotName. The bot will now respond to messages in that channel.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // WhatsApp
  // ────────────────────────────────────────────────────────────────

  whatsapp: {
    title:     'Connect WhatsApp to Your Bot',
    summary:   'Connect WhatsApp Business via the Meta Business Platform to let your bot respond to WhatsApp messages automatically.',
    verifyWith: 'whatsapp',
    steps: [
      {
        step:   1,
        title:  'Set up Meta Business Platform',
        detail: 'Go to developers.facebook.com → My Apps → Create App → Business type. Add the WhatsApp product to the app.',
      },
      {
        step:   2,
        title:  'Get your credentials',
        detail: 'In WhatsApp → API Setup, note your Phone Number ID and WhatsApp Business Account ID. Generate a Permanent Access Token from the Meta Business Suite → System Users.',
      },
      {
        step:   3,
        title:  'Configure the webhook',
        detail: 'In Meta App → WhatsApp → Configuration → Webhook. Paste the URL from Appalix (https://api.appalix.ai/webhooks/whatsapp/YOUR_ID). Set a Verify Token (any string — paste it in Appalix too). Subscribe to the "messages" event.',
      },
      {
        step:   4,
        title:  'Paste credentials in Appalix',
        detail: 'In Appalix → Integrations → WhatsApp card → enter your Phone Number ID, Access Token, and Verify Token. Click Save & Connect.',
      },
    ],
    tips: [
      'WhatsApp requires a Meta Business account and a verified phone number.',
      'Test using the WhatsApp test number provided in Meta\'s API Setup before going live.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Facebook Messenger
  // ────────────────────────────────────────────────────────────────

  facebook: {
    title:     'Connect Facebook Messenger to Your Bot',
    summary:   'Let your bot respond to Facebook Messenger messages on your Facebook Page.',
    verifyWith: 'facebook',
    steps: [
      {
        step:   1,
        title:  'Create a Meta App',
        detail: 'Go to developers.facebook.com → Create App → Business type. Add the Messenger product.',
      },
      {
        step:   2,
        title:  'Generate a Page Access Token',
        detail: 'In Messenger → Settings → Access Tokens → Add or Remove Pages → select your Facebook Page → generate a token.',
      },
      {
        step:   3,
        title:  'Configure the webhook',
        detail: 'In Messenger → Settings → Webhooks. Paste the callback URL from Appalix (https://api.appalix.ai/webhooks/facebook/YOUR_ID). Enter a Verify Token and subscribe to: messages, messaging_postbacks.',
      },
      {
        step:   4,
        title:  'Paste credentials in Appalix',
        detail: 'In Appalix → Integrations → Facebook Messenger card → enter your Page Access Token, App Secret, and Verify Token. Click Save.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Telegram
  // ────────────────────────────────────────────────────────────────

  telegram: {
    title:     'Connect Telegram to Your Bot',
    summary:   'Connect Telegram to let your bot respond to messages in a Telegram chat or channel.',
    verifyWith: 'telegram',
    steps: [
      {
        step:   1,
        title:  'Create a Telegram Bot via BotFather',
        detail: 'Open Telegram and search for @BotFather. Send /newbot. Choose a name and username (must end in "bot"). BotFather will give you an API Token.',
      },
      {
        step:   2,
        title:  'Paste the token in Appalix',
        detail: 'In Appalix → Integrations → Telegram card → paste the Bot Token. Click Save & Connect. Appalix will automatically set up the webhook with Telegram.',
      },
      {
        step:   3,
        title:  'Test your bot',
        detail: 'Search for your bot\'s Telegram username, open a chat, and send a message. Your Appalix bot should reply.',
      },
    ],
    tips: [
      'Telegram setup is the simplest of all channels — no webhook URL is needed from your side.',
      'You can change the bot icon and description via BotFather at any time.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Tickets
  // ────────────────────────────────────────────────────────────────

  tickets: {
    title:     'Use the Sage Ticketing System',
    summary:   'Sage Tickets lets you track customer support requests, assign them to team members, set priority, and manage resolution status — all inside the CRM.',
    steps: [
      {
        step:   1,
        title:  'Go to Sage → Tickets',
        detail: 'Click Tickets in the Sage sidebar.',
      },
      {
        step:   2,
        title:  'Create a ticket manually',
        detail: 'Click New Ticket. Fill in: Title, Contact (link to a Sage contact), Priority (low/medium/high/urgent), Status (open/in_progress/resolved/closed), and Description. Click Save.',
      },
      {
        step:   3,
        title:  'Auto-create tickets from chat',
        detail: 'Enable the "create_support_ticket" tool on your bot. When a customer requests support in the chat widget, the bot can automatically create a ticket linked to their contact record.',
      },
      {
        step:   4,
        title:  'Manage and resolve',
        detail: 'Filter tickets by status or priority. Click a ticket to update its status, add notes, or reassign it. Resolved tickets are archived but remain searchable.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Zapier
  // ────────────────────────────────────────────────────────────────

  zapier: {
    title:     'Connect Zapier to Your Bot (Lead Capture)',
    summary:   'Connect Zapier so that every time a website visitor shares their contact details in the chat widget, Appalix fires a webhook to Zapier — which can then create records in HubSpot, Salesforce, Google Sheets, or any app.',
    verifyWith: 'zapier',
    steps: [
      {
        step:   1,
        title:  'Create a Zapier Zap with a Webhook trigger',
        detail: 'In Zapier, create a New Zap → Trigger → Webhooks by Zapier → Catch Hook. Copy the webhook URL provided.',
      },
      {
        step:   2,
        title:  'Paste the webhook URL in Appalix',
        detail: 'In Appalix → Integrations → edit your integration → CRM section → set Provider to Zapier → paste the webhook URL. Click Save.',
      },
      {
        step:   3,
        title:  'Test with a live chat message',
        detail: 'Open your website chat widget and share a name and email address. Zapier should receive the hook. Click "Test Trigger" in Zapier to confirm the data arrived.',
      },
      {
        step:   4,
        title:  'Add a Zapier Action',
        detail: 'Add an Action step in Zapier — e.g. "Create Contact in HubSpot" or "Add Row to Google Sheets" — map the fields (name, email, phone) and publish the Zap.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // HubSpot
  // ────────────────────────────────────────────────────────────────

  hubspot: {
    title:     'Connect HubSpot to Your Bot (Lead Capture)',
    summary:   'Leads collected in the chat widget are automatically pushed to HubSpot as new contacts using your Private App Token.',
    verifyWith: 'hubspot',
    steps: [
      {
        step:   1,
        title:  'Create a HubSpot Private App',
        detail: 'In HubSpot → Settings → Integrations → Private Apps → Create a private app. Name it "Appalix". Under Scopes, add crm.objects.contacts.write.',
      },
      {
        step:   2,
        title:  'Copy the Access Token',
        detail: 'After creating the app, copy the Access Token from the Auth tab.',
      },
      {
        step:   3,
        title:  'Paste in Appalix',
        detail: 'In Appalix → Integrations → edit your integration → CRM section → set Provider to HubSpot → paste the Access Token. Click Save.',
      },
      {
        step:   4,
        title:  'Test lead capture',
        detail: 'In the chat widget, share a name and email. Within seconds, a new contact should appear in HubSpot → Contacts.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Sage overview
  // ────────────────────────────────────────────────────────────────

  sage: {
    title:     'Sage CRM — Overview of All Features',
    summary:   'Sage is the built-in CRM inside Appalix. It gives you a full pipeline, contact management, AI-powered email inbox, ticketing, and an AI assistant — all in one place.',
    steps: [
      {
        step:   1,
        title:  'Dashboard — daily overview',
        detail: 'Sage → Dashboard shows today\'s high-priority deals, deals closing this week, overdue reminders, and recent activity. Ask the AI "what\'s my pipeline looking like today?" for a live summary.',
      },
      {
        step:   2,
        title:  'Pipelines — Kanban board',
        detail: 'Create pipeline boards to track deals through stages. Drag deals between columns. The AI can move deals, log notes, update status, and set reminders by voice command.',
      },
      {
        step:   3,
        title:  'Contacts — People you deal with',
        detail: 'Store contact details. Deals and emails link to contacts automatically. The AI can search, create, and update contacts.',
      },
      {
        step:   4,
        title:  'Emails — AI-powered inbox',
        detail: 'Connect Gmail or Outlook to get a full AI inbox: priority scoring, key insights, three AI reply drafts per email, AI rewrite, and attachment support (files, Stripe invoices, proposal PDFs).',
      },
      {
        step:   5,
        title:  'Tickets — Support queue',
        detail: 'Manage support tickets linked to contacts. Auto-create tickets from the chat widget. Filter by priority and status.',
      },
      {
        step:   6,
        title:  'Integrations — Connect tools',
        detail: 'Connect Gmail/Outlook (email), Stripe (invoices), Zapier/HubSpot/Intercom/Zoho (lead routing), and more from Sage → Integrations.',
      },
      {
        step:   7,
        title:  'AI Assistant (this chat)',
        detail: 'Ask the AI anything: "move Acme to Qualified", "what are my urgent emails?", "generate a proposal for the Nike deal", "remind me Friday to call Alex". The AI has live access to all your CRM data.',
      },
    ],
    tips: [
      'All Sage features require a Pro plan or above.',
      'The AI assistant can perform any CRM action conversationally — you rarely need to click through menus.',
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // AI Rewrite
  // ────────────────────────────────────────────────────────────────

  'ai-rewrite': {
    title:     'Use AI Rewrite in Sage Emails',
    summary:   'AI Rewrite lets you restructure any email draft using a plain-English instruction — without losing the original meaning.',
    steps: [
      {
        step:   1,
        title:  'Open an email and compose a reply',
        detail: 'Click an email in Sage → Emails. The compose area appears at the bottom. You can write your own draft or load one of the AI reply drafts.',
      },
      {
        step:   2,
        title:  'Expand AI Rewrite',
        detail: 'Click the "✦ AI Rewrite" toggle below the compose area.',
      },
      {
        step:   3,
        title:  'Type your instruction',
        detail: 'Examples: "Make it shorter", "More formal tone", "Add a warm opening", "Translate to French", "Summarise into bullet points".',
      },
      {
        step:   4,
        title:  'Click Rewrite',
        detail: 'The body of the email is replaced with the rewritten version. You can rewrite multiple times with different instructions before sending.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // WordPress plugin
  // ────────────────────────────────────────────────────────────────

  wordpress: {
    title:     'Add the Chat Widget to WordPress',
    summary:   'Install the Appalix WordPress plugin to add the chat widget to your site without editing any code.',
    verifyWith: 'has_widget',
    steps: [
      {
        step:   1,
        title:  'Get your Integration ID',
        detail: 'In Appalix → Integrations → create a Web Widget integration (or open an existing one). Copy the Integration ID shown on the page.',
      },
      {
        step:   2,
        title:  'Install the plugin',
        detail: 'In your WordPress dashboard → Plugins → Add New → search "Appalix" → Install Now → Activate.',
      },
      {
        step:   3,
        title:  'Enter your Integration ID',
        detail: 'Go to Settings → Appalix. Paste your Integration ID. Click Save. The chat widget will appear on your site immediately.',
      },
    ],
    tips: [
      'Alternatively, use the "Insert Headers and Footers" plugin and paste the script tag in the Footer Scripts section.',
    ],
  },
}

// Aliases for common synonyms
const TOPIC_ALIASES: Record<string, string> = {
  email:        'gmail',
  outlook:      'microsoft',
  office365:    'microsoft',
  'office 365': 'microsoft',
  crm:          'sage',
  pipeline:     'pipeline',
  kanban:       'pipeline',
  board:        'pipeline',
  contact:      'contacts',
  deal:         'deals',
  lead:         'deals',
  opportunity:  'deals',
  'knowledge base': 'knowledge-base',
  knowledge:    'knowledge-base',
  sources:      'knowledge-base',
  source:       'knowledge-base',
  rag:          'knowledge-base',
  bot:          'bot',
  bots:         'bot',
  chatbot:      'bot',
  assistant:    'bot',
  widget:       'widget',
  embed:        'widget',
  chat:         'widget',
  attachment:   'attachments',
  invoice:      'attachments',
  proposal:     'attachments',
  rewrite:      'ai-rewrite',
  'ai rewrite': 'ai-rewrite',
  ticket:       'tickets',
  support:      'tickets',
}

/**
 * Look up step-by-step guide content for a given feature topic.
 * Returns a structured string the AI can use to walk users through setup.
 */
export function sageGetGuide(topic: string): string {
  const key = topic.toLowerCase().trim()
  const resolved = GUIDES[key] ?? GUIDES[TOPIC_ALIASES[key] ?? '']

  if (!resolved) {
    const available = Object.keys(GUIDES).join(', ')
    return `No guide found for "${topic}". Available guides: ${available}.`
  }

  const lines: string[] = [
    `## ${resolved.title}`,
    '',
    resolved.summary,
    '',
  ]

  if (resolved.requires) {
    lines.push(`**Requirements:** ${resolved.requires}`, '')
  }

  lines.push('**Steps:**', '')
  for (const s of resolved.steps) {
    lines.push(`**Step ${s.step}: ${s.title}**`)
    lines.push(s.detail)
    lines.push('')
  }

  if (resolved.tips?.length) {
    lines.push('**Tips:**')
    for (const tip of resolved.tips) {
      lines.push(`• ${tip}`)
    }
    lines.push('')
  }

  if (resolved.verifyWith) {
    lines.push(`*(Use sage_check_feature_status with feature="${resolved.verifyWith}" to verify this step is complete.)*`)
  }

  return lines.join('\n')
}

// -----------------------------------------------------------------------
// Feature status check
// -----------------------------------------------------------------------

interface FeatureStatus {
  feature:   string
  connected: boolean
  detail:    string
}

/**
 * Check whether a specific feature or integration is configured for the workspace.
 * Used by the AI to perform real-time progress verification during guided setup.
 */
export async function sageCheckFeatureStatus(
  workspaceId: string,
  feature:     string,
): Promise<string> {
  const key = feature.toLowerCase().trim()

  async function integrationConnected(provider: string): Promise<FeatureStatus> {
    // Check sage_integrations (Sage-specific integrations)
    const { data: sageInt } = await supabase
      .from('sage_integrations')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('status', 'connected')
      .limit(1)
      .maybeSingle()

    if (sageInt) {
      return { feature: provider, connected: true, detail: `${provider} is connected in Sage Integrations.` }
    }

    // Also check platform integrations table
    const { data: platInt } = await supabase
      .from('integrations')
      .select('id, config')
      .eq('workspace_id', workspaceId)
      .eq('platform', provider)
      .limit(1)
      .maybeSingle()

    if (platInt) {
      return { feature: provider, connected: true, detail: `${provider} integration is configured.` }
    }

    return { feature: provider, connected: false, detail: `${provider} is not yet connected. Follow the guide to set it up.` }
  }

  let result: FeatureStatus

  switch (key) {

    case 'gmail': {
      const { data } = await supabase
        .from('sage_integrations')
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'gmail')
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle()
      result = data
        ? { feature: 'gmail', connected: true,  detail: 'Gmail is connected. You can sync the inbox in Sage → Emails.' }
        : { feature: 'gmail', connected: false, detail: 'Gmail is not connected yet. Go to Sage → Integrations → Gmail card → Connect.' }
      break
    }

    case 'microsoft':
    case 'outlook': {
      const { data } = await supabase
        .from('sage_integrations')
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'microsoft')
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle()
      result = data
        ? { feature: 'microsoft', connected: true,  detail: 'Microsoft Outlook is connected. You can sync the inbox in Sage → Emails.' }
        : { feature: 'microsoft', connected: false, detail: 'Outlook is not connected yet. Go to Sage → Integrations → Microsoft card → Connect.' }
      break
    }

    case 'stripe': {
      const { data } = await supabase
        .from('sage_integrations')
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'stripe')
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle()
      result = data
        ? { feature: 'stripe', connected: true,  detail: 'Stripe is connected. The Invoice attachment button will appear in Sage → Emails compose area.' }
        : { feature: 'stripe', connected: false, detail: 'Stripe is not connected yet. Go to Sage → Integrations → Stripe card → paste your Secret Key.' }
      break
    }

    case 'slack':
      result = await integrationConnected('slack')
      break

    case 'whatsapp':
      result = await integrationConnected('whatsapp')
      break

    case 'facebook':
    case 'messenger':
      result = await integrationConnected('facebook')
      break

    case 'telegram':
      result = await integrationConnected('telegram')
      break

    case 'zapier':
    case 'hubspot':
    case 'intercom':
    case 'zoho': {
      // These are stored in integrations.config as crm_provider
      const { data: ints } = await supabase
        .from('integrations')
        .select('config')
        .eq('workspace_id', workspaceId)
      const found = (ints ?? []).some(
        (i: { config: Record<string, unknown> }) => i.config?.crm_provider === key,
      )
      result = found
        ? { feature: key, connected: true,  detail: `${key} CRM integration is configured.` }
        : { feature: key, connected: false, detail: `${key} is not set up. Go to Integrations → edit an integration → CRM section.` }
      break
    }

    case 'has_pipelines': {
      const { count } = await supabase
        .from('sage_pipelines')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
      const n = count ?? 0
      result = {
        feature:   'pipeline',
        connected: n > 0,
        detail:    n > 0 ? `${n} pipeline${n > 1 ? 's' : ''} found. You\'re all set.` : 'No pipelines yet. Go to Sage → Pipelines → New Pipeline.',
      }
      break
    }

    case 'has_contacts': {
      const { count } = await supabase
        .from('sage_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
      const n = count ?? 0
      result = {
        feature:   'contacts',
        connected: n > 0,
        detail:    n > 0 ? `${n} contact${n > 1 ? 's' : ''} found.` : 'No contacts yet. Go to Sage → Contacts → New Contact.',
      }
      break
    }

    case 'has_deals': {
      const { count } = await supabase
        .from('sage_deals')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
      const n = count ?? 0
      result = {
        feature:   'deals',
        connected: n > 0,
        detail:    n > 0 ? `${n} deal${n > 1 ? 's' : ''} found.` : 'No deals yet. Open a pipeline board → "+ Add a Lead".',
      }
      break
    }

    case 'has_bots': {
      const { count } = await supabase
        .from('bots')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
      const n = count ?? 0
      result = {
        feature:   'bots',
        connected: n > 0,
        detail:    n > 0 ? `${n} bot${n > 1 ? 's' : ''} configured.` : 'No bots yet. Go to Bots → New Bot.',
      }
      break
    }

    case 'has_sources': {
      const { count } = await supabase
        .from('sources')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
      const n = count ?? 0
      result = {
        feature:   'sources',
        connected: n > 0,
        detail:    n > 0 ? `${n} knowledge source${n > 1 ? 's' : ''} found.` : 'No knowledge sources yet. Go to Knowledge Base → Add Source.',
      }
      break
    }

    case 'has_widget': {
      const { count } = await supabase
        .from('integrations')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('platform', 'web')
      const n = count ?? 0
      result = {
        feature:   'widget',
        connected: n > 0,
        detail:    n > 0 ? 'Web widget integration found. Copy the embed snippet from the integration page.' : 'No web widget yet. Go to Integrations → New Integration → Web Widget.',
      }
      break
    }

    default:
      return `Unknown feature "${feature}". Checkable features: gmail, microsoft, stripe, slack, whatsapp, facebook, telegram, zapier, hubspot, has_pipelines, has_contacts, has_deals, has_bots, has_sources, has_widget.`
  }

  const icon = result.connected ? '✅' : '⏳'
  return `${icon} **${result.feature}**: ${result.detail}`
}

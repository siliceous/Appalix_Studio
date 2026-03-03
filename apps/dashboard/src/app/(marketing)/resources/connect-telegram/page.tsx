import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Deploy an AI Bot on Telegram with Appalix — Step-by-Step Guide',
  description:
    'Deploy your Appalix AI agent as a Telegram bot in under 10 minutes. Create a bot with @BotFather, paste the token into Appalix, register the webhook, and go live instantly.',
  keywords: [
    'Telegram AI chatbot',
    'Appalix Telegram integration',
    'Telegram bot setup',
    'AI agent Telegram',
    'Telegram BotFather webhook',
    'Telegram bot setWebhook',
    'AI customer service Telegram',
    'Telegram bot token tutorial',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-telegram' },
  openGraph: {
    title: 'Deploy an AI Bot on Telegram with Appalix — Step-by-Step Guide',
    description: 'Deploy your Appalix AI agent as a Telegram bot in under 10 minutes. Create a bot with @BotFather and go live.',
    url: 'https://appalix.ai/resources/connect-telegram',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deploy an AI Bot on Telegram with Appalix — Step-by-Step Guide',
    description: 'Deploy your Appalix AI agent as a Telegram bot in under 10 minutes. Create a bot with @BotFather and go live.',
  },
}

export default function ConnectTelegramPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Deploy an AI Bot on Telegram with Appalix"
        description="Deploy your Appalix AI agent as a Telegram bot in under 10 minutes. Create a bot with @BotFather, paste the token into Appalix, and register the webhook."
        slug="connect-telegram"
        datePublished="2026-03-01"
        steps={[
          { name: 'Create a Telegram bot with @BotFather', text: 'Open Telegram, start a chat with @BotFather, send /newbot, choose a name and username, then copy the bot token provided.' },
          { name: 'Create a Telegram integration in Appalix', text: 'In Appalix, go to Integrations → New → Telegram, paste your bot token, select your connected bot, and save to get your webhook URL and secret token.' },
          { name: 'Register the webhook with Telegram', text: 'Open your browser and navigate to the setWebhook URL with your bot token, Appalix webhook URL, and secret token as parameters to register the webhook.' },
          { name: 'Test the integration', text: 'Open Telegram, start a chat with your bot, send a message, and verify the AI bot replies automatically.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Telegram to Appalix</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">8 min read · All plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Telegram to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Give your Appalix AI agent a Telegram presence. Anyone who messages your bot on Telegram gets an instant AI response — privately, in groups, or in channels. Setup takes about 10 minutes and requires no code.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          {/* What you'll need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on any plan</li>
              <li>A <strong className="text-white">Telegram account</strong> (the app or web version)</li>
              <li>Access to <strong className="text-white">@BotFather</strong> on Telegram — Telegram&apos;s official bot for creating bots</li>
            </ul>
          </section>

          {/* Step 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Telegram Bot with @BotFather</h2>
            <p>
              Every Telegram bot is created through <strong className="text-white">@BotFather</strong>, Telegram&apos;s official bot management bot.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>
                Open Telegram and search for <strong className="text-white">@BotFather</strong>, or tap this link:{' '}
                <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">t.me/BotFather</a>.
              </li>
              <li>
                Send the command: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">/newbot</code>
              </li>
              <li>
                BotFather will ask you for a <strong className="text-white">display name</strong> — this is the name users see (e.g. <em>Acme Support</em>).
              </li>
              <li>
                Next, choose a <strong className="text-white">username</strong> — must end in <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">bot</code> (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">AcmeSupportBot</code>).
              </li>
              <li>
                BotFather will reply with a <strong className="text-white">bot token</strong>. It looks like:
                <div className="mt-2 px-4 py-3 bg-white/5 rounded-lg font-mono text-sm text-brand-300 break-all">
                  7412345678:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                </div>
                Copy this token — you&apos;ll paste it into Appalix in Step 3.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Keep your bot token private.</strong> Anyone with this token can send messages as your bot. Never share it publicly, paste it in a public document, or commit it to a repository.
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Create a Telegram Integration in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In Appalix, go to <strong className="text-white">Integrations</strong> in the left sidebar and click <strong className="text-white">Add integration</strong>.
              </li>
              <li>
                Select <strong className="text-white">Telegram</strong> as the platform.
              </li>
              <li>
                Give the integration a name — for example, <em>Telegram Support Bot</em>.
              </li>
              <li>
                Select the <strong className="text-white">bot</strong> you want to power this channel (the AI agent you&apos;ve configured).
              </li>
              <li>
                Paste your <strong className="text-white">bot token</strong> into the <em>Bot token</em> field.
              </li>
              <li>
                Leave <em>Webhook secret</em> blank — Appalix auto-generates a secure random secret.
              </li>
              <li>
                Click <strong className="text-white">Create integration</strong>.
              </li>
            </ol>
            <p className="mt-4">
              Appalix creates the integration and shows you an <strong className="text-white">Edit</strong> page. Here you&apos;ll find two values you need for the next step:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-white">Webhook URL</strong> — e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://api.appalix.ai/webhooks/telegram/&lt;your-id&gt;</code></li>
              <li><strong className="text-white">Webhook secret token</strong> — the auto-generated secret shown in read-only text</li>
            </ul>
          </section>

          {/* Step 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Register the Webhook with Telegram</h2>
            <p>
              Telegram needs to know where to send messages. You register your webhook by calling the Telegram Bot API once. You can do this from your browser, a terminal, or any HTTP client.
            </p>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Option A — Using your browser (easiest)</h3>
            <p>Paste the following URL into your browser&apos;s address bar, replacing the placeholders:</p>
            <div className="mt-2 px-4 py-3 bg-white/5 rounded-lg font-mono text-sm text-brand-300 break-all leading-relaxed">
              https://api.telegram.org/bot<strong>&lt;BOT_TOKEN&gt;</strong>/setWebhook?url=<strong>&lt;WEBHOOK_URL&gt;</strong>&amp;secret_token=<strong>&lt;WEBHOOK_SECRET&gt;</strong>
            </div>
            <p className="mt-3">
              Telegram will respond with{' '}
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">{"{ \"ok\": true, \"result\": true }"}</code>.
              That&apos;s it — the webhook is live.
            </p>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Option B — Using curl</h3>
            <div className="mt-2 px-4 py-3 bg-white/5 rounded-lg font-mono text-sm text-brand-300 break-all leading-relaxed">
              curl -X POST \<br />
              &nbsp;&nbsp;&quot;https://api.telegram.org/bot<strong>&lt;BOT_TOKEN&gt;</strong>/setWebhook&quot; \<br />
              &nbsp;&nbsp;-d &apos;url=<strong>&lt;WEBHOOK_URL&gt;</strong>&apos; \<br />
              &nbsp;&nbsp;-d &apos;secret_token=<strong>&lt;WEBHOOK_SECRET&gt;</strong>&apos;
            </div>

            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Where to find the values:</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><code className="bg-white/5 px-1 rounded">BOT_TOKEN</code> — copied from @BotFather in Step 1</li>
                <li><code className="bg-white/5 px-1 rounded">WEBHOOK_URL</code> — shown on the Edit integration page in Appalix</li>
                <li><code className="bg-white/5 px-1 rounded">WEBHOOK_SECRET</code> — shown as <em>Webhook secret token</em> on the Edit integration page</li>
              </ul>
            </div>
          </section>

          {/* Step 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Test the integration</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Open Telegram and search for your bot by its username (the one you chose in Step 1).
              </li>
              <li>
                Tap <strong className="text-white">Start</strong> and send any message — for example: <em>&quot;Hi, what can you help me with?&quot;</em>
              </li>
              <li>
                Your Appalix AI agent should reply within a second or two.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Not getting a response?</strong> Check:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Your Appalix integration has a bot connected (required for responses)</li>
                <li>The webhook was registered successfully — Telegram returned <code className="bg-white/5 px-1 rounded">"ok": true</code></li>
                <li>The bot token in Appalix matches the one from @BotFather exactly</li>
                <li>The Appalix API is reachable at <code className="bg-white/5 px-1 rounded">api.appalix.ai</code></li>
              </ul>
            </div>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              When a user sends a message to your Telegram bot:
            </p>
            <ol className="list-decimal pl-5 mt-3 space-y-2">
              <li>Telegram POSTs the update to your Appalix webhook URL.</li>
              <li>Appalix verifies the secret token, then extracts the message text.</li>
              <li>The message is routed to your configured AI agent (with RAG, memory, and lead capture enabled if you&apos;ve set them up).</li>
              <li>The AI reply is sent back to the user via the Telegram <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">sendMessage</code> API.</li>
            </ol>
            <p className="mt-4">
              The entire round-trip typically completes in 1–3 seconds. Appalix acknowledges Telegram&apos;s webhook instantly so no retries are triggered.
            </p>
          </section>

          {/* Groups and channels */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Using the bot in groups</h2>
            <p>
              You can add your Telegram bot to a group or supergroup. By default, bots in groups only receive messages that start with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">/</code> (commands) or that mention the bot by its username.
            </p>
            <p className="mt-3">
              To let the bot respond to all messages in a group:
            </p>
            <ol className="list-decimal pl-5 mt-3 space-y-2">
              <li>
                Message @BotFather: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">/setprivacy</code>
              </li>
              <li>Select your bot and choose <strong className="text-white">Disable</strong>.</li>
              <li>Remove and re-add the bot to the group for the change to take effect.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Tip:</strong> Keep Privacy Mode <strong>enabled</strong> for private support bots — this means the bot only sees messages directed at it and reduces noise.
            </div>
          </section>

          {/* Lead capture */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Lead capture on Telegram</h2>
            <p>
              Lead capture works the same way across all Appalix channels. When a user shares their email address or phone number in the Telegram chat, Appalix automatically extracts it and routes it to your configured CRM (HubSpot, Monday.com, Zapier, etc.).
            </p>
            <p className="mt-3">
              To enable this, go to <strong className="text-white">Integrations → Edit → CRM integration</strong> and choose your CRM provider.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Does this work with Telegram channels (broadcast channels)?</p>
                <p className="text-sm text-gray-400 mt-1">
                  Telegram channel posts trigger the bot only if the bot is an administrator of the channel. The bot can read messages but replying in a channel isn&apos;t supported — channels are one-way broadcast tools. For two-way conversations, use private chats or groups.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use the same Telegram bot token on multiple Appalix integrations?</p>
                <p className="text-sm text-gray-400 mt-1">
                  No. Telegram only allows one active webhook per bot token. If you need separate bots for different use cases, create a new bot with @BotFather.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Does Appalix store Telegram message history?</p>
                <p className="text-sm text-gray-400 mt-1">
                  Yes — all conversations are saved to your Appalix dashboard under <strong>Conversations</strong>. You can review transcripts, search messages, and monitor sentiment just like any other channel.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">What if I regenerate the bot token in @BotFather?</p>
                <p className="text-sm text-gray-400 mt-1">
                  The old token is immediately invalidated. Go to your Appalix integration, paste the new token into the <em>Bot token</em> field, save, then re-run the <code className="bg-white/5 px-1 rounded">setWebhook</code> call with the new token.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Can the bot handle images, stickers, or voice messages?</p>
                <p className="text-sm text-gray-400 mt-1">
                  Currently Appalix processes text messages only. Non-text updates (photos, stickers, voice, video) are acknowledged but not processed. The user will receive no response for those message types.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">✈️</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to launch your Telegram bot?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create a new integration in Appalix, paste your @BotFather token, and register the webhook. Your AI agent will be live on Telegram in under 10 minutes.
            </p>
            <Link
              href="/integrations/new?platform=telegram"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Create Telegram integration →
            </Link>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/platforms" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all integrations →
          </Link>
        </div>

      </div>
    </div>
  )
}

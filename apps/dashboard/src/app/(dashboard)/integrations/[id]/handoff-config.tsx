'use client'

import { useState } from 'react'

type HandoffChannel = 'slack' | 'discord' | 'telegram' | 'whatsapp' | 'generic'

const CHANNELS: {
  value:       HandoffChannel
  label:       string
  desc:        string
  placeholder: string
}[] = [
  {
    value:       'slack',
    label:       'Slack',
    desc:        'Post a rich message to a Slack channel via an incoming webhook.',
    placeholder: 'https://hooks.slack.com/services/T…/B…/…',
  },
  {
    value:       'discord',
    label:       'Discord',
    desc:        'Post a rich embed to a Discord channel via a server webhook.',
    placeholder: 'https://discord.com/api/webhooks/…',
  },
  {
    value:       'telegram',
    label:       'Telegram',
    desc:        'Send a message via your Telegram bot. Requires a bot token and a chat/group ID.',
    placeholder: '',
  },
  {
    value:       'whatsapp',
    label:       'WhatsApp (Twilio)',
    desc:        "Send a WhatsApp message to your team's number via Twilio.",
    placeholder: '',
  },
  {
    value:       'generic',
    label:       'Generic / Zapier / Make',
    desc:        'POST a JSON payload to any endpoint. Use Zapier or Make to forward to Messenger, Teams, email, or anything else.',
    placeholder: 'https://hooks.zapier.com/hooks/catch/…',
  },
]

interface Props {
  channel:         string
  webhookUrl:      string
  telegramToken:   string
  telegramChatId:  string
  twilioSid:       string
  twilioToken:     string
  twilioFrom:      string
  twilioTo:        string
}

export function HandoffConfig(props: Props) {
  const [ch, setCh] = useState<HandoffChannel>((props.channel || 'generic') as HandoffChannel)
  const info = CHANNELS.find((c) => c.value === ch)!

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const monoInputCls = `${inputCls} font-mono`

  return (
    <div className="space-y-4">
      {/* Channel selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notify via</label>
        <select
          name="handoff_channel"
          value={ch}
          onChange={(e) => setCh(e.target.value as HandoffChannel)}
          className={`${inputCls} bg-white`}
        >
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">{info.desc}</p>
      </div>

      {/* Slack */}
      {ch === 'slack' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Slack incoming webhook URL</label>
          <input
            type="url"
            name="handoff_webhook_url"
            defaultValue={props.webhookUrl}
            placeholder={info.placeholder}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Create at <span className="font-medium">api.slack.com → Your App → Incoming Webhooks</span> — pick a channel and copy the URL.
          </p>
        </div>
      )}

      {/* Discord */}
      {ch === 'discord' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Discord webhook URL</label>
          <input
            type="url"
            name="handoff_webhook_url"
            defaultValue={props.webhookUrl}
            placeholder={info.placeholder}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Create at <span className="font-medium">Discord → Channel settings → Integrations → Webhooks</span>.
          </p>
        </div>
      )}

      {/* Telegram */}
      {ch === 'telegram' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bot token</label>
            <input
              type="text"
              name="handoff_telegram_token"
              defaultValue={props.telegramToken}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              className={monoInputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              Get from <span className="font-medium">@BotFather</span> on Telegram (use /newbot or /mybots).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Chat ID / Group ID</label>
            <input
              type="text"
              name="handoff_telegram_chat_id"
              defaultValue={props.telegramChatId}
              placeholder="-100123456789"
              className={monoInputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              Add the bot to your group, then use{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">@userinfobot</span> or the
              Telegram API to find the chat ID. Groups start with <span className="font-mono">-100</span>.
            </p>
          </div>
        </>
      )}

      {/* WhatsApp via Twilio */}
      {ch === 'whatsapp' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Twilio Account SID</label>
              <input
                type="text"
                name="handoff_twilio_sid"
                defaultValue={props.twilioSid}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className={monoInputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Twilio Auth Token</label>
              <input
                type="password"
                name="handoff_twilio_token"
                defaultValue={props.twilioToken}
                placeholder="••••••••••••••••••••••••••••••••"
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">From (Twilio WhatsApp number)</label>
              <input
                type="text"
                name="handoff_twilio_from"
                defaultValue={props.twilioFrom}
                placeholder="whatsapp:+14155238886"
                className={monoInputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">To (your agent&apos;s number)</label>
              <input
                type="text"
                name="handoff_twilio_to"
                defaultValue={props.twilioTo}
                placeholder="whatsapp:+15551234567"
                className={monoInputCls}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Credentials at <span className="font-medium">console.twilio.com</span>. The
            &quot;From&quot; number must have WhatsApp Sandbox or Business API enabled.
          </p>
        </>
      )}

      {/* Generic / Zapier / Make */}
      {ch === 'generic' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook URL</label>
          <input
            type="url"
            name="handoff_webhook_url"
            defaultValue={props.webhookUrl}
            placeholder={info.placeholder}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Receives a JSON body with <span className="font-mono bg-gray-100 px-1 rounded">conversationId</span>,{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">userMessage</span>, and{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">timestamp</span>.
            Use Zapier or Make to forward to Messenger, Teams, email, or any other app.
          </p>
        </div>
      )}
    </div>
  )
}

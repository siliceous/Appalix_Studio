'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'

/* ─── Tooltip ───────────────────────────────────────────────────────────── */
function Tip({ label, children, dir = 'top', clickable = false }: {
  label: string; children: React.ReactNode; dir?: 'top' | 'bottom' | 'right'; clickable?: boolean
}) {
  const [show, setShow] = useState(false)
  const wrapPos = dir === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-[9px]'
    : dir === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-[9px]'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-[9px]'
  const arrowEl = dir === 'bottom'
    ? <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
    : dir === 'right'
    ? <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-l border-b border-gray-200 rotate-45" />
    : <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-gray-200 rotate-45" />
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`pointer-events-none absolute ${wrapPos} z-40 w-max max-w-[200px]`}>
          <div className="relative px-3 py-2 rounded-lg bg-white text-gray-900 text-[11px] font-medium leading-snug shadow-lg border border-gray-200">
            {arrowEl}
            {clickable && <span className="text-[#15A4AE] font-bold mr-1">●</span>}{label}
          </div>
        </div>
      )}
      {clickable && show && <span className="pointer-events-none absolute -inset-0.5 rounded-lg border border-[#15A4AE]/50" />}
    </div>
  )
}

/* ─── Bot data ──────────────────────────────────────────────────────────── */
const BOTS = [
  { id: 1, name: 'Website Bot',   channel: 'Web Widget',  status: 'live',  convos: 142, leads: 38, color: 'purple', icon: '🌐' },
  { id: 2, name: 'WhatsApp Agent',channel: 'WhatsApp',    status: 'live',  convos: 89,  leads: 21, color: 'green',  icon: '💬' },
  { id: 3, name: 'Support Bot',   channel: 'Web Widget',  status: 'live',  convos: 213, leads: 0,  color: 'blue',   icon: '🎧' },
  { id: 4, name: 'Telegram Bot',  channel: 'Telegram',    status: 'draft', convos: 0,   leads: 0,  color: 'sky',    icon: '✈️' },
]

type ConvoMessage = { role: 'bot' | 'user'; text: string; isLead?: boolean }

const CONVOS: Record<number, ConvoMessage[]> = {
  1: [
    { role: 'bot',  text: 'Hi! 👋 I\'m Sage, the Appalix assistant. How can I help you today?' },
    { role: 'user', text: 'Hey, I\'m interested in the Pro plan. What does it include?' },
    { role: 'bot',  text: 'Great choice! The Pro plan includes unlimited bots, email integration, WhatsApp, CRM sync, and priority support. It\'s $79/month.' },
    { role: 'user', text: 'Sounds good. Can I try it first?' },
    { role: 'bot',  text: 'Absolutely — 7-day free trial, no credit card needed. Want me to set that up for you? I just need your email. 😊', isLead: true },
    { role: 'user', text: 'Sure, it\'s sarah@acmecorp.com' },
    { role: 'bot',  text: '✅ Done! I\'ve created your trial account and a member of our team will reach out shortly. Welcome aboard, Sarah!' },
  ],
  2: [
    { role: 'bot',  text: 'Hello! 👋 Thanks for messaging Appalix on WhatsApp. How can we help?' },
    { role: 'user', text: 'Hi, I need help setting up the Telegram integration' },
    { role: 'bot',  text: 'Of course! The Telegram integration takes about 2 minutes. You\'ll need to create a bot via @BotFather first. Want a step-by-step guide?' },
    { role: 'user', text: 'Yes please' },
    { role: 'bot',  text: 'Here you go: 1️⃣ Open Telegram → search @BotFather 2️⃣ Send /newbot 3️⃣ Copy the API token 4️⃣ Paste it in Appalix → Integrations → Telegram. Done in minutes!', isLead: true },
  ],
  3: [
    { role: 'bot',  text: 'Hi there! 🎧 I\'m the Appalix support bot. What can I help you with?' },
    { role: 'user', text: 'My widget isn\'t loading on mobile Safari' },
    { role: 'bot',  text: 'Sorry to hear that! This is usually caused by a Content Security Policy setting. Can you tell me which version of Safari you\'re using?' },
    { role: 'user', text: 'Safari 17 on iOS 17' },
    { role: 'bot',  text: 'Got it! Known issue in Safari 17 — here\'s the fix: add appalix.ai to your CSP allow-list. I\'ve also created ticket #2041 for our team to follow up with you.' },
  ],
  4: [],
}

/* ─── Bot Preview ───────────────────────────────────────────────────────── */
function BotPreview({ onClick }: { onClick: () => void }) {
  const [selectedBot, setSelectedBot] = useState(1)
  const [tab,         setTab]         = useState<'chat' | 'settings' | 'analytics'>('chat')

  function stop(e: React.MouseEvent) { e.stopPropagation() }

  const bot    = BOTS.find(b => b.id === selectedBot) ?? BOTS[0]
  const convos = CONVOS[selectedBot] ?? []

  const STATUS_CLS: Record<string, string> = {
    live:  'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="group relative" role="button" aria-label="Open demo">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xl">

        {/* macOS chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-gray-200">
            <span className="text-xs text-gray-400">app.appalix.ai/bots</span>
          </div>
          <div className="w-16" />
        </div>

        <div className="flex" style={{ height: 620 }}>

          {/* Sidebar */}
          <div className="w-44 shrink-0 bg-white border-r border-gray-100 flex flex-col py-3" onClick={stop}>
            <div className="px-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#15A4AE]/15 flex items-center justify-center">
                  <span className="text-[#15A4AE] text-[9px] font-bold">A</span>
                </div>
                <span className="text-[11px] font-bold text-gray-900">Appalix</span>
              </div>
            </div>
            {[
              { icon: '⊞', label: 'Overview',  active: false },
              { icon: '✉', label: 'Emails',    active: false },
              { icon: '💬', label: 'Conversations', active: false },
              { icon: '📋', label: 'Forms',    active: false },
              { icon: '🎫', label: 'Tickets',  active: false },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] ${item.active ? 'bg-purple-50 text-purple-600 font-semibold' : 'text-gray-500'}`}>
                <span>{item.icon}</span>{item.label}
              </div>
            ))}
            <div className="mt-3 border-t border-gray-100 pt-2">
              <p className="px-3 text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Agent</p>
              {[
                { icon: '🤖', label: 'Bots',           active: true  },
                { icon: '🔗', label: 'Integrations',   active: false },
                { icon: '📚', label: 'Knowledge Base', active: false },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] ${item.active ? 'bg-purple-50 text-purple-600 font-semibold' : 'text-gray-500'}`}>
                  <span>{item.icon}</span>{item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Bot list panel */}
          <div className="w-56 shrink-0 border-r border-gray-100 bg-gray-50 flex flex-col" onClick={stop}>
            <div className="px-3 py-2.5 border-b border-gray-100 bg-white flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-900">My Bots</p>
              <Tip label="Create a new bot — web widget, WhatsApp, Telegram, or Facebook Messenger" dir="bottom" clickable>
                <button className="w-6 h-6 rounded-lg bg-purple-600 text-white text-sm flex items-center justify-center font-bold hover:bg-purple-700 transition-colors">+</button>
              </Tip>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {BOTS.map(b => (
                <Tip key={b.id} label={b.status === 'draft' ? 'Draft bot — click to configure and deploy' : 'Click to view conversations and analytics'} dir="right" clickable>
                  <button
                    onClick={(e) => { stop(e); setSelectedBot(b.id); setTab('chat') }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${selectedBot === b.id ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-white hover:shadow-sm'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{b.icon}</span>
                        <p className="text-[10px] font-semibold text-gray-900 truncate">{b.name}</p>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_CLS[b.status]}`}>{b.status}</span>
                    </div>
                    <p className="text-[9px] text-gray-500 pl-6">{b.channel}</p>
                    {b.status === 'live' && (
                      <div className="flex items-center gap-3 pl-6 mt-1.5">
                        <span className="text-[8px] text-gray-500">{b.convos} convos</span>
                        {b.leads > 0 && <span className="text-[8px] text-purple-600 font-medium">{b.leads} leads</span>}
                      </div>
                    )}
                  </button>
                </Tip>
              ))}
            </div>
          </div>

          {/* Main panel */}
          <div className="flex-1 flex flex-col bg-white" onClick={stop}>
            {/* Bot header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{bot.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{bot.name}</h3>
                  <p className="text-[10px] text-gray-500">{bot.channel} · <span className={`font-medium ${bot.status === 'live' ? 'text-green-600' : 'text-yellow-600'}`}>{bot.status}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tip label="Open no-code bot builder — change personality, responses, and flows" dir="bottom" clickable>
                  <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-[9px] text-gray-600 hover:border-gray-300 transition-colors">Edit Bot</button>
                </Tip>
                <Tip label="Get the embed code to deploy this bot on any website in 30 seconds" dir="bottom" clickable>
                  <button className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[9px] font-medium hover:bg-purple-700 transition-colors">Deploy</button>
                </Tip>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-4">
              {(['chat', 'settings', 'analytics'] as const).map(t => (
                <Tip key={t} label={t === 'chat' ? 'Live conversations from this bot' : t === 'settings' ? 'Configure bot persona, tone, and flows' : 'Conversation metrics, lead capture rates, and CSAT'} dir="bottom" clickable>
                  <button
                    onClick={(e) => { stop(e); setTab(t) }}
                    className={`px-3 py-2.5 text-[10px] font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >{t}</button>
                </Tip>
              ))}
            </div>

            {/* Chat tab */}
            {tab === 'chat' && (
              bot.status === 'draft' ? (
                <div className="flex-1 flex items-center justify-center flex-col gap-3 text-center p-8">
                  <span className="text-4xl">✈️</span>
                  <p className="text-sm font-semibold text-gray-700">This bot is in draft</p>
                  <p className="text-xs text-gray-500">Configure the bot and click Deploy to make it live</p>
                  <button className="mt-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-medium">Configure →</button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                  {convos.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${msg.role === 'bot' ? 'bg-white border border-gray-200 shadow-sm text-gray-800' : 'bg-purple-600 text-white'}`}>
                        {msg.text}
                        {msg.isLead && (
                          <Tip label="Lead captured — contact auto-created in your CRM" dir="top">
                            <div className="mt-1.5 pt-1.5 border-t border-purple-200/50 flex items-center gap-1 cursor-default">
                              <span className="text-[8px] font-bold text-purple-300">✦ Lead captured</span>
                            </div>
                          </Tip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Settings tab */}
            {tab === 'settings' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {[
                  { label: 'Bot Name',        value: bot.name,     tip: 'The name visitors see when chatting' },
                  { label: 'Tone',            value: 'Friendly',   tip: 'Personality style — friendly, professional, or custom' },
                  { label: 'Language',        value: 'English',    tip: 'Auto-detects visitor language if set to Auto' },
                  { label: 'Lead Capture',    value: 'Email + Phone', tip: 'Which fields to ask for before answering questions' },
                  { label: 'Handoff Rule',    value: 'After 3 msgs', tip: 'When to escalate to a human agent' },
                ].map(s => (
                  <Tip key={s.label} label={s.tip} dir="right">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 cursor-default">
                      <p className="text-[10px] font-medium text-gray-600">{s.label}</p>
                      <p className="text-[10px] font-semibold text-gray-900">{s.value}</p>
                    </div>
                  </Tip>
                ))}
              </div>
            )}

            {/* Analytics tab */}
            {tab === 'analytics' && (
              <div className="flex-1 p-4 grid grid-cols-2 gap-3 content-start">
                {[
                  { label: 'Total Conversations', value: bot.convos.toString(), sub: 'last 30 days', tip: 'Total number of chat sessions started' },
                  { label: 'Leads Captured',       value: bot.leads.toString(), sub: 'emails + phones',tip: 'Visitors who provided contact details' },
                  { label: 'Resolution Rate',      value: '78%',                sub: 'no human needed', tip: 'Conversations fully resolved by the bot' },
                  { label: 'Avg. CSAT',            value: '4.7 ★',             sub: 'out of 5',        tip: 'Average satisfaction rating from visitors' },
                ].map(s => (
                  <Tip key={s.label} label={s.tip} dir="top">
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 cursor-default">
                      <p className="text-[9px] text-gray-500 mb-1">{s.label}</p>
                      <p className="text-xl font-bold text-gray-900">{s.value}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{s.sub}</p>
                    </div>
                  </Tip>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onClick}
        className="absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        See it live
      </button>
    </div>
  )
}

/* ─── Demo Modal ────────────────────────────────────────────────────────── */
function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-[#222] border border-white/10 rounded-2xl p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center text-sm">✕</button>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-600/40 bg-purple-600/10 text-purple-400 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Live demo · No credit card needed
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">See the Bot Builder in action</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-7">
          Deploy your first AI bot to your website or WhatsApp in under 5 minutes — no coding required.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/login" onClick={onClose} className="w-full py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm text-center">
            Start a 7-day free trial — free
          </Link>
          <Link href="/contact" onClick={onClose} className="w-full py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm text-center">
            Book a live demo →
          </Link>
        </div>
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-5">
          {['No credit card', 'Cancel anytime', '7-day free trial'].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <svg className="w-3 h-3 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Features ──────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '🌐', tag: 'Multi-Channel', title: 'One bot, every channel', desc: 'Deploy the same bot to your website, WhatsApp, Telegram, Instagram DMs, and Facebook Messenger from a single dashboard.' },
  { icon: '📚', tag: 'Knowledge Base', title: 'Train on your content in minutes', desc: 'Upload URLs, PDFs, and documents. Sage learns your product, FAQs, and pricing — and stays up to date automatically.' },
  { icon: '🎯', tag: 'Lead Capture', title: 'Every visitor becomes a lead', desc: 'Sage asks for email and phone mid-conversation, then creates a contact and deal in your CRM automatically.' },
  { icon: '📊', tag: 'Analytics', title: 'Know exactly what\'s working', desc: 'Conversation volume, lead capture rate, resolution rate, and CSAT — all tracked per bot, per channel.' },
]

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function BotPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="bg-[#1c1c1c] min-h-screen text-white">

      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-600/40 bg-purple-600/10 text-purple-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              AI bot builder · no code required
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-snug mb-6">
              Deploy AI bots to<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                every channel in minutes
              </span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="text-base sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Build, train, and deploy AI chatbots that capture leads, answer questions, and resolve support queries — 24/7 across web, WhatsApp, Telegram, and more.
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login" className="px-7 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">
                Start a 7 Day Free Trial
              </Link>
              <button onClick={() => setModalOpen(true)} className="px-7 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm">
                See it in action →
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <BotPreview onClick={() => setModalOpen(true)} />
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-center text-xs text-gray-600 mt-4">Click different bots to see live conversations, settings, and analytics</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-3">Bot Intelligence</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your 24/7 AI sales & support team</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">Deploy once, run everywhere. Your bots handle the conversations while you focus on closing deals.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.tag} delay={i * 0.05}>
                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-purple-600/30 hover:bg-purple-600/5 transition-all duration-300">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-600/10 border border-purple-600/20 text-purple-400 text-[10px] font-semibold mb-4">{f.tag}</div>
                  <p className="text-xl mb-1">{f.icon}</p>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to deploy your first bot?</h2>
          <p className="text-gray-400 mb-8 text-sm max-w-md mx-auto">Takes 5 minutes. No code. Works on any website.</p>
          <Link href="/login" className="inline-block px-8 py-4 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">
            Start free trial →
          </Link>
        </ScrollReveal>
      </section>

      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

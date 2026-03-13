'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, GitBranch, Plug, LayoutDashboard, Sparkles, CheckCircle2, Circle, AlertTriangle, ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'appalix_welcome_v1'

const STEPS = [
  {
    id:    'pipeline',
    icon:  GitBranch,
    label: 'Create your first pipeline',
    sub:   'Set up stages to track your leads end-to-end.',
    href:  '/sage/pipelines',
    prompt: 'How do I create a pipeline in Appalix?',
  },
  {
    id:    'channel',
    icon:  Plug,
    label: 'Connect a channel',
    sub:   'Link email, a bot, or a form to start capturing leads.',
    href:  '/bots',
    prompt: 'How do I connect a bot or email channel to start capturing leads?',
  },
  {
    id:    'explore',
    icon:  LayoutDashboard,
    label: 'Explore the Sage dashboard',
    sub:   'See your leads, tickets, and AI automation in one place.',
    href:  '/sage/dashboard',
    prompt: 'Walk me through the Sage dashboard — what can I do here?',
  },
]

interface Props {
  userName:    string | null
  plan:        string
  trialEndsAt: string | null
}

function daysLeft(trialEndsAt: string): number {
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

const PRO_PLANS = ['pro', 'team', 'enterprise']

export function WelcomeModal({ userName, plan, trialEndsAt }: Props) {
  const [open,    setOpen]    = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const isOnTrial  = trialEndsAt != null && new Date(trialEndsAt) > new Date()
  const isPro      = PRO_PLANS.includes(plan)
  const isStarter  = !isPro
  const days       = trialEndsAt ? daysLeft(trialEndsAt) : 0

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
      const t = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(t)
    } catch { /* private browsing */ }
  }, [])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* */ }
    setOpen(false)
  }

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openSage(prompt: string) {
    dismiss()
    window.dispatchEvent(new CustomEvent('sage:open', { detail: { prompt } }))
  }

  if (!open) return null

  const firstName = userName?.split(' ')[0] ?? 'there'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-brand-50 to-white dark:from-[#61c2ad]/10 dark:to-[#1e1e1e]">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center mb-4">
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Welcome to Appalix, {firstName}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Get set up in a few steps — or let Sage guide you through everything.
          </p>

          {/* Trial badge */}
          {isOnTrial && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 dark:bg-[#61c2ad]/15 text-brand-700 dark:text-brand-300 text-[11px] font-medium">
              <Sparkles className="w-3 h-3" />
              {days > 0
                ? `${days}-day free trial — all Pro features unlocked`
                : 'Trial active — all Pro features unlocked'}
            </div>
          )}
        </div>

        {/* Starter plan warning */}
        {isStarter && isOnTrial && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Sage AI is a Pro feature
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                You're getting a free feel of it now. If you stay on the free plan after your trial, Sage chat will be disabled.{' '}
                <Link href="/settings/upgrade" onClick={dismiss} className="underline underline-offset-2 font-medium">
                  Upgrade to keep it →
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="px-6 py-4 space-y-2">
          {STEPS.map(({ id, icon: Icon, label, sub, href, prompt }) => {
            const done = checked.has(id)
            return (
              <div
                key={id}
                className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8"
              >
                <button
                  onClick={() => toggle(id)}
                  className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-600 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                >
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-brand-500" />
                    : <Circle className="w-5 h-5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Link
                      href={href}
                      onClick={dismiss}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Go there <ArrowRight className="w-3 h-3" />
                    </Link>
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <button
                      onClick={() => openSage(prompt)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      Ask Sage to guide me
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 space-y-2">
          <button
            onClick={() => openSage("I'm new to Appalix — walk me through everything step by step.")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Let Sage walk me through it
          </button>
          <button
            onClick={dismiss}
            className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1.5 transition-colors"
          >
            I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  )
}

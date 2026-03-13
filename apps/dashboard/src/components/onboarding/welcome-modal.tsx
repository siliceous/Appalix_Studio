'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Bot, Puzzle, BookOpen, Sparkles, AlertTriangle, ArrowRight, ChevronRight } from 'lucide-react'

const STORAGE_KEY = 'appalix_welcome_v1'

const STEPS = [
  {
    id:     'bot',
    step:   1,
    icon:   Bot,
    label:  'Create your first bot',
    sub:    'Set up your AI agent — give it a name, persona, and instructions.',
    href:   '/bots/new',
    sagePrompt: "I just created my bot in Appalix. What should I do next to set it up properly?",
  },
  {
    id:     'integrations',
    step:   2,
    icon:   Puzzle,
    label:  'Connect your integrations',
    sub:    'Link Gmail, Slack, WhatsApp, or any channel your leads come through.',
    href:   '/integrations',
    sagePrompt: "I'm on the integrations page. Walk me through connecting my first channel step by step.",
  },
  {
    id:     'knowledge',
    step:   3,
    icon:   BookOpen,
    label:  'Upload your knowledge base',
    sub:    'Add your docs, website, or FAQs so Sage knows your business inside out.',
    href:   '/sources',
    sagePrompt: "I'm ready to upload my knowledge base. Walk me through adding sources in Appalix so Sage can learn about my business.",
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
  const [open, setOpen] = useState(false)

  const isOnTrial = trialEndsAt != null && new Date(trialEndsAt) > new Date()
  const isStarter = !PRO_PLANS.includes(plan)
  const days      = trialEndsAt ? daysLeft(trialEndsAt) : 0

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

  function goWithSage(href: string, prompt: string) {
    dismiss()
    // Navigate first, then open Sage after a short delay so the page has loaded
    window.location.href = href
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sage:open', { detail: { prompt } }))
    }, 800)
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
            3 steps to go live — follow them in order or let Sage guide you.
          </p>

          {isOnTrial && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 dark:bg-[#61c2ad]/15 text-brand-700 dark:text-brand-300 text-[11px] font-medium">
              <Sparkles className="w-3 h-3" />
              {days > 0 ? `${days}-day free trial — all Pro features unlocked` : 'Trial active — all Pro features unlocked'}
            </div>
          )}
        </div>

        {/* Starter plan warning */}
        {isStarter && isOnTrial && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              <span className="font-medium text-amber-800 dark:text-amber-300">Sage AI is a Pro feature.</span>{' '}
              You're getting a free feel during your trial. Upgrade to keep it after.{' '}
              <Link href="/settings/upgrade" onClick={dismiss} className="underline underline-offset-2 font-medium">
                Upgrade →
              </Link>
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="px-6 py-4 space-y-2">
          {STEPS.map(({ id, step, icon: Icon, label, sub, href, sagePrompt }) => (
            <div
              key={id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/5"
            >
              {/* Step number */}
              <div className="shrink-0 w-7 h-7 rounded-full bg-brand-100 dark:bg-[#61c2ad]/15 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-none mb-0.5">Step {step}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">{sub}</p>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <Link
                  href={href}
                  onClick={dismiss}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors whitespace-nowrap"
                >
                  Let's Go <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => goWithSage(href, sagePrompt)}
                  className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3" />
                  with Sage
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer — Sage full walkthrough */}
        <div className="px-6 pb-6 pt-1 space-y-2">
          <button
            onClick={() => goWithSage('/bots/new', "I'm brand new to Appalix. Start from step 1 — walk me through creating my bot, connecting integrations, and uploading my knowledge base, one step at a time.")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Let Sage walk me through all 3 steps
          </button>
          <button
            onClick={dismiss}
            className="w-full inline-flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1.5 transition-colors"
          >
            I'll explore on my own <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

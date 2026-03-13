'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Bot, Puzzle, BookOpen, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react'

// v2 key stores progress; old v1 key (= '1') treated as fully dismissed
const STORAGE_KEY = 'appalix_onboarding_v2'

interface OnboardingState {
  dismissed:  boolean
  completed:  string[]   // step ids that have been actioned
}

function loadState(): OnboardingState {
  try {
    // Legacy: if old key exists treat as dismissed
    if (localStorage.getItem('appalix_welcome_v1') === '1') {
      return { dismissed: true, completed: [] }
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as OnboardingState
  } catch { /* */ }
  return { dismissed: false, completed: [] }
}

function saveState(state: OnboardingState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* */ }
}

export function resetOnboarding() {
  try {
    localStorage.removeItem('appalix_welcome_v1')
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* */ }
}

const ALL_STEPS = [
  {
    id:    'bot',
    step:  1,
    icon:  Bot,
    label: 'Create your first bot',
    sub:   'Set up your AI agent — give it a name, persona, and instructions.',
    href:  '/bots/new',
  },
  {
    id:    'integrations',
    step:  2,
    icon:  Puzzle,
    label: 'Connect your bot to a channel',
    sub:   'Add an integration to put your bot on Slack, WhatsApp, your website, and more.',
    href:  '/integrations',
  },
  {
    id:    'knowledge',
    step:  3,
    icon:  BookOpen,
    label: 'Upload your knowledge base',
    sub:   'Add your docs, website, or FAQs so Sage knows your business inside out.',
    href:  '/sources',
  },
]

interface Props {
  userName:        string | null
  plan:            string
  trialEndsAt:     string | null
  /** Step IDs already completed server-side (has bot / integration / source) */
  serverCompleted: string[]
}

function daysLeft(trialEndsAt: string): number {
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

const PRO_PLANS = ['pro', 'team', 'enterprise']

export function WelcomeModal({ userName, plan, trialEndsAt, serverCompleted }: Props) {
  const [open,      setOpen]      = useState(false)
  const [state,     setState]     = useState<OnboardingState>({ dismissed: false, completed: [] })

  const isOnTrial = trialEndsAt != null && new Date(trialEndsAt) > new Date()
  const isStarter = !PRO_PLANS.includes(plan)
  const days      = trialEndsAt ? daysLeft(trialEndsAt) : 0

  useEffect(() => {
    const s = loadState()
    // Merge server-detected completions into localStorage state
    const merged = { ...s, completed: Array.from(new Set([...s.completed, ...serverCompleted])) }
    if (merged.completed.length !== s.completed.length) saveState(merged)
    setState(merged)
    if (merged.dismissed) return
    const remaining = ALL_STEPS.filter(st => !merged.completed.includes(st.id))
    if (remaining.length === 0) return
    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = ALL_STEPS.filter(st => !state.completed.includes(st.id))
  const isFirstVisit = state.completed.length === 0

  function dismiss() {
    const next = { ...state, dismissed: true }
    saveState(next)
    setState(next)
    setOpen(false)
  }

  function completeStep(id: string, href: string) {
    const next = { ...state, completed: [...state.completed.filter(x => x !== id), id] }
    saveState(next)
    setState(next)
    setOpen(false)
    window.location.href = href
  }

  function openSageFullGuide() {
    setOpen(false)
    window.dispatchEvent(new CustomEvent('sage:open', {
      detail: { prompt: "I'm brand new to Appalix. Walk me through: 1) creating my bot, 2) connecting integrations, 3) uploading my knowledge base — one step at a time, verify each before moving on." },
    }))
  }

  if (!open || remaining.length === 0) return null

  const firstName   = userName?.split(' ')[0] ?? 'there'
  const doneCount   = state.completed.length
  const totalSteps  = ALL_STEPS.length

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

          {isFirstVisit ? (
            <>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Welcome to Appalix, {firstName}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                3 steps to go live — follow them in order or let Sage guide you.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Almost there — {totalSteps - doneCount} step{totalSteps - doneCount !== 1 ? 's' : ''} to go
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {doneCount} of {totalSteps} steps done. Keep going to finish setup.
              </p>
            </>
          )}

          {/* Progress bar */}
          {!isFirstVisit && (
            <div className="mt-3 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${(doneCount / totalSteps) * 100}%` }}
              />
            </div>
          )}

          {isOnTrial && isFirstVisit && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 dark:bg-[#61c2ad]/15 text-brand-700 dark:text-brand-300 text-[11px] font-medium">
              <Sparkles className="w-3 h-3" />
              {days > 0 ? `${days}-day free trial — all Pro features unlocked` : 'Trial active — all Pro features unlocked'}
            </div>
          )}
        </div>

        {/* Starter plan warning — first visit only */}
        {isStarter && isOnTrial && isFirstVisit && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              <span className="font-medium text-amber-800 dark:text-amber-300">Sage AI is a Pro feature.</span>{' '}
              You're getting a free feel during your trial.{' '}
              <Link href="/settings/upgrade" onClick={dismiss} className="underline underline-offset-2 font-medium">
                Upgrade to keep it →
              </Link>
            </p>
          </div>
        )}

        {/* Remaining steps */}
        <div className="px-6 py-4 space-y-2">
          {remaining.map(({ id, step, icon: Icon, label, sub, href }) => (
            <div
              key={id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/5"
            >
              <div className="shrink-0 w-7 h-7 rounded-full bg-brand-100 dark:bg-[#61c2ad]/15 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-none mb-0.5">Step {step}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">{sub}</p>
              </div>

              <button
                onClick={() => completeStep(id, href)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Let's Go <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-1 space-y-2">
          <button
            onClick={openSageFullGuide}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {isFirstVisit ? 'Let Sage walk me through all 3 steps' : 'Ask Sage to help with the next step'}
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

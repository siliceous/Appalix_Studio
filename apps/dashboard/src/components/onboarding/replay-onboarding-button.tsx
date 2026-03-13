'use client'

import { Sparkles } from 'lucide-react'
import { resetOnboarding } from './welcome-modal'

export function ReplayOnboardingButton() {
  function replay() {
    resetOnboarding()
    window.location.reload()
  }

  return (
    <button
      onClick={replay}
      className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
    >
      <Sparkles className="w-3.5 h-3.5" />
      Replay getting started guide
    </button>
  )
}

'use client'

import { useActionState } from 'react'
import { useEffect, useRef } from 'react'
import { subscribeToNewsletter } from '@/app/actions/newsletter'

export function NewsletterSignup() {
  const [state, action, isPending] = useActionState(subscribeToNewsletter, null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.success && inputRef.current) {
      inputRef.current.value = ''
    }
  }, [state])

  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-3xl mb-4">📬</div>
        <h2 className="text-2xl font-bold mb-3">Stay ahead of the curve</h2>
        <p className="text-white/65 mb-8 text-sm">
          Get new guides, case studies, and product updates delivered to your inbox every two weeks.
        </p>

        {state?.success ? (
          <p className="text-[#15A4AE] font-medium">{state.message}</p>
        ) : (
          <form action={action} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              ref={inputRef}
              type="email"
              name="email"
              required
              placeholder="you@company.com"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder-gray-600 outline-none focus:border-brand-600/50 transition-colors"
            />
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-[#1a8c76] hover:bg-[#14705d] disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
            >
              {isPending ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        )}

        {state && !state.success && (
          <p className="text-red-400 text-sm mt-3">{state.message}</p>
        )}

        <p className="text-xs text-gray-600 mt-3">No spam. Unsubscribe any time.</p>
      </div>
    </section>
  )
}

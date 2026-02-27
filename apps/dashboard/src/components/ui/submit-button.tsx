'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

interface SubmitButtonProps {
  children: React.ReactNode
  pendingText?: string
  className?: string
  disabled?: boolean
}

/**
 * Drop-in replacement for <button type="submit"> inside a <form action={serverAction}>.
 * Shows a spinner and disables the button while the server action is in-flight,
 * preventing duplicate submissions.
 */
export function SubmitButton({ children, pendingText, className, disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {pendingText ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}

interface IconSubmitButtonProps {
  children: React.ReactNode
  className?: string
  title?: string
}

/**
 * Like SubmitButton but for icon-only buttons — swaps the icon for a spinner.
 */
export function IconSubmitButton({ children, className, title }: IconSubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={className} title={title}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  )
}

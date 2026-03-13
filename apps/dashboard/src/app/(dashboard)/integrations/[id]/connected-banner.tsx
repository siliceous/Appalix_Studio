'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export function ConnectedBanner({ platform }: { platform: string }) {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/integrations'), 2000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/25 text-green-700 dark:text-green-400">
      <CheckCircle2 className="w-5 h-5 shrink-0" />
      <p className="text-sm font-medium">
        {platform} connected successfully! Redirecting you back…
      </p>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Invisible component: polls router.refresh() every 4 s while any source
 * is still pending or processing. Rendered only when hasActiveJobs is true.
 */
export function SourcesPoller() {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, 4000)

    return () => clearInterval(id)
  }, [router])

  return null
}

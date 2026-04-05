'use client'

import { useEffect } from 'react'

/** Prevents the browser window from scrolling while in the dashboard. All scrolling
 *  happens inside the individual content containers. */
export function BodyScrollLock() {
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => { html.style.overflow = prev }
  }, [])
  return null
}

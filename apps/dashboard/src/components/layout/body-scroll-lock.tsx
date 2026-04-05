'use client'

import { useEffect } from 'react'

/** Prevents the browser window from scrolling while in the dashboard. All scrolling
 *  happens inside the individual content containers. */
export function BodyScrollLock() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    html.style.height = '100%'
    body.style.overflow = 'hidden'
    body.style.height = '100%'
    return () => {
      html.style.overflow = prevHtml
      html.style.height = ''
      body.style.overflow = prevBody
      body.style.height = ''
    }
  }, [])
  return null
}

'use client'

import { useEffect } from 'react'

export function WorkspaceBgApplier({
  bgColor,
  cardColor,
}: {
  bgColor:   string | null
  cardColor: string | null
}) {
  useEffect(() => {
    if (bgColor && /^#[0-9a-fA-F]{6}$/.test(bgColor)) {
      document.documentElement.style.setProperty('--ws-bg', bgColor)
    } else {
      document.documentElement.style.removeProperty('--ws-bg')
    }

    if (cardColor && /^#[0-9a-fA-F]{6}$/.test(cardColor)) {
      document.documentElement.style.setProperty('--ws-card', cardColor)
    } else {
      document.documentElement.style.removeProperty('--ws-card')
    }
  }, [bgColor, cardColor])

  return null
}

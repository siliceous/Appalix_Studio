'use client'

import { useEffect } from 'react'

const GOOGLE_FONTS = [
  'Inter', 'Poppins', 'Nunito', 'Raleway', 'Montserrat',
  'Lato', 'DM Sans', 'Plus Jakarta Sans', 'Outfit', 'Figtree',
]

export function WorkspaceFontApplier({
  fontFamily,
  fontSize,
}: {
  fontFamily: string | null
  fontSize:   number | null
}) {
  useEffect(() => {
    // Apply font family
    if (fontFamily) {
      document.documentElement.style.setProperty('--ws-font', `'${fontFamily}', sans-serif`)
      // Inject Google Fonts link if needed
      if (GOOGLE_FONTS.includes(fontFamily)) {
        const id = `ws-gfont-${fontFamily.replace(/\s/g, '-')}`
        if (!document.getElementById(id)) {
          const link = document.createElement('link')
          link.id   = id
          link.rel  = 'stylesheet'
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap`
          document.head.appendChild(link)
        }
      }
    } else {
      document.documentElement.style.removeProperty('--ws-font')
    }

    // Apply font size (sets html root px so all rem values scale)
    if (fontSize && fontSize >= 12 && fontSize <= 20) {
      document.documentElement.style.fontSize = `${fontSize}px`
    } else {
      document.documentElement.style.fontSize = ''
    }
  }, [fontFamily, fontSize])

  return null
}

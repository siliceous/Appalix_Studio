import type { ReactNode } from 'react'

// Force html/body to render transparent so the form blends with whatever's behind
// the iframe on a customer's site. Standalone visits look fine because the browser
// background is white anyway.
export default function PublicFormLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{'html,body{background:transparent !important;}'}</style>
      {children}
    </>
  )
}

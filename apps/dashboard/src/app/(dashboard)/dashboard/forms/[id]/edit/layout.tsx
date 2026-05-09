import type { ReactNode } from 'react'

// Counter the parent forms/layout.tsx's `-m-8` so the editor renders inside
// the standard dashboard chrome (sidebar + padding visible) rather than
// going fullscreen. The editor still gets the full available height.
export default function FormEditLayout({ children }: { children: ReactNode }) {
  return (
    <div className="m-8 h-[calc(100%-0px)] flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
      {children}
    </div>
  )
}

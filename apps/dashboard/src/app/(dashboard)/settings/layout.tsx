import React from 'react'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto -m-8 p-8">
      {children}
    </div>
  )
}

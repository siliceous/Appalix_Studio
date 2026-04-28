import React from 'react'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SageToolbar pageKey="settings" />
      <div className="flex-1 overflow-y-auto p-8">
        {children}
      </div>
    </div>
  )
}

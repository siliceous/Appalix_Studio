'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface GenerationLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function GenerationLayout({ children }: GenerationLayoutProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>
    </div>
  )
}

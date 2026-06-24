'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Image, Video, ShoppingBag, Zap, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/ai-studio',
    label: 'Dashboard',
    icon: ArrowRight,
  },
  {
    href: '/ai-studio/create-image',
    label: 'Create Image',
    icon: Image,
  },
  {
    href: '/ai-studio/create-video',
    label: 'Create Video',
    icon: Video,
  },
  {
    href: '/ai-studio/product-ads',
    label: 'Product Ads',
    icon: ShoppingBag,
  },
  {
    href: '/ai-studio/talking-ad',
    label: 'Talking Ad',
    icon: Zap,
  },
]

interface AIStudioLayoutProps {
  children: React.ReactNode
}

export function AIStudioLayout({ children }: AIStudioLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="flex gap-4">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-white/10 p-6 h-screen overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
            AI Studio
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Create professional AI-generated content
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors',
                  isActive
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Info Card */}
        <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
            Pro Tip
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-300">
            Use projects to organize and reuse your assets across multiple generations.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

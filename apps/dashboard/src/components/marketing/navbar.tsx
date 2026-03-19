'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const DASHBOARD_LINKS = [
  { label: 'AI Agent',  href: '/ai-agent',      desc: 'Deploy AI chatbots trained on your content' },
  { label: 'Email',     href: '/email',          desc: 'AI triage and reply for your inbox' },
  { label: 'Bot',       href: '/bot',            desc: 'Build and configure your AI bots' },
  { label: 'Forms',     href: '/smart-forms',    desc: 'Capture leads from every source' },
  { label: 'Tickets',   href: '/tickets',        desc: 'Support ticket management' },
]

const TOP_LINKS = [
  { label: 'Sage',          href: '/ai-assistant', badge: true },
  { label: 'eCommerce',     href: '/ecommerce'   },
  { label: 'Integrations',  href: '/platforms'   },
  { label: 'Pricing',       href: '/pricing'     },
]

function DashboardDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Dashboard
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 rounded-xl border border-white/10 bg-[#1c1c1c] shadow-2xl shadow-black/40 overflow-hidden z-50">
          <div className="p-1.5">
            {DASHBOARD_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex flex-col px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <span className="text-sm font-medium text-gray-200 group-hover:text-white">{l.label}</span>
                <span className="text-xs text-gray-500 group-hover:text-gray-400 mt-0.5">{l.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MarketingNavbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#1c1c1c]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Appalix"
            width={120}
            height={36}
            className="object-contain mix-blend-screen"
            priority
          />
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          <DashboardDropdown />
          {TOP_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {l.label}
              {'badge' in l && l.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-600/20 text-brand-400 border border-brand-600/30 leading-none">
                  Pro
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium bg-[#1a8c76] hover:bg-[#14705d] text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  )
}

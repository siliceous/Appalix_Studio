import Link from 'next/link'
import Image from 'next/image'

const NAV_LINKS = [
  { label: 'AI Agent',      href: '/'              },
  { label: 'Features',      href: '/features'      },
  { label: 'Sage',          href: '/ai-assistant',   badge: true },
  { label: 'Integrations',  href: '/platforms'     },
  { label: 'Pricing',       href: '/pricing'       },
  { label: 'Security',      href: '/security'      },
  { label: 'Resources',     href: '/resources'     },
]

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
          {NAV_LINKS.map((l) => (
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

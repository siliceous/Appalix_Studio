import Link from 'next/link'
import Image from 'next/image'

const NAV_LINKS = [
  { label: 'AI Agent',      href: '/'              },
  { label: 'Features',      href: '/features'      },
  { label: 'Integrations',  href: '/platforms'     },
  { label: 'Pricing',       href: '/pricing'       },
  { label: 'Resources',     href: '/resources'     },
]

export function MarketingNavbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#111111]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Appalix"
            width={120}
            height={36}
            className="object-contain invert"
            priority
          />
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {l.label}
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
            className="text-sm font-medium bg-[#3873BB] hover:bg-[#1a4073] text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  )
}

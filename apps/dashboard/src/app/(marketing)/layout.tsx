import { MarketingNavbar } from '@/components/marketing/navbar'
import { MarketingFooter } from '@/components/marketing/footer'
import { NewsletterSignup } from '@/components/marketing/newsletter-signup'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#1c1c1c] min-h-screen text-white">
      <MarketingNavbar />
      <main>{children}</main>
      <NewsletterSignup />
      <MarketingFooter />
    </div>
  )
}

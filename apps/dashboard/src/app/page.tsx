import type { Metadata } from 'next'
import { MarketingNavbar } from '@/components/marketing/navbar'
import { MarketingFooter } from '@/components/marketing/footer'
import { NewsletterSignup } from '@/components/marketing/newsletter-signup'
import TestLandingPage from '@/app/(marketing)/test/page'

export const metadata: Metadata = {
  title: 'Appalix — AI Lead Capture & Pipeline Management from Every Channel',
  description:
    'Capture leads from forms, email, and chatbots automatically. AI qualifies, scores, and routes every lead into your pipeline. One platform. Every source.',
  keywords: [
    'AI lead capture software',
    'lead management platform',
    'multi-channel lead capture',
    'AI CRM for small business',
    'automated lead qualification',
    'lead pipeline management',
    'chatbot lead generation',
    'Google Ads lead capture',
    'Meta lead ads integration',
    'AI sales pipeline tool',
  ],
  alternates: { canonical: 'https://appalix.ai' },
}

export default function HomePage() {
  return (
    <div className="bg-[#1c1c1c] min-h-screen text-white">
      <MarketingNavbar />
      <main>
        <TestLandingPage />
      </main>
      <NewsletterSignup />
      <MarketingFooter />
    </div>
  )
}

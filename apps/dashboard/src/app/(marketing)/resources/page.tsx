import Link from 'next/link'
import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'
import { NewsletterSignup } from '@/components/marketing/newsletter-signup'

export const metadata: Metadata = {
  title: 'Resources — AI Sales Agent Guides, Tutorials & Case Studies | Appalix',
  description:
    'Guides, tutorials, and strategies to help you get more from your AI sales agents. Expert insights on conversational AI for sales and support.',
  keywords: [
    'AI chatbot guide',
    'AI sales agent tutorial',
    'conversational AI for sales',
    'chatbot case study',
    'AI agent best practices',
  ],
}

const POSTS = [
  {
    category: 'Product',
    title: 'Meet Appalix Sage: Your Team\'s Internal AI Assistant',
    excerpt: 'Appalix Sage puts AI to work inside your team — searching your knowledge base, drafting proposals and reports, and sharing content with colleagues. Available on Pro and above.',
    readTime: '8 min read',
    date: 'Feb 26, 2026',
    emoji: '✦',
    slug: 'meet-appalix-copilot',
  },
  {
    category: 'Guide',
    title: 'Multiple Bots on Multiple Platforms',
    excerpt: 'Train one AI agent and deploy it across unlimited websites, Slack, WhatsApp, Telegram, and more — each channel with its own settings, branding, and CRM integration.',
    readTime: '6 min read',
    date: 'Mar 5, 2026',
    emoji: '🌐',
    slug: 'multiple-bots-multiple-platforms',
  },
  {
    category: 'Tutorial',
    title: 'Connecting Webhook URLs to CRMs and Human Handover',
    excerpt: 'Step-by-step: capture leads into HubSpot or Salesforce automatically, and alert your team on Slack, Discord, Telegram, or WhatsApp the moment a visitor requests a human.',
    readTime: '10 min read',
    date: 'Feb 24, 2026',
    emoji: '🔗',
    slug: 'connecting-webhooks-crm-handover',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect HubSpot CRM to Appalix',
    excerpt: 'Native HubSpot integration — no Zapier needed. Create a Private App token in HubSpot and Appalix will push captured leads straight into your contacts automatically.',
    readTime: '8 min read',
    date: 'Feb 26, 2026',
    emoji: '🟠',
    slug: 'connect-hubspot',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Zapier to Appalix for CRM Lead Capture',
    excerpt: 'Route Appalix leads to HubSpot, Salesforce, Google Sheets, Pipedrive, or 6,000+ apps via a Zapier Catch Hook. Available on Core plan and above — zero code required.',
    readTime: '7 min read',
    date: 'Feb 26, 2026',
    emoji: '🔗',
    slug: 'connect-zapier',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Intercom to Appalix',
    excerpt: 'Automatically create Intercom leads the moment a visitor shares contact details in your AI chat. Get your Access Token from the Intercom Developer Hub in under 5 minutes.',
    readTime: '7 min read',
    date: 'Feb 26, 2026',
    emoji: '💬',
    slug: 'connect-intercom',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Zoho CRM to Appalix',
    excerpt: 'Push leads directly into the Zoho CRM Leads module using an OAuth access token. Covers both the quick Self Client method and the production OAuth app approach.',
    readTime: '9 min read',
    date: 'Feb 26, 2026',
    emoji: '🔵',
    slug: 'connect-zoho-crm',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Salesforce to Appalix',
    excerpt: 'Create Salesforce Lead records automatically when visitors share contact details in chat. Step-by-step: get an OAuth access token via Workbench or a Connected App.',
    readTime: '10 min read',
    date: 'Feb 26, 2026',
    emoji: '☁️',
    slug: 'connect-salesforce',
  },
  {
    category: 'Guide',
    title: 'How to train your AI agent on your product docs in under 10 minutes',
    excerpt: 'A step-by-step walkthrough of syncing your knowledge base, PDFs, and website content to build an expert AI agent fast.',
    readTime: '5 min read',
    date: 'Feb 18, 2026',
    emoji: '📚',
  },
  {
    category: 'Strategy',
    title: '7 ways AI sales agents increase conversion rates on landing pages',
    excerpt: 'Real tactics used by high-growth SaaS companies to turn passive visitors into qualified leads using conversational AI.',
    readTime: '7 min read',
    date: 'Feb 14, 2026',
    emoji: '📈',
  },
  {
    category: 'Tutorial',
    title: 'Setting up your Appalix web widget: a complete guide',
    excerpt: 'Everything you need to know about embedding, customising, and optimising the Appalix chat widget on your website.',
    readTime: '6 min read',
    date: 'Feb 10, 2026',
    emoji: '🔌',
  },
  {
    category: 'Case Study',
    title: 'How GrowthCo reduced support tickets by 68% in 30 days',
    excerpt: 'Discover how one B2B SaaS company deployed an AI agent to handle tier-1 support and free their team for complex issues.',
    readTime: '4 min read',
    date: 'Feb 6, 2026',
    emoji: '🏆',
  },
  {
    category: 'Product',
    title: 'Introducing multilingual AI agents: 95 languages, zero setup',
    excerpt: 'Your Appalix agent now automatically detects and responds in your visitor\'s language — enabling truly global customer conversations.',
    readTime: '3 min read',
    date: 'Jan 30, 2026',
    emoji: '🌍',
  },
  {
    category: 'Guide',
    title: 'Human handoff done right: when and how to escalate AI conversations',
    excerpt: 'The best AI agents know their limits. Learn how to configure smart escalation rules so no customer ever feels stuck.',
    readTime: '6 min read',
    date: 'Jan 24, 2026',
    emoji: '🤝',
  },
]

const CATEGORIES = ['All', 'Guide', 'Tutorial', 'Strategy', 'Case Study', 'Product']

export default function ResourcesPage() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <ScrollReveal>
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Resources</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5">Insights for AI-first teams</h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Guides, tutorials, and strategies to help you get more from your AI sales agents.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href="/" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                ← Back to home
              </Link>
              <span className="text-gray-700">·</span>
              <Link href="/features" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                View features →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Category filter */}
      <section className="px-6 pb-8">
        <ScrollReveal>
          <div className="max-w-7xl mx-auto flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  cat === 'All'
                    ? 'bg-brand-600/20 border-brand-600/40 text-brand-300'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Posts grid */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map((post, i) => (
            <ScrollReveal key={post.title} delay={i * 0.07}>
              <Link href={'slug' in post ? `/resources/${post.slug}` : '#'} className="block h-full">
              <article className="group flex flex-col rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors overflow-hidden cursor-pointer h-full">
                {/* Thumbnail placeholder */}
                <div className="h-36 bg-gradient-to-br from-brand-600/10 to-transparent flex items-center justify-center border-b border-white/5">
                  <span className="text-5xl">{post.emoji}</span>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-600">{post.readTime}</span>
                  </div>

                  <h2 className="font-semibold text-white leading-snug mb-2 group-hover:text-brand-300 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{post.excerpt}</p>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <span className="text-xs text-gray-600">{post.date}</span>
                    <span className="text-xs text-brand-400 font-medium group-hover:text-brand-300 transition-colors">
                      Read more →
                    </span>
                  </div>
                </div>
              </article>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <NewsletterSignup />
    </div>
  )
}

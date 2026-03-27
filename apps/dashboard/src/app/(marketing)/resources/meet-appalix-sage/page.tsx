import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Meet Appalix Sage — Your Team\'s Internal AI Assistant',
  description:
    'Appalix Sage puts AI to work inside your team — searching your knowledge base, drafting proposals and reports, and sharing content with colleagues. Available on Pro plan and above.',
  keywords: [
    'internal AI assistant',
    'team AI sage',
    'AI for internal teams',
    'knowledge base AI',
    'AI document generation',
    'AI proposal drafting',
    'internal chatbot',
    'Appalix Sage',
    'AI team productivity tool',
    'internal knowledge base AI search',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/meet-appalix-sage' },
  openGraph: {
    title: 'Meet Appalix Sage — Your Team\'s Internal AI Assistant',
    description: 'Appalix Sage puts AI to work inside your team — searching docs, drafting proposals, and sharing content with colleagues.',
    url: 'https://appalix.ai/resources/meet-appalix-sage',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meet Appalix Sage — Your Team\'s Internal AI Assistant',
    description: 'Appalix Sage puts AI to work inside your team — searching docs, drafting proposals, and sharing content with colleagues.',
  },
}

export default function SageBlogPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="Article"
        title="Meet Appalix Sage — Your Team's Internal AI Assistant"
        description="Appalix Sage puts AI to work inside your team — searching your knowledge base, drafting proposals and reports, and sharing content with colleagues. Available on Pro plan and above."
        slug="meet-appalix-sage"
        datePublished="2026-02-26"
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Meet Appalix Sage</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Product</span>
            <span className="text-xs text-white/60">8 min read · Feb 26, 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">

            Meet Appalix Sage: Your Team&apos;s Internal AI Assistant
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            You already have an AI chatbot serving your customers. Now Appalix Sage puts that same intelligence to work <em>inside</em> your team — searching your knowledge base, drafting documents, and helping everyone move faster.
          </p>
        </div>

        {/* Hero callout */}
        <div className="mb-10 p-6 rounded-2xl bg-gradient-to-br from-brand-600/15 to-transparent border border-brand-600/20">
          <p className="text-sm font-semibold text-brand-300 mb-2">✦ Available on Pro and above</p>
          <p className="text-sm text-white/65 leading-relaxed">
            Appalix Sage is included with every <strong className="text-white">Pro, Scale, and Enterprise</strong> plan at no extra charge. Starter plan users can access it after upgrading.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-10" />

        {/* Article body */}
        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          {/* What is Sage */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What is Appalix Sage?</h2>
            <p>
              Appalix already powers AI chatbots that handle your <em>customer</em> conversations across your website, Slack, WhatsApp, and more. Sage is the other side of that coin — an AI assistant designed for your <strong className="text-white">internal team</strong>.
            </p>
            <p className="mt-4">
              Instead of a customer typing a question into your website widget, it&apos;s your marketing manager asking for a first draft of a campaign brief. Or your sales lead requesting a proposal for a new account. Or your operations team searching your internal SOPs without digging through folders.
            </p>
            <p className="mt-4">
              Sage lives inside the Appalix dashboard under its own dedicated section. It is tied to your workspace and its knowledge base, so every answer it gives draws on <strong className="text-white">your</strong> company&apos;s actual content — not the generic internet.
            </p>
            <div className="mt-6 p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm font-semibold text-white mb-2">Two modes, two audiences</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-1">Chat Agent</p>
                  <p className="text-sm text-white/65">Your customer-facing chatbot. Deployed on your website, Slack, WhatsApp, and more. Serves visitors and customers.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-1">Sage</p>
                  <p className="text-sm text-white/65">Your internal AI assistant. Lives in the Appalix dashboard. Serves your authenticated team members only.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Key features */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What Sage can do</h2>
            <p>
              Sage is not a generic AI chatbot. It is purpose-built for internal team productivity, with four core capabilities:
            </p>

            <div className="mt-6 space-y-4">
              {[
                {
                  icon: '🔍',
                  title: 'Knowledge base search',
                  desc: 'Sage searches your workspace knowledge base — the same one that powers your customer chatbot — and surfaces the most relevant content in plain language. Ask "What does our return policy say about software licences?" and get a direct answer with the source passage, not a list of documents to scroll through.',
                },
                {
                  icon: '📄',
                  title: 'Document drafting',
                  desc: 'Need a proposal for a new client? A project status report? A job description? An investor update? Describe what you need and Sage produces a complete, ready-to-use draft. Not a bullet-point skeleton — a full document you can copy, edit, and send.',
                },
                {
                  icon: '📊',
                  title: 'Summaries and analysis',
                  desc: 'Feed Sage a brief and it will summarise, extract key points, reformat, translate, or turn it into a slide outline. Paste a long meeting transcript and ask for the action items. Describe your quarterly results and ask for a crisp executive summary.',
                },
                {
                  icon: '📧',
                  title: 'Content sharing with colleagues',
                  desc: 'When Sage drafts a document, it can also help you share it. Ask it to email the draft to a colleague and it will use your configured Resend email settings to send it directly. You can also copy a hosted link to the document for quick sharing in Slack or any other tool.',
                },
              ].map((f) => (
                <div key={f.title} className="flex gap-4 p-5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-2xl shrink-0">{f.icon}</span>
                  <div>
                    <p className="font-semibold text-white mb-1">{f.title}</p>
                    <p className="text-sm text-white/65 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Who is it for */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Who benefits most from Sage?</h2>
            <p>
              Sage is most valuable for companies where multiple team members regularly need to find information, produce written content, or share knowledge quickly. Here is how different roles use it:
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { role: '📣 Marketing', use: 'Draft blog posts, email campaigns, landing page copy, and press releases in seconds. Use your knowledge base as the source of truth for every piece of content.' },
                { role: '💼 Sales', use: 'Generate tailored proposals and pitch decks on demand. Ask for competitive talking points, prepare for a specific account, or draft a follow-up email after a call.' },
                { role: '🛠 Operations', use: 'Search SOPs and internal policies without hunting through shared drives. Generate process documentation, onboarding guides, and compliance checklists.' },
                { role: '👩‍💼 Management', use: 'Produce board reports, investor updates, and team briefings. Get instant summaries of internal documents before a meeting starts.' },
              ].map((item) => (
                <div key={item.role} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-semibold text-white text-sm mb-2">{item.role}</p>
                  <p className="text-xs text-white/65 leading-relaxed">{item.use}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How the knowledge base works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How Sage uses your knowledge base</h2>
            <p>
              Sage uses the same knowledge base that powers your customer chatbot. That means every document, URL, FAQ, and training file you have already uploaded is instantly available to your team through Sage — with no extra configuration.
            </p>
            <p className="mt-4">
              When you send a message, Sage automatically retrieves the most relevant passages from your knowledge base using semantic search. Those passages are injected into its context before it generates a reply, so answers are grounded in your actual company content rather than general AI knowledge.
            </p>
            <div className="mt-5 p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm font-semibold text-white mb-2">Example</p>
              <p className="text-sm text-white/65 leading-relaxed">
                You upload your company&apos;s 60-page product handbook to the knowledge base (for your customer chatbot). Your sales team can now ask Sage: <em>&quot;What are the key differentiators in our Enterprise tier?&quot;</em> — and get a concise, accurate answer drawn directly from the handbook. No hunting, no page numbers, no manual reading.
              </p>
            </div>
          </section>

          {/* Step by step activation */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How to activate Sage — step by step</h2>
            <ol className="space-y-6 mt-4">
              {[
                {
                  step: '1',
                  title: 'Upgrade to a Pro plan',
                  desc: 'Sage is available on Pro, Scale, and Enterprise plans. If you are on Starter, navigate to Settings → Upgrade in your dashboard. Pro plans start with a 14-day free trial — no card required at signup.',
                },
                {
                  step: '2',
                  title: 'Open the Sage section in your sidebar',
                  desc: 'Once your workspace is on a Pro plan, a "Sage" link with a sparkle icon appears in the left sidebar of your dashboard. Click it to open the Sage chat interface.',
                },
                {
                  step: '3',
                  title: 'Make sure your knowledge base is populated',
                  desc: 'Go to Sources → Add Source and upload your internal documents, website URLs, PDFs, and FAQs. The more you train your knowledge base, the more useful Sage becomes. Sources you have already added for your customer chatbot are immediately available to Sage — no duplication needed.',
                },
                {
                  step: '4',
                  title: '(Optional) Configure email sharing',
                  desc: 'If you want Sage to send documents to colleagues by email, go to Settings → Automation and add your Resend API key and a from-address. This takes about two minutes and unlocks the email sharing capability.',
                },
                {
                  step: '5',
                  title: 'Start a conversation',
                  desc: 'Type your first message in the chat box. You can use one of the four starter prompts to get going — "Summarise our knowledge base", "Draft a proposal for a new client", "What are our most common support queries?", or "Help me write a project status report". Sage will respond using your workspace content.',
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-600/30 text-brand-400 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">{item.title}</p>
                    <p className="text-sm text-white/65 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Conversation examples */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Real conversations you can have with Sage</h2>
            <div className="space-y-4">
              {[
                {
                  prompt: '"Draft a proposal for Henderson & Co. They are a 200-person logistics company looking to automate their customer support."',
                  response: 'Sage produces a full proposal — executive summary, problem statement, proposed solution, pricing overview, and next steps — in under 10 seconds. You edit it, copy it, or ask Sage to email it directly to the account owner.',
                },
                {
                  prompt: '"What does our standard SLA say about response times for P1 issues?"',
                  response: 'Sage searches your knowledge base for the SLA document, extracts the relevant clause, and quotes it verbatim with context. No digging through shared drives.',
                },
                {
                  prompt: '"Write a project status update for the Henderson implementation. We are 60% done, on schedule, and blocked on getting their API credentials."',
                  response: 'Sage formats a professional status update email including a progress summary, the current blocker, and a proposed next step — ready to send to the client in one click.',
                },
                {
                  prompt: '"Summarise the last 3 months of our knowledge base updates into a team briefing I can share in Slack."',
                  response: 'Sage reads through your knowledge base, identifies recently updated content, and produces a concise team briefing. You copy it straight into Slack.',
                },
              ].map((ex, i) => (
                <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-brand-300 font-medium mb-3 italic">{ex.prompt}</p>
                  <p className="text-xs text-white/65 leading-relaxed">{ex.response}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Security & access */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Security and access control</h2>
            <p>
              Sage is built with team security in mind from the ground up:
            </p>
            <ul className="space-y-3 mt-4">
              {[
                'Only authenticated workspace members can access Sage. It is never exposed publicly.',
                'Every Sage request is validated against your Supabase session — unauthenticated requests are rejected at both the dashboard and API layers.',
                'The Fastify API that powers Sage uses a service-key-only authentication pattern — it is never directly callable from the browser.',
                'Sage conversations are session-only (held in browser memory) by default, so no conversation data is stored in your database.',
                'The plan gate is enforced server-side: even if a Starter-plan user somehow navigated to /sage, the API route would return a 403 before any AI call is made.',
              ].map((point, i) => (
                <li key={i} className="flex gap-3">
                  <svg className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-white/80 leading-relaxed">{point}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Roadmap */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What&apos;s coming next</h2>
            <p>
              The current Sage release is the foundation. Here is what is on the roadmap:
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: '💾', label: 'Persistent conversation history', desc: 'Saved sessions so you can pick up where you left off across browser tabs and days.' },
                { icon: '🔔', label: 'Approval routing', desc: 'Ask Sage to "route this proposal for sign-off" and it creates an approval request and notifies the right person via email or Slack.' },
                { icon: '📤', label: 'CSV data exports', desc: 'Ask Sage for a CSV of your leads or conversations and download it instantly.' },
                { icon: '👥', label: 'Team channels', desc: 'Bring Sage into your Slack or Microsoft Teams workspace so your whole team can query it without logging into the dashboard.' },
              ].map((item) => (
                <div key={item.label} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">{item.label}</p>
                    <p className="text-xs text-white/65 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Summary */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Summary</h2>
            <p>
              Appalix Sage turns your existing knowledge base into a team-wide AI assistant. The same content that answers your customers&apos; questions can now draft proposals for your sales team, write reports for your managers, and surface policy details for your operations team — all in a single conversation.
            </p>
            <p className="mt-4">
              It is not a separate product, a separate subscription, or a separate system to maintain. It is built into your Appalix workspace, available the moment you upgrade to Pro, and ready to use in under five minutes.
            </p>
            <p className="mt-4">
              Your customers already have an AI working for them. Now your team does too.
            </p>
          </section>

        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-12" />

        {/* CTA */}
        <div className="text-center">
          <p className="text-white/65 mb-5 text-sm">Ready to put AI to work for your internal team?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-[#1a8c76] hover:bg-[#14705d] text-white text-sm font-medium rounded-xl transition-colors"
            >
              Start a 14-Day Free Trial →
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-2.5 border border-white/10 hover:border-white/20 text-white/80 hover:text-white text-sm font-medium rounded-xl transition-colors"
            >
              View Pro plan features
            </Link>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-12 text-center">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
        </div>

      </div>
    </div>
  )
}

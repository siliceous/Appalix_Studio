import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Sage Automation Rules — Smart Multi-Pipeline Lead Routing | Appalix',
  description:
    'Learn how to use Sage Automation Rules to route leads intelligently across pipelines. Set conditions like priority, keywords, and channel to trigger the right action automatically.',
  keywords: [
    'Sage automation rules',
    'multi-pipeline routing',
    'AI lead routing',
    'CRM automation rules',
    'lead pipeline automation',
    'Appalix Sage rules',
    'smart lead assignment',
    'conditional automation CRM',
    'pipeline routing conditions',
    'enterprise lead routing',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/sage-automation-rules' },
  openGraph: {
    title: 'Sage Automation Rules — Smart Multi-Pipeline Lead Routing',
    description: 'Route leads intelligently across pipelines using conditions like priority, keywords, and channel. First-match wins.',
    url: 'https://appalix.ai/resources/sage-automation-rules',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sage Automation Rules — Smart Multi-Pipeline Lead Routing',
    description: 'Route leads intelligently across pipelines using conditions like priority, keywords, and channel. First-match wins.',
  },
}

export default function SageAutomationRulesPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="Article"
        title="Sage Automation Rules — Smart Multi-Pipeline Lead Routing"
        description="Learn how to use Sage Automation Rules to route leads intelligently across pipelines. Set conditions like priority, keywords, and channel to trigger the right action automatically."
        slug="sage-automation-rules"
        datePublished="2026-03-13"
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Sage Automation Rules</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Product</span>
            <span className="text-xs text-white/60">10 min read · Mar 13, 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Sage Automation Rules: Route Every Lead to the Right Pipeline Automatically
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Sage Auto is powerful on its own — it watches your emails, bot conversations, forms, and tickets, and creates contacts and deals without you lifting a finger. But every business is different. An enterprise enquiry should land in your Sales pipeline. A support complaint should become a ticket. A casual question from a student should be ignored. Automation Rules let you encode that logic so Sage always does the right thing.
          </p>
        </div>

        {/* Hero callout */}
        <div className="mb-10 p-6 rounded-2xl bg-gradient-to-br from-brand-600/15 to-transparent border border-brand-600/20">
          <p className="text-sm font-semibold text-brand-300 mb-2">⚡ Available on Pro and above</p>
          <p className="text-sm text-white/65 leading-relaxed">
            Sage Automation Rules are part of the Sage CRM feature set, included with every{' '}
            <strong className="text-white">Pro, Scale, and Enterprise</strong> plan. Rules are evaluated in real-time every time Sage processes an incoming item — no delays, no manual review.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-10" />

        {/* Body */}
        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          {/* What are rules */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What are Automation Rules?</h2>
            <p>
              By default, Sage Auto processes every email, bot conversation, form submission, and ticket using a single global setting — it either creates a contact and deal, creates a ticket, or ignores the item based on what the AI recommends. Every item that matches goes into the same default pipeline.
            </p>
            <p className="mt-4">
              That works well when you have one product and one sales process. But most growing businesses have multiple pipelines — Enterprise Sales, SMB Sales, Customer Support, Agency Projects — and different inbound sources should flow into different ones. A rule lets you say:{' '}
              <em>&quot;If this item matches these conditions, do this specific action and put it in this specific pipeline.&quot;</em>
            </p>
            <p className="mt-4">
              Rules override the default behaviour of Sage Auto on a per-item basis. Every time Sage processes a new item, it checks your rules first. If a rule matches, that rule&apos;s action and pipeline are used. If no rule matches, the workspace default applies.
            </p>

            <div className="mt-6 p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm font-semibold text-white mb-3">Rules vs. default Sage Auto settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-white/65 uppercase tracking-wide mb-1">Default Sage Auto</p>
                  <p className="text-sm text-white/65 leading-relaxed">One global switch per channel. All matching items go to the same default pipeline with the same action.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-1">With Rules</p>
                  <p className="text-sm text-white/65 leading-relaxed">Each item is evaluated individually. Different keywords, priorities, or channels route to different pipelines with different actions.</p>
                </div>
              </div>
            </div>
          </section>

          {/* How rules work */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How rules work — the logic</h2>
            <p>
              A rule has three parts: a <strong className="text-white">channel filter</strong>, a set of <strong className="text-white">conditions</strong>, and an <strong className="text-white">action</strong>.
            </p>

            <div className="mt-6 space-y-4">
              {[
                {
                  icon: '📡',
                  title: 'Channel filter',
                  desc: 'Each rule can target a specific channel (Email, Bot conversation, Form submission, or Ticket) or apply to Any channel. A rule for "Email" only fires when Sage processes an email — it never interferes with bot conversations, even if the conditions would match.',
                },
                {
                  icon: '🔍',
                  title: 'Conditions (AND logic)',
                  desc: 'Each rule can have one or more conditions. All conditions must pass for the rule to match — this is AND logic, not OR. A condition checks one of three fields: Priority (is High / Medium / Low), Content (the AI summary or subject contains or does not contain a keyword), or Channel (for "any channel" rules that need a channel check inside).',
                },
                {
                  icon: '⚡',
                  title: 'Action + pipeline',
                  desc: 'When a rule matches, its action is used instead of the Sage Auto default: "Create contact & deal" (and route to a specific pipeline), "Create ticket", or "Ignore". For "Create contact & deal" you pick exactly which pipeline the deal lands in. Leave it blank to use the workspace default.',
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

            <div className="mt-6 p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm font-semibold text-white mb-2">First-match wins</p>
              <p className="text-sm text-white/65 leading-relaxed">
                Rules are evaluated in priority order (highest number first). The <strong className="text-white">first rule that matches</strong> wins — Sage stops checking and uses that rule&apos;s action. This means you can place specific, high-priority rules at the top and a catch-all rule at the bottom, and only items that don&apos;t match the specific rules will fall through to the catch-all.
              </p>
            </div>
          </section>

          {/* Per-channel priority */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Priority is per-channel</h2>
            <p>
              Because rules are filtered by channel first, priorities are scoped to within that channel. An Email rule at priority 10 never competes with a Bot rule at priority 10 — they live in separate evaluation spaces.
            </p>
            <p className="mt-4">
              This means you can freely number your email rules 1, 2, 3 and your bot rules 1, 2, 3 without any cross-channel conflicts. You only need to think about priority order <em>within</em> the same channel.
            </p>
            <p className="mt-4">
              The one exception: rules set to <strong className="text-white">Any channel</strong> compete with all channel-specific rules. If you have an &quot;Any&quot; rule at priority 15, it beats a channel-specific rule at priority 10 for every channel. To avoid unintended overrides, keep &quot;Any&quot; rules at a lower priority number than your channel-specific ones.
            </p>
          </section>

          {/* Step by step */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How to create your first rule — step by step</h2>
            <ol className="space-y-6 mt-4">
              {[
                {
                  step: '1',
                  title: 'Go to Sage → Rules',
                  desc: 'Open your Appalix dashboard. In the left sidebar, expand the Sage section and click Rules. You\'ll see a list of all your existing rules (empty on first visit) and a "New rule" button in the top right.',
                },
                {
                  step: '2',
                  title: 'Click "New rule"',
                  desc: 'A modal opens with the rule builder. Every field has a sensible default — channel is set to "Any channel", the action defaults to "Create contact & deal", and a single condition row is pre-filled for you to customise.',
                },
                {
                  step: '3',
                  title: 'Name your rule',
                  desc: 'Give it a descriptive name that explains what it does — for example "High-priority enterprise email → Sales pipeline" or "Support complaints → Ticket". You\'ll see this name in the rules list and in backfill result notifications, so make it meaningful.',
                },
                {
                  step: '4',
                  title: 'Choose the channel',
                  desc: 'Select which channel the rule applies to: Email, Bot conversation, Form submission, Ticket, or Any channel. Picking a specific channel makes the rule more precise and prevents it from accidentally matching items from other channels.',
                },
                {
                  step: '5',
                  title: 'Add your conditions',
                  desc: 'Each condition row has three parts: Field (Priority, Message / summary, or Channel), Operator (is, contains, does not contain), and Value. Click "Add condition" to add more rows — all conditions must match (AND logic). For example: Priority is "high" AND Message/summary contains "enterprise".',
                },
                {
                  step: '6',
                  title: 'Set the action',
                  desc: 'Choose what happens when this rule fires: "Create contact & deal" (lead enters your CRM), "Create ticket" (a support ticket is opened), or "Ignore" (the item is skipped entirely). If you choose "Create contact & deal", a pipeline selector appears — pick the exact pipeline this rule routes into, or leave blank to use the workspace default.',
                },
                {
                  step: '7',
                  title: '(Optional) Enable owner notification',
                  desc: 'Toggle on "Notify workspace owner when this rule fires" if you want an alert logged whenever this rule matches. Useful for high-value rules like enterprise enquiries where you want instant awareness.',
                },
                {
                  step: '8',
                  title: 'Set the priority',
                  desc: 'Enter a priority number. Higher numbers are evaluated first. Leave it at 0 if you only have one rule, or use 10, 20, 30 for a range of rules so you have room to insert new ones between existing ones later.',
                },
                {
                  step: '9',
                  title: 'Save the rule',
                  desc: 'Click "Save rule". The rule is immediately active — from this point on, every item Sage processes will be checked against it before the default action runs. There is no additional deployment step needed.',
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

          {/* Example rules */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5 rule examples to get you started</h2>
            <p>
              Not sure where to begin? Here are five rules that work for most businesses right out of the box.
            </p>

            <div className="mt-6 space-y-5">
              {[
                {
                  name: 'Enterprise email → Sales pipeline',
                  channel: 'Email',
                  conditions: ['Priority is "high"', 'Message/summary contains "enterprise"'],
                  action: 'Create contact & deal → Enterprise Sales pipeline',
                  why: 'High-priority emails that mention enterprise are likely from large accounts. You want them in a dedicated high-touch pipeline, not mixed in with SMB leads.',
                },
                {
                  name: 'High-priority form submission → Sales pipeline',
                  channel: 'Form submission',
                  conditions: ['Priority is "high"'],
                  action: 'Create contact & deal → Sales pipeline',
                  why: 'Paid ad leads marked high priority by the AI are hot. Fast-tracking them to your sales pipeline with no manual review keeps response times low.',
                },
                {
                  name: 'Support complaint → Ticket',
                  channel: 'Any channel',
                  conditions: ['Message/summary contains "complaint"', 'Message/summary contains "refund"'],
                  action: 'Create ticket',
                  why: 'Support-flavoured contacts should not enter your sales pipeline. Turning them into tickets routes them to your support team instead.',
                },
                {
                  name: 'Bot chats mentioning pricing → Sales pipeline',
                  channel: 'Bot conversation',
                  conditions: ['Message/summary contains "pricing"'],
                  action: 'Create contact & deal → Sales pipeline',
                  why: 'Anyone who asks a bot about pricing is showing purchase intent. Routing these to your sales pipeline lets your team follow up proactively.',
                },
                {
                  name: 'Low-priority catch-all → Ignore',
                  channel: 'Any channel',
                  conditions: ['Priority is "low"'],
                  action: 'Ignore',
                  why: 'Place this rule last (lowest priority number). Low-quality items that no specific rule caught are silently skipped — they don\'t clutter your pipelines or ticket queue.',
                },
              ].map((ex, i) => (
                <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="font-semibold text-white text-sm">{ex.name}</p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 border border-brand-600/20 shrink-0">{ex.channel}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {ex.conditions.map((c, ci) => (
                      <p key={ci} className="text-xs text-white/65 font-mono bg-white/5 px-2 py-1 rounded">
                        {ci > 0 && <span className="text-white/60 mr-2">AND</span>}{c}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-brand-400 mb-2">→ {ex.action}</p>
                  <p className="text-xs text-white/60 leading-relaxed italic">{ex.why}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Managing rules */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Managing your rules</h2>
            <p>
              The Rules page at <strong className="text-white">Sage → Rules</strong> is your central control panel. From here you can:
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { icon: '🔁', label: 'Toggle rules on and off', desc: 'Use the toggle icon on any rule card to disable it without deleting it. Disabled rules appear in a separate "Disabled" section and are not evaluated — useful for seasonal rules or rules you want to pause temporarily.' },
                { icon: '✏️', label: 'Edit a rule', desc: 'Click the pencil icon on any rule card to re-open the rule builder modal with the existing values pre-filled. Change any field and save — the update takes effect immediately.' },
                { icon: '🗑️', label: 'Delete a rule', desc: 'Click the trash icon to permanently delete a rule. Deleting a rule does not undo any actions it already took — contacts and deals it created remain in your CRM.' },
                { icon: '🔢', label: 'Adjust priority', desc: 'Edit any rule and change its priority number to reorder evaluation. Higher numbers are checked first. You do not need to use consecutive numbers — 10, 20, 30 leaves room to insert rules between existing ones.' },
              ].map((item) => (
                <li key={item.label} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm mb-0.5">{item.label}</p>
                    <p className="text-xs text-white/65 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Tips */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips and best practices</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: '🎯',
                  title: 'Start specific, add catch-alls last',
                  desc: 'Build your most specific rules first (e.g. "enterprise email") at high priority. Add a general catch-all rule (e.g. "low priority → ignore") last at the lowest priority. The specific rules get first refusal, the catch-all handles everything else.',
                },
                {
                  icon: '📏',
                  title: 'Use 10-point priority gaps',
                  desc: 'Number your rules 10, 20, 30 rather than 1, 2, 3. If you later need to insert a rule between two existing ones, you have room without renumbering everything.',
                },
                {
                  icon: '🧪',
                  title: 'Test with "Process existing"',
                  desc: 'After creating a rule, go to the Sage dashboard and click "Process existing". This runs your rules against already-analysed items so you can see immediately which ones match without waiting for new inbound.',
                },
                {
                  icon: '🔕',
                  title: 'Ignore > delete',
                  desc: 'Instead of deleting low-quality items from your pipelines manually, create an "Ignore" rule for the patterns that consistently produce junk. Sage will silently skip them before they ever enter your CRM.',
                },
                {
                  icon: '🌐',
                  title: 'Use "Any channel" sparingly',
                  desc: '"Any channel" rules match everything — emails, bots, forms, and tickets. Only use them for truly universal conditions (like "always ignore low priority") and keep them at low priority so they don\'t override your channel-specific rules.',
                },
                {
                  icon: '🔔',
                  title: 'Turn on notify for high-value rules',
                  desc: 'For rules that catch enterprise or high-priority leads, enable the "Notify workspace owner" toggle. You will get an alert the moment a high-value match is processed — so you can follow up within minutes, not hours.',
                },
              ].map((tip) => (
                <div key={tip.title} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xl shrink-0">{tip.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">{tip.title}</p>
                    <p className="text-xs text-white/65 leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Summary */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Summary</h2>
            <p>
              Sage Auto handles the mechanical work of processing every inbound item. Automation Rules handle the <em>intelligence</em> — making sure each item is routed to the right pipeline, handled with the right action, and never mixed in with items that deserve different treatment.
            </p>
            <p className="mt-4">
              A rule takes less than two minutes to create. The payoff is a CRM that organises itself correctly from the first contact, every time — without anyone on your team having to review and re-route leads manually.
            </p>
            <p className="mt-4">
              Start with two or three rules based on your most common patterns, run &quot;Process existing&quot; to validate them, and add more as you spot opportunities. Most teams end up with five to ten rules that cover 90% of their routing logic.
            </p>
          </section>

        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-12" />

        {/* CTA */}
        <div className="text-center">
          <p className="text-white/65 mb-5 text-sm">Ready to route leads to the right pipeline automatically?</p>
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

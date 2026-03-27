import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Appalix Forms — Complete Guide to Lead Capture & Management',
  description:
    'Everything you need to know about Appalix Forms: connect Meta and Google Ads webhooks, sync Mailchimp and ActiveCampaign contacts, score leads automatically, and push to your CRM pipeline in one click.',
  keywords: [
    'Appalix Forms guide',
    'lead capture Appalix',
    'Meta lead ads integration',
    'Google Ads lead forms',
    'Mailchimp lead sync',
    'ActiveCampaign lead import',
    'lead scoring CRM',
    'lead ad forms tutorial',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/forms-lead-ads-guide' },
  openGraph: {
    title: 'Appalix Forms — Complete Guide to Lead Capture & Management',
    description: 'Connect Meta, Google Ads, Mailchimp, and ActiveCampaign. Leads are scored, deduplicated, and pushed to your CRM in one click.',
    url: 'https://appalix.ai/resources/forms-lead-ads-guide',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Appalix Forms — Complete Guide to Lead Capture & Management',
    description: 'Connect Meta, Google Ads, Mailchimp, and ActiveCampaign. Leads scored, deduplicated, and pushed to your CRM in one click.',
  },
}

export default function FormsLeadAdsGuidePage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="Article"
        title="Appalix Forms — Complete Guide to Lead Capture & Management"
        description="Everything you need to know about Appalix Forms: connect Meta and Google Ads webhooks, sync Mailchimp and ActiveCampaign contacts, score leads automatically, and push to your CRM pipeline in one click."
        slug="forms-lead-ads-guide"
        datePublished="2026-03-04"
      />

      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Appalix Forms — Complete Guide</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Guide</span>
            <span className="text-xs text-white/60">15 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Appalix Forms — Complete Guide
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Appalix Forms is your lead operations hub. Connect Meta Lead Ads and Google Ads via webhook,
            pull in contacts from Mailchimp and ActiveCampaign, let Appalix score and deduplicate everything automatically,
            then push the best leads into your Sage CRM pipeline with a single click.
            This guide walks through every feature end to end.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        {/* Table of contents */}
        <div className="mb-10 p-5 rounded-xl bg-white/3 border border-white/8">
          <p className="text-xs font-semibold text-white/65 uppercase tracking-wider mb-3">In this guide</p>
          <ol className="space-y-1.5 text-sm">
            {[
              ['Overview & prerequisites', '#overview'],
              ['Forms → Sources: connecting ad platforms', '#sources'],
              ['Meta Lead Ads (webhook)', '#meta'],
              ['Google Ads Lead Forms (webhook)', '#google'],
              ['Email platform sync — Mailchimp & ActiveCampaign', '#email-sync'],
              ['Forms → All Leads: your lead inbox', '#all-leads'],
              ['Lead scoring — High, Medium, Low', '#scoring'],
              ['Moving a lead into your CRM pipeline', '#pipeline'],
              ['Forms → Campaign Analytics', '#analytics'],
              ['Frequently asked questions', '#faq'],
            ].map(([label, href]) => (
              <li key={href}>
                <a href={href} className="text-brand-400 hover:text-brand-300 transition-colors">{label}</a>
              </li>
            ))}
          </ol>
        </div>

        <div className="prose prose-invert prose-brand max-w-none space-y-12 text-white/80">

          {/* ── Overview ─────────────────────────────────────────────────────── */}
          <section id="overview">
            <h2 className="text-xl font-semibold text-white mb-3">Overview &amp; prerequisites</h2>
            <p>
              Appalix Forms is available on <strong className="text-white">Pro plans and above</strong>. You'll find it in the left sidebar under the <strong className="text-white">Forms</strong> section with three pages:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-white">All Leads</strong> — your unified inbox of every lead from every source, with score badges, filtering, and actions.</li>
              <li><strong className="text-white">Sources</strong> — connect ad platforms (Meta, Google Ads) and sync from email marketing tools (Mailchimp, ActiveCampaign).</li>
              <li><strong className="text-white">Campaign Analytics</strong> — aggregated stats across all your lead sources: total leads, leads by platform, score breakdown, and top campaigns.</li>
            </ul>
            <p className="mt-4">
              Sage AI is available in the right panel on every Forms page. Use it to ask questions about your leads, get follow-up advice, or draft outreach copy without leaving the dashboard.
            </p>
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
              <strong>Plan requirement:</strong> Forms requires a Pro, Scale, or Enterprise plan. Upgrade in <strong>Settings → Upgrade</strong>.
            </div>
          </section>

          {/* ── Sources ──────────────────────────────────────────────────────── */}
          <section id="sources">
            <h2 className="text-xl font-semibold text-white mb-3">Forms → Sources: connecting your lead platforms</h2>
            <p>
              The Sources page is where you connect every platform that sends leads to Appalix. It has two groups:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-white">Ad platform webhooks</strong> — Meta Lead Ads and Google Ads Lead Forms. These push leads in real time the moment a user submits a form. Each workspace gets a unique webhook URL containing your workspace ID.</li>
              <li><strong className="text-white">Email platform sync</strong> — Mailchimp and ActiveCampaign. These pull your existing subscriber lists into Appalix on demand, using the API credentials you already saved in Sage → Integrations.</li>
            </ul>
            <p className="mt-4">
              Once a platform is connected, the Sources card shows a green <em>Connected</em> badge, the total leads received, and the last lead timestamp. Clicking <strong className="text-white">Disconnect</strong> removes the connection but does not delete existing leads.
            </p>
          </section>

          {/* ── Meta ─────────────────────────────────────────────────────────── */}
          <section id="meta">
            <h2 className="text-xl font-semibold text-white mb-3">Meta Lead Ads (webhook)</h2>
            <p>
              Meta Lead Ads let people complete your form without leaving Facebook or Instagram. When a user submits, Meta fires a webhook to Appalix — which fetches the full lead data, scores it, and stores it within seconds. No polling, no Zapier.
            </p>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Credentials you need</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Verify Token</strong> — any string you choose. Used by Meta to confirm your webhook URL is valid during setup.</li>
              <li><strong className="text-white">App Secret</strong> — found in your Meta App → Settings → Basic. Used by Appalix to verify that incoming webhook requests are genuinely from Meta (HMAC-SHA256 signature check).</li>
              <li><strong className="text-white">Page Access Token</strong> — a long-lived token with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">leads_retrieval</code> permission. Appalix uses this to fetch full lead details from the Meta Graph API after each notification.</li>
            </ul>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Quick setup</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong className="text-white">Forms → Sources</strong> and click <strong className="text-white">Connect</strong> on the Meta card.</li>
              <li>Copy your unique webhook URL (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-sm">https://appalix.ai/api/webhooks/meta-leads/YOUR_ID</code>).</li>
              <li>In <strong className="text-white">Meta for Developers</strong>, create a Business app, add the Webhooks product, create a Page subscription, and paste your webhook URL and verify token.</li>
              <li>Subscribe to the <strong className="text-white">leadgen</strong> field.</li>
              <li>Copy your App Secret and long-lived Page Access Token, paste both into Appalix, and click <strong className="text-white">Save &amp; Connect</strong>.</li>
            </ol>

            <div className="mt-4 p-4 rounded-xl bg-brand-600/10 border border-brand-600/20 text-sm">
              <Link href="/resources/connect-meta-leads" className="text-brand-400 hover:text-brand-300 font-medium">
                → Read the full Meta Lead Ads step-by-step tutorial
              </Link>
            </div>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">What Appalix captures from Meta</h3>
            <p>Full name, email, phone, company, job title, city/state/country, and all custom question answers from the Meta form. Campaign name, ad name, and form name are stored separately for analytics.</p>
          </section>

          {/* ── Google Ads ───────────────────────────────────────────────────── */}
          <section id="google">
            <h2 className="text-xl font-semibold text-white mb-3">Google Ads Lead Forms (webhook)</h2>
            <p>
              Google Ads Lead Form Extensions let you collect lead information directly inside a search, display, or video ad. Unlike Meta, Google sends the full lead data in the webhook payload — no secondary API call is needed.
            </p>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Credentials you need</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Webhook Key</strong> — a key you create in Google Ads. Google sends it in the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">google_key</code> header with every request. Appalix compares it against what you stored to verify authenticity.</li>
            </ul>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Quick setup</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong className="text-white">Forms → Sources</strong> and click <strong className="text-white">Connect</strong> on the Google Ads card.</li>
              <li>Copy your unique webhook URL (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-sm">https://appalix.ai/api/webhooks/google-leads/YOUR_ID</code>).</li>
              <li>In <strong className="text-white">Google Ads</strong>, go to your Lead Form Asset → Webhook settings. Paste your webhook URL and create a webhook key (any string).</li>
              <li>Paste the same webhook key into Appalix and click <strong className="text-white">Save &amp; Connect</strong>.</li>
            </ol>

            <div className="mt-4 p-4 rounded-xl bg-brand-600/10 border border-brand-600/20 text-sm">
              <Link href="/resources/connect-google-ads-leads" className="text-brand-400 hover:text-brand-300 font-medium">
                → Read the full Google Ads Lead Forms step-by-step tutorial
              </Link>
            </div>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">What Appalix captures from Google Ads</h3>
            <p>Full name, email, phone, city, postcode, country, and any custom questions from the lead form asset. Campaign ID and form name are stored for analytics.</p>
          </section>

          {/* ── Email sync ───────────────────────────────────────────────────── */}
          <section id="email-sync">
            <h2 className="text-xl font-semibold text-white mb-3">Email platform sync — Mailchimp &amp; ActiveCampaign</h2>
            <p>
              If you already use Mailchimp or ActiveCampaign to collect subscriber data — through embedded forms, landing pages, or lead magnets — you can pull those contacts into Appalix Forms for AI-assisted lead analysis and CRM handoff. No re-entering of credentials is required: Appalix reuses the API keys you saved in <strong className="text-white">Sage → Integrations → Email Marketing</strong>.
            </p>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Prerequisites</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Connect Mailchimp or ActiveCampaign in <strong className="text-white">Sage → Integrations → Email Marketing</strong>. Enter your API key (and server prefix + audience ID for Mailchimp, or API URL for ActiveCampaign).</li>
              <li>Navigate to <strong className="text-white">Forms → Sources</strong>. A new <em>Email Platform Sync</em> section appears automatically once a provider is connected.</li>
            </ol>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Running a sync</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>In <strong className="text-white">Forms → Sources</strong>, find the Mailchimp or ActiveCampaign sync card.</li>
              <li>Click <strong className="text-white">Sync Now</strong>. Appalix fetches all subscribed contacts from your list (paginated — handles large lists automatically).</li>
              <li>A result banner shows how many contacts were imported and how many were skipped as duplicates.</li>
              <li>New contacts appear immediately in <strong className="text-white">Forms → All Leads</strong> with a Mailchimp or ActiveCampaign platform badge.</li>
            </ol>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">What gets imported</h3>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-white/65 font-medium">Field</th>
                    <th className="text-left py-2 pr-4 text-white/65 font-medium">Mailchimp</th>
                    <th className="text-left py-2 text-white/65 font-medium">ActiveCampaign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ['Name', '✓ full_name or FNAME+LNAME', '✓ firstName+lastName'],
                    ['Email', '✓', '✓'],
                    ['Phone', '✓ PHONE merge field', '✓'],
                    ['Company', '✓ COMPANY merge field', '✓ orgname'],
                    ['Job title', '—', '—'],
                  ].map(([f, mc, ac]) => (
                    <tr key={f}>
                      <td className="py-2 pr-4 text-white">{f}</td>
                      <td className="py-2 pr-4 text-white/80">{mc}</td>
                      <td className="py-2 text-white/80">{ac}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Deduplication</h3>
            <p>
              Before inserting any contact, Appalix checks whether a lead with the same email address <em>or</em> phone number already exists in your workspace. Duplicates are skipped — no double entries, no matter how many times you run the sync.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
              <strong>Important:</strong> Syncing is one-directional — email platform to Appalix only. No data is ever written back to Mailchimp or ActiveCampaign by this sync.
            </div>
          </section>

          {/* ── All Leads ────────────────────────────────────────────────────── */}
          <section id="all-leads">
            <h2 className="text-xl font-semibold text-white mb-3">Forms → All Leads: your lead inbox</h2>
            <p>
              All Leads is a unified table of every lead received across all connected sources — Meta, Google Ads, Mailchimp, and ActiveCampaign — ordered newest first.
            </p>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Table columns</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Platform</strong> — colour-coded badge (Meta Ads, Google Ads, Mailchimp, ActiveCampaign).</li>
              <li><strong className="text-white">Name</strong> — full name from the form submission.</li>
              <li><strong className="text-white">Email &amp; phone</strong> — contact details. Click email to open a mailto: link.</li>
              <li><strong className="text-white">Company</strong> — company name if provided.</li>
              <li><strong className="text-white">Campaign</strong> — the campaign or ad name that generated the lead (ad platforms only).</li>
              <li><strong className="text-white">Score</strong> — High, Medium, or Low badge (see Lead Scoring below).</li>
              <li><strong className="text-white">Date</strong> — when the lead was received.</li>
              <li><strong className="text-white">Actions</strong> — Move to Pipeline and Delete.</li>
            </ul>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Filtering</h3>
            <p>
              Use the filter bar above the table to narrow leads by <strong className="text-white">platform</strong> (Meta Ads, Google Ads, Mailchimp, ActiveCampaign) or by <strong className="text-white">score</strong> (High, Medium, Low). Filters can be combined — e.g. show only High-score Meta leads.
            </p>
          </section>

          {/* ── Scoring ──────────────────────────────────────────────────────── */}
          <section id="scoring">
            <h2 className="text-xl font-semibold text-white mb-3">Lead scoring — High, Medium, Low</h2>
            <p>
              Every lead is automatically scored the moment it arrives, based on how much contact information was provided. Scoring is rule-based and instant — no configuration needed.
            </p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-6 text-white/65 font-medium">Score</th>
                    <th className="text-left py-2 pr-6 text-white/65 font-medium">Condition</th>
                    <th className="text-left py-2 text-white/65 font-medium">Badge colour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="py-2 pr-6"><span className="text-green-400 font-semibold">High</span></td>
                    <td className="py-2 pr-6 text-white/80">3 or 4 of: email, phone, company, job title present</td>
                    <td className="py-2 text-white/80">Green</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-6"><span className="text-yellow-400 font-semibold">Medium</span></td>
                    <td className="py-2 pr-6 text-white/80">Exactly 2 of the above fields present</td>
                    <td className="py-2 text-white/80">Amber</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-6"><span className="text-white/65 font-semibold">Low</span></td>
                    <td className="py-2 pr-6 text-white/80">Only 1 field present (typically email only)</td>
                    <td className="py-2 text-white/80">Gray</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm">
              <strong className="text-white">Tip:</strong> To maximise High scores from Meta, add phone number and company as required fields in your Meta Lead Form. Google Ads forms always collect phone if you enable the phone question.
            </p>

            <p className="mt-3 text-sm">
              Lead score is also used when a lead is moved to your CRM pipeline — it maps directly to the <strong className="text-white">priority</strong> field on the Sage deal (High → high, Medium → medium, Low → medium).
            </p>
          </section>

          {/* ── Pipeline ─────────────────────────────────────────────────────── */}
          <section id="pipeline">
            <h2 className="text-xl font-semibold text-white mb-3">Moving a lead into your CRM pipeline</h2>
            <p>
              Clicking <strong className="text-white">Pipeline</strong> on any lead in All Leads triggers a one-click promotion into Sage CRM. Here's exactly what happens:
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-3">
              <li>
                <strong className="text-white">Sage Contact created</strong> — a new contact is created in Sage with the lead's name, email, phone, company, and job title. It's tagged <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">lead_ad</code> and the source platform.
              </li>
              <li>
                <strong className="text-white">Sage Deal created</strong> — a deal is created in the first stage of your first pipeline. The deal title is <em>&quot;Lead Name – Platform&quot;</em> (e.g. &quot;Jane Smith – Meta Ads&quot;). Priority is set from the lead score.
              </li>
              <li>
                <strong className="text-white">Lead marked as promoted</strong> — the lead's pipeline stage is updated to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">crm_pipeline</code> and a <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">pipeline_moved</code> event is logged.
              </li>
              <li>
                <strong className="text-white">Visible in Sage → Pipelines</strong> — the contact and deal appear immediately in your Kanban pipeline view.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Prerequisite:</strong> You need at least one pipeline with at least one stage in <strong>Sage → Pipelines</strong> before you can move a lead. If no pipeline exists, you'll see an error message with a link to create one.
            </div>
            <p className="mt-4 text-sm">
              A lead that has already been moved to the pipeline shows a <strong className="text-white">In Pipeline</strong> badge in All Leads and cannot be promoted again. You can continue to manage it directly inside Sage → Pipelines.
            </p>
          </section>

          {/* ── Analytics ────────────────────────────────────────────────────── */}
          <section id="analytics">
            <h2 className="text-xl font-semibold text-white mb-3">Forms → Campaign Analytics</h2>
            <p>
              Campaign Analytics gives you a bird's-eye view of your lead generation performance across all connected platforms. No chart libraries, no lag — it renders from your live data every time you load the page.
            </p>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">What's on the page</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Stat cards</strong> — total leads all time, leads this month, sources connected, and leads moved to pipeline.</li>
              <li><strong className="text-white">Leads by platform</strong> — a breakdown showing lead count and share for each connected source (Meta, Google Ads, Mailchimp, ActiveCampaign).</li>
              <li><strong className="text-white">Score breakdown</strong> — count of High, Medium, and Low leads with percentages across your entire lead base.</li>
              <li><strong className="text-white">Top campaigns</strong> — a ranked table of the campaigns, ads, or forms that have generated the most leads, sorted by volume.</li>
            </ul>

            <p className="mt-4 text-sm">
              The analytics page updates in real time as new leads arrive — refresh to see the latest numbers after running a sync or after a new ad submission.
            </p>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────────────── */}
          <section id="faq">
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-6">
              <div>
                <p className="font-semibold text-white">Can I connect both Meta and Google Ads at the same time?</p>
                <p className="text-sm text-white/65 mt-1">Yes. Each platform has its own independent webhook. Connect as many sources as you like — all leads flow into the same All Leads table and are distinguished by platform badge.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Do I need separate credentials for Mailchimp in Forms vs. Sage → Integrations?</p>
                <p className="text-sm text-white/65 mt-1">No. The email platform sync in Forms → Sources reads the credentials you already saved in Sage → Integrations → Email Marketing. Connect once, use everywhere.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What happens if I sync Mailchimp and a contact already exists as a Meta lead?</p>
                <p className="text-sm text-white/65 mt-1">Appalix checks email and phone against all existing leads in your workspace before inserting. If there's a match, the duplicate is skipped. The original lead's source platform and data are preserved.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I delete a lead?</p>
                <p className="text-sm text-white/65 mt-1">Yes. Click the delete icon in the Actions column of All Leads. This permanently removes the lead and its event log. It does not affect any Sage Contact or Deal that was already created from the lead.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What plan do I need?</p>
                <p className="text-sm text-white/65 mt-1">Forms is available on Pro, Scale, and Enterprise plans. If you're on a Starter or Core plan, you'll see an upgrade prompt when you navigate to any Forms page.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Is there a limit on how many leads I can store?</p>
                <p className="text-sm text-white/65 mt-1">There is no hard limit on the number of lead records. Storage limits follow your plan's database quota. For most Pro and Scale users this is not a practical concern.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I sync ConvertKit, Klaviyo, or Constant Contact contacts into Forms?</p>
                <p className="text-sm text-white/65 mt-1">The current email platform sync supports Mailchimp and ActiveCampaign. ConvertKit, Klaviyo, and Constant Contact credentials can be stored in Sage → Integrations for future outbound sync features, but Forms pull sync is limited to Mailchimp and ActiveCampaign today.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Are my API keys and tokens stored securely?</p>
                <p className="text-sm text-white/65 mt-1">Yes. All credentials (app secrets, page access tokens, API keys, webhook keys) are stored encrypted in your workspace database. They are never exposed in plain text after saving.</p>
              </div>
            </div>
          </section>

          {/* ── Related tutorials ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Related tutorials</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: '/resources/connect-meta-leads', emoji: '📘', title: 'Connect Meta Lead Ads', desc: 'Full step-by-step setup guide for Meta Lead Ads webhook.' },
                { href: '/resources/connect-google-ads-leads', emoji: '🎯', title: 'Connect Google Ads Lead Forms', desc: 'Full step-by-step setup guide for Google Ads webhook.' },
                { href: '/resources/meet-appalix-sage', emoji: '✦', title: 'Meet Appalix Sage', desc: 'How the Sage AI panel works and what it can do for your team.' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="p-4 rounded-xl bg-white/3 border border-white/8 hover:border-brand-600/40 transition-colors group"
                >
                  <div className="text-xl mb-2">{item.emoji}</div>
                  <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors mb-1">{item.title}</p>
                  <p className="text-xs text-white/65">{item.desc}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-4">
            <p className="text-2xl mb-3">📥</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to start capturing leads?</h3>
            <p className="text-sm text-white/65 mb-5">
              Connect your first source in Forms → Sources and your leads will start flowing in automatically.
            </p>
            <Link
              href="/forms/sources"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Forms → Sources →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources/connect-meta-leads" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Connect Meta Lead Ads
          </Link>
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Back to Resources →
          </Link>
        </div>

      </div>
    </div>
  )
}

import Link from 'next/link'
import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'
import { ResourcesGrid } from './resources-grid'

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
  // Knowledge base source tutorials
  {
    category: 'Tutorial',
    title: 'How to Connect Notion to Appalix',
    excerpt: 'Index any Notion page as a knowledge source. Create a Notion integration, share the page with it, and paste the token into Appalix — your bot will answer from your docs in minutes.',
    readTime: '7 min read',
    date: 'Feb 28, 2026',
    emoji: '📝',
    logo: '/integrations/notion.webp',
    large: true,
    slug: 'connect-notion',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect GitBook to Appalix',
    excerpt: 'Turn your entire GitBook space into a live knowledge source. Generate a personal API token in GitBook, paste your space URL into Appalix, and your bot will answer from your developer docs.',
    readTime: '6 min read',
    date: 'Feb 28, 2026',
    emoji: '📖',
    logo: '/integrations/gitbook.png',
    slug: 'connect-gitbook',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Google Drive to Appalix',
    excerpt: 'Index Google Docs and Drive files as AI knowledge sources. Generate a read-only OAuth token via the Google OAuth Playground and paste it into Appalix alongside your file URL.',
    readTime: '8 min read',
    date: 'Feb 28, 2026',
    emoji: '☁️',
    logo: '/integrations/google-drive.png',
    slug: 'connect-google-drive',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Dropbox to Appalix',
    excerpt: 'Index Dropbox documents and shared links as AI knowledge sources. Create a Dropbox app in the App Console, generate a long-lived access token, and add any file path or shared link.',
    readTime: '7 min read',
    date: 'Feb 28, 2026',
    emoji: '📦',
    logo: '/integrations/dropbox.png',
    slug: 'connect-dropbox',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect OneDrive to Appalix',
    excerpt: 'Index Word documents and files from Microsoft OneDrive. Sign in to Microsoft Graph Explorer, copy the access token with Files.Read scope, and paste it into Appalix with your file URL.',
    readTime: '8 min read',
    date: 'Feb 28, 2026',
    emoji: '🗂️',
    logo: '/integrations/onedrive.png',
    slug: 'connect-onedrive',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect SharePoint to Appalix',
    excerpt: "Index SharePoint documents so your AI bot answers from your organisation's intranet content and policies. Requires a Microsoft Graph token, file URL, and SharePoint Site ID.",
    readTime: '10 min read',
    date: 'Feb 28, 2026',
    emoji: '🏢',
    logo: '/integrations/sharepoint.webp',
    slug: 'connect-sharepoint',
  },
  {
    category: 'Guide',
    title: 'Knowledge Base File Types — Everything Appalix Can Ingest',
    excerpt: 'A complete reference of every file format the Appalix knowledge base supports: PDF, Word, Excel, PowerPoint, CSV, images, ZIP, website URLs, Notion, GitBook, and cloud drives — and how each one is processed.',
    readTime: '6 min read',
    date: 'Mar 1, 2026',
    emoji: '📂',
    slug: 'knowledge-base-file-types',
  },
  {
    category: 'Tutorial',
    title: 'How to Upload a ZIP File as a Knowledge Base Source',
    excerpt: 'Bulk-import dozens of text files in one step. ZIP your .txt, .md, .csv, .json, .xml, and .html files, upload in Appalix, and your bot indexes all of them instantly — executables and binaries are safely skipped.',
    readTime: '5 min read',
    date: 'Mar 1, 2026',
    emoji: '🗜️',
    slug: 'upload-zip-knowledge-base',
  },
  // Platform tutorials
  {
    category: 'Tutorial',
    title: 'How to Add an AI Chatbot to WordPress with Appalix',
    excerpt: 'Install the Appalix plugin, enter your API endpoint and key in Settings → Appalix Chat, and your AI bot is live on every page of your WordPress site in minutes.',
    readTime: '8 min read',
    date: 'Feb 27, 2026',
    emoji: '🔌',
    logo: '/integrations/wordpress.jpg',
    slug: 'add-wordpress-chatbot',
  },
  {
    category: 'Tutorial',
    title: 'How to Embed the Appalix Chat Widget on Any Website',
    excerpt: 'Two lines of code add a floating AI chat bubble to any site — HTML, Next.js, Webflow, Squarespace, Framer, Shopify, and more. Step-by-step with platform-specific instructions.',
    readTime: '5 min read',
    date: 'Feb 27, 2026',
    emoji: '💬',
    slug: 'embed-web-widget',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Appalix to Slack',
    excerpt: 'Deploy your AI bot inside Slack so it answers questions in channels and DMs automatically. Create a Slack app, subscribe to events, and paste the credentials into Appalix.',
    readTime: '9 min read',
    date: 'Feb 27, 2026',
    emoji: '💜',
    logo: '/integrations/slack.png',
    slug: 'connect-slack',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Appalix to Facebook Messenger',
    excerpt: 'Automatically respond to every Messenger message on your Facebook Page with your AI bot. Set up a Meta app, configure the webhook, and go live — no manual monitoring needed.',
    readTime: '10 min read',
    date: 'Feb 27, 2026',
    emoji: '📘',
    logo: '/integrations/messenger.jpg',
    slug: 'connect-facebook-messenger',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Appalix to WhatsApp Business',
    excerpt: "Put your AI bot on WhatsApp so it replies to customer messages 24/7. Uses Meta's WhatsApp Business API — step-by-step from creating a Meta app to sending your first test message.",
    readTime: '11 min read',
    date: 'Feb 27, 2026',
    emoji: '💚',
    logo: '/integrations/whatsapp.jpg',
    slug: 'connect-whatsapp',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Appalix to Google Chat',
    excerpt: 'Add your Appalix AI bot to Google Chat Spaces and DMs as a native Google Chat app. Ideal for internal teams on Google Workspace — train it on your docs and SOPs.',
    readTime: '9 min read',
    date: 'Feb 27, 2026',
    emoji: '🔵',
    logo: '/integrations/google-chat.png',
    slug: 'connect-google-chat',
  },
  {
    category: 'Developer Guide',
    title: 'Custom API Integration — Connect Appalix to Any Platform',
    excerpt: 'Full REST API reference for the Appalix Custom API. One POST request gets you an AI reply. Includes auth, request/response format, error codes, and code examples in JS and Python.',
    readTime: '10 min read',
    date: 'Feb 27, 2026',
    emoji: '⚙️',
    slug: 'custom-api-integration',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Telegram to Appalix',
    excerpt: 'Deploy your AI agent as a Telegram bot in under 10 minutes. Create a bot with @BotFather, paste the token into Appalix, and register the webhook — your bot is live instantly.',
    readTime: '8 min read',
    date: 'Mar 1, 2026',
    emoji: '✈️',
    logo: '/integrations/telegram.jpeg',
    slug: 'connect-telegram',
  },
  // CRM tutorials
  {
    category: 'Tutorial',
    title: 'How to Connect Monday.com to Appalix',
    excerpt: 'Create Monday.com board items automatically when your AI chatbot captures a lead. Get your Personal API Token, find your Board ID, and go live in under 5 minutes — no Zapier needed.',
    readTime: '6 min read',
    date: 'Mar 1, 2026',
    emoji: '📋',
    logo: '/integrations/monday.png',
    large: true,
    slug: 'connect-monday',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect HubSpot CRM to Appalix',
    excerpt: 'Native HubSpot integration — no Zapier needed. Create a Private App token in HubSpot and Appalix will push captured leads straight into your contacts automatically.',
    readTime: '8 min read',
    date: 'Feb 26, 2026',
    emoji: '🟠',
    logo: '/integrations/hubspot.png',
    slug: 'connect-hubspot',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Zapier to Appalix for CRM Lead Capture',
    excerpt: 'Route Appalix leads to HubSpot, Salesforce, Google Sheets, Pipedrive, or 6,000+ apps via a Zapier Catch Hook. Available on Core plan and above — zero code required.',
    readTime: '7 min read',
    date: 'Feb 26, 2026',
    emoji: '🔗',
    logo: '/integrations/zapier.png',
    slug: 'connect-zapier',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Intercom to Appalix',
    excerpt: 'Automatically create Intercom leads the moment a visitor shares contact details in your AI chat. Get your Access Token from the Intercom Developer Hub in under 5 minutes.',
    readTime: '7 min read',
    date: 'Feb 26, 2026',
    emoji: '💬',
    logo: '/integrations/intercom.jpeg',
    slug: 'connect-intercom',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Zoho CRM to Appalix',
    excerpt: 'Push leads directly into the Zoho CRM Leads module using an OAuth access token. Covers both the quick Self Client method and the production OAuth app approach.',
    readTime: '9 min read',
    date: 'Feb 26, 2026',
    emoji: '🔵',
    logo: '/integrations/zoho.png',
    slug: 'connect-zoho-crm',
  },
  {
    category: 'Tutorial',
    title: 'How to Connect Salesforce to Appalix',
    excerpt: 'Create Salesforce Lead records automatically when visitors share contact details in chat. Step-by-step: get an OAuth access token via Workbench or a Connected App.',
    readTime: '10 min read',
    date: 'Feb 26, 2026',
    emoji: '☁️',
    logo: '/integrations/salesforce.jpg',
    slug: 'connect-salesforce',
  },
  // Sage CRM integration tutorials
  {
    category: 'Tutorial',
    title: 'Connect Stripe to Sage CRM',
    excerpt: 'Create and send payment invoices directly from Sage deal records using Stripe. Get your Secret Key from the Stripe Dashboard, paste it into Sage Integrations, and start billing from your CRM.',
    readTime: '6 min read',
    date: 'Mar 2, 2026',
    emoji: '💳',
    slug: 'connect-sage-stripe',
    large: true,
  },
  {
    category: 'Tutorial',
    title: 'Connect Zapier to Sage CRM',
    excerpt: 'Trigger Zapier automations when Sage events fire — deal created, stage changed, contact added. Create a Catch Hook, paste the URL into Sage Integrations, and connect to 6,000+ apps.',
    readTime: '7 min read',
    date: 'Mar 2, 2026',
    emoji: '⚡',
    slug: 'connect-sage-zapier',
  },
  {
    category: 'Tutorial',
    title: 'Connect Gmail to Sage CRM',
    excerpt: 'Send emails from Sage deal and contact records using your Gmail account. Enable 2-Step Verification, create a Gmail App Password, and connect to Sage in under 3 minutes.',
    readTime: '6 min read',
    date: 'Mar 2, 2026',
    emoji: '📧',
    slug: 'connect-sage-gmail',
  },
  {
    category: 'Tutorial',
    title: 'Connect Outlook to Sage CRM',
    excerpt: 'Send emails directly from Sage deal and contact records using Microsoft Outlook or Office 365. Create a Microsoft App Password and connect it to Sage Integrations in minutes.',
    readTime: '6 min read',
    date: 'Mar 2, 2026',
    emoji: '📬',
    slug: 'connect-sage-microsoft',
  },
  {
    category: 'Tutorial',
    title: 'Connect Freshdesk to Sage CRM',
    excerpt: 'Create Freshdesk support tickets directly from Sage deal and contact records. Get your domain and API key from Freshdesk Profile Settings and connect in Sage Integrations.',
    readTime: '6 min read',
    date: 'Mar 2, 2026',
    emoji: '🎫',
    slug: 'connect-sage-freshdesk',
  },
  {
    category: 'Tutorial',
    title: 'Connect Zendesk to Sage CRM',
    excerpt: 'Create Zendesk tickets from Sage records and sync ticket status to the activity timeline. Get your Zendesk subdomain, agent email, and API token and connect in under 5 minutes.',
    readTime: '7 min read',
    date: 'Mar 2, 2026',
    emoji: '🛟',
    slug: 'connect-sage-zendesk',
  },
  // Lead Ads integration tutorials
  {
    category: 'Guide',
    title: 'Appalix Forms — Complete Guide to Lead Capture & Management',
    excerpt: 'Everything about the Forms section in one place: connect Meta and Google Ads webhooks, sync Mailchimp and ActiveCampaign contacts, understand lead scoring, and push to your CRM pipeline in one click.',
    readTime: '15 min read',
    date: 'Mar 4, 2026',
    emoji: '📥',
    large: true,
    slug: 'forms-lead-ads-guide',
  },
  {
    category: 'Tutorial',
    title: 'Connect Google Ads Lead Forms to Appalix',
    excerpt: 'Automatically receive Google Ads lead form submissions inside Appalix. Paste your webhook URL into Google Ads Lead Form Extensions and connect in Forms → Sources in under 5 minutes — no Zapier needed.',
    readTime: '8 min read',
    date: 'Mar 4, 2026',
    emoji: '🎯',
    slug: 'connect-google-ads-leads',
  },
  {
    category: 'Tutorial',
    title: 'Connect Meta Lead Ads to Appalix',
    excerpt: 'Automatically receive Facebook and Instagram lead ad submissions inside Appalix. Set up a Meta webhook in 5 steps — leads are scored, deduplicated, and ready to push to your CRM pipeline instantly.',
    readTime: '10 min read',
    date: 'Mar 4, 2026',
    emoji: '📘',
    slug: 'connect-meta-leads',
  },
  // Email Marketing platform tutorials
  {
    category: 'Tutorial',
    title: 'Connect Mailchimp to Appalix',
    excerpt: 'Connect Mailchimp to Appalix Sage and pull your audience into Forms for AI lead scoring and CRM handoff. API key, server prefix, and audience ID — done in under 3 minutes.',
    readTime: '6 min read',
    date: 'Mar 4, 2026',
    emoji: '🐒',
    large: true,
    slug: 'connect-mailchimp',
  },
  {
    category: 'Tutorial',
    title: 'Connect ActiveCampaign to Appalix',
    excerpt: 'Pull your ActiveCampaign contacts into Appalix Forms for AI lead scoring and one-click CRM handoff. Requires your API URL and API Key from ActiveCampaign → Settings → Developer.',
    readTime: '6 min read',
    date: 'Mar 4, 2026',
    emoji: '⚡',
    slug: 'connect-activecampaign',
  },
  {
    category: 'Tutorial',
    title: 'Connect Kit (ConvertKit) to Appalix',
    excerpt: 'Sync Appalix Sage contacts to Kit as subscribers and apply tags automatically. Ideal for creators and course businesses — connect with your API key and secret in under 3 minutes.',
    readTime: '5 min read',
    date: 'Mar 4, 2026',
    emoji: '✉️',
    slug: 'connect-convertkit',
  },
  {
    category: 'Tutorial',
    title: 'Connect Klaviyo to Appalix',
    excerpt: 'Sync Appalix CRM contacts to your Klaviyo list and trigger flows automatically. Create a restricted Private API Key, grab your List ID, and connect in under 3 minutes.',
    readTime: '6 min read',
    date: 'Mar 4, 2026',
    emoji: '📊',
    slug: 'connect-klaviyo',
  },
  {
    category: 'Tutorial',
    title: 'Connect Constant Contact to Appalix',
    excerpt: 'Sync Sage CRM contacts to your Constant Contact list automatically. Requires an API key and OAuth access token from the Constant Contact developer portal.',
    readTime: '7 min read',
    date: 'Mar 4, 2026',
    emoji: '📬',
    slug: 'connect-constantcontact',
  },
  // General guides & posts
  {
    category: 'Product',
    title: 'Team Seats, Roles & Permissions in Appalix',
    excerpt: 'A complete breakdown of how Appalix manages workspace access — four-tier role hierarchy (Owner, Admin, Member, Viewer), per-plan seat limits, real-time enforcement, and what\'s coming next with lead assignment and round-robin distribution.',
    readTime: '8 min read',
    date: 'Mar 10, 2026',
    emoji: '👥',
    large: true,
    slug: 'team-seats-roles',
  },
  {
    category: 'Product',
    title: 'Manual Lead Assignment in Appalix Sage CRM',
    excerpt: 'Assign contacts to specific team members, track ownership with an Assigned To badge in the contacts table, filter leads by rep, and keep a full activity log of every reassignment — no leads fall through the cracks.',
    readTime: '7 min read',
    date: 'Mar 10, 2026',
    emoji: '🎯',
    slug: 'assign-leads-manually',
  },
  {
    category: 'Product',
    title: 'Round-Robin Lead Distribution in Appalix',
    excerpt: 'Enable one toggle and every inbound lead — from the bot, email triage, and form submissions — is automatically assigned to the next rep in rotation. Fair, instant, and zero manual work.',
    readTime: '8 min read',
    date: 'Mar 10, 2026',
    emoji: '🔄',
    slug: 'round-robin-lead-distribution',
  },
  {
    category: 'Product',
    title: 'Role-Based Permissions — What Each Role Can Do',
    excerpt: 'A full permission matrix for Owners, Admins, Members, and Viewers across Contacts, Pipelines, Tickets, sidebar navigation, and workspace settings. Includes how enforcement works at both the UI and server layers.',
    readTime: '9 min read',
    date: 'Mar 10, 2026',
    emoji: '🔐',
    slug: 'role-based-permissions',
  },
  {
    category: 'Guide',
    title: 'Team Onboarding Guide — Set Up Your Team in 15 Minutes',
    excerpt: 'A step-by-step checklist: business profile → invite with the right roles → choose lead distribution → create your first pipeline → assign existing leads → orient each role. Everything your team needs to be productive on day one.',
    readTime: '15 min read',
    date: 'Mar 10, 2026',
    emoji: '🚀',
    large: true,
    slug: 'team-onboarding-guide',
  },
  {
    category: 'Product',
    title: "Meet Appalix Sage: Your Team's Internal AI Assistant",
    excerpt: 'Appalix Sage puts AI to work inside your team — searching your knowledge base, drafting proposals and reports, and sharing content with colleagues. Available on Pro and above.',
    readTime: '8 min read',
    date: 'Feb 26, 2026',
    emoji: '✦',
    slug: 'meet-appalix-sage',
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
    excerpt: "Your Appalix agent now automatically detects and responds in your visitor's language — enabling truly global customer conversations.",
    readTime: '3 min read',
    date: 'Jan 30, 2026',
    emoji: '🌍',
  },
  {
    category: 'Guide',
    title: 'Human handoff done right: when and how to escalate AI conversations',
    excerpt: "The best AI agents know their limits. Learn how to configure smart escalation rules so no customer ever feels stuck.",
    readTime: '6 min read',
    date: 'Jan 24, 2026',
    emoji: '🤝',
  },
]

const CATEGORIES = ['All', 'Guide', 'Tutorial', 'Developer Guide', 'Strategy', 'Case Study', 'Product']

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

      {/* Interactive grid: search + category filter + post cards */}
      <ResourcesGrid posts={POSTS} categories={CATEGORIES} />
    </div>
  )
}

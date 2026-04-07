import { Header } from '@/components/layout/header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Support' }

const TOPICS = [
  {
    icon: '💳',
    title: 'Billing & Subscriptions',
    description: 'Questions about your plan, invoices, payment methods, or cancellation.',
    subject: 'Billing%20%26%20Subscription%20Support',
    body: 'Hi%2C%0A%0AI%20have%20a%20question%20about%20my%20billing%20or%20subscription.%0A%0A',
  },
  {
    icon: '🚀',
    title: 'Feature Request',
    description: "Suggest a new feature or improvement you'd like to see in Appalix.",
    subject: 'Feature%20Request',
    body: 'Hi%2C%0A%0AI%20have%20a%20feature%20request%20for%20Appalix.%0A%0AFeature%3A%20',
  },
  {
    icon: '🐛',
    title: 'Report a Bug',
    description: "Something not working as expected? Let us know and we'll fix it fast.",
    subject: 'Bug%20Report',
    body: 'Hi%2C%0A%0AI%27d%20like%20to%20report%20a%20bug.%0A%0ADescription%3A%20%0A%0ASteps%20to%20reproduce%3A%20%0A%0AExpected%20behaviour%3A%20',
  },
  {
    icon: '🔧',
    title: 'Technical Support',
    description: 'Need help with integrations, bots, or platform configuration.',
    subject: 'Technical%20Support',
    body: 'Hi%2C%0A%0AI%20need%20help%20with%20a%20technical%20issue.%0A%0ADescription%3A%20',
  },
  {
    icon: '🏢',
    title: 'Enterprise Enquiry',
    description: 'Interested in Enterprise? Custom pricing, SSO, dedicated infrastructure.',
    subject: 'Enterprise%20Plan%20Enquiry',
    body: 'Hi%2C%0A%0AI%27m%20interested%20in%20the%20Enterprise%20plan%20for%20Appalix.%20Please%20get%20in%20touch%20to%20discuss%20our%20requirements.%0A%0A',
  },
  {
    icon: '💬',
    title: 'General Enquiry',
    description: "Anything else — we're always happy to hear from you.",
    subject: 'General%20Enquiry',
    body: 'Hi%2C%0A%0A',
  },
]

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Settings</a>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-900 dark:text-gray-100">Support</span>
      </div>

      <Header
        title="Contact Support"
        description="We're here to help. Choose a topic below and we'll get back to you as quickly as possible."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOPICS.map((topic) => (
          <a
            key={topic.title}
            href={`mailto:support@appalix.ai?subject=${topic.subject}&body=${topic.body}`}
            className="group flex items-start gap-4 bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-200 dark:border-white/10 p-5 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-sm transition-all"
          >
            <span className="text-2xl mt-0.5 shrink-0">{topic.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {topic.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                {topic.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Direct contact</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Prefer to email directly? Reach our team at the addresses below.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-24 text-xs text-gray-400 dark:text-gray-500 shrink-0">General</span>
            <a href="mailto:support@appalix.ai" className="text-brand-600 dark:text-brand-400 hover:underline">
              support@appalix.ai
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-xs text-gray-400 dark:text-gray-500 shrink-0">Sales / Enterprise</span>
            <a href="mailto:sales@appalix.ai" className="text-brand-600 dark:text-brand-400 hover:underline">
              sales@appalix.ai
            </a>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        We typically respond within 1 business day. For urgent issues please include your workspace name and a description of the problem.
      </p>
    </div>
  )
}

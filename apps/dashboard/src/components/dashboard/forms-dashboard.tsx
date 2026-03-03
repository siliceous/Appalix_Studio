import { ClipboardList, Plus } from 'lucide-react'

/**
 * Forms triage dashboard.
 *
 * Left panel  — lists forms created by the user.
 * Right panel — shows submissions from the selected form, triaged by priority.
 *
 * This is a placeholder until the Forms builder feature is shipped.
 * When forms exist, submissions will appear here with the same priority
 * rules (high / medium / low) and one-click CRM actions as the Email tab.
 */
export function FormsDashboard() {
  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Left — form list (empty) */}
      <aside className="w-[280px] shrink-0 flex flex-col border-r border-gray-200 dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/8 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Forms
          </h2>
          <button
            disabled
            title="Coming soon"
            className="w-5 h-5 rounded-md flex items-center justify-center bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <ClipboardList className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No forms yet</p>
          </div>
        </div>
      </aside>

      {/* Right — submission triage area (empty) */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#1a1a1a] p-8">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Forms — coming soon
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            Build embeddable forms for your website or chatbots. Submissions will appear here
            triaged by priority — just like email — so you can create leads, tickets, or ignore
            with one click.
          </p>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
            In development
          </span>
        </div>
      </div>

    </div>
  )
}

import { ClipboardList } from 'lucide-react'

export function FormsDashboard() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#1c1c1c]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-7 h-7 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Forms</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
          Collect and manage form submissions from your chatbots and website — all in one place.
        </p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
          Coming soon
        </span>
      </div>
    </div>
  )
}

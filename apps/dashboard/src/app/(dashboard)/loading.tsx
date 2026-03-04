export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-white/10 border-t-brand-600 dark:border-t-[#61c2ad] animate-spin" />
        <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
      </div>
    </div>
  )
}

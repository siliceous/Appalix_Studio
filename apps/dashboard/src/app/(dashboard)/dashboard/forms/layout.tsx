export default function DashboardFormsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-0px)] -m-8 overflow-hidden">
      <div className="flex-1 h-full overflow-hidden flex flex-col bg-[#f5f4f1] dark:bg-[#1c1c1c]">
        {children}
      </div>
    </div>
  )
}

export default function BotsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      {children}
    </div>
  )
}

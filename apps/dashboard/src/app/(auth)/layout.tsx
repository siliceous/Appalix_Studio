import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#1c1c1c] px-4 overflow-hidden">
      {/* Teal glow — matches homepage hero */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#15A4AE]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="Appalix" width={160} height={48} className="object-contain mx-auto brightness-0 invert" priority />
        </div>
        {children}
      </div>
    </div>
  )
}

import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="Appalix" width={160} height={48} className="object-contain mx-auto" priority />
        </div>
        {children}
      </div>
    </div>
  )
}

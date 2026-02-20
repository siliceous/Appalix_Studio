import { redirect } from 'next/navigation'

// Root path always redirects to the dashboard
export default function RootPage() {
  redirect('/dashboard')
}

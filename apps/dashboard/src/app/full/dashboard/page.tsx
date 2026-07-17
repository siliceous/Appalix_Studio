import { redirect } from 'next/navigation'

export default function FullDashboardPage() {
  // Redirect /full/dashboard to the main dashboard which is in (dashboard) group
  redirect('/dashboard')
}

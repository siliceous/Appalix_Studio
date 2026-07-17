import { redirect } from 'next/navigation'

export default function FullDashboardCatchAll({ params }: { params: { slug: string[] } }) {
  // Redirect /full/* to /* (which goes through the (dashboard) layout)
  const path = params.slug?.join('/') || 'dashboard'
  redirect(`/${path}`)
}

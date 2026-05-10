import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { listForms } from '@/app/actions/forms'
import { MyFormsClient } from '@/features/forms/components/MyFormsClient'

export const metadata: Metadata = { title: 'My Forms · Builder' }
export const dynamic = 'force-dynamic'

export default async function MyFormsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const forms = await listForms()

  return <MyFormsClient initialForms={forms} />
}

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getForm } from '@/app/actions/forms'
import { FormEditorShell } from '@/features/forms/components/FormEditorShell'

export const metadata: Metadata = { title: 'Form Editor · Forms' }

interface Props { params: Promise<{ id: string }> }

export default async function FormEditorPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const form = await getForm(id)
  if (!form) notFound()

  return <FormEditorShell initialForm={form} />
}

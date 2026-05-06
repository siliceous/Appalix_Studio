import { notFound } from 'next/navigation'
import { headers }   from 'next/headers'
import type { Metadata } from 'next'
import { getPublicForm } from '@/app/actions/form-submissions'
import { FormRenderer }  from './form-renderer'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const form = await getPublicForm(slug)
  return {
    title: form?.name ?? 'Form',
    robots: { index: false },
  }
}

export default async function PublicFormPage({ params }: Props) {
  const { slug } = await params
  const form = await getPublicForm(slug)
  if (!form) notFound()

  const headersList = await headers()
  const host   = headersList.get('host') ?? ''
  const proto  = host.startsWith('localhost') ? 'http' : 'https'
  const sourceUrl = `${proto}://${host}/f/${slug}`

  const bg     = form.theme?.colors?.background ?? '#f3f4f6'
  const formBg = form.theme?.colors?.background ?? '#ffffff'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: bg === '#ffffff' ? '#f3f4f6' : bg }}
    >
      <div className="w-full">
        <FormRenderer form={form} sourceUrl={sourceUrl} />
      </div>
    </div>
  )
}

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

  // Server-side scheduling gate
  const scheduling = form.behaviour?.scheduling
  if (scheduling?.mode === 'scheduled') {
    const now = Date.now()
    const tooEarly = scheduling.startAt && new Date(scheduling.startAt).getTime() > now
    const tooLate  = scheduling.endAt   && new Date(scheduling.endAt).getTime()   < now
    if (tooEarly || tooLate) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700 mb-2">This form is currently unavailable.</p>
            <p className="text-sm text-gray-400">Please check back later.</p>
          </div>
        </div>
      )
    }
  }

  const headersList = await headers()
  const host   = headersList.get('host') ?? ''
  const proto  = host.startsWith('localhost') ? 'http' : 'https'
  const sourceUrl = `${proto}://${host}/f/${slug}`

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-white"
    >
      <div className="w-full">
        <FormRenderer form={form} sourceUrl={sourceUrl} />
      </div>
    </div>
  )
}

import { getDocuments } from '@/app/actions/sage-documents'
import { QuotesClient } from './quotes-client'
import type { Metadata } from 'next'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

export const metadata: Metadata = { title: 'Quotes & Invoices' }

export default async function QuotesPage() {
  const documents = await getDocuments()
  return (
    <div className="flex flex-col">
      <SageToolbar pageKey="quotes" />
      <div>
        <QuotesClient initialDocuments={documents} />
      </div>
    </div>
  )
}

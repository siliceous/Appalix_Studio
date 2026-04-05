import { getDocuments } from '@/app/actions/sage-documents'
import { QuotesClient } from './quotes-client'
import type { Metadata } from 'next'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

export const metadata: Metadata = { title: 'Quotes & Invoices' }

export default async function QuotesPage() {
  const documents = await getDocuments()
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <SageToolbar pageKey="quotes" />
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <QuotesClient initialDocuments={documents} />
      </div>
    </div>
  )
}

import { getDocuments } from '@/app/actions/sage-documents'
import { QuotesClient } from './quotes-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Quotes & Invoices' }

export default async function QuotesPage() {
  const documents = await getDocuments()
  return <QuotesClient initialDocuments={documents} />
}

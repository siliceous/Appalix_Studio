'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Stripe from 'stripe'
import type { SageDocument, SageDocumentItem, SageDocumentType, SageDocumentStatus, SageDiscountType } from '@/lib/types'

async function getAuthContext(): Promise<{ workspaceId: string; userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!data) redirect('/login')
  return { workspaceId: (data as { workspace_id: string }).workspace_id, userId: user.id }
}

// Helper to get workspace Stripe key from sage_integrations
async function getWorkspaceStripeKey(workspaceId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'stripe')
    .eq('status', 'connected')
    .limit(1)
    .single()
  return (data as { config: Record<string, string> } | null)?.config?.secret_key ?? null
}

// Helper to generate next doc number (QUO-001, INV-001, PKG-001)
async function nextDocNumber(workspaceId: string, docType: SageDocumentType): Promise<string> {
  const admin = createAdminClient()
  const prefix = docType === 'quote' ? 'QUO' : docType === 'invoice' ? 'INV' : 'PKG'
  const { count } = await admin
    .from('sage_documents')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('doc_type', docType)
  const n = (count ?? 0) + 1
  return `${prefix}-${String(n).padStart(3, '0')}`
}

// List documents (optionally filtered by type)
export async function getDocuments(docType?: SageDocumentType): Promise<SageDocument[]> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  let q = admin
    .from('sage_documents')
    .select('*, contact:sage_contacts(id,name,email), company:sage_companies(id,name), project:sage_projects(id,name)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (docType) q = q.eq('doc_type', docType)
  const { data } = await q
  return (data ?? []) as SageDocument[]
}

// Get single document with items
export async function getDocument(id: string): Promise<SageDocument | null> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_documents')
    .select('*, items:sage_document_items(id,description,quantity,unit_price,amount,order_index,created_at), contact:sage_contacts(id,name,email), company:sage_companies(id,name), project:sage_projects(id,name)')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()
  if (!data) return null
  const doc = data as SageDocument
  if (doc.items) {
    doc.items = [...doc.items].sort((a, b) => a.order_index - b.order_index)
  }
  return doc
}

// Create a new document
export async function createDocument(fields: {
  doc_type:       SageDocumentType
  project_id?:    string
  contact_id?:    string
  company_id?:    string
  currency?:      string
  issue_date?:    string
  due_date?:      string
  valid_until?:   string
  discount_type?: SageDiscountType
  discount_value?: number
  tax_rate?:      number
  tax_inclusive?: boolean
  customer_po?:   string
  notes?:         string
  terms?:         string
  from_name?:     string
  from_address?:  string
  accent_color?:  string
  logo_url?:      string
  attachments?:   { name: string; url: string; size: number; type: string }[]
  items:          { item_code?: string; description: string; category?: string; job?: string; tax_code?: string; unit?: string; quantity: number; unit_price: number; discount?: number; order_index: number }[]
}): Promise<{ id?: string; doc_number?: string; error?: string }> {
  const { workspaceId, userId } = await getAuthContext()
  const admin = createAdminClient()
  const doc_number = await nextDocNumber(workspaceId, fields.doc_type)

  // Calculate totals
  const subtotal = fields.items.reduce((s, i) => s + i.quantity * i.unit_price * (1 - (i.discount ?? 0) / 100), 0)
  const discountAmt = fields.discount_type === 'fixed'
    ? (fields.discount_value ?? 0)
    : subtotal * ((fields.discount_value ?? 0) / 100)
  const taxable  = subtotal - discountAmt
  const tax_amount = taxable * ((fields.tax_rate ?? 0) / 100)
  const total = taxable + tax_amount

  const { data, error } = await admin
    .from('sage_documents')
    .insert({
      workspace_id:   workspaceId,
      doc_type:       fields.doc_type,
      doc_number,
      project_id:     fields.project_id     ?? null,
      contact_id:     fields.contact_id     ?? null,
      company_id:     fields.company_id     ?? null,
      currency:       fields.currency       ?? 'USD',
      status:         'draft',
      issue_date:     fields.issue_date     ?? new Date().toISOString().slice(0, 10),
      due_date:       fields.due_date       ?? null,
      valid_until:    fields.valid_until    ?? null,
      discount_type:  fields.discount_type  ?? 'percent',
      discount_value: fields.discount_value ?? 0,
      tax_rate:       fields.tax_rate       ?? 0,
      tax_inclusive:  fields.tax_inclusive  ?? false,
      tax_amount,
      subtotal,
      total,
      customer_po:    fields.customer_po   ?? null,
      notes:          fields.notes         ?? null,
      terms:          fields.terms         ?? null,
      from_name:      fields.from_name     ?? null,
      from_address:   fields.from_address  ?? null,
      accent_color:   fields.accent_color  ?? '#2563eb',
      logo_url:       fields.logo_url      ?? null,
      attachments:    fields.attachments   ?? [],
      created_by:     userId,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  const docId = (data as { id: string }).id

  if (fields.items.length > 0) {
    await admin.from('sage_document_items').insert(
      fields.items.map((item, idx) => ({
        document_id: docId,
        item_code:   item.item_code   ?? null,
        description: item.description,
        category:    item.category    ?? null,
        job:         item.job         ?? null,
        tax_code:    item.tax_code    ?? null,
        unit:        item.unit        ?? null,
        quantity:    item.quantity,
        unit_price:  item.unit_price,
        discount:    item.discount    ?? 0,
        order_index: item.order_index ?? idx,
      }))
    )
  }

  revalidatePath('/sage/quotes')
  return { id: docId, doc_number }
}

// Update document (metadata + recalculate totals)
export async function updateDocument(id: string, fields: {
  project_id?:    string | null
  contact_id?:    string | null
  company_id?:    string | null
  status?:        SageDocumentStatus
  currency?:      string
  issue_date?:    string
  due_date?:      string | null
  valid_until?:   string | null
  discount_type?: SageDiscountType
  discount_value?: number
  tax_rate?:      number
  tax_inclusive?: boolean
  customer_po?:   string | null
  notes?:         string | null
  terms?:         string | null
  from_name?:     string | null
  from_address?:  string | null
  accent_color?:  string | null
  logo_url?:      string | null
  attachments?:   { name: string; url: string; size: number; type: string }[]
  items?:         { item_code?: string; description: string; category?: string; job?: string; tax_code?: string; unit?: string; quantity: number; unit_price: number; discount?: number; order_index: number }[]
}): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  // Build update payload
  const update: Record<string, unknown> = {}
  if (fields.project_id    !== undefined) update.project_id    = fields.project_id
  if (fields.contact_id    !== undefined) update.contact_id    = fields.contact_id
  if (fields.company_id    !== undefined) update.company_id    = fields.company_id
  if (fields.status        !== undefined) update.status        = fields.status
  if (fields.currency      !== undefined) update.currency      = fields.currency
  if (fields.issue_date    !== undefined) update.issue_date    = fields.issue_date
  if (fields.due_date      !== undefined) update.due_date      = fields.due_date
  if (fields.valid_until   !== undefined) update.valid_until   = fields.valid_until
  if (fields.discount_type !== undefined) update.discount_type = fields.discount_type
  if (fields.discount_value !== undefined) update.discount_value = fields.discount_value
  if (fields.tax_rate      !== undefined) update.tax_rate      = fields.tax_rate
  if (fields.tax_inclusive !== undefined) update.tax_inclusive = fields.tax_inclusive
  if (fields.customer_po   !== undefined) update.customer_po   = fields.customer_po
  if (fields.notes         !== undefined) update.notes         = fields.notes
  if (fields.terms         !== undefined) update.terms         = fields.terms
  if (fields.from_name     !== undefined) update.from_name     = fields.from_name
  if (fields.from_address  !== undefined) update.from_address  = fields.from_address
  if (fields.accent_color  !== undefined) update.accent_color  = fields.accent_color
  if (fields.logo_url      !== undefined) update.logo_url      = fields.logo_url
  if (fields.attachments   !== undefined) update.attachments   = fields.attachments

  // If items provided, recalculate totals
  if (fields.items) {
    const subtotal = fields.items.reduce((s, i) => s + i.quantity * i.unit_price * (1 - (i.discount ?? 0) / 100), 0)
    const discAmt = (fields.discount_type ?? 'percent') === 'fixed'
      ? (fields.discount_value ?? 0)
      : subtotal * ((fields.discount_value ?? 0) / 100)
    const taxable    = subtotal - discAmt
    const tax_amount = taxable * ((fields.tax_rate ?? 0) / 100)
    update.subtotal  = subtotal
    update.tax_amount = tax_amount
    update.total     = taxable + tax_amount

    // Replace all items
    await admin.from('sage_document_items').delete().eq('document_id', id)
    if (fields.items.length > 0) {
      await admin.from('sage_document_items').insert(
        fields.items.map((item, idx) => ({
          document_id: id,
          item_code:   item.item_code   ?? null,
          description: item.description,
          category:    item.category    ?? null,
          job:         item.job         ?? null,
          tax_code:    item.tax_code    ?? null,
          unit:        item.unit        ?? null,
          quantity:    item.quantity,
          unit_price:  item.unit_price,
          discount:    item.discount    ?? 0,
          order_index: item.order_index ?? idx,
        }))
      )
    }
  }

  const { error } = await admin
    .from('sage_documents')
    .update(update)
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  revalidatePath('/sage/quotes')
  revalidatePath(`/sage/quotes/${id}`)
  return { error: error?.message }
}

// Soft delete
export async function deleteDocument(id: string): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  revalidatePath('/sage/quotes')
  return { error: error?.message }
}

// Convert quote → invoice (copies the document)
export async function convertToInvoice(quoteId: string): Promise<{ id?: string; error?: string }> {
  const { workspaceId, userId } = await getAuthContext()
  const admin = createAdminClient()

  const { data: quoteRaw } = await admin
    .from('sage_documents')
    .select('*, items:sage_document_items(description,quantity,unit_price,order_index)')
    .eq('id', quoteId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!quoteRaw) return { error: 'Quote not found' }
  const quote = quoteRaw as SageDocument & { items: SageDocumentItem[] }

  const doc_number = await nextDocNumber(workspaceId, 'invoice')

  const { data, error } = await admin
    .from('sage_documents')
    .insert({
      workspace_id:   workspaceId,
      doc_type:       'invoice',
      doc_number,
      quote_id:       quoteId,
      project_id:     quote.project_id,
      contact_id:     quote.contact_id,
      company_id:     quote.company_id,
      currency:       quote.currency,
      status:         'draft',
      issue_date:     new Date().toISOString().slice(0, 10),
      due_date:       null,
      discount_type:  quote.discount_type,
      discount_value: quote.discount_value,
      tax_rate:       quote.tax_rate,
      tax_amount:     quote.tax_amount,
      subtotal:       quote.subtotal,
      total:          quote.total,
      notes:          quote.notes,
      terms:          quote.terms,
      created_by:     userId,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  const invId = (data as { id: string }).id

  // Mark quote as invoiced
  await admin.from('sage_documents').update({ status: 'invoiced', accepted_at: new Date().toISOString() }).eq('id', quoteId)

  // Copy items
  if (quote.items?.length) {
    await admin.from('sage_document_items').insert(
      quote.items.map(i => ({
        document_id: invId,
        description: i.description,
        quantity:    i.quantity,
        unit_price:  i.unit_price,
        order_index: i.order_index,
      }))
    )
  }

  revalidatePath('/sage/quotes')
  return { id: invId }
}

// Create Stripe invoice and get payment link
export async function sendViaStripe(documentId: string): Promise<{ payment_link?: string; error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const stripeKey = await getWorkspaceStripeKey(workspaceId)
  if (!stripeKey) return { error: 'Stripe is not connected. Go to Sage → Integrations → Stripe.' }

  const { data: docRaw } = await admin
    .from('sage_documents')
    .select('*, items:sage_document_items(description,quantity,unit_price,amount,order_index), contact:sage_contacts(id,name,email)')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!docRaw) return { error: 'Document not found' }
  const doc = docRaw as SageDocument & { items: SageDocumentItem[]; contact: { id: string; name: string; email: string | null } | null }

  if (doc.doc_type !== 'invoice') return { error: 'Only invoices can be sent via Stripe' }
  if (!doc.items?.length) return { error: 'Add at least one line item before sending' }

  const stripe = new Stripe(stripeKey)

  // Get or create Stripe customer
  let customerId = doc.stripe_customer_id
  if (!customerId) {
    const email = doc.contact?.email ?? null
    const name  = doc.contact?.name  ?? 'Client'
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      customerId = existing.data[0]?.id ?? null
    }
    if (!customerId) {
      const c = await stripe.customers.create({ ...(doc.contact?.email ? { email: doc.contact.email } : {}), name })
      customerId = c.id
    }
  }

  // Due date — Stripe requires due_date for send_invoice; default 30 days
  const dueDateTs = doc.due_date
    ? Math.floor(new Date(doc.due_date).getTime() / 1000)
    : Math.floor(Date.now() / 1000) + 30 * 86400

  try {
    // Create invoice
    const invoice = await stripe.invoices.create({
      customer:           customerId,
      collection_method:  'send_invoice',
      due_date:           dueDateTs,
      currency:           doc.currency.toLowerCase(),
      metadata:           { document_id: documentId, workspace_id: workspaceId },
    })

    // Add line items
    for (const item of doc.items) {
      await stripe.invoiceItems.create({
        customer:            customerId,
        invoice:             invoice.id,
        description:         item.description || 'Service',
        quantity:            Math.round(item.quantity),
        unit_amount_decimal: String(Math.round(item.unit_price * 100)),
        currency:            doc.currency.toLowerCase(),
      })
    }

    // Finalize
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: false })
    const paymentLink = finalized.hosted_invoice_url ?? ''

    await admin
      .from('sage_documents')
      .update({
        stripe_customer_id:  customerId,
        stripe_invoice_id:   finalized.id,
        stripe_payment_link: paymentLink,
        status:              'sent',
        sent_at:             new Date().toISOString(),
      })
      .eq('id', documentId)

    revalidatePath('/sage/quotes')
    revalidatePath(`/sage/quotes/${documentId}`)
    return { payment_link: paymentLink }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    return { error: msg }
  }
}

// Poll Stripe to check if invoice was paid
export async function syncStripeStatus(documentId: string): Promise<{ status?: SageDocumentStatus; error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const stripeKey = await getWorkspaceStripeKey(workspaceId)
  if (!stripeKey) return { error: 'Stripe not connected' }

  const { data: docRaw } = await admin
    .from('sage_documents')
    .select('stripe_invoice_id, status')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .single()

  const doc = docRaw as { stripe_invoice_id: string | null; status: SageDocumentStatus } | null
  if (!doc?.stripe_invoice_id) return { error: 'No Stripe invoice linked' }

  const stripe = new Stripe(stripeKey)
  const inv = await stripe.invoices.retrieve(doc.stripe_invoice_id)

  let newStatus: SageDocumentStatus = doc.status
  if (inv.status === 'paid') newStatus = 'paid'
  else if (inv.status === 'open' && inv.due_date && inv.due_date * 1000 < Date.now()) newStatus = 'overdue'
  else if (inv.status === 'open') newStatus = 'sent'
  else if (inv.status === 'void') newStatus = 'void'

  if (newStatus !== doc.status) {
    await admin
      .from('sage_documents')
      .update({
        status:  newStatus,
        ...(newStatus === 'paid' ? { paid_at: new Date().toISOString() } : {}),
      })
      .eq('id', documentId)
    revalidatePath('/sage/quotes')
    revalidatePath(`/sage/quotes/${documentId}`)
  }

  return { status: newStatus }
}

// Manually mark as paid
export async function markAsPaid(documentId: string): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_documents')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
  revalidatePath('/sage/quotes')
  revalidatePath(`/sage/quotes/${documentId}`)
  return { error: error?.message }
}

// Mark quote as accepted
export async function acceptQuote(documentId: string): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_documents')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
  revalidatePath('/sage/quotes')
  revalidatePath(`/sage/quotes/${documentId}`)
  return { error: error?.message }
}

// Mark as sent (non-Stripe send — just status update)
export async function markAsSent(documentId: string): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_documents')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
  revalidatePath('/sage/quotes')
  revalidatePath(`/sage/quotes/${documentId}`)
  return { error: error?.message }
}

// Search contacts with full details for document builder
export async function searchContacts(query: string): Promise<{
  id: string; name: string; email: string | null; phone: string | null
  company_name: string | null; street: string | null; city: string | null
  state: string | null; zip: string | null; country: string | null
  vat_number: string | null
}[]> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  let q = admin
    .from('sage_contacts')
    .select('id,name,email,phone,company_name,street,city,state,zip,country')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('name')
    .limit(20)
  if (query.trim()) {
    q = q.or(
      `name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`
    )
  }
  const { data } = await q
  return ((data ?? []) as any[]).map(c => ({ ...c, vat_number: null }))
}

// Create a contact quickly from within the document builder
export async function createQuickContact(fields: {
  name:         string
  email?:       string
  phone?:       string
  company_name?: string
}): Promise<{ id?: string; error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sage_contacts')
    .insert({
      workspace_id: workspaceId,
      name:         fields.name,
      email:        fields.email        ?? null,
      phone:        fields.phone        ?? null,
      company_name: fields.company_name ?? null,
      source:       'manual',
      tags:         [],
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/sage/quotes')
  revalidatePath('/sage/contacts')
  return { id: (data as { id: string }).id }
}

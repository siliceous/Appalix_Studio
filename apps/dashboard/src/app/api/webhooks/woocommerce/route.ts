import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

// Never statically render — webhook handlers are always dynamic
export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * WooCommerce webhook handler.
 *
 * Configure in WooCommerce → Settings → Advanced → Webhooks:
 *   Topic:       order.updated  (or order.created)
 *   Delivery URL: https://yourdomain.com/api/webhooks/woocommerce
 *   Secret:      your WOOCOMMERCE_WEBHOOK_SECRET
 *
 * Relevant order statuses:
 *   completed  → provision workspace
 *   refunded / cancelled / failed → cancel / restrict workspace
 */
export async function POST(request: NextRequest) {
  const body      = await request.text()
  const signature = request.headers.get('x-wc-webhook-signature')
  const topic     = request.headers.get('x-wc-webhook-topic') ?? ''

  // Verify HMAC-SHA256 signature
  if (!verifySignature(body, signature)) {
    console.error('[woocommerce webhook] signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let order: WooOrder
  try {
    order = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    if (topic === 'order.created' || topic === 'order.updated') {
      await handleOrderEvent(order)
    }
  } catch (err) {
    console.error('[woocommerce webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ---------------------------------------------------------------
// Order handler
// ---------------------------------------------------------------

async function handleOrderEvent(order: WooOrder) {
  const status = order.status
  const email  = order.billing?.email
  const orderId = String(order.id)

  if (!email) {
    console.error('[woocommerce] order has no billing email:', orderId)
    return
  }

  if (status === 'completed') {
    await provisionWorkspace(email, orderId, order)
  } else if (['refunded', 'cancelled', 'failed'].includes(status)) {
    await cancelWorkspace(orderId, status)
  }
}

async function provisionWorkspace(email: string, orderId: string, order: WooOrder) {
  const supabase = getSupabase()
  const plan = extractPlanFromOrder(order)

  // Check if workspace already exists for this order (idempotent)
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('woo_order_id', orderId)
    .maybeSingle()

  if (existing) {
    // Already provisioned — update status in case of re-activation
    await supabase
      .from('workspaces')
      .update({ subscription_status: 'active' })
      .eq('woo_order_id', orderId)
    console.log(`[woocommerce] re-activated workspace for order ${orderId}`)
    return
  }

  // Get or create Supabase auth user
  const { data: userList } = await supabase.auth.admin.listUsers()
  const existingUser = userList.users.find((u: { email?: string }) => u.email === email)

  let userId: string
  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error || !newUser.user) throw new Error(`Failed to create user: ${error?.message}`)
    userId = newUser.user.id
  }

  // Create workspace
  const workspaceName = order.billing?.first_name
    ? `${order.billing.first_name}'s Workspace`
    : email.split('@')[0]

  const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      name:                workspaceName,
      slug:                `${slug}-${Date.now().toString(36)}`,
      plan,
      subscription_status: 'active',
      billing_email:       email,
      woo_order_id:        orderId,
    })
    .select('id')
    .single()

  if (wsError) throw new Error(`Failed to create workspace: ${wsError.message}`)

  // Add user as owner
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id:      userId,
    role:         'owner',
    accepted_at:  new Date().toISOString(),
  })

  // Send magic-link login email
  await supabase.auth.admin.generateLink({
    type:  'magiclink',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` },
  })

  console.log(`[woocommerce] Workspace provisioned: ${workspace.id} for ${email} (order ${orderId})`)
}

async function cancelWorkspace(orderId: string, reason: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('workspaces')
    .update({ subscription_status: 'cancelled' })
    .eq('woo_order_id', orderId)

  if (error) {
    console.error(`[woocommerce] failed to cancel workspace for order ${orderId}:`, error.message)
  } else {
    console.log(`[woocommerce] workspace cancelled for order ${orderId} (${reason})`)
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.WOOCOMMERCE_WEBHOOK_SECRET) return false
  const expected = createHmac('sha256', process.env.WOOCOMMERCE_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

function extractPlanFromOrder(order: WooOrder): 'starter' | 'pro' | 'enterprise' {
  // Check line item names for plan keywords
  for (const item of order.line_items ?? []) {
    const name = (item.name ?? '').toLowerCase()
    if (name.includes('enterprise')) return 'enterprise'
    if (name.includes('pro'))        return 'pro'
  }
  return 'starter'
}

// ---------------------------------------------------------------
// WooCommerce order shape (minimal subset we care about)
// ---------------------------------------------------------------
interface WooOrder {
  id: number
  status: string
  billing?: {
    email?: string
    first_name?: string
    last_name?: string
  }
  line_items?: Array<{ name?: string; product_id?: number }>
  meta_data?: Array<{ key: string; value: unknown }>
}

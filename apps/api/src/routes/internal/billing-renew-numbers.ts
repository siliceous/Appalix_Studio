// ─────────────────────────────────────────────────────────────────────────────
// /internal/billing/renew-numbers
//
// Called nightly by a cron service (e.g. Render cron, GitHub Actions schedule).
// Finds every active phone number whose billing_next_at has passed, charges the
// workspace wallet for one more month, then rolls billing_next_at forward 30 days.
//
// Protected by INTERNAL_API_SECRET header — never exposed to end users.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify'
import { supabase }             from '../../lib/supabase.js'
import { recordPhoneNumberMonth } from '../../services/usage-ledger.service.js'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

interface PhoneNumberRow {
  id:             string
  workspace_id:   string
  e164:           string
  billing_next_at: string
}

export async function billingRenewNumbersRoute(fastify: FastifyInstance) {
  fastify.post('/billing/renew-numbers', async (req, reply) => {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const secret = process.env.INTERNAL_API_SECRET
    if (secret) {
      const header = (req.headers['x-internal-secret'] as string | undefined) ?? ''
      if (header !== secret) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
    }

    const now = new Date()

    // ── Find due numbers ──────────────────────────────────────────────────────
    const { data: due, error } = await supabase
      .from('workspace_phone_numbers' as never)
      .select('id, workspace_id, e164, billing_next_at')
      .is('released_at', null)
      .lte('billing_next_at', now.toISOString())
      .limit(500) as { data: PhoneNumberRow[] | null; error: { message: string } | null }

    if (error) {
      fastify.log.error({ err: error.message }, '[billing-renew] query failed')
      return reply.code(500).send({ error: error.message })
    }

    const rows = due ?? []
    fastify.log.info(`[billing-renew] ${rows.length} number(s) due for renewal`)

    const results = { renewed: 0, skipped: 0, errors: 0 }

    for (const row of rows) {
      try {
        // Charge wallet + record usage event
        await recordPhoneNumberMonth({
          workspaceId:   row.workspace_id,
          phoneNumberId: row.id,
          e164:          row.e164,
          occurredAt:    now,
        })

        // Roll billing_next_at forward by exactly 30 days from the due date
        // (not from now, so drift doesn't accumulate)
        const nextAt = new Date(new Date(row.billing_next_at).getTime() + THIRTY_DAYS_MS)

        await supabase
          .from('workspace_phone_numbers' as never)
          .update({ billing_next_at: nextAt.toISOString() })
          .eq('id', row.id)

        results.renewed++
      } catch (err) {
        fastify.log.error({ err, numberId: row.id }, '[billing-renew] renewal failed')
        results.errors++
      }
    }

    return reply.send({
      ok:        true,
      processed: rows.length,
      ...results,
      ran_at:    now.toISOString(),
    })
  })
}

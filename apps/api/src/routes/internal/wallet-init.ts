import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../../lib/supabase.js'

export async function walletInitRoutes(app: FastifyInstance) {
  /**
   * POST /internal/wallet/init/:workspace_id
   * Initialize wallet for a workspace (development/testing only)
   */
  app.post<{ Params: { workspace_id: string } }>(
    '/wallet/init/:workspace_id',
    async (request: FastifyRequest<{ Params: { workspace_id: string } }>, reply: FastifyReply) => {
      try {
        const { workspace_id } = request.params

        // Verify this is only used in development
        if (process.env.NODE_ENV === 'production') {
          return reply.status(403).send({ error: 'Not available in production' })
        }

        if (!workspace_id) {
          return reply.status(400).send({ error: 'Workspace ID required' })
        }

        // Check if wallet already exists
        const { data: existing } = await (supabase
          .from('wallet_accounts')
          .select('id')
          .eq('workspace_id', workspace_id)
          .maybeSingle() as any)

        if (existing) {
          return reply.send({ message: 'Wallet already exists', workspace_id })
        }

        // Create wallet with initial balance of $1000
        const { data, error } = await (supabase
          .from('wallet_accounts')
          .insert({
            workspace_id,
            balance: 1000.00,
            currency: 'USD',
            auto_recharge_enabled: false,
            auto_recharge_threshold: 100.00,
            auto_recharge_amount: 500.00,
            low_balance_threshold: 50.00,
          } as any)
          .select() as any)

        if (error) {
          console.error('Wallet creation error:', error)
          return reply.status(500).send({ error: error.message })
        }

        return reply.status(201).send({
          message: 'Wallet created successfully',
          workspace_id,
          balance: 1000.00,
          currency: 'USD',
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Wallet init error:', message)
        return reply.status(500).send({ error: message })
      }
    }
  )

  /**
   * GET /internal/wallet/:workspace_id
   * Get wallet balance (development/testing only)
   */
  app.get<{ Params: { workspace_id: string } }>(
    '/wallet/:workspace_id',
    async (request: FastifyRequest<{ Params: { workspace_id: string } }>, reply: FastifyReply) => {
      try {
        const { workspace_id } = request.params

        if (process.env.NODE_ENV === 'production') {
          return reply.status(403).send({ error: 'Not available in production' })
        }

        const { data: wallet, error } = await (supabase
          .from('wallet_accounts')
          .select('balance, currency')
          .eq('workspace_id', workspace_id)
          .single() as any)

        if (error || !wallet) {
          return reply.status(404).send({ error: 'Wallet not found' })
        }

        return reply.send(wallet)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    }
  )

  /**
   * POST /internal/wallet/:workspace_id/topup
   * Add credits to wallet (development/testing only)
   */
  app.post<{ Params: { workspace_id: string }; Body: { amount: number } }>(
    '/wallet/:workspace_id/topup',
    async (request: FastifyRequest<{ Params: { workspace_id: string }; Body: { amount: number } }>, reply: FastifyReply) => {
      try {
        const { workspace_id } = request.params
        const { amount } = request.body

        if (process.env.NODE_ENV === 'production') {
          return reply.status(403).send({ error: 'Not available in production' })
        }

        if (!amount || amount <= 0) {
          return reply.status(400).send({ error: 'Amount must be greater than 0' })
        }

        // Get current balance
        const { data: wallet, error: fetchError } = await (supabase
          .from('wallet_accounts')
          .select('balance')
          .eq('workspace_id', workspace_id)
          .single() as any)

        if (fetchError || !wallet) {
          return reply.status(404).send({ error: 'Wallet not found' })
        }

        const newBalance = (wallet as any).balance + amount

        // Update balance
        const { error: updateError } = await (supabase
          .from('wallet_accounts')
          .update({ balance: newBalance })
          .eq('workspace_id', workspace_id) as any)

        if (updateError) {
          return reply.status(500).send({ error: updateError.message })
        }

        return reply.send({
          message: 'Topup successful',
          workspace_id,
          added: amount,
          new_balance: newBalance,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    }
  )
}

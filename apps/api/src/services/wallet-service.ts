import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }
  return supabase;
}

export interface WalletTransaction {
  workspace_id: string;
  amount_usd: number;
  transaction_type: 'topup' | 'usage_deduction' | 'refund' | 'admin_adjustment';
  description: string;
  metadata?: Record<string, any>;
}

export class WalletService {
  /**
   * Deduct balance from workspace wallet
   */
  async deductBalance(
    workspace_id: string,
    amount_usd: number,
    transaction_type: 'usage_deduction' | 'refund' = 'usage_deduction',
    description: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get current balance
      const { data: wallet, error: walletError } = await getSupabase()
        .from('wallet_accounts')
        .select('balance')
        .eq('workspace_id', workspace_id)
        .single();

      if (walletError || !wallet) {
        console.error('Wallet not found:', workspace_id);
        return false;
      }

      // Check if sufficient balance
      if (wallet.balance < amount_usd) {
        console.error(`Insufficient balance. Need $${amount_usd}, have $${wallet.balance}`);
        return false;
      }

      // Deduct from wallet (using RPC for atomicity)
      const { error: deductError } = await getSupabase().rpc('wallet_deduct', {
        p_workspace_id: workspace_id,
        p_amount: amount_usd,
      });

      if (deductError) {
        console.error('Wallet deduction error:', deductError);
        return false;
      }

      // Record transaction
      const { error: transactionError } = await getSupabase()
        .from('wallet_transactions')
        .insert({
          workspace_id,
          amount_usd,
          transaction_type,
          description,
          metadata: metadata || {},
        });

      if (transactionError) {
        console.error('Transaction recording error:', transactionError);
        // Don't fail if transaction logging fails - balance was already deducted
      }

      return true;
    } catch (error) {
      console.error('Wallet deduction exception:', error);
      return false;
    }
  }

  /**
   * Add balance to workspace wallet (refund)
   */
  async refundBalance(
    workspace_id: string,
    amount_usd: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Add to wallet using RPC
      const { error: creditError } = await getSupabase().rpc('wallet_credit', {
        p_workspace_id: workspace_id,
        p_amount: amount_usd,
      });

      if (creditError) {
        console.error('Wallet refund error:', creditError);
        return false;
      }

      // Record transaction
      const { error: transactionError } = await getSupabase()
        .from('wallet_transactions')
        .insert({
          workspace_id,
          amount_usd,
          transaction_type: 'refund',
          description,
          metadata: metadata || {},
        });

      if (transactionError) {
        console.error('Refund transaction recording error:', transactionError);
        // Don't fail if logging fails - balance was already credited
      }

      return true;
    } catch (error) {
      console.error('Wallet refund exception:', error);
      return false;
    }
  }

  /**
   * Get workspace wallet balance
   */
  async getBalance(workspace_id: string): Promise<number | null> {
    try {
      const { data: wallet, error } = await getSupabase()
        .from('wallet_accounts')
        .select('balance')
        .eq('workspace_id', workspace_id)
        .single();

      if (error || !wallet) {
        return null;
      }

      return wallet.balance;
    } catch (error) {
      console.error('Get balance error:', error);
      return null;
    }
  }
}

export const walletService = new WalletService();

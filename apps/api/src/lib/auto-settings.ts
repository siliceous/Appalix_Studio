/**
 * Sage Auto Settings — reads global + per-channel automation flags.
 *
 * Logic:
 *   global OFF  → assist mode everywhere (ignore channel settings)
 *   global ON + channel ON  → full automation for that channel
 *   global ON + channel OFF → assist mode for that channel
 */
import { supabase } from './supabase.js'

export interface WorkspaceAutoSettings {
  global_auto_enabled:  boolean
  email_auto_enabled:   boolean
  bots_auto_enabled:    boolean
  forms_auto_enabled:   boolean
  tickets_auto_enabled: boolean
}

const DEFAULTS: WorkspaceAutoSettings = {
  global_auto_enabled:  true,
  email_auto_enabled:   true,
  bots_auto_enabled:    true,
  forms_auto_enabled:   true,
  tickets_auto_enabled: true,
}

export async function getWorkspaceAutoSettings(workspaceId: string): Promise<WorkspaceAutoSettings> {
  try {
    const { data } = await supabase
      .from('sage_workspace_settings')
      .select('global_auto_enabled, email_auto_enabled, bots_auto_enabled, forms_auto_enabled, tickets_auto_enabled')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (!data) return DEFAULTS

    return {
      global_auto_enabled:  data.global_auto_enabled  ?? true,
      email_auto_enabled:   data.email_auto_enabled    ?? true,
      bots_auto_enabled:    data.bots_auto_enabled     ?? true,
      forms_auto_enabled:   data.forms_auto_enabled    ?? true,
      tickets_auto_enabled: data.tickets_auto_enabled  ?? true,
    }
  } catch {
    return DEFAULTS
  }
}

export function isFullAutomation(
  settings: WorkspaceAutoSettings,
  channel:  'email' | 'bots' | 'forms' | 'tickets',
): boolean {
  if (!settings.global_auto_enabled) return false
  const map: Record<string, keyof WorkspaceAutoSettings> = {
    email:   'email_auto_enabled',
    bots:    'bots_auto_enabled',
    forms:   'forms_auto_enabled',
    tickets: 'tickets_auto_enabled',
  }
  return !!settings[map[channel]]
}

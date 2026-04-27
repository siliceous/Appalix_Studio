import { supabase } from '../../lib/supabase.js'

export async function recordStatusEvent(params: {
  workspaceId:          string
  complianceProfileId?: string
  entityType:           'profile' | 'brand' | 'campaign' | 'document'
  entityId?:            string
  oldStatus?:           string
  newStatus:            string
  reason?:              string
  actorType:            'user' | 'admin' | 'system' | 'provider_webhook'
  actorId?:             string
  metadata?:            Record<string, unknown>
}): Promise<void> {
  const { error } = await supabase
    .from('sms_compliance_status_events' as never)
    .insert({
      workspace_id:          params.workspaceId,
      compliance_profile_id: params.complianceProfileId ?? null,
      entity_type:           params.entityType,
      entity_id:             params.entityId ?? null,
      old_status:            params.oldStatus ?? null,
      new_status:            params.newStatus,
      reason:                params.reason ?? null,
      actor_type:            params.actorType,
      actor_id:              params.actorId ?? null,
      metadata:              params.metadata ?? {},
    }) as { error: { message: string } | null }

  if (error) console.error('[smsComplianceStatusService] recordStatusEvent:', error.message)
}

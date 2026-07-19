import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function publishPresetsFromMasterWorkspace() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  console.log('[PublishPresets] Starting preset publication...')

  // Find master user accounts by email
  const masterEmails = ['info@gorank.com.au', 'sales@appalix.ai']
  const masterUserIds: string[] = []

  for (const email of masterEmails) {
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users?.users.find(u => u.email === email)
    if (user) {
      masterUserIds.push(user.id)
      console.log(`[PublishPresets] Found master user: ${email} (${user.id})`)
    }
  }

  if (masterUserIds.length === 0) {
    console.error('[PublishPresets] Could not find master users')
    return
  }

  // Get workspaces owned by master users (they have owner role in workspace_members)
  const { data: masterWorkspaceMembers } = await supabase
    .from('workspace_members')
    .select('workspace_id, user_id')
    .in('user_id', masterUserIds)
    .eq('role', 'owner')

  if (!masterWorkspaceMembers || masterWorkspaceMembers.length === 0) {
    console.error('[PublishPresets] No master workspaces found')
    return
  }

  const masterWorkspaceIds = [...new Set(masterWorkspaceMembers.map(m => m.workspace_id))]
  console.log(`[PublishPresets] Found ${masterWorkspaceIds.length} master workspaces`)

  for (const workspaceId of masterWorkspaceIds) {
    console.log(`\n[PublishPresets] Processing workspace: ${workspaceId}`)

    // Get all active actors from this workspace
    const { data: actors } = await supabase
      .from('talking_actors')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)

    console.log(`[PublishPresets] Found ${actors?.length || 0} active actors`)

    if (!actors || actors.length === 0) {
      console.log(`[PublishPresets] No actors to publish`)
      continue
    }

    // Update all actors to be global presets
    const { error: updateError, count } = await supabase
      .from('talking_actors')
      .update({ is_global: true })
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)

    if (updateError) {
      console.error(`[PublishPresets] Failed to publish:`, updateError)
    } else {
      console.log(`[PublishPresets] ✅ Published ${count} actors as global presets`)
      if (actors) {
        actors.forEach((a: any) => console.log(`  - ${a.name}`))
      }
    }
  }

  console.log('\n[PublishPresets] Done! Verifying...')

  // Verify
  const { data: allPresets } = await supabase
    .from('talking_actors')
    .select('id, name, workspace_id')
    .eq('is_global', true)

  console.log(`\n[PublishPresets] Total global presets now available: ${allPresets?.length || 0}`)
  if (allPresets) {
    allPresets.forEach((p: any) => console.log(`  - ${p.name}`))
  }
}

publishPresetsFromMasterWorkspace().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

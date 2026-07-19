import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function findActors() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: actors } = await supabase
    .from('talking_actors')
    .select('id, name, workspace_id, is_active')
    .eq('is_active', true)

  console.log(`\nTotal active actors: ${actors?.length || 0}\n`)

  const byWorkspace = new Map<string, any[]>()
  actors?.forEach(a => {
    if (!byWorkspace.has(a.workspace_id)) {
      byWorkspace.set(a.workspace_id, [])
    }
    byWorkspace.get(a.workspace_id)!.push(a)
  })

  for (const [wsId, acts] of byWorkspace) {
    const { data: wsMembers } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', wsId)
      .eq('role', 'owner')
      .single()

    const { data: user } = await supabase.auth.admin.getUserById(wsMembers?.user_id || '')
    
    console.log(`Workspace: ${wsId}`)
    console.log(`  Owner: ${user?.user_metadata?.email || user?.email || 'unknown'}`)
    console.log(`  Actors: ${acts.length}`)
    acts.forEach(a => console.log(`    - ${a.name}`))
    console.log()
  }
}

findActors().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})

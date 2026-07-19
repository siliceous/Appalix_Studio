import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function check() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Find info@gorank user
  const { data: users } = await supabase.auth.admin.listUsers()
  const infoUser = users?.users.find(u => u.email === 'info@gorank.com.au')
  
  console.log('\ninfo@gorank.com.au user:', infoUser?.id, infoUser?.email)

  if (!infoUser) {
    console.log('User not found!')
    return
  }

  // Get their workspaces
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('user_id', infoUser.id)

  console.log('\nWorkspaces for info@gorank.com.au:')
  memberships?.forEach(m => {
    console.log(`  - Workspace ${m.workspace_id}, Role: ${m.role}`)
  })

  // Get all workspace names
  const { data: allWorkspaces } = await supabase
    .from('workspaces')
    .select('id, name')

  console.log('\nAll workspaces:')
  allWorkspaces?.forEach(ws => {
    console.log(`  - ${ws.name} (${ws.id})`)
  })
}

check().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})

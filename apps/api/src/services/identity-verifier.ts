import { supabase } from '../lib/supabase.js'

export interface VerificationResult {
  success:  boolean
  email?:   string
  name?:    string
  reason?:  string
}

export interface ConversationVerification {
  email: string
  name:  string
}

/**
 * Returns the verified identity for a conversation, or null if not verified.
 */
export async function getConversationVerification(
  conversationId: string,
): Promise<ConversationVerification | null> {
  const { data } = await supabase
    .from('conversations')
    .select('verified_user_email, verified_user_name')
    .eq('id', conversationId)
    .single()

  if (!data?.verified_user_email) return null
  return { email: data.verified_user_email, name: data.verified_user_name ?? data.verified_user_email }
}

/**
 * Checks whether the provided email belongs to a registered workspace member.
 * If it does, marks the conversation as verified and returns success.
 */
export async function verifyWorkspaceMember(
  email:          string,
  workspaceId:    string,
  conversationId: string,
): Promise<VerificationResult> {
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Get all workspace member user_ids
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)

  if (!members?.length) {
    return { success: false, reason: 'No registered members found for this workspace.' }
  }

  // 2. Look up each member's auth email in parallel
  const userResults = await Promise.all(
    members.map((m) => supabase.auth.admin.getUserById(m.user_id)),
  )

  // 3. Find a matching user
  let matchedUserId: string | null = null
  for (let i = 0; i < userResults.length; i++) {
    const user = userResults[i].data?.user
    if (user?.email?.toLowerCase() === normalizedEmail) {
      matchedUserId = members[i].user_id
      break
    }
  }

  if (!matchedUserId) {
    return {
      success: false,
      reason:  `${email} is not registered as a team member on this workspace.`,
    }
  }

  // 4. Get display name from user_profiles (if set up)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', matchedUserId)
    .maybeSingle()

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : normalizedEmail.split('@')[0]

  // 5. Mark conversation as verified
  await supabase
    .from('conversations')
    .update({
      verified_user_email: normalizedEmail,
      verified_user_name:  displayName,
      verified_at:         new Date().toISOString(),
    })
    .eq('id', conversationId)

  console.log(`[identity-verifier] conversation=${conversationId} verified as ${normalizedEmail}`)

  return { success: true, email: normalizedEmail, name: displayName }
}

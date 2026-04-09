'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function saveUserName(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const firstName = (formData.get('first_name') as string | null)?.trim()
  const lastName  = (formData.get('last_name')  as string | null)?.trim() || null

  if (!firstName) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('user_profiles').upsert(
    { user_id: user.id, first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )

  redirect('/settings')
}

export async function uploadUserAvatar(
  base64: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // Decode base64 → Buffer (text-based transfer avoids binary corruption)
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length === 0) return { ok: false, error: 'Empty image data' }
  if (buffer.length > 500 * 1024) return { ok: false, error: 'Avatar must be under 500 KB' }

  const admin    = createAdminClient()
  const newPath  = `${user.id}/avatar_${Date.now()}.jpg`

  // Upload with a unique timestamped filename so CDN and Next.js image cache
  // never serve a stale/corrupt version from a previous upload.
  const { error: uploadError } = await admin.storage
    .from('user-avatars')
    .upload(newPath, buffer, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: { publicUrl } } = admin.storage
    .from('user-avatars')
    .getPublicUrl(newPath)

  // Clean up old avatar files for this user
  const { data: existing } = await admin.storage.from('user-avatars').list(user.id)
  const toDelete = (existing ?? [])
    .filter(f => f.name !== `avatar_${newPath.split('avatar_')[1]}`)
    .map(f => `${user.id}/${f.name}`)
  if (toDelete.length > 0) {
    await admin.storage.from('user-avatars').remove(toDelete)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase as any).from('user_profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (dbError) return { ok: false, error: dbError.message }

  revalidatePath('/settings')
  revalidatePath('/', 'layout')

  return { ok: true, url: publicUrl }
}

export async function saveCalendarLink(url: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const trimmed = url.trim()
  if (trimmed && !trimmed.startsWith('https://')) {
    return { ok: false, error: 'Calendar link must be a valid https:// URL' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('user_profiles').upsert(
    { user_id: user.id, calendar_link: trimmed || null, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )

  revalidatePath('/settings')
  return { ok: true }
}

export async function saveJobTitle(title: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('user_profiles').upsert(
    { user_id: user.id, job_title: title.trim() || null, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )

  revalidatePath('/settings')
  return { ok: true }
}

export async function disconnectGoogleCalendar(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const admin = createAdminClient()

  // Fetch token to revoke it
  const { data: row } = await admin
    .from('sage_integrations' as never)
    .select('config')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .maybeSingle() as unknown as { data: { config: Record<string, string> } | null }

  // Best-effort revoke with Google
  const token = row?.config?.access_token
  if (token) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' }).catch(() => {})
  }

  await admin
    .from('sage_integrations' as never)
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')

  revalidatePath('/settings')
  return { ok: true }
}

export async function removeUserAvatar(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('user_profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  revalidatePath('/settings')
  revalidatePath('/', 'layout')

  return { ok: true }
}

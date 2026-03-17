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

/**
 * Step 1 of client-side upload: get a signed upload URL so the browser can
 * PUT the blob directly to Supabase Storage (avoids server-side binary handling).
 */
export async function getAvatarUploadUrl(): Promise<{
  ok: boolean
  signedUrl?: string
  token?: string
  path?: string
  publicUrl?: string
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const admin = createAdminClient()
  const path  = `${user.id}/avatar.jpg`

  const { data, error } = await admin.storage
    .from('user-avatars')
    .createSignedUploadUrl(path)

  if (error || !data) return { ok: false, error: error?.message ?? 'Could not create upload URL' }

  const { data: { publicUrl } } = admin.storage
    .from('user-avatars')
    .getPublicUrl(path)

  return { ok: true, signedUrl: data.signedUrl, token: data.token, path, publicUrl }
}

/**
 * Step 2: after the browser has uploaded the file, save the public URL to the DB.
 */
export async function saveAvatarUrl(
  publicUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase as any).from('user_profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (dbError) return { ok: false, error: dbError.message }

  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout')

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

  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout')

  return { ok: true }
}

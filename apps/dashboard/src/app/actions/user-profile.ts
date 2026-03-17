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
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'No file provided' }
  if (!file.type.startsWith('image/')) return { ok: false, error: 'File must be an image' }
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Avatar must be under 2 MB' }

  const admin  = createAdminClient()
  const ext    = file.name.split('.').pop() ?? 'jpg'
  const path   = `${user.id}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('user-avatars')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: { publicUrl } } = admin.storage
    .from('user-avatars')
    .getPublicUrl(path)

  // Use update (not upsert) — avoids NOT NULL violation on first_name when no row exists yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase as any).from('user_profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (dbError) return { ok: false, error: dbError.message }

  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout')

  // Append timestamp to bust browser cache when re-uploading to the same path
  return { ok: true, url: `${publicUrl}?v=${Date.now()}` }
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

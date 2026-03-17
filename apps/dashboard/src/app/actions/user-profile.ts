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

  const admin = createAdminClient()
  const path  = `${user.id}/avatar.jpg`

  const { error: uploadError } = await admin.storage
    .from('user-avatars')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: { publicUrl } } = admin.storage
    .from('user-avatars')
    .getPublicUrl(path)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase as any).from('user_profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (dbError) return { ok: false, error: dbError.message }

  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout')

  return { ok: true, url: publicUrl }
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

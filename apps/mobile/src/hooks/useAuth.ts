import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeSignOut = useAuthStore((s) => s.signOut);

  const isAuthenticated = user !== null;

  async function signOut() {
    storeSignOut();
    await supabase.auth.signOut();
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    signOut,
    supabase,
  };
}

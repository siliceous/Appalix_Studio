import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { Colors } from '@/constants/colors';
import type { User, WorkspaceRole } from '@/types';

interface AuthContextValue {
  initialized: boolean;
}

const AuthContext = createContext<AuthContextValue>({ initialized: false });

export function useAuthContext() {
  return useContext(AuthContext);
}

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const isLoading = useAuthStore((s) => s.isLoading);

  async function resolveUserFromSession(userId: string, email: string) {
    // Fetch the workspace membership to get role + workspaceId
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, name')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      // User exists in auth but has no workspace membership yet
      setUser(null);
      return;
    }

    const user: User = {
      id: userId,
      email,
      role: data.role as WorkspaceRole,
      workspaceId: data.workspace_id,
      name: data.name ?? undefined,
    };
    setUser(user);
  }

  useEffect(() => {
    let mounted = true;

    // 1. Check existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        await resolveUserFromSession(session.user.id, session.user.email ?? '');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 2. Subscribe to auth state changes (sign in, sign out, token refresh)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setLoading(false);
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          await resolveUserFromSession(
            session.user.id,
            session.user.email ?? '',
          );
          setLoading(false);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand[500]} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ initialized: true }}>
      {children}
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg.primary,
  },
});

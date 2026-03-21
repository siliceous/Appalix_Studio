import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to the main app
    if (!isLoading && user) {
      router.replace('/(app)');
    }
  }, [user, isLoading, router]);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

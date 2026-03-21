// NativeWind requires importing the CSS file in the root layout
// The path is relative to this file: src/app/_layout.tsx → ../../global.css
import '../../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import {
  setupNotificationHandler,
  handleNotificationResponse,
} from '@/lib/push-notifications';

// Keep the splash screen visible until we explicitly hide it
SplashScreen.preventAutoHideAsync();

setupNotificationHandler();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen once the layout has mounted
    SplashScreen.hideAsync();

    // Listen for notification taps while app is backgrounded or closed
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryProvider>
  );
}

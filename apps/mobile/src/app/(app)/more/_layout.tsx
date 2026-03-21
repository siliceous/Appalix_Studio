import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg.secondary },
      }}
    />
  );
}

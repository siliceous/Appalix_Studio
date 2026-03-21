import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth';
import { Colors } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
  badge?: number;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Home',
    icon: 'home-outline',
    iconFocused: 'home',
  },
  {
    name: 'feed/index',
    title: 'Feed',
    icon: 'flash-outline',
    iconFocused: 'flash',
    badge: 0,
  },
  {
    name: 'conversations/index',
    title: 'Inbox',
    icon: 'chatbubbles-outline',
    iconFocused: 'chatbubbles',
  },
  {
    name: 'deals/index',
    title: 'Deals',
    icon: 'briefcase-outline',
    iconFocused: 'briefcase',
  },
  {
    name: 'more',
    title: 'More',
    icon: 'grid-outline',
    iconFocused: 'grid',
  },
];

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brand[500],
        tabBarInactiveTintColor: Colors.text.secondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <View>
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={size}
                  color={color}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
    height: 60,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

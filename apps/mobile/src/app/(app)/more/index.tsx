import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuRow {
  label: string;
  icon: IoniconsName;
  iconColor: string;
  route: string;
}

const MENU_ROWS: MenuRow[] = [
  { label: 'Tickets', icon: 'ticket-outline', iconColor: '#8b5cf6', route: '/(app)/more/tickets' },
  { label: 'Contacts', icon: 'people-outline', iconColor: '#3b82f6', route: '/(app)/more/contacts' },
  { label: 'Notifications', icon: 'notifications-outline', iconColor: '#f59e0b', route: '/(app)/more/notifications' },
  { label: 'Settings', icon: 'settings-outline', iconColor: '#6b7280', route: '/(app)/more/settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const storeSignOut = useAuthStore((s) => s.signOut);

  async function handleSignOut() {
    storeSignOut();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role}</Text>
            </View>
          </View>
        </View>

        {/* Menu rows */}
        <View style={styles.menuSection}>
          {MENU_ROWS.map((row, index) => (
            <Pressable
              key={row.route}
              style={({ pressed }) => [
                styles.menuRow,
                index === 0 && styles.menuRowFirst,
                index === MENU_ROWS.length - 1 && styles.menuRowLast,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push(row.route as never)}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${row.iconColor}18` }]}>
                <Ionicons name={row.icon} size={18} color={row.iconColor} />
              </View>
              <Text style={styles.menuLabel}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.text.muted} />
            </Pressable>
          ))}
        </View>

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text.primary },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.brand[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  profileEmail: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  roleBadge: {
    marginTop: 5,
    backgroundColor: `${Colors.brand[500]}18`,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  roleText: { fontSize: 11, fontWeight: '600', color: Colors.brand[500], textTransform: 'capitalize' },
  menuSection: {
    marginHorizontal: 16,
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  menuRowFirst: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  menuRowLast: { borderBottomWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  pressed: { opacity: 0.8 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text.primary, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    gap: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
});

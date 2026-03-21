import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';
import { registerPushToken } from '@/lib/api';
import { Colors } from '@/constants/colors';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const storeSignOut = useAuthStore((s) => s.signOut);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    // Check current permission status
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPushEnabled(status === 'granted');
    });
  }, []);

  async function handlePushToggle(value: boolean) {
    if (pushLoading) return;
    setPushLoading(true);

    if (value) {
      const token = await registerForPushNotificationsAsync();
      if (token && user) {
        await registerPushToken(user.id, token).catch(console.error);
        setPushEnabled(true);
      } else {
        // Permission denied — prompt user to open Settings
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
    } else {
      // Can't programmatically revoke; direct user to settings
      Linking.openSettings();
    }

    setPushLoading(false);
  }

  async function handleSignOut() {
    storeSignOut();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  const appVersion =
    Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile section */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role}</Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={[styles.rowIcon, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="notifications-outline" size={16} color="#f59e0b" />
              </View>
              <Text style={styles.rowLabel}>Push Notifications</Text>
              <Switch
                value={pushEnabled}
                onValueChange={handlePushToggle}
                trackColor={{ false: Colors.border, true: Colors.brand[500] }}
                thumbColor="#ffffff"
                disabled={pushLoading}
              />
            </View>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Legal</Text>
          <View style={styles.settingsCard}>
            <Pressable
              style={({ pressed }) => [styles.settingsRow, styles.rowBorder, pressed && styles.pressed]}
              onPress={() => Linking.openURL('https://appalix.com/privacy')}
            >
              <View style={[styles.rowIcon, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#8b5cf6" />
              </View>
              <Text style={styles.rowLabel}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.text.muted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
              onPress={() => Linking.openURL('https://appalix.com/terms')}
            >
              <View style={[styles.rowIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="document-text-outline" size={16} color="#3b82f6" />
              </View>
              <Text style={styles.rowLabel}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.text.muted} />
            </Pressable>
          </View>
        </View>

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* App version */}
        <Text style={styles.versionText}>Appalix v{appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: { padding: 4 },
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
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
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.brand[500],
    textTransform: 'capitalize',
  },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.text.primary },
  pressed: { opacity: 0.8 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    gap: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 32,
  },
});

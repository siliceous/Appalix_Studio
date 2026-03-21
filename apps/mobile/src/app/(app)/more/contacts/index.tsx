import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth';
import { fetchContacts } from '@/lib/api';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { SageContact } from '@/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

// Deterministic colour based on name character codes
function avatarColor(name: string): string {
  const COLORS = ['#15A4AE', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function ContactsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contacts', user?.workspaceId],
    queryFn: () => fetchContacts(user!.workspaceId),
    enabled: !!user,
  });

  const filteredData = (data ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  });

  const renderContact = ({ item }: { item: SageContact }) => {
    const initials = getInitials(item.name);
    const bgColor = avatarColor(item.name);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => router.push(`/(app)/more/contacts/${item.id}`)}
      >
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.company && (
            <Text style={styles.contactCompany}>{item.company}</Text>
          )}
          {item.email && (
            <Text style={styles.contactEmail} numberOfLines={1}>{item.email}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.text.muted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Contacts</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.text.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts…"
          placeholderTextColor={Colors.text.muted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? (
        <View>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLoader key={i} width="100%" height={64} borderRadius={0} style={styles.skelItem} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={Colors.brand[500]}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
          contentContainerStyle={!filteredData.length ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.text.muted} />
              <Text style={styles.emptyTitle}>No contacts found</Text>
            </View>
          }
        />
      )}
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text.primary },
  skelItem: { marginVertical: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  pressed: { opacity: 0.8 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cardBody: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '600', color: Colors.text.primary },
  contactCompany: { fontSize: 12, color: Colors.text.secondary, marginTop: 1 },
  contactEmail: { fontSize: 12, color: Colors.text.muted, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 72 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.secondary, marginTop: 12 },
});

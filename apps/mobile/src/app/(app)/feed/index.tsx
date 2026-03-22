import React, { useState, useCallback } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/auth';
import { fetchFeedItems, actionFeedItem } from '@/lib/api';
import { FeedCard } from '@/components/feed/FeedCard';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { FeedItem } from '@/types';

type FilterTab = 'all' | 'bot' | 'email' | 'form' | 'ticket';

const FILTER_ICONS: { key: Exclude<FilterTab, 'all'>; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }[] = [
  { key: 'bot',    icon: 'hardware-chip-outline', color: '#15A4AE' },
  { key: 'email',  icon: 'mail-outline',          color: '#3b82f6' },
  { key: 'form',   icon: 'document-text-outline', color: '#8b5cf6' },
  { key: 'ticket', icon: 'ticket-outline',         color: '#f59e0b' },
];

export default function FeedScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['feed', filter, user?.workspaceId],
    queryFn: () => fetchFeedItems(
      user!.workspaceId,
      user!.id,
      user!.role,
      filter === 'all' ? null : filter,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    ),
    enabled: !!user,
  });

  const filteredData = (data ?? []).filter((item: FeedItem) => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.contactName?.toLowerCase().includes(q) ||
        item.contactEmail?.toLowerCase().includes(q) ||
        item.company?.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleAction(id: string, action: 'ignore' | 'assign') {
    await Haptics.impactAsync(
      action === 'ignore'
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
    await actionFeedItem(id, action);
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedCard
        item={item}
        onPress={() => router.push(`/(app)/feed/${item.id}?type=${item.type}`)}
        onReply={() => router.push(`/(app)/feed/${item.id}?type=${item.type}`)}
        onAssign={() => handleAction(item.id, 'assign')}
        onIgnore={() => handleAction(item.id, 'ignore')}
      />
    ),
    [router],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Activity Feed</Text>
        <View style={styles.filterIcons}>
          {FILTER_ICONS.map(({ key, icon, color }) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setFilter(active ? 'all' : key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[styles.filterIconBtn, active && { backgroundColor: color + '22', borderColor: color + '55' }]}
              >
                <Ionicons name={icon} size={18} color={active ? color : Colors.text.muted} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.text.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, company…"
          placeholderTextColor={Colors.text.muted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Feed list */}
      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} width="100%" height={110} borderRadius={14} style={styles.skelItem} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={Colors.brand[500]}
            />
          }
          contentContainerStyle={
            filteredData.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.brand[500]} />
              <Text style={styles.emptyTitle}>You're all caught up</Text>
              <Text style={styles.emptySubtitle}>No items match the current filter.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text.primary, flex: 1 },
  filterIcons: { flexDirection: 'row', gap: 6 },
  filterIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg.card,
  },
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
  listContent: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.primary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: Colors.text.secondary, marginTop: 4 },
  skeletonWrap: { paddingTop: 8 },
  skelItem: { marginHorizontal: 16, marginVertical: 5 },
});

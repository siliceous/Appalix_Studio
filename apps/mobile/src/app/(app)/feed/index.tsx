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
import { fetchFeed, actionFeedItem } from '@/lib/api';
import { FeedCard } from '@/components/feed/FeedCard';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { FeedItem } from '@/types';

type FilterTab = 'all' | 'bot' | 'email' | 'form' | 'ticket';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bot', label: 'Bots' },
  { key: 'email', label: 'Email' },
  { key: 'form', label: 'Forms' },
  { key: 'ticket', label: 'Tickets' },
];

export default function FeedScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['feed', filter, user?.workspaceId],
    queryFn: () => fetchFeed(user!.workspaceId, user!.role, user!.id),
    enabled: !!user,
  });

  const filteredData = (data ?? []).filter((item) => {
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
        onPress={() => router.push(`/(app)/feed/${item.id}`)}
        onReply={() => router.push(`/(app)/feed/${item.id}`)}
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

      {/* Filter tabs */}
      <FlatList
        data={TABS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(t) => t.key}
        contentContainerStyle={styles.tabs}
        renderItem={({ item: tab }) => (
          <Pressable
            onPress={() => setFilter(tab.key)}
            style={[styles.tab, filter === tab.key && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                filter === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        )}
      />

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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
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
  tabs: { paddingHorizontal: 14, paddingBottom: 8, gap: 6 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  tabTextActive: { color: '#ffffff' },
  listContent: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.primary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: Colors.text.secondary, marginTop: 4 },
  skeletonWrap: { paddingTop: 8 },
  skelItem: { marginHorizontal: 16, marginVertical: 5 },
});

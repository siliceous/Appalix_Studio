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
import { fetchFeed } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { FeedItem } from '@/types';

type FilterTab = 'all' | 'bot' | 'email' | 'form';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bot', label: 'Bot' },
  { key: 'email', label: 'Email' },
  { key: 'form', label: 'Form' },
];

const TYPE_ICONS: Record<FeedItem['type'], React.ComponentProps<typeof Ionicons>['name']> = {
  form: 'document-text-outline',
  bot: 'hardware-chip-outline',
  email: 'mail-outline',
  ticket: 'ticket-outline',
};

const TYPE_COLORS: Record<FeedItem['type'], string> = {
  form: '#8b5cf6',
  bot: '#15A4AE',
  email: '#3b82f6',
  ticket: '#f59e0b',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ConversationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['conversations', filter, user?.workspaceId],
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
        item.company?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderItem = ({ item }: { item: FeedItem }) => {
    const iconColor = TYPE_COLORS[item.type];
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => router.push(`/(app)/conversations/${item.id}`)}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={TYPE_ICONS[item.type]} size={18} color={iconColor} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.contactName ?? 'Unknown'}
            </Text>
            <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          {item.summary ? (
            <Text style={styles.cardSummary} numberOfLines={1}>
              {item.summary}
            </Text>
          ) : null}
          <View style={styles.cardBottom}>
            {item.company ? (
              <Text style={styles.cardCompany} numberOfLines={1}>
                {item.company}
              </Text>
            ) : null}
            <PriorityBadge priority={item.priority} size="sm" />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.text.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations…"
          placeholderTextColor={Colors.text.muted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Tabs */}
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
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        )}
      />

      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} width="100%" height={72} borderRadius={0} style={styles.skelItem} />
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
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={filteredData.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.text.muted} />
              <Text style={styles.emptyTitle}>No conversations</Text>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.8 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, flex: 1 },
  cardTime: { fontSize: 12, color: Colors.text.muted, marginLeft: 8 },
  cardSummary: { fontSize: 13, color: Colors.text.secondary, marginBottom: 5 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCompany: { fontSize: 12, color: Colors.text.muted, flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 70 },
  skeletonWrap: {},
  skelItem: { marginVertical: 1 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.secondary, marginTop: 12 },
});

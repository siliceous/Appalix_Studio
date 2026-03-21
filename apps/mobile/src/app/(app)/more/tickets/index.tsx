import React, { useState } from 'react';
import {
  View,
  Text,
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
import { fetchTickets } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { SageTicket, SageTicketStatus } from '@/types';

type FilterTab = SageTicketStatus | 'all';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Pending' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TicketsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<FilterTab>('all');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['tickets', user?.workspaceId, filter],
    queryFn: () =>
      fetchTickets(
        user!.workspaceId,
        filter === 'all' ? undefined : filter,
      ),
    enabled: !!user,
  });

  const renderTicket = ({ item }: { item: SageTicket }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/(app)/more/tickets/${item.id}`)}
    >
      <View style={styles.cardTop}>
        <View style={styles.statusDot}>
          <View
            style={[
              styles.dot,
              { backgroundColor: Colors.status[item.status] },
            ]}
          />
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardTime}>{timeAgo(item.updatedAt)}</Text>
      </View>
      {(item.name || item.email) && (
        <Text style={styles.cardContact} numberOfLines={1}>
          {item.name ?? item.email}
        </Text>
      )}
      <View style={styles.cardBottom}>
        <PriorityBadge priority={item.priority} size="sm" />
        <StatusBadge status={item.status} size="sm" />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Tickets</Text>
      </View>

      {/* Filter Tabs */}
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
        <View style={styles.skelWrap}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} width="100%" height={84} borderRadius={14} style={styles.skelItem} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={Colors.brand[500]}
            />
          }
          contentContainerStyle={!data?.length ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="ticket-outline" size={48} color={Colors.text.muted} />
              <Text style={styles.emptyTitle}>No tickets</Text>
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
  tabTextActive: { color: '#fff' },
  skelWrap: { paddingTop: 4 },
  skelItem: { marginHorizontal: 16, marginVertical: 5 },
  listContent: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.secondary, marginTop: 12 },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: { opacity: 0.85 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot: { width: 20, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  cardTime: { fontSize: 11, color: Colors.text.muted },
  cardContact: { fontSize: 12, color: Colors.text.secondary, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', gap: 6 },
});

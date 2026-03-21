import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { fetchHomeDashboard, fetchFeed } from '@/lib/api';
import { FeedCard } from '@/components/feed/FeedCard';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { FeedItem } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

function KpiCard({ label, value, icon, color }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color }]}>
      <View style={[styles.kpiIconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const dashQuery = useQuery({
    queryKey: ['home-dashboard', user?.workspaceId, user?.id],
    queryFn: () =>
      fetchHomeDashboard(user!.workspaceId, user!.id, user!.role),
    enabled: !!user,
  });

  const feedQuery = useQuery({
    queryKey: ['feed', 'home', user?.workspaceId],
    queryFn: () => fetchFeed(user!.workspaceId, user!.role, user!.id),
    enabled: !!user,
  });

  const onRefresh = useCallback(() => {
    dashQuery.refetch();
    feedQuery.refetch();
  }, [dashQuery, feedQuery]);

  const isRefreshing = dashQuery.isFetching || feedQuery.isFetching;
  const dash = dashQuery.data;
  const topFeed = feedQuery.data?.slice(0, 3) ?? [];

  const renderFeedCard = ({ item }: { item: FeedItem }) => (
    <FeedCard
      item={item}
      onPress={() => router.push(`/(app)/feed/${item.id}`)}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{user?.name ?? user?.email ?? 'there'}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/more/notifications')}
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.text.primary} />
          </Pressable>
        </View>

        {/* KPI Strip */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiStrip}
        >
          {dashQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLoader key={i} width={100} height={88} borderRadius={14} style={styles.kpiSkeleton} />
            ))
          ) : (
            <>
              <KpiCard
                label="New Leads"
                value={dash?.newLeadsToday ?? 0}
                icon="people-outline"
                color={Colors.brand[500]}
              />
              <KpiCard
                label="Open Tickets"
                value={dash?.openTickets ?? 0}
                icon="ticket-outline"
                color="#8b5cf6"
              />
              <KpiCard
                label="Active Deals"
                value={dash?.activeDeals ?? 0}
                icon="briefcase-outline"
                color="#3b82f6"
              />
              <KpiCard
                label="Unread"
                value={dash?.unreadConversations ?? 0}
                icon="chatbubbles-outline"
                color="#f59e0b"
              />
            </>
          )}
        </ScrollView>

        {/* AI Priority */}
        <Text style={styles.sectionTitle}>AI Priority</Text>
        <View style={styles.priorityRow}>
          {dashQuery.isLoading ? (
            <>
              <SkeletonLoader width={90} height={36} borderRadius={20} />
              <SkeletonLoader width={90} height={36} borderRadius={20} />
              <SkeletonLoader width={90} height={36} borderRadius={20} />
            </>
          ) : (
            <>
              <View style={[styles.priorityPill, { backgroundColor: Colors.priorityBg.high }]}>
                <View style={[styles.priorityDot, { backgroundColor: Colors.priority.high }]} />
                <Text style={[styles.priorityText, { color: Colors.priority.high }]}>
                  High · {dash?.highPriorityCount ?? 0}
                </Text>
              </View>
              <View style={[styles.priorityPill, { backgroundColor: Colors.priorityBg.medium }]}>
                <View style={[styles.priorityDot, { backgroundColor: Colors.priority.medium }]} />
                <Text style={[styles.priorityText, { color: Colors.priority.medium }]}>
                  Medium · {dash?.mediumPriorityCount ?? 0}
                </Text>
              </View>
              <View style={[styles.priorityPill, { backgroundColor: Colors.priorityBg.low }]}>
                <View style={[styles.priorityDot, { backgroundColor: Colors.priority.low }]} />
                <Text style={[styles.priorityText, { color: Colors.priority.low }]}>
                  Low · {dash?.lowPriorityCount ?? 0}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Needs Action */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Needs Action</Text>
          <Pressable onPress={() => router.push('/(app)/feed')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {feedQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader
              key={i}
              width="100%"
              height={100}
              borderRadius={14}
              style={styles.feedSkeleton}
            />
          ))
        ) : topFeed.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={40} color={Colors.brand[500]} />
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        ) : (
          <FlatList
            data={topFeed}
            keyExtractor={(item) => item.id}
            renderItem={renderFeedCard}
            scrollEnabled={false}
          />
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  greeting: { fontSize: 14, color: Colors.text.secondary },
  name: { fontSize: 22, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  seeAll: { fontSize: 13, color: Colors.brand[500], fontWeight: '500' },
  kpiStrip: { paddingHorizontal: 16, gap: 10 },
  kpiCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 14,
    width: 110,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  kpiSkeleton: { marginHorizontal: 5 },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiValue: { fontSize: 22, fontWeight: '700', color: Colors.text.primary },
  kpiLabel: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  priorityRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 13, fontWeight: '600' },
  feedSkeleton: { marginHorizontal: 16, marginVertical: 5 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: Colors.text.secondary, marginTop: 8 },
  bottomPad: { height: 24 },
});

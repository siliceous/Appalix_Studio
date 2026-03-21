import React from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { Notification } from '@/types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  function handleNotificationPress(notification: Notification) {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    if (notification.deepLink) {
      router.push(notification.deepLink as never);
    }
  }

  const renderNotification = ({ item }: { item: Notification }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        !item.read && styles.cardUnread,
        pressed && styles.pressed,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name="notifications-outline"
          size={20}
          color={item.read ? Colors.text.muted : Colors.brand[500]}
        />
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.content}>
        <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable
          onPress={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
        >
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} width="100%" height={72} borderRadius={0} style={styles.skelItem} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={Colors.brand[500]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={!data?.length ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.text.muted} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>You're all caught up!</Text>
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
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: Colors.text.primary },
  markAllText: { fontSize: 13, color: Colors.brand[500], fontWeight: '500' },
  skelItem: { marginVertical: 1 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cardUnread: { backgroundColor: `${Colors.brand[500]}08` },
  pressed: { opacity: 0.85 },
  iconWrap: { position: 'relative', width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.brand[500],
    borderWidth: 2,
    borderColor: Colors.bg.card,
  },
  content: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: Colors.text.secondary, marginBottom: 3 },
  notifTitleUnread: { color: Colors.text.primary, fontWeight: '600' },
  notifBody: { fontSize: 13, color: Colors.text.secondary, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: Colors.text.muted },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.secondary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: Colors.text.muted, marginTop: 4 },
});

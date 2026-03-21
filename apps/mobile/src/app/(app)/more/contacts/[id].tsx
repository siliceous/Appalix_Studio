import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { fetchContact, fetchDeals, fetchTickets } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useRole } from '@/hooks/useRole';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';

function avatarColor(name: string): string {
  const COLORS = ['#15A4AE', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { canAssign } = useRole();

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => fetchContact(id),
    enabled: !!id,
  });

  // Linked deals — filter client-side by contactId
  const { data: allDeals } = useQuery({
    queryKey: ['deals', user?.workspaceId],
    queryFn: () => fetchDeals(user!.workspaceId),
    enabled: !!user,
    select: (data) => data.filter((d) => d.contactId === id),
  });

  // Linked tickets — filter client-side by contactId
  const { data: allTickets } = useQuery({
    queryKey: ['tickets', user?.workspaceId],
    queryFn: () => fetchTickets(user!.workspaceId),
    enabled: !!user,
    select: (data) => data.filter((t) => t.contactId === id),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.pad}>
          <SkeletonLoader width="60%" height={24} borderRadius={6} style={styles.skel} />
          <SkeletonLoader width="100%" height={180} borderRadius={12} style={styles.skel} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !contact) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Failed to load contact.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initials = contact.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const bgColor = avatarColor(contact.name);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Contact</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: bgColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.contactName}>{contact.name}</Text>
          {contact.company && (
            <Text style={styles.contactCompany}>{contact.company}</Text>
          )}
        </View>

        {/* Contact rows */}
        <View style={styles.infoSection}>
          {contact.email && (
            <Pressable
              style={styles.infoRow}
              onPress={() => Linking.openURL(`mailto:${contact.email}`)}
            >
              <View style={[styles.rowIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="mail-outline" size={16} color="#3b82f6" />
              </View>
              <Text style={styles.infoValue}>{contact.email}</Text>
              <Ionicons name="arrow-forward-outline" size={14} color={Colors.brand[500]} />
            </Pressable>
          )}
          {contact.phone && (
            <Pressable
              style={styles.infoRow}
              onPress={() => Linking.openURL(`tel:${contact.phone}`)}
            >
              <View style={[styles.rowIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="call-outline" size={16} color="#22c55e" />
              </View>
              <Text style={styles.infoValue}>{contact.phone}</Text>
              <Ionicons name="arrow-forward-outline" size={14} color={Colors.brand[500]} />
            </Pressable>
          )}
        </View>

        {/* Linked Deals */}
        {(allDeals ?? []).length > 0 && (
          <View style={styles.linkedSection}>
            <Text style={styles.sectionTitle}>Linked Deals</Text>
            {(allDeals ?? []).map((deal) => (
              <Pressable
                key={deal.id}
                style={({ pressed }) => [styles.linkedCard, pressed && styles.pressed]}
                onPress={() => router.push(`/(app)/deals/${deal.id}`)}
              >
                <Ionicons name="briefcase-outline" size={14} color={Colors.text.secondary} />
                <Text style={styles.linkedTitle} numberOfLines={1}>{deal.title}</Text>
                {deal.priority && <PriorityBadge priority={deal.priority} size="sm" />}
              </Pressable>
            ))}
          </View>
        )}

        {/* Linked Tickets */}
        {(allTickets ?? []).length > 0 && (
          <View style={styles.linkedSection}>
            <Text style={styles.sectionTitle}>Linked Tickets</Text>
            {(allTickets ?? []).map((ticket) => (
              <Pressable
                key={ticket.id}
                style={({ pressed }) => [styles.linkedCard, pressed && styles.pressed]}
                onPress={() => router.push(`/(app)/more/tickets/${ticket.id}`)}
              >
                <Ionicons name="ticket-outline" size={14} color={Colors.text.secondary} />
                <Text style={styles.linkedTitle} numberOfLines={1}>{ticket.title}</Text>
                <StatusBadge status={ticket.status} size="sm" />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        {contact.phone && (
          <Pressable
            style={styles.actionBarBtn}
            onPress={() => Linking.openURL(`tel:${contact.phone}`)}
          >
            <Ionicons name="call-outline" size={18} color="#22c55e" />
            <Text style={[styles.actionBarText, { color: '#22c55e' }]}>Call</Text>
          </Pressable>
        )}
        {contact.phone && <View style={styles.actionDivider} />}
        {contact.email && (
          <Pressable
            style={styles.actionBarBtn}
            onPress={() => Linking.openURL(`mailto:${contact.email}`)}
          >
            <Ionicons name="mail-outline" size={18} color={Colors.brand[500]} />
            <Text style={[styles.actionBarText, { color: Colors.brand[500] }]}>Email</Text>
          </Pressable>
        )}
        {contact.email && <View style={styles.actionDivider} />}
        <Pressable style={styles.actionBarBtn}>
          <Ionicons name="create-outline" size={18} color={Colors.text.secondary} />
          <Text style={styles.actionBarText}>Add Note</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  pad: { padding: 16 },
  skel: { marginBottom: 12 },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 14, color: '#ef4444' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  scroll: { flex: 1 },
  profileSection: {
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  contactName: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  contactCompany: { fontSize: 14, color: Colors.text.secondary, marginTop: 3 },
  infoSection: {
    backgroundColor: Colors.bg.card,
    marginBottom: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoValue: { flex: 1, fontSize: 14, color: Colors.text.primary },
  linkedSection: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  linkedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { opacity: 0.8 },
  linkedTitle: { flex: 1, fontSize: 13, color: Colors.text.primary },
  bottomPad: { height: 24 },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  actionBarBtn: { flex: 1, alignItems: 'center', gap: 4 },
  actionBarText: { fontSize: 12, fontWeight: '500', color: Colors.text.secondary },
  actionDivider: { width: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
});

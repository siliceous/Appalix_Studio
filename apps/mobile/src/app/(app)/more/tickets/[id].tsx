import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchTicket,
  updateTicketStatus,
  assignTicket,
  actionFeedItem,
} from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import { STATUS_LABELS } from '@/constants/config';
import type { SageTicketStatus } from '@/types';

const STATUS_OPTIONS: SageTicketStatus[] = ['open', 'in_progress', 'pending', 'resolved', 'closed'];

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id),
    enabled: !!id,
  });

  const changeStatus = useMutation({
    mutationFn: (status: SageTicketStatus) => updateTicketStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setStatusPickerVisible(false);
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.pad}>
          <SkeletonLoader width="70%" height={24} borderRadius={6} style={styles.skel} />
          <SkeletonLoader width="50%" height={18} borderRadius={6} style={styles.skel} />
          <SkeletonLoader width="100%" height={120} borderRadius={12} style={styles.skel} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !ticket) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Failed to load ticket.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Ticket Detail</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Subject & contact */}
        <View style={styles.titleSection}>
          <Text style={styles.subject}>{ticket.title}</Text>
          {(ticket.name || ticket.email || ticket.phone) && (
            <View style={styles.contactRow}>
              {ticket.name && (
                <View style={styles.contactPill}>
                  <Ionicons name="person-outline" size={13} color={Colors.text.secondary} />
                  <Text style={styles.contactPillText}>{ticket.name}</Text>
                </View>
              )}
              {ticket.email && (
                <View style={styles.contactPill}>
                  <Ionicons name="mail-outline" size={13} color={Colors.text.secondary} />
                  <Text style={styles.contactPillText}>{ticket.email}</Text>
                </View>
              )}
              {ticket.phone && (
                <View style={styles.contactPill}>
                  <Ionicons name="call-outline" size={13} color={Colors.text.secondary} />
                  <Text style={styles.contactPillText}>{ticket.phone}</Text>
                </View>
              )}
            </View>
          )}
          {/* Badges */}
          <View style={styles.badgeRow}>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </View>
        </View>

        {/* Description */}
        {ticket.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Message</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{ticket.description}</Text>
            </View>
          </View>
        )}

        {/* Activity Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: Colors.status[ticket.status] }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Ticket created</Text>
                <Text style={styles.timelineDate}>
                  {new Date(ticket.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
            {ticket.updatedAt !== ticket.createdAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: Colors.brand[500] }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Last updated</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        <Pressable style={styles.actionBarBtn}>
          <Ionicons name="arrow-undo-outline" size={18} color={Colors.brand[500]} />
          <Text style={[styles.actionBarText, { color: Colors.brand[500] }]}>Reply</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable style={styles.actionBarBtn}>
          <Ionicons name="person-add-outline" size={18} color={Colors.text.secondary} />
          <Text style={styles.actionBarText}>Assign</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable
          style={styles.actionBarBtn}
          onPress={() => setStatusPickerVisible(true)}
        >
          <Ionicons name="refresh-outline" size={18} color={Colors.text.secondary} />
          <Text style={styles.actionBarText}>Status</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable
          style={styles.actionBarBtn}
          onPress={() => changeStatus.mutate('open')}
        >
          <Ionicons name="arrow-up-circle-outline" size={18} color="#ef4444" />
          <Text style={[styles.actionBarText, { color: '#ef4444' }]}>Escalate</Text>
        </Pressable>
      </View>

      {/* Status Picker Modal */}
      <Modal
        visible={statusPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStatusPickerVisible(false)}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setStatusPickerVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Change Status</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={STATUS_OPTIONS}
            keyExtractor={(s) => s}
            renderItem={({ item: status }) => (
              <Pressable
                style={[
                  styles.statusItem,
                  status === ticket.status && styles.statusItemActive,
                ]}
                onPress={() => changeStatus.mutate(status)}
              >
                <View style={[styles.statusDot, { backgroundColor: Colors.status[status] }]} />
                <Text
                  style={[
                    styles.statusItemText,
                    status === ticket.status && { color: Colors.brand[500], fontWeight: '600' },
                  ]}
                >
                  {STATUS_LABELS[status]}
                </Text>
                {status === ticket.status && (
                  <Ionicons name="checkmark" size={18} color={Colors.brand[500]} />
                )}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
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
  titleSection: {
    backgroundColor: Colors.bg.card,
    padding: 16,
    marginBottom: 1,
  },
  subject: { fontSize: 18, fontWeight: '700', color: Colors.text.primary, marginBottom: 10 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bg.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  contactPillText: { fontSize: 12, color: Colors.text.secondary },
  badgeRow: { flexDirection: 'row', gap: 6 },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  messageCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.border,
  },
  messageText: { fontSize: 14, color: Colors.text.secondary, lineHeight: 20 },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  timelineContent: {},
  timelineTitle: { fontSize: 13, fontWeight: '500', color: Colors.text.primary },
  timelineDate: { fontSize: 12, color: Colors.text.muted, marginTop: 2 },
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  modalCancel: { fontSize: 15, color: Colors.text.secondary, width: 60 },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  statusItemActive: { backgroundColor: `${Colors.brand[500]}0D` },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusItemText: { flex: 1, fontSize: 15, color: Colors.text.primary },
});

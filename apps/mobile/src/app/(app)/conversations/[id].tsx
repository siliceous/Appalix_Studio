import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { fetchFeedItem, actionFeedItem } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [replyVisible, setReplyVisible] = useState(false);
  const [replyText, setReplyText] = useState('');

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['feed-item', id],
    queryFn: () => fetchFeedItem(id),
    enabled: !!id,
  });

  const actionMutation = useMutation({
    mutationFn: ({ action }: { action: Parameters<typeof actionFeedItem>[1] }) =>
      actionFeedItem(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['feed-item', id] });
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.pad}>
          <SkeletonLoader width="60%" height={24} borderRadius={6} style={styles.skel} />
          <SkeletonLoader width="100%" height={120} borderRadius={12} style={styles.skel} />
          <SkeletonLoader width="100%" height={200} borderRadius={12} style={styles.skel} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Failed to load conversation.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
          </Pressable>
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {item.contactName ?? 'Unknown'}
            </Text>
            <Text style={styles.headerSub}>{item.type} · {item.source ?? 'unknown source'}</Text>
          </View>
          <PriorityBadge priority={item.priority} size="sm" />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* AI Summary */}
          {item.summary && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles" size={16} color={Colors.brand[500]} />
                <Text style={styles.summaryLabel}>AI Summary</Text>
              </View>
              <Text style={styles.summaryText}>{item.summary}</Text>
            </View>
          )}

          {/* Extracted Data */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extracted Info</Text>
            <View style={styles.infoGrid}>
              {[
                { icon: 'person-outline' as const, label: 'Name', value: item.contactName },
                { icon: 'mail-outline' as const, label: 'Email', value: item.contactEmail },
                { icon: 'call-outline' as const, label: 'Phone', value: item.contactPhone },
                { icon: 'business-outline' as const, label: 'Company', value: item.company },
                { icon: 'link-outline' as const, label: 'Source', value: item.source },
              ]
                .filter((r) => r.value)
                .map((row) => (
                  <View key={row.label} style={styles.infoRow}>
                    <Ionicons name={row.icon} size={14} color={Colors.text.muted} />
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {row.value}
                    </Text>
                  </View>
                ))}
            </View>
          </View>

          {/* Timestamp */}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={Colors.text.muted} />
            <Text style={styles.metaText}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>

          <View style={styles.bottomPad} />
        </ScrollView>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <Pressable style={styles.actionBarBtn} onPress={() => setReplyVisible(true)}>
            <Ionicons name="arrow-undo-outline" size={18} color={Colors.brand[500]} />
            <Text style={[styles.actionBarText, { color: Colors.brand[500] }]}>Reply</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable style={styles.actionBarBtn} onPress={() => actionMutation.mutate({ action: 'assign' })}>
            <Ionicons name="person-add-outline" size={18} color={Colors.text.secondary} />
            <Text style={styles.actionBarText}>Assign</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable style={styles.actionBarBtn} onPress={() => actionMutation.mutate({ action: 'create_deal' })}>
            <Ionicons name="briefcase-outline" size={18} color={Colors.text.secondary} />
            <Text style={styles.actionBarText}>Add Deal</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable style={styles.actionBarBtn} onPress={() => actionMutation.mutate({ action: 'create_ticket' })}>
            <Ionicons name="ticket-outline" size={18} color={Colors.text.secondary} />
            <Text style={styles.actionBarText}>Ticket</Text>
          </Pressable>
        </View>

        {/* Reply Modal */}
        <Modal
          visible={replyVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setReplyVisible(false)}
        >
          <SafeAreaView style={styles.safe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setReplyVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Reply</Text>
              <Pressable
                onPress={() => {
                  actionMutation.mutate({ action: 'reply' });
                  setReplyVisible(false);
                }}
              >
                <Text style={styles.modalSend}>Send</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.replyInput}
              placeholder="Write your reply…"
              placeholderTextColor={Colors.text.muted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  flex: { flex: 1 },
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
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  headerSub: { fontSize: 12, color: Colors.text.secondary, textTransform: 'capitalize' },
  scroll: { flex: 1 },
  summaryCard: {
    margin: 16,
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brand[500],
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: Colors.brand[500] },
  summaryText: { fontSize: 14, color: Colors.text.secondary, lineHeight: 20 },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoGrid: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  infoLabel: { fontSize: 13, color: Colors.text.muted, width: 60 },
  infoValue: { fontSize: 13, color: Colors.text.primary, flex: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 4,
  },
  metaText: { fontSize: 12, color: Colors.text.muted },
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
  modalCancel: { fontSize: 15, color: Colors.text.secondary },
  modalSend: { fontSize: 15, fontWeight: '600', color: Colors.brand[500] },
  replyInput: {
    flex: 1,
    padding: 20,
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
});

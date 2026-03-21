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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { fetchFeedItem, actionFeedItem, assignTicket } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Button } from '@/components/ui/Button';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';

export default function FeedItemDetailScreen() {
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
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['feed-item', id] });
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
          </Pressable>
        </View>
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
          <Text style={styles.errorText}>Failed to load item.</Text>
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
        {/* Custom Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
          </Pressable>
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {item.contactName ?? 'Unknown'}
            </Text>
            <Text style={styles.headerSub}>{item.type}</Text>
          </View>
          <PriorityBadge priority={item.priority} size="sm" />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* AI Summary Card */}
          {item.summary && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles" size={16} color={Colors.brand[500]} />
                <Text style={styles.summaryLabel}>AI Summary</Text>
              </View>
              <Text style={styles.summaryText}>{item.summary}</Text>
            </View>
          )}

          {/* Extracted Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Contact Info</Text>
            <View style={styles.pillRow}>
              {item.contactName && (
                <View style={styles.infoPill}>
                  <Ionicons name="person-outline" size={13} color={Colors.text.secondary} />
                  <Text style={styles.infoPillText}>{item.contactName}</Text>
                </View>
              )}
              {item.contactEmail && (
                <View style={styles.infoPill}>
                  <Ionicons name="mail-outline" size={13} color={Colors.text.secondary} />
                  <Text style={styles.infoPillText}>{item.contactEmail}</Text>
                </View>
              )}
              {item.contactPhone && (
                <View style={styles.infoPill}>
                  <Ionicons name="call-outline" size={13} color={Colors.text.secondary} />
                  <Text style={styles.infoPillText}>{item.contactPhone}</Text>
                </View>
              )}
              {item.company && (
                <View style={styles.infoPill}>
                  <Ionicons name="business-outline" size={13} color={Colors.text.secondary} />
                  <Text style={styles.infoPillText}>{item.company}</Text>
                </View>
              )}
              {item.source && (
                <View style={styles.infoPill}>
                  <Ionicons name="globe-outline" size={13} color={Colors.text.secondary} />
                  <Text style={styles.infoPillText}>{item.source}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Timestamps */}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={Colors.text.muted} />
            <Text style={styles.metaText}>
              Received {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
          {item.actionedAt && (
            <View style={[styles.metaRow, { marginTop: 4 }]}>
              <Ionicons name="checkmark-done-outline" size={14} color={Colors.brand[500]} />
              <Text style={[styles.metaText, { color: Colors.brand[500] }]}>
                Actioned {new Date(item.actionedAt).toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.actionBar}>
          <Pressable
            style={styles.actionBarBtn}
            onPress={() => setReplyVisible(true)}
          >
            <Ionicons name="arrow-undo-outline" size={18} color={Colors.brand[500]} />
            <Text style={[styles.actionBarText, { color: Colors.brand[500] }]}>Reply</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable
            style={styles.actionBarBtn}
            onPress={() => actionMutation.mutate({ action: 'assign' })}
          >
            <Ionicons name="person-add-outline" size={18} color={Colors.text.secondary} />
            <Text style={styles.actionBarText}>Assign</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable
            style={styles.actionBarBtn}
            onPress={() => actionMutation.mutate({ action: 'create_deal' })}
          >
            <Ionicons name="briefcase-outline" size={18} color={Colors.text.secondary} />
            <Text style={styles.actionBarText}>Add Deal</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable
            style={styles.actionBarBtn}
            onPress={() => actionMutation.mutate({ action: 'create_ticket' })}
          >
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
  loadingHeader: { flexDirection: 'row', padding: 16 },
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
  infoSection: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.text.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoPillText: { fontSize: 12, color: Colors.text.secondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 6 },
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

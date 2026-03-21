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
  fetchDeal,
  fetchDealStages,
  moveDealStage,
  updateDealStatus,
  assignDeal,
} from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Button } from '@/components/ui/Button';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { SageDealStage } from '@/types';

function formatValue(value?: number, currency?: string): string {
  if (!value) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_STYLES = {
  open: { color: '#3b82f6', bg: '#eff6ff' },
  won: { color: '#22c55e', bg: '#f0fdf4' },
  lost: { color: '#ef4444', bg: '#fef2f2' },
} as const;

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [stagePickerVisible, setStagePickerVisible] = useState(false);

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => fetchDeal(id),
    enabled: !!id,
  });

  const { data: stages } = useQuery({
    queryKey: ['deal-stages', deal?.pipelineId],
    queryFn: () => fetchDealStages(deal!.pipelineId!),
    enabled: !!deal?.pipelineId,
    select: (data) => data.sort((a, b) => a.position - b.position),
  });

  const moveStage = useMutation({
    mutationFn: (stageId: string) => moveDealStage(id, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setStagePickerVisible(false);
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: 'open' | 'won' | 'lost') => updateDealStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.pad}>
          <SkeletonLoader width="70%" height={28} borderRadius={6} style={styles.skel} />
          <SkeletonLoader width="40%" height={20} borderRadius={6} style={styles.skel} />
          <SkeletonLoader width="100%" height={160} borderRadius={12} style={styles.skel} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !deal) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Failed to load deal.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_STYLES[deal.status];
  const currentStage = stages?.find((s) => s.id === deal.stageId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Deal Detail</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
        >
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {deal.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title & Value */}
        <View style={styles.titleSection}>
          <Text style={styles.dealTitle}>{deal.title}</Text>
          <Text style={styles.dealValue}>{formatValue(deal.value, deal.currency)}</Text>
        </View>

        {/* Stage row */}
        <Pressable style={styles.infoRow} onPress={() => setStagePickerVisible(true)}>
          <Ionicons name="git-branch-outline" size={16} color={Colors.text.muted} />
          <Text style={styles.infoLabel}>Stage</Text>
          <Text style={styles.infoValue}>{currentStage?.name ?? 'Unknown'}</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.text.muted} />
        </Pressable>

        {/* Priority */}
        {deal.priority && (
          <View style={styles.infoRow}>
            <Ionicons name="flag-outline" size={16} color={Colors.text.muted} />
            <Text style={styles.infoLabel}>Priority</Text>
            <PriorityBadge priority={deal.priority} size="sm" />
          </View>
        )}

        {/* Contact */}
        {deal.contactId && (
          <Pressable
            style={styles.infoRow}
            onPress={() => router.push(`/(app)/more/contacts/${deal.contactId}`)}
          >
            <Ionicons name="person-outline" size={16} color={Colors.text.muted} />
            <Text style={styles.infoLabel}>Contact</Text>
            <Text style={[styles.infoValue, { color: Colors.brand[500] }]}>View Contact</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.brand[500]} />
          </Pressable>
        )}

        {/* Created */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.text.muted} />
          <Text style={styles.infoLabel}>Created</Text>
          <Text style={styles.infoValue}>
            {new Date(deal.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        <Pressable
          style={styles.actionBarBtn}
          onPress={() => setStagePickerVisible(true)}
        >
          <Ionicons name="git-branch-outline" size={18} color={Colors.brand[500]} />
          <Text style={[styles.actionBarText, { color: Colors.brand[500] }]}>Move Stage</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable
          style={styles.actionBarBtn}
          onPress={() => updateStatus.mutate('won')}
          disabled={deal.status === 'won'}
        >
          <Ionicons
            name="trophy-outline"
            size={18}
            color={deal.status === 'won' ? Colors.text.muted : '#22c55e'}
          />
          <Text style={[styles.actionBarText, { color: deal.status === 'won' ? Colors.text.muted : '#22c55e' }]}>
            Won
          </Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable
          style={styles.actionBarBtn}
          onPress={() => updateStatus.mutate('lost')}
          disabled={deal.status === 'lost'}
        >
          <Ionicons
            name="close-circle-outline"
            size={18}
            color={deal.status === 'lost' ? Colors.text.muted : '#ef4444'}
          />
          <Text style={[styles.actionBarText, { color: deal.status === 'lost' ? Colors.text.muted : '#ef4444' }]}>
            Lost
          </Text>
        </Pressable>
      </View>

      {/* Stage Picker Modal */}
      <Modal
        visible={stagePickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStagePickerVisible(false)}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setStagePickerVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Move to Stage</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={stages ?? []}
            keyExtractor={(s) => s.id}
            renderItem={({ item: stage }: { item: SageDealStage }) => (
              <Pressable
                style={[
                  styles.stageItem,
                  stage.id === deal.stageId && styles.stageItemActive,
                ]}
                onPress={() => moveStage.mutate(stage.id)}
              >
                <Text
                  style={[
                    styles.stageItemText,
                    stage.id === deal.stageId && styles.stageItemTextActive,
                  ]}
                >
                  {stage.name}
                </Text>
                {stage.id === deal.stageId && (
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
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  titleSection: { padding: 20, backgroundColor: Colors.bg.card, marginBottom: 1 },
  dealTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary, marginBottom: 6 },
  dealValue: { fontSize: 24, fontWeight: '800', color: Colors.brand[500] },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.bg.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  infoLabel: { width: 70, fontSize: 13, color: Colors.text.muted },
  infoValue: { flex: 1, fontSize: 13, color: Colors.text.primary },
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
  stageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  stageItemActive: { backgroundColor: `${Colors.brand[500]}0D` },
  stageItemText: { fontSize: 15, color: Colors.text.primary },
  stageItemTextActive: { color: Colors.brand[500], fontWeight: '600' },
});

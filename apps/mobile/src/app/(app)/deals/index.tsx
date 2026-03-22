import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { SageDeal, SagePipeline, SageDealStage } from '@/types';

function formatValue(value?: number, currency?: string): string {
  if (!value) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function activityDot(updatedAt?: string): string {
  if (!updatedAt) return '#6b7280';
  const hours = (Date.now() - new Date(updatedAt).getTime()) / 3_600_000;
  if (hours < 12) return '#22c55e';
  if (hours < 24) return '#84cc16';
  if (hours < 48) return '#f59e0b';
  return '#ef4444';
}

async function fetchPipelinesAndStages(workspaceId: string) {
  const [pipelines, stages] = await Promise.all([
    supabase
      .from('sage_pipelines')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
    supabase
      .from('sage_pipeline_stages')
      .select('id, name, color, position, pipeline_id')
      .order('position', { ascending: true }),
  ]);
  return {
    pipelines: (pipelines.data ?? []) as SagePipeline[],
    stages: (stages.data ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color ?? '#6b7280',
      position: s.position,
      pipelineId: s.pipeline_id,
    })) as SageDealStage[],
  };
}

async function fetchDealsEnriched(
  workspaceId: string,
  pipelineId?: string,
  stageId?: string | null,
): Promise<SageDeal[]> {
  let query = supabase
    .from('sage_deals')
    .select(`
      id, title, value, currency, status, priority,
      stage_id, pipeline_id, contact_id, company_id, owner_id,
      company_name, close_date, description, win_percentage,
      lost_reason, won_at, lost_at, created_at, updated_at,
      stage:sage_pipeline_stages(id, name, color),
      contact:sage_contacts(id, name, email, phone)
    `)
    .eq('workspace_id', workspaceId)
    .eq('status', 'open')
    .order('updated_at', { ascending: false });

  if (pipelineId) query = query.eq('pipeline_id', pipelineId);
  if (stageId) query = query.eq('stage_id', stageId);

  const { data } = await query;
  return ((data ?? []) as any[]).map((d) => ({
    id: d.id,
    title: d.title,
    value: d.value,
    currency: d.currency,
    status: d.status,
    priority: d.priority,
    stageId: d.stage_id,
    pipelineId: d.pipeline_id,
    contactId: d.contact_id,
    companyId: d.company_id,
    ownerId: d.owner_id,
    companyName: d.company_name,
    closeDate: d.close_date,
    description: d.description,
    winPercentage: d.win_percentage,
    lostReason: d.lost_reason,
    wonAt: d.won_at,
    lostAt: d.lost_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    stageName: d.stage?.name,
    stageColor: d.stage?.color ?? '#6b7280',
    contactName: d.contact?.name,
    contactEmail: d.contact?.email,
    contactPhone: d.contact?.phone,
  }));
}

export default function DealsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null); // null = All
  const [pipelineDropdownOpen, setPipelineDropdownOpen] = useState(false);

  const {
    data: meta,
    isLoading: metaLoading,
  } = useQuery({
    queryKey: ['deals-meta', user?.workspaceId],
    queryFn: () => fetchPipelinesAndStages(user!.workspaceId),
    enabled: !!user,
    select: (d) => {
      if (!selectedPipelineId && d.pipelines.length > 0) {
        setSelectedPipelineId(d.pipelines[0].id);
      }
      return d;
    },
  });

  const activePipelineId = selectedPipelineId ?? meta?.pipelines[0]?.id;
  const pipelineStages = useMemo(
    () =>
      (meta?.stages ?? []).filter(
        (s) =>
          s.pipelineId === activePipelineId &&
          !['won', 'lost'].includes(s.name.toLowerCase()),
      ),
    [meta?.stages, activePipelineId],
  );

  const {
    data: deals,
    isLoading: dealsLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['deals-enriched', user?.workspaceId, activePipelineId, selectedStageId],
    queryFn: () => fetchDealsEnriched(user!.workspaceId, activePipelineId, selectedStageId),
    enabled: !!user && !!activePipelineId,
  });

  // Pipeline value summary per stage
  const stageSummary = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    for (const s of pipelineStages) map[s.id] = { count: 0, value: 0 };
    for (const d of deals ?? []) {
      if (d.stageId && map[d.stageId]) {
        map[d.stageId].count += 1;
        map[d.stageId].value += d.value ?? 0;
      }
    }
    return map;
  }, [deals, pipelineStages]);

  const totalValue = useMemo(
    () => (deals ?? []).reduce((sum, d) => sum + (d.value ?? 0), 0),
    [deals],
  );

  const renderDeal = ({ item }: { item: SageDeal }) => {
    const showStageChip = !selectedStageId;
    const closingSoon =
      item.closeDate &&
      new Date(item.closeDate).getTime() - Date.now() < 7 * 86_400_000 &&
      new Date(item.closeDate).getTime() > Date.now();

    return (
      <Pressable
        style={({ pressed }) => [styles.dealCard, pressed && styles.pressed]}
        onPress={() => router.push(`/(app)/deals/${item.id}`)}
      >
        {/* Top row: contact name + value */}
        <View style={styles.dealTop}>
          <Text style={styles.dealTitle} numberOfLines={1}>
            {item.contactName ?? item.companyName ?? item.title}
          </Text>
          <Text style={styles.dealValue}>{formatValue(item.value, item.currency)}</Text>
        </View>

        {/* Service / deal title — only when a contact name is shown above */}
        {(item.contactName || item.companyName) ? (
          <Text style={styles.dealService} numberOfLines={1}>{item.title}</Text>
        ) : null}

        {/* Email + phone */}
        {(item.contactEmail || item.contactPhone) ? (
          <Text style={styles.dealContact} numberOfLines={1}>
            {[item.contactEmail, item.contactPhone].filter(Boolean).join('  ·  ')}
          </Text>
        ) : null}

        {/* Meta row */}
        <View style={styles.dealMeta}>
          <View style={styles.dealMetaLeft}>
            {item.priority && <PriorityBadge priority={item.priority} size="sm" />}
            {showStageChip && item.stageName ? (
              <View style={[styles.stageChip, { backgroundColor: (item.stageColor ?? '#6b7280') + '22' }]}>
                <View style={[styles.stageDot, { backgroundColor: item.stageColor ?? '#6b7280' }]} />
                <Text style={[styles.stageChipText, { color: item.stageColor ?? '#6b7280' }]} numberOfLines={1}>
                  {item.stageName}
                </Text>
              </View>
            ) : null}
            {closingSoon ? (
              <View style={styles.closeChip}>
                <Ionicons name="time-outline" size={11} color="#f59e0b" />
                <Text style={styles.closeChipText}>
                  {new Date(item.closeDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.actDot, { backgroundColor: activityDot(item.updatedAt) }]} />
        </View>
      </Pressable>
    );
  };

  const isLoading = metaLoading || (dealsLoading && !deals);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      {/* Header with pipeline dropdown */}
      <View style={styles.header}>
        <Text style={styles.title}>Deals</Text>
        <View style={styles.headerRight}>
          {totalValue > 0 && (
            <Text style={styles.totalValue}>{formatValue(totalValue)}</Text>
          )}
          {metaLoading ? (
            <SkeletonLoader width={120} height={32} borderRadius={20} />
          ) : (
            <Pressable
              style={styles.pipelineDropdown}
              onPress={() => setPipelineDropdownOpen(true)}
            >
              <Ionicons name="git-network-outline" size={14} color={Colors.brand[500]} />
              <Text style={styles.pipelineDropdownText} numberOfLines={1}>
                {meta?.pipelines.find((p) => p.id === activePipelineId)?.name ?? 'Pipeline'}
              </Text>
              <Ionicons name="chevron-down" size={13} color={Colors.brand[500]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Stage funnel strip + tabs */}
      {!metaLoading && pipelineStages.length > 0 && (
        <>
          {/* Funnel strip */}
          <View style={styles.funnelStrip}>
            {pipelineStages.map((stage) => {
              const summary = stageSummary[stage.id] ?? { count: 0, value: 0 };
              const isActive = selectedStageId === stage.id;
              return (
                <Pressable
                  key={stage.id}
                  style={[styles.funnelSegment, { flex: 1 }]}
                  onPress={() => setSelectedStageId(isActive ? null : stage.id)}
                >
                  <View
                    style={[
                      styles.funnelBar,
                      { backgroundColor: isActive ? stage.color : stage.color + '55' },
                    ]}
                  />
                  <Text style={styles.funnelCount}>{summary.count}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Stage tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stageTabs}
          >
            <Pressable
              onPress={() => setSelectedStageId(null)}
              style={[styles.stageTab, !selectedStageId && styles.stageTabActive]}
            >
              <Text style={[styles.stageTabText, !selectedStageId && styles.stageTabTextActive]}>
                All
              </Text>
            </Pressable>
            {pipelineStages.map((stage: SageDealStage) => (
              <Pressable
                key={stage.id}
                onPress={() => setSelectedStageId(stage.id)}
                style={[
                  styles.stageTab,
                  selectedStageId === stage.id && { backgroundColor: stage.color, borderColor: stage.color },
                ]}
              >
                <Text
                  style={[
                    styles.stageTabText,
                    selectedStageId === stage.id && styles.stageTabTextActive,
                  ]}
                >
                  {stage.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {/* Deals list */}
      {isLoading ? (
        <View style={styles.skelWrap}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} width="100%" height={90} borderRadius={14} style={styles.skelItem} />
          ))}
        </View>
      ) : (
        <FlatList
          data={deals ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderDeal}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !dealsLoading}
              onRefresh={refetch}
              tintColor={Colors.brand[500]}
            />
          }
          contentContainerStyle={
            !deals?.length ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={48} color={Colors.text.muted} />
              <Text style={styles.emptyTitle}>No deals in this stage</Text>
            </View>
          }
        />
      )}

      {/* Pipeline picker modal */}
      <Modal
        visible={pipelineDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPipelineDropdownOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPipelineDropdownOpen(false)}>
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Select Pipeline</Text>
            {(meta?.pipelines ?? []).map((pipeline: SagePipeline) => (
              <Pressable
                key={pipeline.id}
                style={[styles.dropdownItem, activePipelineId === pipeline.id && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedPipelineId(pipeline.id);
                  setSelectedStageId(null);
                  setPipelineDropdownOpen(false);
                }}
              >
                <Ionicons name="git-network-outline" size={15} color={activePipelineId === pipeline.id ? Colors.brand[500] : Colors.text.secondary} />
                <Text style={[styles.dropdownItemText, activePipelineId === pipeline.id && { color: Colors.brand[500], fontWeight: '600' }]}>
                  {pipeline.name}
                </Text>
                {activePipelineId === pipeline.id && (
                  <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  totalValue: { fontSize: 14, fontWeight: '700', color: Colors.brand[500] },
  pipelineDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.brand[500] + '15',
    borderWidth: 1,
    borderColor: Colors.brand[500] + '40',
    maxWidth: 160,
  },
  pipelineDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brand[500],
    flexShrink: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    width: 280,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  dropdownItemActive: { backgroundColor: Colors.brand[500] + '10' },
  dropdownItemText: { fontSize: 14, color: Colors.text.primary, flex: 1 },

  // Funnel
  funnelStrip: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 0,
    gap: 2,
  },
  funnelSegment: { alignItems: 'center', gap: 1 },
  funnelBar: { height: 4, width: '100%', borderRadius: 2 },
  funnelCount: { fontSize: 9, color: Colors.text.muted, fontWeight: '700' },

  // Stage tabs
  stageTabs: { paddingHorizontal: 14, paddingBottom: 4, paddingTop: 3, gap: 5, alignItems: 'center' },
  stageTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
  },
  stageTabActive: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  stageTabText: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },
  stageTabTextActive: { color: '#ffffff' },

  // Skeletons
  skelWrap: { paddingTop: 4 },
  skelItem: { marginHorizontal: 16, marginVertical: 5 },

  // List
  listContent: { paddingTop: 4, paddingBottom: 20 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.secondary, marginTop: 12 },

  // Deal card
  dealCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: { opacity: 0.85 },
  dealTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dealTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, flex: 1, marginRight: 8 },
  dealValue: { fontSize: 15, fontWeight: '700', color: Colors.brand[500] },
  dealService: { fontSize: 12, color: Colors.text.secondary, marginBottom: 2 },
  dealContact: { fontSize: 11, color: Colors.text.muted, marginBottom: 8 },
  dealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dealMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
    maxWidth: 120,
  },
  stageDot: { width: 6, height: 6, borderRadius: 3 },
  stageChipText: { fontSize: 11, fontWeight: '600' },
  closeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
  },
  closeChipText: { fontSize: 11, color: '#f59e0b', fontWeight: '600' },
  actDot: { width: 8, height: 8, borderRadius: 4 },
});

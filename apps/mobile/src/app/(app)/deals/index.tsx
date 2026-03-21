import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth';
import { fetchPipelines, fetchDealStages, fetchDeals } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { SageDeal, SageDealStage, SagePipeline } from '@/types';

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function formatValue(value?: number, currency?: string): string {
  if (!value) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DealsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines', user?.workspaceId],
    queryFn: () => fetchPipelines(user!.workspaceId),
    enabled: !!user,
    select: (data) => {
      // Auto-select first pipeline on load
      if (!selectedPipelineId && data.length > 0) {
        setSelectedPipelineId(data[0].id);
      }
      return data;
    },
  });

  const activePipelineId = selectedPipelineId ?? pipelines?.[0]?.id;

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ['deal-stages', activePipelineId],
    queryFn: () => fetchDealStages(activePipelineId!),
    enabled: !!activePipelineId,
    select: (data) => {
      if (!selectedStageId && data.length > 0) {
        setSelectedStageId(data[0].id);
      }
      return data.sort((a, b) => a.position - b.position);
    },
  });

  const activeStageId = selectedStageId ?? stages?.[0]?.id;

  const { data: deals, isLoading: dealsLoading, refetch, isFetching } = useQuery({
    queryKey: ['deals', user?.workspaceId, activePipelineId, activeStageId],
    queryFn: () => fetchDeals(user!.workspaceId, activePipelineId, activeStageId),
    enabled: !!user && !!activePipelineId,
  });

  const renderDeal = ({ item }: { item: SageDeal }) => (
    <Pressable
      style={({ pressed }) => [styles.dealCard, pressed && styles.pressed]}
      onPress={() => router.push(`/(app)/deals/${item.id}`)}
    >
      <View style={styles.dealTop}>
        <Text style={styles.dealTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.dealValue}>{formatValue(item.value, item.currency)}</Text>
      </View>
      <View style={styles.dealMeta}>
        {item.priority && <PriorityBadge priority={item.priority} size="sm" />}
        <Text style={styles.dealDays}>{daysSince(item.createdAt)}d in stage</Text>
      </View>
    </Pressable>
  );

  const isLoading = pipelinesLoading || stagesLoading || dealsLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Deals</Text>
      </View>

      {/* Pipeline selector */}
      {pipelinesLoading ? (
        <SkeletonLoader width="50%" height={32} borderRadius={8} style={styles.pipelineSkel} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pipelineTabs}
        >
          {(pipelines ?? []).map((pipeline: SagePipeline) => (
            <Pressable
              key={pipeline.id}
              onPress={() => {
                setSelectedPipelineId(pipeline.id);
                setSelectedStageId(null);
              }}
              style={[
                styles.pipelineTab,
                activePipelineId === pipeline.id && styles.pipelineTabActive,
              ]}
            >
              <Text
                style={[
                  styles.pipelineTabText,
                  activePipelineId === pipeline.id && styles.pipelineTabTextActive,
                ]}
              >
                {pipeline.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Stage tabs */}
      {stagesLoading ? (
        <View style={styles.stageSkelRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} width={80} height={32} borderRadius={8} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageTabs}
        >
          {(stages ?? []).map((stage: SageDealStage) => (
            <Pressable
              key={stage.id}
              onPress={() => setSelectedStageId(stage.id)}
              style={[styles.stageTab, activeStageId === stage.id && styles.stageTabActive]}
            >
              <Text
                style={[
                  styles.stageTabText,
                  activeStageId === stage.id && styles.stageTabTextActive,
                ]}
              >
                {stage.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Deals list */}
      {dealsLoading ? (
        <View style={styles.skelWrap}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} width="100%" height={84} borderRadius={14} style={styles.skelItem} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text.primary },
  pipelineSkel: { marginHorizontal: 16, marginBottom: 8 },
  pipelineTabs: { paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
  pipelineTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pipelineTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  pipelineTabText: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  pipelineTabTextActive: { color: '#ffffff' },
  stageSkelRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  stageTabs: { paddingHorizontal: 14, paddingBottom: 8, gap: 6 },
  stageTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stageTabActive: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  stageTabText: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  stageTabTextActive: { color: '#ffffff' },
  skelWrap: { paddingTop: 4 },
  skelItem: { marginHorizontal: 16, marginVertical: 5 },
  listContent: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.secondary, marginTop: 12 },
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
  dealTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dealTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, flex: 1 },
  dealValue: { fontSize: 15, fontWeight: '700', color: Colors.brand[500], marginLeft: 8 },
  dealMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dealDays: { fontSize: 12, color: Colors.text.muted },
});

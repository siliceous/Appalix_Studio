import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth';
import { fetchWorkspaceMembers } from '@/lib/api';
import type { SageTicketPriority, SageDealActivity } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DealDetail {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  status: 'open' | 'won' | 'lost';
  priority: SageTicketPriority | null;
  pipeline_id: string | null;
  stage_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  company_name: string | null;
  close_date: string | null;
  description: string | null;
  win_percentage: number | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string | null;
  stage: { id: string; name: string; color: string } | null;
  contact: { id: string; name: string; email: string | null } | null;
}

interface DealStage {
  id: string;
  name: string;
  color: string;
  position: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(value?: number | null, currency?: string | null): string {
  if (!value) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

const PRIORITY_OPTIONS: { value: SageTicketPriority; label: string; color: string; bg: string }[] = [
  { value: 'high',   label: 'High',   color: Colors.priority.high,   bg: Colors.priorityBg.high },
  { value: 'medium', label: 'Medium', color: Colors.priority.medium, bg: Colors.priorityBg.medium },
  { value: 'low',    label: 'Low',    color: Colors.priority.low,    bg: Colors.priorityBg.low },
];

const STATUS_STYLES = {
  open: { color: '#3b82f6', bg: '#eff6ff', label: 'Open' },
  won:  { color: '#22c55e', bg: '#f0fdf4', label: 'Won'  },
  lost: { color: '#ef4444', bg: '#fef2f2', label: 'Lost' },
} as const;

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchDealDetail(id: string): Promise<DealDetail> {
  const { data, error } = await supabase
    .from('sage_deals')
    .select(`
      id, title, value, currency, status, priority,
      pipeline_id, stage_id, contact_id, owner_id,
      company_name, close_date, description, win_percentage,
      lost_reason, created_at, updated_at,
      stage:sage_pipeline_stages(id, name, color),
      contact:sage_contacts(id, name, email)
    `)
    .eq('id', id)
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Not found');
  return data as unknown as DealDetail;
}

async function fetchDealTasks(dealId: string): Promise<SageDealActivity[]> {
  const { data } = await supabase
    .from('sage_deal_activities')
    .select('id, type, title, body, due_at, completed_at, created_at')
    .eq('deal_id', dealId)
    .not('due_at', 'is', null)
    .order('due_at', { ascending: true });
  return (data ?? []) as SageDealActivity[];
}

async function fetchDealStages(pipelineId: string): Promise<DealStage[]> {
  const { data } = await supabase
    .from('sage_pipeline_stages')
    .select('id, name, color, position')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true });
  return (data ?? []) as DealStage[];
}

// ---------------------------------------------------------------------------
// Priority dropdown (same pattern as ticket detail)
// ---------------------------------------------------------------------------

function PriorityDropdown({
  current,
  onChange,
}: {
  current: SageTicketPriority;
  onChange: (p: SageTicketPriority) => void;
}) {
  const [open, setOpen] = useState(false);
  const opt = PRIORITY_OPTIONS.find((o) => o.value === current) ?? PRIORITY_OPTIONS[2];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.priorityPill, { backgroundColor: opt.bg, borderColor: opt.color + '40' }]}
      >
        <View style={[styles.priorityDot, { backgroundColor: opt.color }]} />
        <Text style={[styles.priorityPillText, { color: opt.color }]}>{opt.label}</Text>
        <Ionicons name="chevron-down" size={12} color={opt.color} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Set Priority</Text>
            {PRIORITY_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                style={[styles.dropdownItem, current === o.value && styles.dropdownItemActive]}
                onPress={() => { onChange(o.value); setOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <View style={[styles.priorityDot, { backgroundColor: o.color }]} />
                <Text style={[styles.dropdownItemText, { color: o.color }]}>{o.label}</Text>
                {current === o.value && <Ionicons name="checkmark" size={16} color={o.color} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Deal detail screen
// ---------------------------------------------------------------------------

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // UI state
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(true);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // Activity forms
  const [setActType, setSetActType] = useState<'call' | 'meeting' | 'task'>('call');
  const [setActSubject, setSetActSubject] = useState('');
  const [setActScheduled, setSetActScheduled] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calSelectedDay, setCalSelectedDay] = useState<number | null>(null);
  const [savingSetAct, setSavingSetAct] = useState(false);
  const [logActType, setLogActType] = useState<'call' | 'meeting' | 'task'>('call');
  const [logActNote, setLogActNote] = useState('');
  const [savingLogAct, setSavingLogAct] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Local mutable state
  const [priority, setPriority] = useState<SageTicketPriority>('low');
  const [status, setStatus] = useState<'open' | 'won' | 'lost'>('open');
  const [assignedTo, setAssignedTo] = useState('');
  const [priorityInitialised, setPriorityInitialised] = useState(false);

  // Queries
  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['deal-detail', id],
    queryFn: () => fetchDealDetail(id),
    enabled: !!id,
    select: (d) => {
      if (!priorityInitialised) {
        setPriority(d.priority ?? 'low');
        setStatus(d.status);
        setAssignedTo(d.owner_id ?? '');
        setPriorityInitialised(true);
      }
      return d;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ['deal-tasks', id],
    queryFn: () => fetchDealTasks(id),
    enabled: !!id,
  });

  const { data: stages } = useQuery({
    queryKey: ['deal-stages', deal?.pipeline_id],
    queryFn: () => fetchDealStages(deal!.pipeline_id!),
    enabled: !!deal?.pipeline_id,
  });

  const { data: actFeedItems } = useQuery({
    queryKey: ['deal-act-feed', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sage_deal_activities')
        .select('id, type, title, body, due_at, completed_at, created_at')
        .eq('deal_id', id)
        .is('due_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data ?? []) as SageDealActivity[];
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ['workspace-members', user?.workspaceId],
    queryFn: () => fetchWorkspaceMembers(user!.workspaceId),
    enabled: !!user?.workspaceId,
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handlePriorityChange(p: SageTicketPriority) {
    setPriority(p);
    await supabase.from('sage_deals').update({ priority: p }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['deals-enriched'] });
  }

  async function handleStatusChange(s: 'open' | 'won' | 'lost') {
    setStatus(s);
    setStatusPickerOpen(false);
    const patch: Record<string, unknown> = { status: s };
    if (s === 'won') patch.won_at = new Date().toISOString();
    if (s === 'lost') patch.lost_at = new Date().toISOString();
    await supabase.from('sage_deals').update(patch).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['deals-enriched'] });
  }

  async function handleMoveStage(stageId: string) {
    setStagePickerOpen(false);
    await supabase.from('sage_deals').update({ stage_id: stageId }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['deal-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['deals-enriched'] });
  }

  async function handleAssign(userId: string) {
    setAssignedTo(userId);
    setAssignOpen(false);
    await supabase.from('sage_deals').update({ owner_id: userId || null }).eq('id', id);
  }

  async function handleSetActivity() {
    if (!setActSubject.trim()) return;
    setSavingSetAct(true);
    try {
      const due = calSelectedDay !== null
        ? new Date(calYear, calMonth, calSelectedDay).toISOString()
        : new Date(Date.now() + 86_400_000).toISOString();
      const { error: err } = await supabase.from('sage_deal_activities').insert({
        workspace_id: user!.workspaceId,
        deal_id: id,
        type: setActType,
        title: setActSubject.trim(),
        due_at: due,
        created_by: user!.id,
      });
      if (err) throw err;
      setSetActSubject('');
      setSetActScheduled('');
      setCalSelectedDay(null);
      queryClient.invalidateQueries({ queryKey: ['deal-tasks', id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to set activity.');
    } finally {
      setSavingSetAct(false);
    }
  }

  async function handleLogActivity() {
    if (!logActNote.trim()) return;
    setSavingLogAct(true);
    try {
      const { error: err } = await supabase.from('sage_deal_activities').insert({
        workspace_id: user!.workspaceId,
        deal_id: id,
        type: logActType,
        body: logActNote.trim(),
        created_by: user!.id,
      });
      if (err) throw err;
      setLogActNote('');
      queryClient.invalidateQueries({ queryKey: ['deal-act-feed', id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to log activity.');
    } finally {
      setSavingLogAct(false);
    }
  }

  async function handleCreateNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const { error: err } = await supabase.from('sage_deal_activities').insert({
        workspace_id: user!.workspaceId,
        deal_id: id,
        type: 'note',
        body: noteText.trim(),
        created_by: user!.id,
      });
      if (err) throw err;
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['deal-act-feed', id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleCompleteTask(taskId: string) {
    await supabase
      .from('sage_deal_activities')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', taskId);
    queryClient.invalidateQueries({ queryKey: ['deal-tasks', id] });
  }

  // ---------------------------------------------------------------------------
  // Calendar helpers
  // ---------------------------------------------------------------------------

  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calFirstDow = new Date(calYear, calMonth, 1).getDay();
  const today = new Date();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
          </Pressable>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonLoader width="70%" height={28} borderRadius={6} />
          <SkeletonLoader width="40%" height={20} borderRadius={6} />
          <SkeletonLoader width="100%" height={160} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !deal) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { margin: 16 }]}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Failed to load deal.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_STYLES[status];
  const currentStage = stages?.find((s) => s.id === deal.stage_id) ?? deal.stage;
  const pendingTasks = (tasks ?? []).filter((t) => !t.completed_at);
  const completedTasks = (tasks ?? []).filter((t) => t.completed_at);
  const assignedMember = (members ?? []).find((m) => m.userId === assignedTo);
  const createdOn = new Date(deal.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerName} numberOfLines={1}>{deal.title}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Edit', 'Coming soon')}>
            <Ionicons name="pencil-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Share', 'Coming soon')}>
            <Ionicons name="share-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Delete', 'Coming soon')}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
          <PriorityDropdown current={priority} onChange={handlePriorityChange} />
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Deal Info + Contact — collapsible */}
        <View style={styles.section}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <Ionicons name="briefcase-outline" size={15} color={Colors.brand[500]} />
              <Text style={styles.sectionLabel}>
                {formatValue(deal.value, deal.currency)} {deal.company_name ? `· ${deal.company_name}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => setInfoCollapsed((v) => !v)} style={styles.collapseBtn}>
              <Ionicons name={infoCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.text.muted} />
            </Pressable>
          </View>

          {/* Stage + status badges */}
          <View style={styles.badgeRow}>
            {currentStage ? (
              <View style={[styles.stageBadge, { backgroundColor: currentStage.color + '22', borderColor: currentStage.color + '55' }]}>
                <View style={[styles.stageDot, { backgroundColor: currentStage.color }]} />
                <Text style={[styles.stageBadgeText, { color: currentStage.color }]}>{currentStage.name}</Text>
              </View>
            ) : null}
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
            </View>
            {deal.win_percentage != null && (
              <View style={styles.winBadge}>
                <Text style={styles.winBadgeText}>{deal.win_percentage}% win</Text>
              </View>
            )}
          </View>

          {!infoCollapsed && (
            <>
              <View style={[styles.divider, { marginTop: 10 }]} />
              <Text style={[styles.sectionLabel, { marginTop: 10 }]}>Contact Info</Text>
              {deal.contact?.name ? (
                <View style={styles.contactRow}>
                  <Ionicons name="person-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{deal.contact.name}</Text>
                </View>
              ) : null}
              {deal.contact?.email ? (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{deal.contact.email}</Text>
                </View>
              ) : null}
              {deal.company_name ? (
                <View style={styles.contactRow}>
                  <Ionicons name="business-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{deal.company_name}</Text>
                </View>
              ) : null}
              {deal.close_date ? (
                <View style={styles.contactRow}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>
                    Close: {new Date(deal.close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Tasks */}
        <View style={styles.section}>
          <View style={[styles.summaryHeaderLeft, { marginBottom: 10 }]}>
            <Ionicons name="checkmark-circle-outline" size={15} color={Colors.brand[500]} />
            <Text style={styles.sectionLabel}>Tasks</Text>
            {pendingTasks.length > 0 && (
              <View style={styles.taskCountBadge}>
                <Text style={styles.taskCountText}>{pendingTasks.length}</Text>
              </View>
            )}
          </View>

          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <Text style={styles.emptyTaskText}>No tasks yet. Set an activity below.</Text>
          ) : null}

          {pendingTasks.map((t) => (
            <View key={t.id} style={styles.taskRow}>
              <Pressable onPress={() => handleCompleteTask(t.id)} style={styles.taskCheckbox}>
                <Ionicons name="ellipse-outline" size={18} color={Colors.brand[500]} />
              </Pressable>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{t.title ?? t.body ?? '—'}</Text>
                <Text style={styles.taskMeta}>
                  {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  {t.due_at ? ` · ${new Date(t.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                </Text>
              </View>
            </View>
          ))}

          {completedTasks.length > 0 && (
            <>
              <Text style={styles.completedLabel}>Completed</Text>
              {completedTasks.map((t) => (
                <View key={t.id} style={[styles.taskRow, { opacity: 0.5 }]}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.brand[500]} style={{ marginRight: 10 }} />
                  <Text style={[styles.taskTitle, { textDecorationLine: 'line-through' }]}>
                    {t.title ?? t.body ?? '—'}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* Lodge an Activity — collapsed chevron */}
          <Pressable
            style={styles.lodgeChevron}
            onPress={() => setActivityCollapsed((v) => !v)}
          >
            <Ionicons name="add-circle-outline" size={16} color={Colors.brand[500]} />
            <Text style={styles.lodgeChevronText}>Lodge an Activity</Text>
            <Ionicons
              name={activityCollapsed ? 'chevron-down' : 'chevron-up'}
              size={15}
              color={Colors.text.muted}
              style={{ marginLeft: 'auto' }}
            />
          </Pressable>

          {!activityCollapsed && (
            <View style={{ marginTop: 12, gap: 16 }}>

              {/* Set Activity */}
              <View style={styles.activityFormCard}>
                <View style={styles.activityFormHeader}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.brand[500]} />
                  <Text style={styles.activityFormTitle}>Set Activity</Text>
                </View>
                <View style={styles.activityTypePills}>
                  {(['call', 'meeting', 'task'] as const).map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.activityTypePill, setActType === t && styles.activityTypePillActive]}
                      onPress={() => setSetActType(t)}
                    >
                      <Text style={[styles.activityTypePillText, setActType === t && styles.activityTypePillTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    style={[styles.activityTypePill, calSelectedDay !== null && styles.activityTypePillActive]}
                    onPress={() => setDatePickerOpen(true)}
                  >
                    <Ionicons name="calendar-outline" size={13} color={calSelectedDay !== null ? Colors.brand[500] : Colors.text.secondary} />
                  </Pressable>
                </View>
                <TextInput
                  style={styles.activityInput}
                  value={setActSubject}
                  onChangeText={setSetActSubject}
                  placeholder="e.g. Call tomorrow and book a product demo"
                  placeholderTextColor={Colors.text.muted}
                />
                <TextInput
                  style={[styles.activityInput, styles.activityScheduleInput]}
                  value={setActScheduled}
                  onChangeText={setSetActScheduled}
                  multiline
                  numberOfLines={2}
                  placeholder={'Scheduled for\ne.g. 25 Mar 2026, 10:00'}
                  placeholderTextColor={Colors.text.muted}
                  textAlignVertical="top"
                />
                <Pressable
                  style={[styles.activitySaveBtn, (!setActSubject.trim() || savingSetAct) && styles.btnDisabled]}
                  onPress={handleSetActivity}
                  disabled={!setActSubject.trim() || savingSetAct}
                >
                  {savingSetAct
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="checkmark-circle-outline" size={14} color="#fff" /><Text style={styles.activitySaveBtnText}>Set</Text></>}
                </Pressable>
              </View>

              {/* Log Activity */}
              <View style={styles.activityFormCard}>
                <View style={styles.activityFormHeader}>
                  <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
                  <Text style={[styles.activityFormTitle, { color: Colors.text.secondary }]}>Log Activity</Text>
                </View>
                <View style={styles.activityTypePills}>
                  {(['call', 'meeting', 'task'] as const).map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.activityTypePill, logActType === t && styles.activityTypePillActive]}
                      onPress={() => setLogActType(t)}
                    >
                      <Text style={[styles.activityTypePillText, logActType === t && styles.activityTypePillTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={[styles.activityInput, styles.activityNoteInput]}
                  value={logActNote}
                  onChangeText={setLogActNote}
                  multiline
                  placeholder="Write a note…"
                  placeholderTextColor={Colors.text.muted}
                  textAlignVertical="top"
                />
                <Pressable
                  style={[styles.activitySaveBtn, (!logActNote.trim() || savingLogAct) && styles.btnDisabled]}
                  onPress={handleLogActivity}
                  disabled={!logActNote.trim() || savingLogAct}
                >
                  {savingLogAct
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="checkmark-circle-outline" size={14} color="#fff" /><Text style={styles.activitySaveBtnText}>Log</Text></>}
                </Pressable>
              </View>

              {/* Create Note */}
              <View style={styles.activityFormCard}>
                <View style={styles.activityFormHeader}>
                  <Ionicons name="create-outline" size={14} color={Colors.text.secondary} />
                  <Text style={[styles.activityFormTitle, { color: Colors.text.secondary }]}>Create Note</Text>
                </View>
                <TextInput
                  style={[styles.activityInput, styles.activityNoteInput]}
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  placeholder="Write a note…"
                  placeholderTextColor={Colors.text.muted}
                  textAlignVertical="top"
                />
                <Pressable
                  style={[styles.activitySaveBtn, (!noteText.trim() || savingNote) && styles.btnDisabled]}
                  onPress={handleCreateNote}
                  disabled={!noteText.trim() || savingNote}
                >
                  {savingNote
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="checkmark-circle-outline" size={14} color="#fff" /><Text style={styles.activitySaveBtnText}>Save Note</Text></>}
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Overview & Activity */}
        <View style={styles.section}>
          <View style={[styles.summaryHeaderLeft, { marginBottom: 10 }]}>
            <Ionicons name="information-circle-outline" size={15} color={Colors.brand[500]} />
            <Text style={styles.sectionLabel}>Overview & Activity</Text>
          </View>
          <View style={styles.detailGrid}>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Status</Text>
              <Text style={[styles.detailVal, { color: statusStyle.color, fontWeight: '600' }]}>{statusStyle.label}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Value</Text>
              <Text style={[styles.detailVal, { color: Colors.brand[500], fontWeight: '700' }]}>{formatValue(deal.value, deal.currency)}</Text>
            </View>
            {deal.close_date ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Close Date</Text>
                <Text style={styles.detailVal}>{new Date(deal.close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
            ) : null}
            {deal.win_percentage != null ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Win %</Text>
                <Text style={styles.detailVal}>{deal.win_percentage}%</Text>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Created</Text>
              <Text style={styles.detailVal}>{createdOn}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailKey}>Owner</Text>
              <Text style={styles.detailVal}>{assignedMember?.name ?? 'Unassigned'}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {deal.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{deal.description}</Text>
          </View>
        ) : null}

        {/* Activity Feed */}
        <View style={styles.section}>
          <View style={[styles.summaryHeaderLeft, { marginBottom: 10 }]}>
            <Ionicons name="time-outline" size={15} color={Colors.brand[500]} />
            <Text style={styles.sectionLabel}>Activity</Text>
          </View>
          {actFeedItems && actFeedItems.length > 0 ? (
            actFeedItems.map((a) => (
              <View key={a.id} style={styles.actFeedItem}>
                <View style={styles.actFeedDot} />
                <View style={styles.actFeedContent}>
                  <Text style={styles.actFeedType}>
                    {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                  </Text>
                  {a.body ? <Text style={styles.actFeedBody}>{a.body}</Text> : null}
                  <Text style={styles.actFeedTime}>
                    {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noActivityText}>No activities yet. Log a note, call, meeting, or task above.</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomBarBtn} onPress={() => setStagePickerOpen(true)}>
          <Ionicons name="git-branch-outline" size={14} color={Colors.brand[500]} />
          <Text style={[styles.bottomBarText, { color: Colors.brand[500] }]} numberOfLines={1}>
            {currentStage?.name ?? 'Stage'}
          </Text>
          <Ionicons name="chevron-up" size={11} color={Colors.brand[500]} />
        </Pressable>
        <Pressable style={[styles.bottomBarBtn, { backgroundColor: statusStyle.bg, borderColor: statusStyle.color + '44' }]} onPress={() => setStatusPickerOpen(true)}>
          <Text style={[styles.bottomBarText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          <Ionicons name="chevron-up" size={11} color={statusStyle.color} />
        </Pressable>
        <Pressable style={styles.bottomBarBtn} onPress={() => setAssignOpen(true)}>
          <Ionicons name="person-outline" size={14} color={Colors.text.secondary} />
          <Text style={styles.bottomBarText} numberOfLines={1}>
            {assignedMember?.name ?? 'Assign'}
          </Text>
          <Ionicons name="chevron-up" size={11} color={Colors.text.muted} />
        </Pressable>
      </View>

      {/* Stage Picker Modal */}
      <Modal visible={stagePickerOpen} transparent animationType="slide" onRequestClose={() => setStagePickerOpen(false)}>
        <Pressable style={styles.modalOverlayBottom} onPress={() => setStagePickerOpen(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Move to Stage</Text>
            {(stages ?? []).map((stage) => (
              <Pressable
                key={stage.id}
                style={[styles.sheetItem, stage.id === deal.stage_id && styles.sheetItemActive]}
                onPress={() => handleMoveStage(stage.id)}
              >
                <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                <Text style={[styles.sheetItemText, stage.id === deal.stage_id && { color: Colors.brand[500], fontWeight: '600' }]}>
                  {stage.name}
                </Text>
                {stage.id === deal.stage_id && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Status Picker Modal */}
      <Modal visible={statusPickerOpen} transparent animationType="slide" onRequestClose={() => setStatusPickerOpen(false)}>
        <Pressable style={styles.modalOverlayBottom} onPress={() => setStatusPickerOpen(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Set Status</Text>
            {(['open', 'won', 'lost'] as const).map((s) => {
              const ss = STATUS_STYLES[s];
              return (
                <Pressable
                  key={s}
                  style={[styles.sheetItem, status === s && styles.sheetItemActive]}
                  onPress={() => handleStatusChange(s)}
                >
                  <Text style={[styles.sheetItemText, { color: ss.color }]}>{ss.label}</Text>
                  {status === s && <Ionicons name="checkmark" size={16} color={ss.color} style={{ marginLeft: 'auto' }} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Assign Modal */}
      <Modal visible={assignOpen} transparent animationType="slide" onRequestClose={() => setAssignOpen(false)}>
        <Pressable style={styles.modalOverlayBottom} onPress={() => setAssignOpen(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Assign To</Text>
            <Pressable
              style={[styles.sheetItem, !assignedTo && styles.sheetItemActive]}
              onPress={() => handleAssign('')}
            >
              <Text style={[styles.sheetItemText, { color: Colors.text.secondary }]}>Unassigned</Text>
              {!assignedTo && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
            </Pressable>
            {(members ?? []).map((m) => (
              <Pressable
                key={m.userId}
                style={[styles.sheetItem, assignedTo === m.userId && styles.sheetItemActive]}
                onPress={() => handleAssign(m.userId)}
              >
                <Text style={[styles.sheetItemText, { color: Colors.text.primary }]}>{m.name || m.email}</Text>
                {assignedTo === m.userId && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Calendar Modal */}
      <Modal visible={datePickerOpen} transparent animationType="fade" onRequestClose={() => setDatePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDatePickerOpen(false)}>
          <View style={styles.calCard}>
            {/* Month nav */}
            <View style={styles.calHeader}>
              <Pressable onPress={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>
                <Ionicons name="chevron-back" size={20} color={Colors.text.primary} />
              </Pressable>
              <Text style={styles.calMonthLabel}>{MONTHS[calMonth]} {calYear}</Text>
              <Pressable onPress={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>
                <Ionicons name="chevron-forward" size={20} color={Colors.text.primary} />
              </Pressable>
            </View>
            {/* Day headers */}
            <View style={styles.calRow}>
              {DAYS.map((d) => <Text key={d} style={styles.calDayLabel}>{d}</Text>)}
            </View>
            {/* Day grid */}
            {Array.from({ length: Math.ceil((calFirstDow + calDaysInMonth) / 7) }).map((_, week) => (
              <View key={week} style={styles.calRow}>
                {Array.from({ length: 7 }).map((_, dow) => {
                  const dayNum = week * 7 + dow - calFirstDow + 1;
                  const isValid = dayNum >= 1 && dayNum <= calDaysInMonth;
                  const isPast = isValid && new Date(calYear, calMonth, dayNum) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isToday = isValid && dayNum === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                  const isSel = calSelectedDay === dayNum;
                  return (
                    <Pressable
                      key={dow}
                      disabled={!isValid || isPast}
                      onPress={() => { setCalSelectedDay(dayNum); setDatePickerOpen(false); }}
                      style={[styles.calDayCell, isSel && styles.calDayCellSelected, isToday && !isSel && styles.calDayCellToday]}
                    >
                      <Text style={[
                        styles.calDayText,
                        !isValid && { color: 'transparent' },
                        isPast && { color: Colors.text.muted },
                        isToday && !isSel && { color: Colors.brand[500], fontWeight: '700' },
                        isSel && { color: '#fff' },
                      ]}>
                        {isValid ? dayNum : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 14, color: '#ef4444' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.bg.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerName: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 6 },

  // Priority pill
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 4,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityPillText: { fontSize: 11, fontWeight: '600' },

  scroll: { flex: 1 },

  // Section
  section: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  summaryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  collapseBtn: { padding: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },

  // Deal info badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  stageBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  stageDot: { width: 6, height: 6, borderRadius: 3 },
  stageBadgeText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  winBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  winBadgeText: { fontSize: 11, fontWeight: '600', color: '#22c55e' },

  // Contact rows
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  contactText: { fontSize: 13, color: Colors.text.primary, flex: 1 },

  // Tasks
  taskCountBadge: { backgroundColor: Colors.brand[500], borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  taskCountText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  emptyTaskText: { fontSize: 12, color: Colors.text.muted, marginBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  taskCheckbox: { marginRight: 10, marginTop: 1 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: '500', color: Colors.text.primary },
  taskMeta: { fontSize: 11, color: Colors.text.muted, marginTop: 2 },
  completedLabel: { fontSize: 11, fontWeight: '600', color: Colors.text.muted, marginTop: 10, marginBottom: 4 },

  // Lodge an Activity
  lodgeChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  lodgeChevronText: { fontSize: 13, fontWeight: '600', color: Colors.brand[500] },

  // Activity forms
  activityFormCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityFormHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  activityFormTitle: { fontSize: 12, fontWeight: '600', color: Colors.brand[500] },
  activityTypePills: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  activityTypePill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  activityTypePillActive: { backgroundColor: Colors.brand[500] + '15', borderColor: Colors.brand[500] + '60' },
  activityTypePillText: { fontSize: 12, fontWeight: '500', color: Colors.text.secondary },
  activityTypePillTextActive: { color: Colors.brand[500], fontWeight: '600' },
  activityInput: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  activityScheduleInput: { minHeight: 52 },
  activityNoteInput: { minHeight: 72 },
  activitySaveBtn: {
    backgroundColor: Colors.brand[500],
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  activitySaveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },

  // Overview grid
  detailGrid: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailKey: { fontSize: 12, color: Colors.text.muted, width: 90 },
  detailVal: { fontSize: 12, color: Colors.text.primary, flex: 1, textAlign: 'right' },

  // Description
  descriptionText: { fontSize: 13, color: Colors.text.primary, lineHeight: 20, marginTop: 6 },

  // Activity feed
  actFeedItem: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  actFeedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand[500], marginTop: 4 },
  actFeedContent: { flex: 1 },
  actFeedType: { fontSize: 12, fontWeight: '600', color: Colors.text.primary },
  actFeedBody: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  actFeedTime: { fontSize: 11, color: Colors.text.muted, marginTop: 3 },
  noActivityText: { fontSize: 12, color: Colors.text.muted, lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  bottomBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bottomBarText: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalOverlayBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dropdownCard: {
    backgroundColor: Colors.bg.card, borderRadius: 14,
    width: 280, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  dropdownTitle: { fontSize: 12, fontWeight: '600', color: Colors.text.muted, paddingHorizontal: 16, paddingVertical: 8 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemActive: { backgroundColor: Colors.brand[500] + '10' },
  dropdownItemText: { fontSize: 14, color: Colors.text.primary, flex: 1 },
  bottomSheet: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 34, paddingTop: 12,
    minHeight: 240,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 14, fontWeight: '600', color: Colors.text.muted, paddingHorizontal: 20, paddingBottom: 8 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  sheetItemActive: { backgroundColor: Colors.brand[500] + '10' },
  sheetItemText: { fontSize: 15, color: Colors.text.primary, flex: 1 },

  // Calendar
  calCard: {
    backgroundColor: Colors.bg.card, borderRadius: 16, padding: 16, width: 320,
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calMonthLabel: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  calRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  calDayLabel: { width: 36, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.text.muted },
  calDayCell: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  calDayCellSelected: { backgroundColor: Colors.brand[500] },
  calDayCellToday: { borderWidth: 1, borderColor: Colors.brand[500] },
  calDayText: { fontSize: 13, color: Colors.text.primary },
});

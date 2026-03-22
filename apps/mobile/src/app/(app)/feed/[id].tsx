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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth';
import { fetchWorkspaceMembers } from '@/lib/api';
import type { SageTicketPriority, FeedItem } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailDetail {
  id: string;
  from_name: string;
  from_address: string;
  subject: string;
  body_text: string | null;
  ai_summary: string | null;
  ai_priority: SageTicketPriority;
  ai_reply_drafts: { tone: string; body: string }[] | null;
  received_at: string;
  assigned_to: string | null;
}

interface ConversationDetail {
  id: string;
  title: string;
  platform: string | null;
  ai_summary: string | null;
  ai_priority: SageTicketPriority;
  ai_entities: { name?: string; email?: string; phone?: string; company?: string } | null;
  sentiment: string | null;
  message_count: number;
  status: string;
  assigned_to: string | null;
  created_at: string;
  last_activity_at: string;
  bot: { name: string } | { name: string }[] | null;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchEmailDetail(id: string): Promise<EmailDetail> {
  const { data, error } = await supabase
    .from('sage_emails')
    .select('id, from_name, from_address, subject, body_text, ai_summary, ai_priority, ai_reply_drafts, received_at, assigned_to')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Not found');
  return data as EmailDetail;
}

async function fetchBotDetail(id: string): Promise<ConversationDetail> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, platform, ai_summary, ai_priority, ai_entities, sentiment, message_count, status, assigned_to, created_at, last_activity_at, bot:bots(name)')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Not found');
  return data as ConversationDetail;
}

async function fetchConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as ConversationMessage[];
}

async function fetchFeedItemDirect(id: string, type: string): Promise<FeedItem> {
  if (type === 'bot') {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, ai_priority, ai_summary, last_activity_at, platform')
      .eq('id', id)
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Not found');
    const r = data as any;
    return { id: r.id, type: 'bot', contactName: r.title, summary: r.ai_summary, priority: r.ai_priority ?? 'low', createdAt: r.last_activity_at, source: r.platform };
  }
  if (type === 'form') {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, email, phone, company, lead_score, source_platform, created_at')
      .eq('id', id)
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Not found');
    const r = data as any;
    return { id: r.id, type: 'form', contactName: r.name, contactEmail: r.email, contactPhone: r.phone, company: r.company, priority: r.lead_score ?? 'low', createdAt: r.created_at, source: r.source_platform };
  }
  const { data, error } = await supabase
    .from('sage_tickets')
    .select('id, title, priority, status, created_at, name, email, phone, description')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Not found');
  const r = data as any;
  return { id: r.id, type: 'ticket', contactName: r.name, contactEmail: r.email, contactPhone: r.phone, summary: r.description ?? r.title, priority: r.priority ?? 'low', createdAt: r.created_at };
}

// ---------------------------------------------------------------------------
// Priority constants
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS: { value: SageTicketPriority; label: string; color: string; bg: string }[] = [
  { value: 'high',   label: 'High',   color: Colors.priority.high,   bg: Colors.priorityBg.high },
  { value: 'medium', label: 'Medium', color: Colors.priority.medium, bg: Colors.priorityBg.medium },
  { value: 'low',    label: 'Low',    color: Colors.priority.low,    bg: Colors.priorityBg.low },
];

const TYPE_COLORS: Record<string, string> = {
  email:  '#3b82f6',
  bot:    '#8b5cf6',
  form:   '#15A4AE',
  ticket: '#f59e0b',
};

// ---------------------------------------------------------------------------
// Priority dropdown
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
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.priorityDot, { backgroundColor: o.color }]} />
                <Text style={[styles.dropdownItemText, { color: o.color }]}>{o.label}</Text>
                {current === o.value && (
                  <Ionicons name="checkmark" size={16} color={o.color} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Email detail screen (Screen 1)
// ---------------------------------------------------------------------------

function EmailDetailView({
  email,
  onReply,
  onDelete,
  onBack,
}: {
  email: EmailDetail;
  onReply: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [priority, setPriority] = useState<SageTicketPriority>(email.ai_priority ?? 'low');
  const [detailsCollapsed, setDetailsCollapsed] = useState(!email.ai_summary || (email.ai_priority ?? 'low') === 'low');
  const [analysing, setAnalysing] = useState(false);
  const [assignedTo, setAssignedTo] = useState(email.assigned_to ?? '');
  const [assignOpen, setAssignOpen] = useState(false);
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['workspace-members', user?.workspaceId],
    queryFn: () => fetchWorkspaceMembers(user!.workspaceId),
    enabled: !!user?.workspaceId,
  });
  const members = membersQuery.data ?? [];

  const priorityMutation = useMutation({
    mutationFn: async (p: SageTicketPriority) => {
      await supabase.from('sage_emails').update({ ai_priority: p }).eq('id', email.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-detail', email.id] }),
  });

  function handlePriorityChange(p: SageTicketPriority) {
    setPriority(p);
    priorityMutation.mutate(p);
  }

  function handleDelete() {
    Alert.alert('Delete Email', 'Move this email to trash?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('sage_emails').update({ is_trashed: true }).eq('id', email.id);
          queryClient.invalidateQueries({ queryKey: ['feed'] });
          onDelete();
        },
      },
    ]);
  }

  const receivedDate = new Date(email.received_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>

        <Text style={styles.headerName} numberOfLines={1}>{email.from_name || email.from_address}</Text>

        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Edit', 'Edit email coming soon')}>
            <Ionicons name="pencil-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Download', 'Download coming soon')}>
            <Ionicons name="download-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
          <PriorityDropdown current={priority} onChange={handlePriorityChange} />
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* AI Summary */}
        <View style={styles.section}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <Ionicons
                name={email.ai_summary ? 'sparkles' : 'sparkles-outline'}
                size={15}
                color={email.ai_summary ? Colors.brand[500] : Colors.text.muted}
              />
              <Text style={[styles.sectionLabel, !email.ai_summary && { color: Colors.text.muted }]}>
                {email.ai_summary ? 'AI Summary' : 'No AI Summary'}
              </Text>
            </View>
            <Pressable onPress={() => setDetailsCollapsed((v) => !v)} style={styles.collapseBtn}>
              <Ionicons name={detailsCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.text.muted} />
            </Pressable>
          </View>
          {!detailsCollapsed && email.ai_summary && (
            <Text style={styles.summaryText}>{email.ai_summary}</Text>
          )}
          {/* Analyse button only for low priority when no summary exists */}
          {!email.ai_summary && priority === 'low' && (
            <Pressable
              style={[styles.analyseBtn, { marginTop: 10 }, analysing && styles.btnDisabled]}
              disabled={analysing}
              onPress={async () => {
                setAnalysing(true);
                try {
                  await supabase.functions.invoke('analyse-email', { body: { email_id: email.id } });
                  queryClient.invalidateQueries({ queryKey: ['email-detail', email.id] });
                } catch {
                  Alert.alert('Error', 'Analysis failed. Please try again.');
                } finally {
                  setAnalysing(false);
                }
              }}
            >
              {analysing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={14} color="#fff" />}
              <Text style={styles.analyseBtnText}>{analysing ? 'Analysing…' : 'Analyse with Sage AI'}</Text>
            </Pressable>
          )}
        </View>

        {/* Contact Info — hidden when collapsed */}
        {!detailsCollapsed && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Contact Info</Text>
            <View style={styles.contactRow}>
              <Ionicons name="person-outline" size={14} color={Colors.text.muted} />
              <Text style={styles.contactText}>{email.from_name || '—'}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={14} color={Colors.text.muted} />
              <Text style={styles.contactText}>{email.from_address}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="time-outline" size={14} color={Colors.text.muted} />
              <Text style={styles.contactText}>{receivedDate}</Text>
            </View>
          </View>
        )}

        {/* Assigned To — always visible */}
        <View style={[styles.section, { marginTop: 0 }]}>
          <Pressable style={styles.dropdownField} onPress={() => setAssignOpen(true)}>
            <Text style={styles.dropdownFieldLabel}>Assigned To</Text>
            <View style={styles.dropdownFieldRight}>
              <Text style={styles.dropdownFieldValue}>
                {members.find((m) => m.userId === assignedTo)?.name || 'Unassigned'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.text.muted} />
            </View>
          </Pressable>
        </View>

        {/* Original Email */}
        <View style={styles.section}>
          <Text style={styles.emailSubject}>{email.subject}</Text>
          <View style={styles.divider} />
          <Text style={styles.emailBody}>{email.body_text ?? 'No content'}</Text>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Pressable style={styles.bottomActionBtn} onPress={() => Alert.alert('Add Deal', 'Coming soon')}>
            <Ionicons name="briefcase-outline" size={15} color={Colors.brand[500]} />
            <Text style={[styles.bottomActionText, { color: Colors.brand[500] }]}>Add Deal</Text>
          </Pressable>
          <Pressable style={styles.bottomActionBtn} onPress={() => Alert.alert('Add Ticket', 'Coming soon')}>
            <Ionicons name="ticket-outline" size={15} color={Colors.text.secondary} />
            <Text style={styles.bottomActionText}>Add Ticket</Text>
          </Pressable>
        </View>
        <Pressable style={styles.replyBtn} onPress={onReply}>
          <Ionicons name="arrow-undo-outline" size={16} color="#fff" />
          <Text style={styles.replyBtnText}>Reply</Text>
        </Pressable>
      </View>

      {/* Assigned To Modal */}
      <Modal visible={assignOpen} transparent animationType="fade" onRequestClose={() => setAssignOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssignOpen(false)}>
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Assign To</Text>
            <Pressable
              style={[styles.dropdownItem, !assignedTo && styles.dropdownItemActive]}
              onPress={async () => {
                setAssignedTo('');
                setAssignOpen(false);
                await supabase.from('sage_emails').update({ assigned_to: null }).eq('id', email.id);
              }}
            >
              <Text style={[styles.dropdownItemText, { color: Colors.text.secondary }]}>Unassigned</Text>
              {!assignedTo && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
            </Pressable>
            {members.map((m) => (
              <Pressable
                key={m.userId}
                style={[styles.dropdownItem, assignedTo === m.userId && styles.dropdownItemActive]}
                onPress={async () => {
                  setAssignedTo(m.userId);
                  setAssignOpen(false);
                  await supabase.from('sage_emails').update({ assigned_to: m.userId }).eq('id', email.id);
                }}
              >
                <Text style={[styles.dropdownItemText, { color: Colors.text.primary }]}>{m.name || m.email}</Text>
                {assignedTo === m.userId && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Reply screen (Screen 2)
// ---------------------------------------------------------------------------

function EmailReplyView({
  email,
  onBack,
}: {
  email: EmailDetail;
  onBack: () => void;
}) {
  const [body, setBody] = useState(email.ai_reply_drafts?.[0]?.body ?? '');
  const [enhancing, setEnhancing] = useState(false);
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  async function handleEnhance() {
    if (!body.trim()) return;
    setEnhancing(true);
    try {
      // Update ai_reply in DB, then re-fetch
      const { data } = await supabase
        .from('sage_emails')
        .select('ai_reply_drafts')
        .eq('id', email.id)
        .single();
      const draft = (data?.ai_reply_drafts as { tone: string; body: string }[] | null)?.[0]?.body;
      if (draft) setBody(draft);
    } catch {
      Alert.alert('Error', 'Failed to enhance reply');
    } finally {
      setEnhancing(false);
    }
  }

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    try {
      // Mark email as replied
      await supabase
        .from('sage_emails')
        .update({ is_replied: true })
        .eq('id', email.id);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sent', 'Reply sent successfully', [{ text: 'OK', onPress: onBack }]);
    } catch {
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerName}>Reply</Text>
        <View style={{ width: 80 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Reply to label */}
        <View style={styles.replyToBar}>
          <Text style={styles.replyToLabel}>To: </Text>
          <Text style={styles.replyToAddress} numberOfLines={1}>
            {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}
          </Text>
        </View>
        <View style={styles.replySubjectBar}>
          <Text style={styles.replyToLabel}>Subject: </Text>
          <Text style={styles.replyToAddress} numberOfLines={1}>Re: {email.subject}</Text>
        </View>

        <View style={styles.divider} />

        {/* AI prefilled reply body */}
        <ScrollView style={styles.replyScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.replyInput}
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Write your reply here…"
            placeholderTextColor={Colors.text.muted}
            textAlignVertical="top"
            autoFocus={!body}
          />
        </ScrollView>

        {/* Bottom action bar */}
        <View style={styles.replyBottomBar}>
          <Pressable
            style={[styles.enhanceBtn, enhancing && styles.btnDisabled]}
            onPress={handleEnhance}
            disabled={enhancing}
          >
            {enhancing ? (
              <ActivityIndicator size="small" color={Colors.brand[500]} />
            ) : (
              <Ionicons name="sparkles-outline" size={15} color={Colors.brand[500]} />
            )}
            <Text style={styles.enhanceBtnText}>
              {enhancing ? 'Enhancing…' : 'Enhance with Sage AI'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.sendBtn, sending && styles.btnDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={15} color="#fff" />
            )}
            <Text style={styles.sendBtnText}>{sending ? 'Sending…' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Bot conversation detail screen (Screen 1) — mirrors EmailDetailView
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ['active', 'closed', 'archived'] as const;

function BotDetailView({
  conv,
  messages,
  onReply,
  onBack,
}: {
  conv: ConversationDetail;
  messages: ConversationMessage[];
  onReply: () => void;
  onBack: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [priority, setPriority] = useState<SageTicketPriority>(conv.ai_priority ?? 'low');
  const [detailsCollapsed, setDetailsCollapsed] = useState(!conv.ai_summary || (conv.ai_priority ?? 'low') === 'low');
  const [convCollapsed, setConvCollapsed] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [status, setStatus] = useState(conv.status ?? 'active');
  const [assignedTo, setAssignedTo] = useState(conv.assigned_to ?? '');
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['workspace-members', user?.workspaceId],
    queryFn: () => fetchWorkspaceMembers(user!.workspaceId),
    enabled: !!user?.workspaceId,
  });
  const members = membersQuery.data ?? [];

  const priorityMutation = useMutation({
    mutationFn: async (p: SageTicketPriority) => {
      await supabase.from('conversations').update({ ai_priority: p }).eq('id', conv.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bot-detail', conv.id] }),
  });

  async function handleStatusChange(s: string) {
    setStatus(s);
    setStatusOpen(false);
    await supabase.from('conversations').update({ status: s }).eq('id', conv.id);
    queryClient.invalidateQueries({ queryKey: ['bot-detail', conv.id] });
  }

  async function handleAssignChange(userId: string) {
    setAssignedTo(userId);
    setAssignOpen(false);
    await supabase.from('conversations').update({ assigned_to: userId || null }).eq('id', conv.id);
    queryClient.invalidateQueries({ queryKey: ['bot-detail', conv.id] });
  }

  const shortId = '#' + conv.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  const startedOn = new Date(conv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const entities = conv.ai_entities ?? {};
  const assignedMember = members.find((m) => m.userId === assignedTo);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerName} numberOfLines={1}>{conv.title || 'Bot Conversation'}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Edit', 'Coming soon')}>
            <Ionicons name="pencil-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Download', 'Coming soon')}>
            <Ionicons name="download-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Delete', 'Coming soon')}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
          <PriorityDropdown current={priority} onChange={(p) => { setPriority(p); priorityMutation.mutate(p); }} />
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* AI Summary */}
        <View style={styles.section}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <Ionicons name={conv.ai_summary ? 'sparkles' : 'sparkles-outline'} size={15} color={conv.ai_summary ? Colors.brand[500] : Colors.text.muted} />
              <Text style={[styles.sectionLabel, !conv.ai_summary && { color: Colors.text.muted }]}>
                {conv.ai_summary ? 'AI Summary' : 'No AI Summary'}
              </Text>
            </View>
            <Pressable onPress={() => setDetailsCollapsed((v) => !v)} style={styles.collapseBtn}>
              <Ionicons name={detailsCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.text.muted} />
            </Pressable>
          </View>
          {!detailsCollapsed && conv.ai_summary && (
            <Text style={styles.summaryText}>{conv.ai_summary}</Text>
          )}
          {!conv.ai_summary && priority === 'low' && (
            <Pressable
              style={[styles.analyseBtn, { marginTop: 10 }, analysing && styles.btnDisabled]}
              disabled={analysing}
              onPress={async () => {
                setAnalysing(true);
                try {
                  await supabase.functions.invoke('analyze-conversation', { body: { conversation_id: conv.id } });
                  queryClient.invalidateQueries({ queryKey: ['bot-detail', conv.id] });
                } catch {
                  Alert.alert('Error', 'Analysis failed. Please try again.');
                } finally {
                  setAnalysing(false);
                }
              }}
            >
              {analysing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={14} color="#fff" />}
              <Text style={styles.analyseBtnText}>{analysing ? 'Analysing…' : 'Analyse with Sage AI'}</Text>
            </Pressable>
          )}
        </View>

        {/* Conversation Details — own collapse, default collapsed */}
        <View style={styles.section}>
          <Pressable style={styles.summaryHeader} onPress={() => setConvCollapsed((v) => !v)}>
            <Text style={styles.sectionLabel}>Conversation Details</Text>
            <Ionicons name={convCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.text.muted} />
          </Pressable>
          {!convCollapsed && (
            <View style={[styles.detailGrid, { marginTop: 8 }]}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Bot</Text>
                <Text style={styles.detailVal}>{(Array.isArray(conv.bot) ? conv.bot[0]?.name : conv.bot?.name) ?? '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Platform</Text>
                <Text style={styles.detailVal}>{conv.platform ?? '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Tone</Text>
                <Text style={styles.detailVal}>{conv.sentiment ?? '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Total Messages</Text>
                <Text style={styles.detailVal}>{conv.message_count ?? messages.length}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Started On</Text>
                <Text style={styles.detailVal}>{startedOn}</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailKey}>ID</Text>
                <Text style={styles.detailVal}>{shortId}</Text>
              </View>
            </View>
          )}
        </View>

        {/* User Details — hidden when AI summary collapsed */}
        {!detailsCollapsed && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>User Details</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Name</Text>
                <Text style={styles.detailVal}>{entities.name ?? '—'}</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailKey}>Email</Text>
                <Text style={styles.detailVal}>{entities.email ?? '—'}</Text>
              </View>
            </View>

            {/* Status dropdown */}
            <Pressable style={styles.dropdownField} onPress={() => setStatusOpen(true)}>
              <Text style={styles.dropdownFieldLabel}>Status</Text>
              <View style={styles.dropdownFieldRight}>
                <Text style={styles.dropdownFieldValue}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.text.muted} />
              </View>
            </Pressable>

            {/* Assigned To dropdown */}
            <Pressable style={[styles.dropdownField, { marginTop: 8 }]} onPress={() => setAssignOpen(true)}>
              <Text style={styles.dropdownFieldLabel}>Assigned To</Text>
              <View style={styles.dropdownFieldRight}>
                <Text style={styles.dropdownFieldValue}>{assignedMember?.name || 'Unassigned'}</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.text.muted} />
              </View>
            </Pressable>
          </View>
        )}

        {/* Chat messages */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Conversation</Text>
          {messages.length === 0 ? (
            <Text style={styles.noMessages}>No messages yet.</Text>
          ) : (
            messages.map((msg) => (
              <View key={msg.id} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userBubbleText : styles.assistantBubbleText]}>
                  {msg.content}
                </Text>
                <Text style={[styles.bubbleTime, msg.role === 'user' ? { textAlign: 'right' } : {}]}>
                  {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Pressable style={styles.bottomActionBtn} onPress={() => Alert.alert('Add Deal', 'Coming soon')}>
            <Ionicons name="briefcase-outline" size={15} color={Colors.brand[500]} />
            <Text style={[styles.bottomActionText, { color: Colors.brand[500] }]}>Add Deal</Text>
          </Pressable>
          <Pressable style={styles.bottomActionBtn} onPress={() => Alert.alert('Add Ticket', 'Coming soon')}>
            <Ionicons name="ticket-outline" size={15} color={Colors.text.secondary} />
            <Text style={styles.bottomActionText}>Add Ticket</Text>
          </Pressable>
        </View>
        <Pressable style={styles.replyBtn} onPress={onReply}>
          <Ionicons name="arrow-undo-outline" size={16} color="#fff" />
          <Text style={styles.replyBtnText}>Reply</Text>
        </Pressable>
      </View>

      {/* Status Modal */}
      <Modal visible={statusOpen} transparent animationType="fade" onRequestClose={() => setStatusOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setStatusOpen(false)}>
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Set Status</Text>
            {STATUS_OPTIONS.map((s) => (
              <Pressable
                key={s}
                style={[styles.dropdownItem, status === s && styles.dropdownItemActive]}
                onPress={() => handleStatusChange(s)}
              >
                <Text style={[styles.dropdownItemText, { color: Colors.text.primary }]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
                {status === s && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Assigned To Modal */}
      <Modal visible={assignOpen} transparent animationType="fade" onRequestClose={() => setAssignOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssignOpen(false)}>
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Assign To</Text>
            <Pressable
              style={[styles.dropdownItem, !assignedTo && styles.dropdownItemActive]}
              onPress={() => handleAssignChange('')}
            >
              <Text style={[styles.dropdownItemText, { color: Colors.text.secondary }]}>Unassigned</Text>
              {!assignedTo && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
            </Pressable>
            {members.map((m) => (
              <Pressable
                key={m.userId}
                style={[styles.dropdownItem, assignedTo === m.userId && styles.dropdownItemActive]}
                onPress={() => handleAssignChange(m.userId)}
              >
                <Text style={[styles.dropdownItemText, { color: Colors.text.primary }]}>{m.name || m.email}</Text>
                {assignedTo === m.userId && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Bot reply screen (Screen 2) — mirrors EmailReplyView
// ---------------------------------------------------------------------------

function BotReplyView({ conv, onBack }: { conv: ConversationDetail; onBack: () => void }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        role: 'assistant',
        content: body,
      });
      queryClient.invalidateQueries({ queryKey: ['bot-messages', conv.id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sent', 'Reply sent successfully', [{ text: 'OK', onPress: onBack }]);
    } catch {
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerName}>Reply</Text>
        <View style={{ width: 80 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.replyToBar}>
          <Text style={styles.replyToLabel}>To: </Text>
          <Text style={styles.replyToAddress} numberOfLines={1}>{conv.title}</Text>
        </View>
        <View style={styles.replySubjectBar}>
          <Text style={styles.replyToLabel}>Platform: </Text>
          <Text style={styles.replyToAddress} numberOfLines={1}>{conv.platform ?? 'Bot'}</Text>
        </View>
        <View style={styles.divider} />

        <ScrollView style={styles.replyScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.replyInput}
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Write your reply here…"
            placeholderTextColor={Colors.text.muted}
            textAlignVertical="top"
            autoFocus
          />
        </ScrollView>

        <View style={styles.replyBottomBar}>
          <Pressable
            style={styles.enhanceBtn}
            onPress={() => Alert.alert('Enhance', 'AI enhancement coming soon')}
          >
            <Ionicons name="sparkles-outline" size={15} color={Colors.brand[500]} />
            <Text style={styles.enhanceBtnText}>Enhance with Sage AI</Text>
          </Pressable>
          <Pressable style={[styles.sendBtn, sending && styles.btnDisabled]} onPress={handleSend} disabled={sending}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={15} color="#fff" />}
            <Text style={styles.sendBtnText}>{sending ? 'Sending…' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Form (lead) detail screen (Screen 1)
// ---------------------------------------------------------------------------

interface FormDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  website: string | null;
  source_platform: string;
  campaign_name: string | null;
  ad_name: string | null;
  form_name: string | null;
  lead_score: SageTicketPriority | null;
  pipeline_stage: string | null;
  raw_payload: Record<string, string> | null;
  assigned_to: string | null;
  created_at: string;
}

async function fetchFormDetail(id: string): Promise<FormDetail> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, email, phone, company, job_title, website, source_platform, campaign_name, ad_name, form_name, lead_score, pipeline_stage, raw_payload, assigned_to, created_at')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Not found');
  return data as FormDetail;
}

function FormDetailView({
  form,
  onReply,
  onBack,
}: {
  form: FormDetail;
  onReply: () => void;
  onBack: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [priority, setPriority] = useState<SageTicketPriority>(form.lead_score ?? 'low');
  const [detailsCollapsed, setDetailsCollapsed] = useState((form.lead_score ?? 'low') === 'low');
  const [formDetailsCollapsed, setFormDetailsCollapsed] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [assignedTo, setAssignedTo] = useState(form.assigned_to ?? '');
  const [assignOpen, setAssignOpen] = useState(false);
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['workspace-members', user?.workspaceId],
    queryFn: () => fetchWorkspaceMembers(user!.workspaceId),
    enabled: !!user?.workspaceId,
  });
  const members = membersQuery.data ?? [];

  const priorityMutation = useMutation({
    mutationFn: async (p: SageTicketPriority) => {
      await supabase.from('leads').update({ lead_score: p }).eq('id', form.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['form-detail', form.id] }),
  });

  const shortId = '#' + form.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  const submittedOn = new Date(form.created_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const assignedMember = members.find((m) => m.userId === assignedTo);

  // Stems: field is shown if its normalised key starts with OR equals any stem.
  // Keep stems specific enough to avoid false matches (e.g. "sms_" won't match "phone").
  const SALES_STEMS = [
    'first_name', 'last_name', 'full_name', 'name',
    'email',
    'phone', 'mobile', 'telephone',
    'company', 'organisation', 'organization', 'business',
    'address', 'street', 'city', 'town', 'suburb', 'state', 'postcode', 'zip', 'postal', 'region', 'country',
    'tag', 'interest', 'service', 'product',
    'message', 'comment', 'note', 'enquiry', 'inquiry', 'question',
    'budget', 'job_title', 'role', 'website',
    'email_marketing', 'marketing_opt', 'newsletter', 'subscribed', 'unsubscribed',
    'source', 'lead_source', 'referral',
    'date_added', 'date_created', 'date_modified', 'date_updated', 'created_at', 'updated_at', 'last_modified',
  ];
  const rawFields = form.raw_payload
    ? Object.entries(form.raw_payload).filter(([key]) => {
        // Convert camelCase → snake_case, then lowercase and normalise separators
        const k = key
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toLowerCase()
          .replace(/[\s-]/g, '_');
        return SALES_STEMS.some(
          (s) =>
            k === s ||
            k.startsWith(s + '_') ||
            k.endsWith('_' + s) ||
            // handle stem + digit suffix, e.g. address1, address2
            (k.startsWith(s) && /^\d/.test(k.slice(s.length))),
        );
      })
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerName} numberOfLines={1}>{form.name || 'Form Submission'}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Edit', 'Coming soon')}>
            <Ionicons name="pencil-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Download', 'Coming soon')}>
            <Ionicons name="download-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Delete', 'Coming soon')}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
          <PriorityDropdown current={priority} onChange={(p) => { setPriority(p); priorityMutation.mutate(p); }} />
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* AI Summary + Contact Info — one card, one chevron */}
        <View style={styles.section}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <Ionicons name="sparkles-outline" size={15} color={Colors.text.muted} />
              <Text style={[styles.sectionLabel, { color: Colors.text.muted }]}>No AI Summary</Text>
            </View>
            <Pressable onPress={() => setDetailsCollapsed((v) => !v)} style={styles.collapseBtn}>
              <Ionicons name={detailsCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.text.muted} />
            </Pressable>
          </View>
          {!priority || priority === 'low' ? (
            <Pressable
              style={[styles.analyseBtn, { marginTop: 4 }, analysing && styles.btnDisabled]}
              disabled={analysing}
              onPress={async () => {
                setAnalysing(true);
                try {
                  await supabase.functions.invoke('analyse-lead', { body: { lead_id: form.id } });
                  queryClient.invalidateQueries({ queryKey: ['form-detail', form.id] });
                } catch {
                  Alert.alert('Error', 'Analysis failed. Please try again.');
                } finally {
                  setAnalysing(false);
                }
              }}
            >
              {analysing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={14} color="#fff" />}
              <Text style={styles.analyseBtnText}>{analysing ? 'Analysing…' : 'Analyse with Sage AI'}</Text>
            </Pressable>
          ) : null}

          {/* Contact Info — collapses with AI summary chevron */}
          {!detailsCollapsed && (
            <>
              <View style={[styles.divider, { marginTop: 12 }]} />
              <Text style={[styles.sectionLabel, { marginTop: 10 }]}>Contact Info</Text>
              <View style={styles.contactRow}>
                <Ionicons name="person-outline" size={14} color={Colors.text.muted} />
                <Text style={styles.contactText}>{form.name || '—'}</Text>
              </View>
              {form.email ? (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{form.email}</Text>
                </View>
              ) : null}
              {form.phone ? (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{form.phone}</Text>
                </View>
              ) : null}
              {form.company ? (
                <View style={styles.contactRow}>
                  <Ionicons name="business-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{form.company}</Text>
                </View>
              ) : null}
              {form.job_title ? (
                <View style={styles.contactRow}>
                  <Ionicons name="briefcase-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{form.job_title}</Text>
                </View>
              ) : null}
              {form.website ? (
                <View style={styles.contactRow}>
                  <Ionicons name="globe-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{form.website}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Form Details — own collapse, default collapsed */}
        <View style={styles.section}>
          <Pressable style={styles.summaryHeader} onPress={() => setFormDetailsCollapsed((v) => !v)}>
            <Text style={styles.sectionLabel}>Form Details</Text>
            <Ionicons name={formDetailsCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.text.muted} />
          </Pressable>
          {!formDetailsCollapsed && (
            <View style={[styles.detailGrid, { marginTop: 8 }]}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Source</Text>
                <Text style={styles.detailVal}>{form.source_platform ?? '—'}</Text>
              </View>
              {form.campaign_name ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Campaign</Text>
                  <Text style={styles.detailVal}>{form.campaign_name}</Text>
                </View>
              ) : null}
              {form.ad_name ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Ad</Text>
                  <Text style={styles.detailVal}>{form.ad_name}</Text>
                </View>
              ) : null}
              {form.form_name ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Form</Text>
                  <Text style={styles.detailVal}>{form.form_name}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Stage</Text>
                <Text style={styles.detailVal}>{form.pipeline_stage ?? '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Submitted</Text>
                <Text style={styles.detailVal}>{submittedOn}</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailKey}>ID</Text>
                <Text style={styles.detailVal}>{shortId}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Assigned To — always visible */}
        <View style={[styles.section, { marginTop: 0 }]}>
          <Pressable style={styles.dropdownField} onPress={() => setAssignOpen(true)}>
            <Text style={styles.dropdownFieldLabel}>Assigned To</Text>
            <View style={styles.dropdownFieldRight}>
              <Text style={styles.dropdownFieldValue}>{assignedMember?.name || 'Unassigned'}</Text>
              <Ionicons name="chevron-down" size={14} color={Colors.text.muted} />
            </View>
          </Pressable>
        </View>

        {/* Form fields — customer friendly */}
        {rawFields.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.emailSubject}>{form.form_name || 'Form Submission'}</Text>
            <View style={styles.divider} />
            <View style={styles.detailGrid}>
              {rawFields.map(([key, val], i) => {
                const label = key
                  .replace(/_/g, ' ')
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                const isLast = i === rawFields.length - 1;
                return (
                  <View key={key} style={[styles.detailRow, isLast && { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailKey}>{label}</Text>
                    <Text style={[styles.detailVal, { flexShrink: 1 }]} numberOfLines={3}>{String(val)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Pressable style={styles.bottomActionBtn} onPress={() => Alert.alert('Add Deal', 'Coming soon')}>
            <Ionicons name="briefcase-outline" size={15} color={Colors.brand[500]} />
            <Text style={[styles.bottomActionText, { color: Colors.brand[500] }]}>Add Deal</Text>
          </Pressable>
          <Pressable style={styles.bottomActionBtn} onPress={() => Alert.alert('Add Ticket', 'Coming soon')}>
            <Ionicons name="ticket-outline" size={15} color={Colors.text.secondary} />
            <Text style={styles.bottomActionText}>Add Ticket</Text>
          </Pressable>
        </View>
        <Pressable style={styles.replyBtn} onPress={onReply}>
          <Ionicons name="arrow-undo-outline" size={16} color="#fff" />
          <Text style={styles.replyBtnText}>Reply</Text>
        </Pressable>
      </View>

      {/* Assigned To Modal */}
      <Modal visible={assignOpen} transparent animationType="fade" onRequestClose={() => setAssignOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssignOpen(false)}>
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Assign To</Text>
            <Pressable
              style={[styles.dropdownItem, !assignedTo && styles.dropdownItemActive]}
              onPress={async () => {
                setAssignedTo('');
                setAssignOpen(false);
                await supabase.from('leads').update({ assigned_to: null }).eq('id', form.id);
              }}
            >
              <Text style={[styles.dropdownItemText, { color: Colors.text.secondary }]}>Unassigned</Text>
              {!assignedTo && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
            </Pressable>
            {members.map((m) => (
              <Pressable
                key={m.userId}
                style={[styles.dropdownItem, assignedTo === m.userId && styles.dropdownItemActive]}
                onPress={async () => {
                  setAssignedTo(m.userId);
                  setAssignOpen(false);
                  await supabase.from('leads').update({ assigned_to: m.userId }).eq('id', form.id);
                }}
              >
                <Text style={[styles.dropdownItemText, { color: Colors.text.primary }]}>{m.name || m.email}</Text>
                {assignedTo === m.userId && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FormReplyView({ form, onBack }: { form: FormDetail; onBack: () => void }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sent', 'Reply sent successfully', [{ text: 'OK', onPress: onBack }]);
    } catch {
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerName}>Reply</Text>
        <View style={{ width: 80 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.replyToBar}>
          <Text style={styles.replyToLabel}>To: </Text>
          <Text style={styles.replyToAddress} numberOfLines={1}>
            {form.name}{form.email ? ` <${form.email}>` : ''}
          </Text>
        </View>
        <View style={styles.replySubjectBar}>
          <Text style={styles.replyToLabel}>Re: </Text>
          <Text style={styles.replyToAddress} numberOfLines={1}>{form.form_name || form.source_platform}</Text>
        </View>
        <View style={styles.divider} />

        <ScrollView style={styles.replyScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.replyInput}
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Write your reply here…"
            placeholderTextColor={Colors.text.muted}
            textAlignVertical="top"
            autoFocus
          />
        </ScrollView>

        <View style={styles.replyBottomBar}>
          <Pressable style={styles.enhanceBtn} onPress={() => Alert.alert('Enhance', 'AI enhancement coming soon')}>
            <Ionicons name="sparkles-outline" size={15} color={Colors.brand[500]} />
            <Text style={styles.enhanceBtnText}>Enhance with Sage AI</Text>
          </Pressable>
          <Pressable style={[styles.sendBtn, sending && styles.btnDisabled]} onPress={handleSend} disabled={sending}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={15} color="#fff" />}
            <Text style={styles.sendBtnText}>{sending ? 'Sending…' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Ticket detail screen (Screen 1)
// ---------------------------------------------------------------------------

interface TicketDetail {
  id: string;
  title: string;
  priority: SageTicketPriority;
  status: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  description: string | null;
  ai_summary: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
}

interface TicketTask {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
}

async function fetchTicketDetail(id: string): Promise<TicketDetail> {
  // Select all fields including new ones added in migration 00078
  const { data, error } = await supabase
    .from('sage_tickets')
    .select('id, title, priority, status, name, email, phone, company, description, ai_summary, assigned_to, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error || !data) {
    // Fallback: fetch without new columns if migration hasn't run yet
    const { data: d2, error: e2 } = await supabase
      .from('sage_tickets')
      .select('id, title, priority, status, name, email, phone, description, created_at, updated_at')
      .eq('id', id)
      .single();
    if (e2 || !d2) throw new Error(e2?.message ?? 'Not found');
    return { ...d2, company: null, ai_summary: null, assigned_to: null } as TicketDetail;
  }
  return data as TicketDetail;
}

async function fetchTicketTasks(ticketId: string): Promise<TicketTask[]> {
  const { data, error } = await supabase
    .from('sage_ticket_activities')
    .select('id, type, title, body, due_at, completed_at, created_at')
    .eq('ticket_id', ticketId)
    .not('due_at', 'is', null)
    .order('due_at', { ascending: true });
  if (error) return [];
  return (data ?? []) as TicketTask[];
}

const TICKET_STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'] as const;

function TicketDetailView({
  ticket,
  tasks,
  onReply,
  onBack,
}: {
  ticket: TicketDetail;
  tasks: TicketTask[];
  onReply: () => void;
  onBack: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [priority, setPriority] = useState<SageTicketPriority>(ticket.priority ?? 'low');
  const [summaryCollapsed, setSummaryCollapsed] = useState(!ticket.ai_summary || (ticket.priority ?? 'low') === 'low');
  const [overviewCollapsed, setOverviewCollapsed] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [status, setStatus] = useState(ticket.status ?? 'open');
  const [assignedTo, setAssignedTo] = useState(ticket.assigned_to ?? '');
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const queryClient = useQueryClient();

  // Activity panel state
  const [activityCollapsed, setActivityCollapsed] = useState(true);
  // Set Activity form
  const [setActType, setSetActType] = useState<'call' | 'meeting' | 'task'>('call');
  const [setActSubject, setSetActSubject] = useState('');
  const [setActScheduled, setSetActScheduled] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calSelectedDay, setCalSelectedDay] = useState<number | null>(null);
  const [savingSetAct, setSavingSetAct] = useState(false);
  // Log Activity form
  const [logActType, setLogActType] = useState<'call' | 'meeting' | 'task'>('call');
  const [logActNote, setLogActNote] = useState('');
  const [savingLogAct, setSavingLogAct] = useState(false);
  // Create Note form
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const membersQuery = useQuery({
    queryKey: ['workspace-members', user?.workspaceId],
    queryFn: () => fetchWorkspaceMembers(user!.workspaceId),
    enabled: !!user?.workspaceId,
  });
  const members = membersQuery.data ?? [];

  const actFeedQuery = useQuery({
    queryKey: ['ticket-act-feed', ticket.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sage_ticket_activities')
        .select('id, type, title, body, due_at, completed_at, created_at')
        .eq('ticket_id', ticket.id)
        .is('due_at', null)           // logged/notes only (no due_at = not a "set" task)
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
  const actFeedItems = actFeedQuery.data ?? [];

  async function handleSetActivity() {
    if (!setActSubject.trim()) return;
    setSavingSetAct(true);
    try {
      const { error } = await supabase.from('sage_ticket_activities').insert({
        workspace_id: user!.workspaceId,
        ticket_id: ticket.id,
        type: setActType,
        title: setActSubject.trim(),
        due_at: setActScheduled.trim()
          ? new Date(setActScheduled).toISOString()
          : new Date(Date.now() + 86_400_000).toISOString(),
        created_by: user!.id,
      });
      if (error) throw error;
      setSetActSubject('');
      setSetActScheduled('');
      setCalSelectedDay(null);
      queryClient.invalidateQueries({ queryKey: ['ticket-tasks', ticket.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to set activity. Please try again.');
    } finally {
      setSavingSetAct(false);
    }
  }

  async function handleLogActivity() {
    if (!logActNote.trim()) return;
    setSavingLogAct(true);
    try {
      const { error } = await supabase.from('sage_ticket_activities').insert({
        workspace_id: user!.workspaceId,
        ticket_id: ticket.id,
        type: logActType,
        body: logActNote.trim(),
        created_by: user!.id,
      });
      if (error) throw error;
      setLogActNote('');
      queryClient.invalidateQueries({ queryKey: ['ticket-act-feed', ticket.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to log activity. Please try again.');
    } finally {
      setSavingLogAct(false);
    }
  }

  async function handleCreateNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from('sage_ticket_activities').insert({
        workspace_id: user!.workspaceId,
        ticket_id: ticket.id,
        type: 'note',
        body: noteText.trim(),
        created_by: user!.id,
      });
      if (error) throw error;
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['ticket-act-feed', ticket.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleCompleteTask(taskId: string) {
    await supabase
      .from('sage_ticket_activities')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', taskId);
    queryClient.invalidateQueries({ queryKey: ['ticket-tasks', ticket.id] });
  }

  const priorityMutation = useMutation({
    mutationFn: async (p: SageTicketPriority) => {
      await supabase.from('sage_tickets').update({ priority: p }).eq('id', ticket.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket-detail', ticket.id] }),
  });

  async function handleStatusChange(s: string) {
    setStatus(s);
    setStatusOpen(false);
    await supabase.from('sage_tickets').update({ status: s }).eq('id', ticket.id);
    queryClient.invalidateQueries({ queryKey: ['ticket-detail', ticket.id] });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleAssignChange(userId: string) {
    setAssignedTo(userId);
    setAssignOpen(false);
    await supabase.from('sage_tickets').update({ assigned_to: userId || null }).eq('id', ticket.id);
    queryClient.invalidateQueries({ queryKey: ['ticket-detail', ticket.id] });
  }

  function handleDelete() {
    Alert.alert('Delete Ticket', 'Are you sure you want to delete this ticket?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('sage_tickets').delete().eq('id', ticket.id);
          queryClient.invalidateQueries({ queryKey: ['feed'] });
          onBack();
        },
      },
    ]);
  }

  const shortId = '#' + ticket.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  const createdOn = new Date(ticket.created_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const updatedOn = ticket.updated_at
    ? new Date(ticket.updated_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;
  const assignedMember = members.find((m) => m.userId === assignedTo);
  const pendingTasks = tasks.filter((t) => !t.completed_at);
  const completedTasks = tasks.filter((t) => !!t.completed_at);

  const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const statusColor = (s: string) =>
    s === 'open' ? '#3b82f6' : s === 'in_progress' ? '#f59e0b' : s === 'resolved' ? '#22c55e' : Colors.text.muted;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerName} numberOfLines={1}>{ticket.title || 'Ticket'}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Edit', 'Edit ticket coming soon')}>
            <Ionicons name="pencil-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Download', 'Download coming soon')}>
            <Ionicons name="download-outline" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
          <PriorityDropdown current={priority} onChange={(p) => { setPriority(p); priorityMutation.mutate(p); }} />
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* AI Summary + AI Analyse + Contact Info — one card, one chevron, default open */}
        <View style={styles.section}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <Ionicons
                name={ticket.ai_summary ? 'sparkles' : 'sparkles-outline'}
                size={15}
                color={ticket.ai_summary ? Colors.brand[500] : Colors.text.muted}
              />
              <Text style={[styles.sectionLabel, !ticket.ai_summary && { color: Colors.text.muted }]}>
                {ticket.ai_summary ? 'AI Summary' : ticket.description ? 'Summary' : 'No AI Summary'}
              </Text>
            </View>
            <Pressable onPress={() => setSummaryCollapsed((v) => !v)} style={styles.collapseBtn}>
              <Ionicons name={summaryCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.text.muted} />
            </Pressable>
          </View>

          {!summaryCollapsed && (
            ticket.ai_summary ? (
              <Text style={styles.summaryText}>{ticket.ai_summary}</Text>
            ) : ticket.description ? (
              <Text style={[styles.summaryText, { color: Colors.text.muted, fontStyle: 'italic' }]}>
                {ticket.description}
              </Text>
            ) : null
          )}

          {/* Analyse button only for low priority when no AI summary */}
          {!ticket.ai_summary && priority === 'low' && (
            <Pressable
              style={[styles.analyseBtn, { marginTop: 10 }, analysing && styles.btnDisabled]}
              disabled={analysing}
              onPress={async () => {
                setAnalysing(true);
                try {
                  await supabase.functions.invoke('analyse-ticket', { body: { ticket_id: ticket.id } });
                  queryClient.invalidateQueries({ queryKey: ['ticket-detail', ticket.id] });
                } catch {
                  Alert.alert('Error', 'Analysis failed. Please try again.');
                } finally {
                  setAnalysing(false);
                }
              }}
            >
              {analysing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={14} color="#fff" />}
              <Text style={styles.analyseBtnText}>{analysing ? 'Analysing…' : 'Analyse with Sage AI'}</Text>
            </Pressable>
          )}

          {/* Contact Info — collapses with AI summary chevron */}
          {!summaryCollapsed && (
            <>
              <View style={[styles.divider, { marginTop: 12 }]} />
              <Text style={[styles.sectionLabel, { marginTop: 10 }]}>Contact Info</Text>
              {ticket.name ? (
                <View style={styles.contactRow}>
                  <Ionicons name="person-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{ticket.name}</Text>
                </View>
              ) : null}
              {ticket.email ? (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{ticket.email}</Text>
                </View>
              ) : null}
              {ticket.phone ? (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{ticket.phone}</Text>
                </View>
              ) : null}
              {ticket.company ? (
                <View style={styles.contactRow}>
                  <Ionicons name="business-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.contactText}>{ticket.company}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Overview & Activity */}
        <View style={styles.section}>
          <Pressable style={styles.summaryHeader} onPress={() => setOverviewCollapsed((v) => !v)}>
            <View style={styles.summaryHeaderLeft}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.brand[500]} />
              <Text style={styles.sectionLabel}>Overview & Activity</Text>
            </View>
            <Ionicons name={overviewCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.text.muted} />
          </Pressable>
          {!overviewCollapsed && (
            <View style={[styles.detailGrid, { marginTop: 10 }]}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Status</Text>
                <Text style={[styles.detailVal, { color: statusColor(status), fontWeight: '600' }]}>
                  {statusLabel(status)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Created</Text>
                <Text style={styles.detailVal}>{createdOn}</Text>
              </View>
              {updatedOn ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Last Updated</Text>
                  <Text style={styles.detailVal}>{updatedOn}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Assigned To</Text>
                <Text style={styles.detailVal}>{assignedMember?.name || 'Unassigned'}</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailKey}>Ticket ID</Text>
                <Text style={styles.detailVal}>{shortId}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Tasks + Lodge an Activity — unified card */}
        <View style={styles.section}>
          <View style={[styles.summaryHeaderLeft, { marginBottom: 10 }]}>
            <Ionicons name="checkmark-circle-outline" size={15} color={Colors.brand[500]} />
            <Text style={styles.sectionLabel}>Tasks</Text>
            {pendingTasks.length > 0 && (
              <View style={[styles.taskCountBadge, { backgroundColor: Colors.brand[500] }]}>
                <Text style={[styles.taskCountText, { color: '#fff' }]}>{pendingTasks.length}</Text>
              </View>
            )}
          </View>

          {tasks.length === 0 ? (
            <Text style={styles.emptyTaskText}>No tasks yet. Set an activity below.</Text>
          ) : null}

          {pendingTasks.map((t) => (
            <View key={t.id} style={styles.taskRow}>
              <Pressable onPress={() => handleCompleteTask(t.id)} style={styles.taskCheckbox}>
                <Ionicons name="ellipse-outline" size={18} color={Colors.brand[500]} />
              </Pressable>
              <View style={styles.taskContent}>
                <Text style={styles.taskText}>{t.title}</Text>
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
                  <Text style={[styles.taskText, styles.taskDone]}>{t.title}</Text>
                </View>
              ))}
            </>
          )}

          {/* Lodge an Activity chevron */}
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

              {/* ── Set Activity ── */}
              <View style={styles.activityFormCard}>
                <View style={styles.activityFormHeader}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.brand[500]} />
                  <Text style={styles.activityFormTitle}>Set Activity</Text>
                </View>
                {/* Type pills + calendar as 4th pill — all in one row */}
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
                {/* Schedule — 2 lines */}
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

              {/* ── Log Activity ── */}
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

              {/* ── Create Note ── */}
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

        {/* Full Customer Message */}
        {ticket.description ? (
          <View style={styles.section}>
            <View style={[styles.summaryHeaderLeft, { marginBottom: 10 }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={Colors.text.secondary} />
              <Text style={styles.sectionLabel}>Customer Message</Text>
            </View>
            <Text style={styles.emailBody}>{ticket.description}</Text>
          </View>
        ) : null}

        {/* Activity Feed — logged + pending tasks timeline */}
        <View style={styles.section}>
          <View style={[styles.summaryHeaderLeft, { marginBottom: 12 }]}>
            <Ionicons name="pulse-outline" size={15} color={Colors.brand[500]} />
            <Text style={styles.sectionLabel}>Feed</Text>
          </View>

          {/* Pending tasks in feed */}
          {tasks.map((t) => (
            <View key={`task-${t.id}`} style={styles.feedItem}>
              <View style={[styles.feedItemDot, { backgroundColor: t.completed_at ? Colors.text.muted : Colors.brand[500] }]} />
              <View style={{ flex: 1 }}>
                <View style={styles.feedItemRow}>
                  <View style={[styles.feedItemBadge, { backgroundColor: t.completed_at ? Colors.bg.secondary : Colors.brand[500] + '18' }]}>
                    <Text style={[styles.feedItemBadgeText, { color: t.completed_at ? Colors.text.muted : Colors.brand[500] }]}>
                      {t.completed_at ? 'Done' : 'Pending'}
                    </Text>
                  </View>
                  <Text style={styles.feedItemTime}>
                    {t.due_at ? new Date(t.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <Text style={[styles.feedItemTitle, !!t.completed_at && { color: Colors.text.muted, textDecorationLine: 'line-through' }]}>
                  {t.title}
                </Text>
              </View>
            </View>
          ))}

          {/* Logged activities */}
          {actFeedItems.map((a: any) => {
            const typeLabel = (a.type as string).charAt(0).toUpperCase() + (a.type as string).slice(1);
            const timeStr = new Date(a.created_at).toLocaleString('en-GB', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            });
            return (
              <View key={`log-${a.id}`} style={styles.feedItem}>
                <View style={[styles.feedItemDot, { backgroundColor: '#8b5cf6' }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.feedItemRow}>
                    <View style={[styles.feedItemBadge, { backgroundColor: '#8b5cf620' }]}>
                      <Text style={[styles.feedItemBadgeText, { color: '#8b5cf6' }]}>{typeLabel}</Text>
                    </View>
                    <Text style={styles.feedItemTime}>{timeStr}</Text>
                  </View>
                  {a.body ? <Text style={styles.feedItemNote}>{a.body}</Text> : null}
                </View>
              </View>
            );
          })}

          {tasks.length === 0 && actFeedItems.length === 0 && (
            <View style={styles.feedEmpty}>
              <Text style={styles.feedEmptyText}>No activity yet. Set or log something above.</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Calendar Date Picker Modal */}
      <Modal visible={datePickerOpen} transparent animationType="slide" onRequestClose={() => setDatePickerOpen(false)}>
        <Pressable style={styles.modalOverlayBottom} onPress={() => setDatePickerOpen(false)}>
          <View style={[styles.dropdownCardBottom, { paddingBottom: 20 }]}>
            {/* Month navigation */}
            <View style={styles.calHeader}>
              <Pressable
                style={styles.calNavBtn}
                onPress={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
                  else setCalMonth((m) => m - 1);
                  setCalSelectedDay(null);
                }}
              >
                <Ionicons name="chevron-back" size={18} color={Colors.text.primary} />
              </Pressable>
              <Text style={styles.calMonthLabel}>
                {new Date(calYear, calMonth).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                style={styles.calNavBtn}
                onPress={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
                  else setCalMonth((m) => m + 1);
                  setCalSelectedDay(null);
                }}
              >
                <Ionicons name="chevron-forward" size={18} color={Colors.text.primary} />
              </Pressable>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.calWeekRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <Text key={d} style={styles.calWeekDay}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            {(() => {
              const today = new Date();
              const firstDow = new Date(calYear, calMonth, 1).getDay();
              const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
              const cells: (number | null)[] = [
                ...Array(firstDow).fill(null),
                ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
              ];
              // pad to complete last row
              while (cells.length % 7 !== 0) cells.push(null);
              const weeks: (number | null)[][] = [];
              for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
              return weeks.map((week, wi) => (
                <View key={wi} style={styles.calWeekRow}>
                  {week.map((day, di) => {
                    const isToday = day !== null && today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;
                    const isSelected = day !== null && calSelectedDay === day;
                    const isPast = day !== null && new Date(calYear, calMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    return (
                      <Pressable
                        key={di}
                        style={[
                          styles.calDayBtn,
                          isToday && styles.calDayToday,
                          isSelected && styles.calDaySelected,
                          (!day || isPast) && styles.calDayDisabled,
                        ]}
                        disabled={!day || isPast}
                        onPress={() => {
                          if (!day) return;
                          setCalSelectedDay(day);
                          const d = new Date(calYear, calMonth, day);
                          setSetActScheduled(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        {day ? (
                          <Text style={[styles.calDayText, isToday && styles.calDayTodayText, isSelected && styles.calDaySelectedText, isPast && { color: Colors.text.muted }]}>
                            {day}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ));
            })()}

            {/* Confirm button */}
            <Pressable
              style={[styles.activitySaveBtn, { marginTop: 14 }, !calSelectedDay && styles.btnDisabled]}
              disabled={!calSelectedDay}
              onPress={() => {
                setDatePickerOpen(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
              <Text style={styles.activitySaveBtnText}>
                {calSelectedDay
                  ? `Confirm — ${new Date(calYear, calMonth, calSelectedDay).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : 'Select a date'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          {/* Status pill */}
          <Pressable
            style={[styles.bottomStatusBtn, { borderColor: statusColor(status) + '60', backgroundColor: statusColor(status) + '18' }]}
            onPress={() => setStatusOpen(true)}
          >
            <View style={[styles.priorityDot, { backgroundColor: statusColor(status) }]} />
            <Text style={[styles.bottomStatusText, { color: statusColor(status) }]}>{statusLabel(status)}</Text>
            <Ionicons name="chevron-down" size={11} color={statusColor(status)} />
          </Pressable>
          {/* Assign To pill */}
          <Pressable style={styles.bottomAssignBtn} onPress={() => setAssignOpen(true)}>
            <Ionicons name="person-outline" size={13} color={Colors.text.secondary} />
            <Text style={styles.bottomAssignText} numberOfLines={1}>
              {assignedMember?.name || 'Assign'}
            </Text>
            <Ionicons name="chevron-down" size={11} color={Colors.text.muted} />
          </Pressable>
        </View>
        <Pressable style={styles.replyBtn} onPress={onReply}>
          <Ionicons name="arrow-undo-outline" size={16} color="#fff" />
          <Text style={styles.replyBtnText}>Reply</Text>
        </Pressable>
      </View>

      {/* Status Modal — slides up from bottom bar */}
      <Modal visible={statusOpen} transparent animationType="slide" onRequestClose={() => setStatusOpen(false)}>
        <Pressable style={styles.modalOverlayBottom} onPress={() => setStatusOpen(false)}>
          <View style={styles.dropdownCardBottom}>
            <Text style={styles.dropdownTitle}>Set Status</Text>
            {TICKET_STATUS_OPTIONS.map((s) => (
              <Pressable
                key={s}
                style={[styles.dropdownItem, status === s && styles.dropdownItemActive]}
                onPress={() => handleStatusChange(s)}
              >
                <View style={[styles.priorityDot, { backgroundColor: statusColor(s) }]} />
                <Text style={[styles.dropdownItemText, { color: Colors.text.primary }]}>{statusLabel(s)}</Text>
                {status === s && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Assigned To Modal — slides up from bottom bar */}
      <Modal visible={assignOpen} transparent animationType="slide" onRequestClose={() => setAssignOpen(false)}>
        <Pressable style={styles.modalOverlayBottom} onPress={() => setAssignOpen(false)}>
          <View style={styles.dropdownCardBottom}>
            <Text style={styles.dropdownTitle}>Assign To</Text>
            <Pressable
              style={[styles.dropdownItem, !assignedTo && styles.dropdownItemActive]}
              onPress={() => handleAssignChange('')}
            >
              <Text style={[styles.dropdownItemText, { color: Colors.text.secondary }]}>Unassigned</Text>
              {!assignedTo && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
            </Pressable>
            {members.map((m) => (
              <Pressable
                key={m.userId}
                style={[styles.dropdownItem, assignedTo === m.userId && styles.dropdownItemActive]}
                onPress={() => handleAssignChange(m.userId)}
              >
                <Text style={[styles.dropdownItemText, { color: Colors.text.primary }]}>{m.name || m.email}</Text>
                {assignedTo === m.userId && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Ticket reply screen (Screen 2)
// ---------------------------------------------------------------------------

function TicketReplyView({ ticket, onBack }: { ticket: TicketDetail; onBack: () => void }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await supabase.from('sage_tickets').update({ status: 'in_progress' }).eq('id', ticket.id);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sent', 'Reply sent successfully', [{ text: 'OK', onPress: onBack }]);
    } catch {
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerName}>Reply</Text>
        <View style={{ width: 80 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.replyToBar}>
          <Text style={styles.replyToLabel}>To: </Text>
          <Text style={styles.replyToAddress} numberOfLines={1}>
            {ticket.name}{ticket.email ? ` <${ticket.email}>` : ''}
          </Text>
        </View>
        <View style={styles.replySubjectBar}>
          <Text style={styles.replyToLabel}>Re: </Text>
          <Text style={styles.replyToAddress} numberOfLines={1}>{ticket.title}</Text>
        </View>
        <View style={styles.divider} />

        <ScrollView style={styles.replyScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.replyInput}
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Write your reply here…"
            placeholderTextColor={Colors.text.muted}
            textAlignVertical="top"
            autoFocus
          />
        </ScrollView>

        <View style={styles.replyBottomBar}>
          <Pressable style={styles.enhanceBtn} onPress={() => Alert.alert('Enhance', 'AI enhancement coming soon')}>
            <Ionicons name="sparkles-outline" size={15} color={Colors.brand[500]} />
            <Text style={styles.enhanceBtnText}>Enhance with Sage AI</Text>
          </Pressable>
          <Pressable style={[styles.sendBtn, sending && styles.btnDisabled]} onPress={handleSend} disabled={sending}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={15} color="#fff" />}
            <Text style={styles.sendBtnText}>{sending ? 'Sending…' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Generic feed item detail (non-email types)
// ---------------------------------------------------------------------------

function GenericDetailView({ item, onBack }: { item: FeedItem; onBack: () => void }) {
  const accentColor = TYPE_COLORS[item.type] ?? Colors.brand[500];
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle} numberOfLines={1}>{item.contactName ?? 'Unknown'}</Text>
          <Text style={[styles.headerSub, { color: accentColor }]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
        <PriorityBadge priority={item.priority} size="sm" />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {item.summary && (
          <View style={[styles.summaryCard, { borderLeftColor: accentColor }]}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryHeaderLeft}>
                <Ionicons name="sparkles" size={16} color={accentColor} />
                <Text style={[styles.sectionLabel, { color: accentColor }]}>
                  {item.type === 'bot' ? 'Conversation Summary' : item.type === 'ticket' ? 'Description' : 'Details'}
                </Text>
              </View>
            </View>
            <Text style={styles.summaryText}>{item.summary}</Text>
          </View>
        )}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Contact Info</Text>
          <View style={styles.pillRow}>
            {item.contactName && <InfoPill icon="person-outline" text={item.contactName} />}
            {item.contactEmail && <InfoPill icon="mail-outline" text={item.contactEmail} />}
            {item.contactPhone && <InfoPill icon="call-outline" text={item.contactPhone} />}
            {item.company && <InfoPill icon="business-outline" text={item.company} />}
            {item.source && <InfoPill icon="globe-outline" text={item.source} />}
          </View>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={Colors.text.muted} />
          <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoPill({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={13} color={Colors.text.secondary} />
      <Text style={styles.infoPillText}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Root screen
// ---------------------------------------------------------------------------

export default function FeedItemDetailScreen() {
  const { id, type = 'ticket' } = useLocalSearchParams<{ id: string; type: string }>();
  const router = useRouter();
  const [view, setView] = useState<'detail' | 'reply'>('detail');

  // Email path
  const emailQuery = useQuery({
    queryKey: ['email-detail', id],
    queryFn: () => fetchEmailDetail(id),
    enabled: !!id && type === 'email',
    retry: 0,
  });

  // Bot path
  const botQuery = useQuery({
    queryKey: ['bot-detail', id],
    queryFn: () => fetchBotDetail(id),
    enabled: !!id && type === 'bot',
    retry: 0,
  });
  const botMessagesQuery = useQuery({
    queryKey: ['bot-messages', id],
    queryFn: () => fetchConversationMessages(id),
    enabled: !!id && type === 'bot',
    retry: 0,
  });

  // Form path
  const formQuery = useQuery({
    queryKey: ['form-detail', id],
    queryFn: () => fetchFormDetail(id),
    enabled: !!id && type === 'form',
    retry: 0,
  });

  // Ticket path
  const ticketQuery = useQuery({
    queryKey: ['ticket-detail', id],
    queryFn: () => fetchTicketDetail(id),
    enabled: !!id && type === 'ticket',
    retry: 0,
  });
  const ticketTasksQuery = useQuery({
    queryKey: ['ticket-tasks', id],
    queryFn: () => fetchTicketTasks(id),
    enabled: !!id && type === 'ticket',
    retry: 0,
  });

  // Generic path (fallback only)
  const genericQuery = useQuery({
    queryKey: ['feed-item', id, type],
    queryFn: () => fetchFeedItemDirect(id, type),
    enabled: !!id && type !== 'email' && type !== 'bot' && type !== 'form' && type !== 'ticket',
    retry: 0,
  });

  const isLoading =
    type === 'email' ? emailQuery.isLoading
    : type === 'bot' ? botQuery.isLoading || botMessagesQuery.isLoading
    : type === 'form' ? formQuery.isLoading
    : type === 'ticket' ? ticketQuery.isLoading
    : genericQuery.isLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
          </Pressable>
        </View>
        <View style={styles.pad}>
          <SkeletonLoader width="60%" height={24} borderRadius={6} style={styles.skel} />
          <SkeletonLoader width="100%" height={120} borderRadius={12} style={styles.skel} />
          <SkeletonLoader width="100%" height={80} borderRadius={12} style={styles.skel} />
          <SkeletonLoader width="100%" height={200} borderRadius={12} style={styles.skel} />
        </View>
      </SafeAreaView>
    );
  }

  if (type === 'email') {
    if (emailQuery.error || !emailQuery.data) {
      return <ErrorView onBack={() => router.back()} message={(emailQuery.error as Error)?.message} />;
    }
    if (view === 'reply') {
      return <EmailReplyView email={emailQuery.data} onBack={() => setView('detail')} />;
    }
    return (
      <EmailDetailView
        email={emailQuery.data}
        onReply={() => setView('reply')}
        onDelete={() => router.back()}
        onBack={() => router.back()}
      />
    );
  }

  if (type === 'bot') {
    if (botQuery.error || !botQuery.data) {
      return <ErrorView onBack={() => router.back()} message={(botQuery.error as Error)?.message} />;
    }
    if (view === 'reply') {
      return <BotReplyView conv={botQuery.data} onBack={() => setView('detail')} />;
    }
    return (
      <BotDetailView
        conv={botQuery.data}
        messages={botMessagesQuery.data ?? []}
        onReply={() => setView('reply')}
        onBack={() => router.back()}
      />
    );
  }

  if (type === 'form') {
    if (formQuery.error || !formQuery.data) {
      return <ErrorView onBack={() => router.back()} message={(formQuery.error as Error)?.message} />;
    }
    if (view === 'reply') {
      return <FormReplyView form={formQuery.data} onBack={() => setView('detail')} />;
    }
    return (
      <FormDetailView
        form={formQuery.data}
        onReply={() => setView('reply')}
        onBack={() => router.back()}
      />
    );
  }

  if (type === 'ticket') {
    if (ticketQuery.error || !ticketQuery.data) {
      return <ErrorView onBack={() => router.back()} message={(ticketQuery.error as Error)?.message} />;
    }
    if (view === 'reply') {
      return <TicketReplyView ticket={ticketQuery.data} onBack={() => setView('detail')} />;
    }
    return (
      <TicketDetailView
        ticket={ticketQuery.data}
        tasks={ticketTasksQuery.data ?? []}
        onReply={() => setView('reply')}
        onBack={() => router.back()}
      />
    );
  }

  if (genericQuery.error || !genericQuery.data) {
    return <ErrorView onBack={() => router.back()} />;
  }
  return <GenericDetailView item={genericQuery.data} onBack={() => router.back()} />;
}

function ErrorView({ onBack, message }: { onBack: () => void; message?: string }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </Pressable>
      </View>
      <View style={styles.errorState}>
        <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
        <Text style={styles.errorText}>Failed to load item.</Text>
        {message ? <Text style={styles.errorDetail}>{message}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  pad: { padding: 16 },
  skel: { marginBottom: 12 },
  scroll: { flex: 1 },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, color: '#ef4444' },
  errorDetail: { fontSize: 12, color: Colors.text.muted, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },

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
  headerName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6, borderRadius: 8 },

  // Priority pill
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 4,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityPillText: { fontSize: 12, fontWeight: '600' },

  // Priority modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 88 : 68,
    paddingHorizontal: 14,
  },
  dropdownCardBottom: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    width: 220,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  dropdownItemActive: { backgroundColor: Colors.bg.secondary },
  dropdownItemText: { fontSize: 15, fontWeight: '600' },

  // Sections
  section: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // AI Summary
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  collapseBtn: { padding: 4 },
  summaryText: { fontSize: 14, color: Colors.text.secondary, lineHeight: 20 },

  // Contact
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  contactText: { fontSize: 13, color: Colors.text.secondary, flex: 1 },

  // Email body
  emailSubject: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginBottom: 10 },
  emailBody: { fontSize: 13, color: Colors.text.secondary, lineHeight: 20 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginVertical: 10 },

  // Conversation / User detail grid
  detailGrid: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailKey: { fontSize: 13, color: Colors.text.muted, flex: 1 },
  detailVal: { fontSize: 13, color: Colors.text.primary, fontWeight: '500', flex: 2, textAlign: 'right' },

  // Dropdown fields (Status / Assigned To)
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.secondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownFieldLabel: { fontSize: 13, color: Colors.text.muted },
  dropdownFieldRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dropdownFieldValue: { fontSize: 13, color: Colors.text.primary, fontWeight: '500' },

  // Chat bubbles
  noMessages: { fontSize: 13, color: Colors.text.muted, textAlign: 'center', paddingVertical: 12 },
  messageBubble: { marginBottom: 10, maxWidth: '80%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.brand[500], borderRadius: 14, borderBottomRightRadius: 4, padding: 10 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: Colors.bg.secondary, borderRadius: 14, borderBottomLeftRadius: 4, padding: 10, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userBubbleText: { color: '#fff' },
  assistantBubbleText: { color: Colors.text.primary },
  bubbleTime: { fontSize: 10, color: Colors.text.muted, marginTop: 4 },

  // Bottom right (bot detail)
  bottomRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ignoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ignoreBtnText: { fontSize: 13, fontWeight: '500', color: Colors.text.muted },

  // Bottom bar (email detail)
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: Colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  bottomLeft: { flexDirection: 'row', gap: 8 },
  bottomActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bottomActionText: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brand[500],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  replyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  bottomPad: { height: 20 },

  // Ticket bottom bar status/assign pills
  bottomStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  bottomStatusText: { fontSize: 12, fontWeight: '600' },
  bottomAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg.secondary,
    maxWidth: 120,
  },
  bottomAssignText: { fontSize: 12, fontWeight: '500', color: Colors.text.secondary, flex: 1 },

  // Task rows
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  taskCheckbox: { marginRight: 10, marginTop: 1 },
  taskContent: { flex: 1 },
  taskText: { fontSize: 13, fontWeight: '500', color: Colors.text.primary, lineHeight: 18 },
  taskMeta: { fontSize: 11, color: Colors.text.muted, marginTop: 2 },
  taskDone: { textDecorationLine: 'line-through', color: Colors.text.muted },
  taskCountBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, minWidth: 22, alignItems: 'center' },
  taskCountText: { fontSize: 11, fontWeight: '700' },
  emptyTaskText: { fontSize: 12, color: Colors.text.muted, marginBottom: 8 },
  completedLabel: { fontSize: 11, fontWeight: '600', color: Colors.text.muted, marginTop: 10, marginBottom: 4 },
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

  // Activity form cards
  activityFormCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityFormHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  activityFormTitle: { fontSize: 13, fontWeight: '700', color: Colors.brand[500] },
  activityTypePills: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  activityTypePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg.card,
  },
  activityTypePillActive: {
    backgroundColor: Colors.brand[500] + '20',
    borderColor: Colors.brand[500] + '60',
  },
  activityTypePillText: { fontSize: 12, fontWeight: '500', color: Colors.text.secondary },
  activityTypePillTextActive: { color: Colors.brand[500], fontWeight: '700' },
  activityInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  activityNoteInput: { minHeight: 72, textAlignVertical: 'top', lineHeight: 18 },
  activitySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.brand[500],
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 2,
  },
  activitySaveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  activityScheduleInput: { minHeight: 52, lineHeight: 18, textAlignVertical: 'top' },

  // Feed timeline
  feedItem: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  feedItemDot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  feedItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  feedItemBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  feedItemBadgeText: { fontSize: 10, fontWeight: '700' },
  feedItemTime: { fontSize: 11, color: Colors.text.muted, marginLeft: 'auto' },
  feedItemTitle: { fontSize: 13, color: Colors.text.primary, lineHeight: 18 },
  feedItemNote: { fontSize: 12, color: Colors.text.secondary, marginTop: 2, lineHeight: 17 },
  feedEmpty: { paddingVertical: 16, alignItems: 'center' },
  feedEmptyText: { fontSize: 12, color: Colors.text.muted, textAlign: 'center' },

  // Calendar
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: { padding: 6, borderRadius: 8, backgroundColor: Colors.bg.secondary },
  calMonthLabel: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  calWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  calWeekDay: { width: 36, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.text.muted },
  calDayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayText: { fontSize: 13, color: Colors.text.primary, fontWeight: '500' },
  calDayToday: { borderWidth: 1, borderColor: Colors.brand[500] },
  calDayTodayText: { color: Colors.brand[500], fontWeight: '700' },
  calDaySelected: { backgroundColor: Colors.brand[500] },
  calDaySelectedText: { color: '#fff', fontWeight: '700' },
  calDayDisabled: { opacity: 0.3 },

  // Reply screen
  replyToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.bg.card,
  },
  replySubjectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  replyToLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.muted },
  replyToAddress: { fontSize: 13, color: Colors.text.primary, flex: 1 },
  replyScroll: { flex: 1, backgroundColor: Colors.bg.card },
  replyInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 22,
    padding: 16,
    minHeight: 300,
  },
  replyBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: Colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 10,
  },
  enhanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.brand[500],
    backgroundColor: Colors.priorityBg.high,
    justifyContent: 'center',
  },
  enhanceBtnText: { fontSize: 13, fontWeight: '600', color: Colors.brand[500] },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brand[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
  },
  sendBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  analyseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: Colors.brand[500],
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  analyseBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Generic detail
  summaryCard: {
    margin: 16,
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  infoSection: { paddingHorizontal: 16, marginBottom: 8 },
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
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  headerSub: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
});

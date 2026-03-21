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
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchEmailDetail(id: string): Promise<EmailDetail> {
  const { data, error, status } = await supabase
    .from('sage_emails')
    .select('id, from_name, from_address, subject, body_text, ai_summary, ai_priority, ai_reply_drafts, received_at')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Not found');
  return data as EmailDetail;
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
  const [priority, setPriority] = useState<SageTicketPriority>(email.ai_priority ?? 'low');
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const queryClient = useQueryClient();

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
        {email.ai_summary ? (
          <View style={styles.section}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryHeaderLeft}>
                <Ionicons name="sparkles" size={15} color={Colors.brand[500]} />
                <Text style={styles.sectionLabel}>AI Summary</Text>
              </View>
              <Pressable onPress={() => setSummaryCollapsed((v) => !v)} style={styles.collapseBtn}>
                <Ionicons
                  name={summaryCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={Colors.text.muted}
                />
              </Pressable>
            </View>
            {!summaryCollapsed && (
              <Text style={styles.summaryText}>{email.ai_summary}</Text>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.summaryHeaderLeft}>
              <Ionicons name="sparkles-outline" size={15} color={Colors.text.muted} />
              <Text style={[styles.sectionLabel, { color: Colors.text.muted }]}>No AI Summary</Text>
            </View>
            <Pressable
              style={[styles.analyseBtn, analysing && styles.btnDisabled]}
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
              {analysing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="sparkles" size={14} color="#fff" />
              )}
              <Text style={styles.analyseBtnText}>
                {analysing ? 'Analysing…' : 'Analyse with Sage AI'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Contact Info */}
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

  // Non-email path
  const genericQuery = useQuery({
    queryKey: ['feed-item', id, type],
    queryFn: () => fetchFeedItemDirect(id, type),
    enabled: !!id && type !== 'email',
    retry: 0,
  });

  const isLoading = type === 'email' ? emailQuery.isLoading : genericQuery.isLoading;

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

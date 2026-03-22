import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  useWindowDimensions,
  Modal,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth';
import { fetchHomeDashboard, fetchFeedItems, fetchTasks, fetchReminders, fetchWorkspaceMembers } from '@/lib/api';
import { FeedCard } from '@/components/feed/FeedCard';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Colors } from '@/constants/colors';
import type { FeedItem, WorkspaceMember } from '@/types';
import type { Task, Reminder } from '@/lib/api';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Sales Rep',
  viewer: 'Viewer',
};

type DatePreset = 'today' | '7d' | '30d' | '120d';

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d',   label: '7d' },
  { key: '30d',  label: '30d' },
  { key: '120d', label: '120d' },
];

function getDateFrom(preset: DatePreset): string {
  const now = new Date();
  if (preset === 'today') {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (preset === '7d') {
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }
  if (preset === '30d') {
    now.setDate(now.getDate() - 30);
    return now.toISOString();
  }
  now.setDate(now.getDate() - 120);
  return now.toISOString();
}

type FeedFilter = 'email' | 'bot' | 'form' | 'ticket' | null;

const FEED_FILTERS: { key: FeedFilter; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }[] = [
  { key: 'email',  icon: 'mail-outline',            color: '#3b82f6' },
  { key: 'bot',    icon: 'chatbubble-outline',       color: '#8b5cf6' },
  { key: 'form',   icon: 'document-text-outline',   color: '#15A4AE' },
  { key: 'ticket', icon: 'ticket-outline',           color: '#f59e0b' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function DonutRing({ total, high, medium, size = 60, strokeWidth = 7 }: {
  total: number; high: number; medium: number; size?: number; strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  if (total === 0) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
      </Svg>
    );
  }
  const highR = Math.min(high / total, 1);
  const medR  = Math.min(medium / total, 1 - highR);
  const lowR  = Math.max(0, 1 - highR - medR);
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={cx} cy={cy} r={r} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
      {lowR > 0.01 && (
        <Circle cx={cx} cy={cy} r={r} stroke="#d1d5db" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${lowR * C} ${C}`}
          transform={`rotate(${(highR + medR) * 360}, ${cx}, ${cy})`} />
      )}
      {medR > 0.01 && (
        <Circle cx={cx} cy={cy} r={r} stroke="#eab308" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${medR * C} ${C}`}
          transform={`rotate(${highR * 360}, ${cx}, ${cy})`} />
      )}
      {highR > 0.01 && (
        <Circle cx={cx} cy={cy} r={r} stroke="#22c55e" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${highR * C} ${C}`} />
      )}
    </Svg>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  high: number;
  medium: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  width: number;
}

function KpiCard({ label, value, high, medium, icon, color, width }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, { width }]}>
      <View style={styles.kpiTopRow}>
        {/* Donut with number overlaid in centre */}
        <View style={styles.kpiDonutWrap}>
          <DonutRing total={value} high={high} medium={medium} size={53} strokeWidth={6} />
          <Text style={styles.kpiDonutNumber}>{value}</Text>
        </View>
        {/* Label + priority stacked in centre */}
        <View style={styles.kpiCenter}>
          <Text style={styles.kpiLabel}>{label}</Text>
          <View style={styles.kpiPriorityRow}>
            <View style={styles.kpiPriorityDot} />
            <Text style={styles.kpiPriorityText}>{high}H</Text>
            <View style={[styles.kpiPriorityDot, { backgroundColor: '#eab308' }]} />
            <Text style={styles.kpiPriorityText}>{medium}M</Text>
          </View>
        </View>
        {/* Icon top-right */}
        <View style={[styles.kpiIconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
      </View>
    </View>
  );
}

const TYPE_LABELS: Record<string, string> = {
  call: 'Call', meeting: 'Meeting', task: 'Task', note: 'Note',
};

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const now = new Date();
  const isOverdue = new Date(reminder.due_at) < now;
  const dueLabel = new Date(reminder.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={taskStyles.card}>
      <View style={taskStyles.cardLeft}>
        <View style={[taskStyles.kindBadge, { backgroundColor: '#f59e0b20' }]}>
          <Text style={[taskStyles.kindText, { color: '#f59e0b' }]}>Reminder</Text>
        </View>
        <Text style={taskStyles.title} numberOfLines={2}>{reminder.title}</Text>
        <Text style={taskStyles.parent} numberOfLines={1}>{reminder.parentTitle}</Text>
      </View>
      <View style={taskStyles.cardRight}>
        <Ionicons name="calendar-outline" size={12} color={isOverdue ? '#ef4444' : Colors.text.secondary} />
        <Text style={[taskStyles.due, isOverdue && taskStyles.overdue]}>{dueLabel}</Text>
      </View>
    </View>
  );
}

function TaskCard({ task }: { task: Task }) {
  const now = new Date();
  const isOverdue = !!task.due_at && new Date(task.due_at) < now;
  const dueLabel = task.due_at
    ? new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'No due date';
  const typeLabel = TYPE_LABELS[task.type] ?? task.type;

  return (
    <View style={taskStyles.card}>
      <View style={taskStyles.cardLeft}>
        <View style={[taskStyles.kindBadge, task.kind === 'deal' ? taskStyles.dealBadge : taskStyles.ticketBadge]}>
          <Text style={taskStyles.kindText}>{typeLabel}</Text>
        </View>
        <Text style={taskStyles.title} numberOfLines={2}>{task.title ?? task.body ?? 'Untitled'}</Text>
        <Text style={taskStyles.parent} numberOfLines={1}>{task.parentTitle}</Text>
      </View>
      <View style={taskStyles.cardRight}>
        <Ionicons name="calendar-outline" size={12} color={isOverdue ? '#ef4444' : Colors.text.secondary} />
        <Text style={[taskStyles.due, isOverdue && taskStyles.overdue]}>{dueLabel}</Text>
      </View>
    </View>
  );
}

const taskStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  cardLeft: { flex: 1, gap: 4 },
  kindBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  dealBadge: { backgroundColor: '#3b82f620' },
  ticketBadge: { backgroundColor: '#f59e0b20' },
  kindText: { fontSize: 10, fontWeight: '700', color: Colors.text.secondary },
  title: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  parent: { fontSize: 11, color: Colors.text.secondary },
  cardRight: { alignItems: 'flex-end', gap: 3, marginLeft: 10 },
  due: { fontSize: 11, color: Colors.text.secondary },
  overdue: { color: '#ef4444', fontWeight: '600' },
});

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const kpiCardWidth = (width - 32 - 10) / 2; // 32 = horizontal padding, 10 = gap
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [activeTab, setActiveTab] = useState<'feed' | 'tasks'>('feed');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'upcoming' | 'reminders'>('all');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>(null);
  const [viewingAs, setViewingAs] = useState<WorkspaceMember | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const canSwitchView = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager';

  const membersQuery = useQuery({
    queryKey: ['workspace-members', user?.workspaceId],
    queryFn: () => fetchWorkspaceMembers(user!.workspaceId),
    enabled: !!user && canSwitchView,
  });

  const viewingUserId = viewingAs?.userId ?? user?.id ?? '';
  const viewingRole   = viewingAs?.role   ?? user?.role ?? 'employee';

  const dashQuery = useQuery({
    queryKey: ['home-dashboard', user?.workspaceId, viewingUserId, datePreset],
    queryFn: () =>
      fetchHomeDashboard(user!.workspaceId, viewingUserId, viewingRole, getDateFrom(datePreset)),
    enabled: !!user,
  });

  const feedQuery = useQuery({
    queryKey: ['feed', user?.workspaceId, viewingUserId, feedFilter, datePreset],
    queryFn: () => fetchFeedItems(user!.workspaceId, viewingUserId, viewingRole, feedFilter, getDateFrom(datePreset)),
    enabled: !!user,
  });

  const tasksQuery = useQuery({
    queryKey: ['tasks', user?.workspaceId],
    queryFn: () => fetchTasks(user!.workspaceId),
    enabled: !!user,
  });

  const remindersQuery = useQuery({
    queryKey: ['reminders', user?.workspaceId, user?.id],
    queryFn: () => fetchReminders(user!.workspaceId, user!.id),
    enabled: !!user,
  });

  const onRefresh = useCallback(() => {
    dashQuery.refetch();
    feedQuery.refetch();
    tasksQuery.refetch();
    remindersQuery.refetch();
  }, [dashQuery, feedQuery, tasksQuery, remindersQuery]);

  const isRefreshing = dashQuery.isFetching || feedQuery.isFetching || tasksQuery.isFetching;
  const dash = dashQuery.data;

  const renderFeedCard = ({ item }: { item: FeedItem }) => (
    <FeedCard
      item={item}
      onPress={() => router.push(`/(app)/feed/${item.id}?type=${item.type}`)}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {viewingAs ? 'Viewing as' : `${getGreeting()},`}
            </Text>
            <Pressable
              style={styles.nameRow}
              onPress={() => canSwitchView && setDropdownOpen(true)}
            >
              <Text style={styles.name}>
                {viewingAs
                  ? (viewingAs.name || viewingAs.email)
                  : (user?.name ?? user?.email ?? 'there')}
              </Text>
              {canSwitchView && (
                <Ionicons
                  name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.text.primary}
                />
              )}
            </Pressable>
            <View style={styles.userMeta}>
              <Text style={styles.userEmail}>
                {viewingAs ? viewingAs.email : user?.email}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {ROLE_LABELS[(viewingAs?.role ?? user?.role ?? '')] ?? (viewingAs?.role ?? user?.role)}
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/more/notifications')}
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.text.primary} />
          </Pressable>
        </View>

        {/* Member picker modal */}
        <Modal
          visible={dropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDropdownOpen(false)}
          >
            <View style={styles.dropdownSheet}>
              <Text style={styles.dropdownTitle}>View as</Text>

              {/* Self */}
              <TouchableOpacity
                style={[styles.dropdownItem, !viewingAs && styles.dropdownItemActive]}
                onPress={() => { setViewingAs(null); setDropdownOpen(false); }}
              >
                <View style={styles.dropdownItemLeft}>
                  <Text style={styles.dropdownItemName}>{user?.name ?? user?.email}</Text>
                  <Text style={styles.dropdownItemRole}>
                    {ROLE_LABELS[user?.role ?? ''] ?? user?.role} · You
                  </Text>
                </View>
                {!viewingAs && <Ionicons name="checkmark" size={16} color={Colors.brand[500]} />}
              </TouchableOpacity>

              {/* Team members */}
              {(membersQuery.data ?? [])
                .filter(m => {
                  if (m.userId === user?.id) return false;
                  const RANK: Record<string, number> = { owner: 4, admin: 3, manager: 2, employee: 1, viewer: 0 };
                  return (RANK[m.role] ?? 0) < (RANK[user?.role ?? ''] ?? 0);
                })
                .map(m => (
                  <TouchableOpacity
                    key={m.userId}
                    style={[styles.dropdownItem, viewingAs?.userId === m.userId && styles.dropdownItemActive]}
                    onPress={() => { setViewingAs(m); setDropdownOpen(false); }}
                  >
                    <View style={styles.dropdownItemLeft}>
                      <Text style={styles.dropdownItemName}>{m.name || m.email}</Text>
                      <Text style={styles.dropdownItemRole}>{ROLE_LABELS[m.role] ?? m.role}</Text>
                    </View>
                    {viewingAs?.userId === m.userId && (
                      <Ionicons name="checkmark" size={16} color={Colors.brand[500]} />
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* KPI Grid */}
        <View style={styles.sectionHeader}>
          <View style={styles.overviewLeft}>
            <Text style={styles.sectionTitleInline}>Overview</Text>
            <View style={styles.datePresetRow}>
              {DATE_PRESETS.map(p => (
                <Pressable
                  key={p.key}
                  onPress={() => setDatePreset(p.key)}
                  style={[styles.datePresetBtn, datePreset === p.key && styles.datePresetBtnActive]}
                >
                  <Text style={[styles.datePresetText, datePreset === p.key && styles.datePresetTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable
            onPress={() => setOverviewCollapsed(c => !c)}
            style={styles.collapseBtn}
          >
            <Ionicons
              name={overviewCollapsed ? 'chevron-forward' : 'chevron-down'}
              size={14}
              color={Colors.text.secondary}
            />
            <Text style={styles.collapseBtnText}>
              {overviewCollapsed ? 'Expand' : 'Collapse'}
            </Text>
          </Pressable>
        </View>

        {overviewCollapsed ? (
          /* Collapsed: compact pill buttons */
          <View style={styles.kpiPillRow}>
            {[
              { label: 'Emails',  value: dash?.emailCount ?? 0,  icon: 'mail-outline' as const,           color: '#3b82f6' },
              { label: 'Bots',    value: dash?.botCount ?? 0,    icon: 'chatbubble-outline' as const,     color: '#8b5cf6' },
              { label: 'Forms',   value: dash?.formCount ?? 0,   icon: 'document-text-outline' as const,  color: Colors.brand[500] },
              { label: 'Tickets', value: dash?.ticketCount ?? 0, icon: 'ticket-outline' as const,         color: '#f59e0b' },
            ].map(item => (
              <View key={item.label} style={styles.kpiPill}>
                <Ionicons name={item.icon} size={13} color={item.color} />
                <Text style={styles.kpiPillLabel}>{item.label}</Text>
                <Text style={[styles.kpiPillValue, { color: item.color }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          /* Expanded: 2×2 grid */
          <View style={styles.kpiGrid}>
            {dashQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <SkeletonLoader key={i} width="48%" height={88} borderRadius={14} />
              ))
            ) : (
              <>
                <KpiCard label="Emails"  value={dash?.emailCount ?? 0}  high={dash?.emailHigh ?? 0}  medium={dash?.emailMedium ?? 0}  icon="mail-outline"            color="#3b82f6"          width={kpiCardWidth} />
                <KpiCard label="Bots"    value={dash?.botCount ?? 0}    high={dash?.botHigh ?? 0}    medium={dash?.botMedium ?? 0}    icon="chatbubble-outline"      color="#8b5cf6"          width={kpiCardWidth} />
                <KpiCard label="Forms"   value={dash?.formCount ?? 0}   high={dash?.formHigh ?? 0}   medium={dash?.formMedium ?? 0}   icon="document-text-outline"  color={Colors.brand[500]} width={kpiCardWidth} />
                <KpiCard label="Tickets" value={dash?.ticketCount ?? 0} high={dash?.ticketHigh ?? 0} medium={dash?.ticketMedium ?? 0} icon="ticket-outline"          color="#f59e0b"          width={kpiCardWidth} />
              </>
            )}
          </View>
        )}

        {/* Feed / Tasks tab switcher */}
        <View style={styles.tabSwitcher}>
          <Pressable
            onPress={() => setActiveTab('feed')}
            style={[styles.tabBtn, activeTab === 'feed' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'feed' && styles.tabBtnTextActive]}>
              Activity Feed
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('tasks')}
            style={[styles.tabBtn, activeTab === 'tasks' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'tasks' && styles.tabBtnTextActive]}>
              Tasks
            </Text>
            {((tasksQuery.data?.length ?? 0) + (remindersQuery.data?.length ?? 0)) > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{(tasksQuery.data?.length ?? 0) + (remindersQuery.data?.length ?? 0)}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {activeTab === 'feed' ? (
          <>
            {/* Feed toolbar: category filters */}
            <View style={styles.feedToolbar}>
              <View style={styles.feedFilterRow}>
                {FEED_FILTERS.map(f => {
                  const countMap: Record<string, number> = {
                    email:  dash?.emailCount  ?? 0,
                    bot:    dash?.botCount    ?? 0,
                    form:   dash?.formCount   ?? 0,
                    ticket: dash?.ticketCount ?? 0,
                  };
                  const count = countMap[f.key!] ?? 0;
                  const active = feedFilter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setFeedFilter(active ? null : f.key)}
                      style={[styles.feedFilterBtn, { backgroundColor: active ? f.color : `${f.color}18` }]}
                    >
                      <Ionicons name={f.icon} size={15} color={active ? '#fff' : f.color} />
                      {count > 0 && (
                        <View style={[styles.feedFilterBadge, { backgroundColor: active ? '#ffffff40' : f.color }]}>
                          <Text style={styles.feedFilterBadgeText}>{count > 99 ? '99+' : count}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {feedQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <SkeletonLoader key={i} width="100%" height={100} borderRadius={14} style={styles.feedSkeleton} />
              ))
            ) : (feedQuery.data ?? []).length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={40} color={Colors.brand[500]} />
                <Text style={styles.emptyText}>You're all caught up!</Text>
              </View>
            ) : (
              <FlatList
                data={feedQuery.data ?? []}
                keyExtractor={(item) => item.id}
                renderItem={renderFeedCard}
                scrollEnabled={false}
              />
            )}
          </>
        ) : (
          (() => {
            const now = new Date();
            const tasks = tasksQuery.data ?? [];
            const reminders = remindersQuery.data ?? [];
            const pendingTasks   = tasks.filter(t => t.due_at && new Date(t.due_at) < now);
            const upcomingTasks  = tasks.filter(t => t.due_at && new Date(t.due_at) >= now);
            const counts = {
              all:       tasks.length + reminders.length,
              pending:   pendingTasks.length,
              upcoming:  upcomingTasks.length,
              reminders: reminders.length,
            };
            const isLoading = tasksQuery.isLoading || remindersQuery.isLoading;

            return (
              <>
                {/* Filter tabs */}
                <View style={styles.taskFilterRow}>
                  {([
                    { key: 'all',       label: 'All',       color: '#3b82f6' },
                    { key: 'pending',   label: 'Pending',   color: '#eab308' },
                    { key: 'upcoming',  label: 'Upcoming',  color: '#22c55e' },
                    { key: 'reminders', label: 'Reminders', color: '#8b5cf6' },
                  ] as const).map(f => {
                    const isActive = taskFilter === f.key;
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => setTaskFilter(f.key)}
                        style={[
                          styles.taskFilterBtn,
                          { backgroundColor: isActive ? f.color : `${f.color}18` },
                        ]}
                      >
                        <Text style={[styles.taskFilterText, { color: isActive ? '#fff' : f.color }]}>
                          {f.label}
                        </Text>
                        {counts[f.key] > 0 && (
                          <View style={[styles.taskFilterBadge, { backgroundColor: isActive ? '#ffffff40' : f.color }]}>
                            <Text style={[styles.taskFilterBadgeText, { color: '#fff' }]}>{counts[f.key]}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonLoader key={i} width="100%" height={72} borderRadius={12} style={styles.feedSkeleton} />
                  ))
                ) : counts[taskFilter] === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="checkmark-done-outline" size={40} color={Colors.brand[500]} />
                    <Text style={styles.emptyText}>
                      {taskFilter === 'all' ? 'No tasks or reminders!' : `No ${taskFilter} items.`}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Pending tasks */}
                    {(taskFilter === 'all' || taskFilter === 'pending') && pendingTasks.length > 0 && (
                      <>
                        {taskFilter === 'all' && <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Pending</Text>}
                        {pendingTasks.map(t => <TaskCard key={t.id} task={t} />)}
                      </>
                    )}
                    {/* Upcoming tasks */}
                    {(taskFilter === 'all' || taskFilter === 'upcoming') && upcomingTasks.length > 0 && (
                      <>
                        {taskFilter === 'all' && <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Upcoming</Text>}
                        {upcomingTasks.map(t => <TaskCard key={t.id} task={t} />)}
                      </>
                    )}
                    {/* Reminders */}
                    {(taskFilter === 'all' || taskFilter === 'reminders') && reminders.length > 0 && (
                      <>
                        {taskFilter === 'all' && <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Reminders</Text>}
                        {reminders.map(r => <ReminderCard key={r.id} reminder={r} />)}
                      </>
                    )}
                  </>
                )}
              </>
            );
          })()
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.secondary },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  greeting: { fontSize: 14, color: Colors.text.secondary },
  name: { fontSize: 22, fontWeight: '700', color: Colors.text.primary },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitleInline: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    margin: -8,
  },
  collapseBtnText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  kpiPillRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
  },
  kpiPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 8,
  },
  kpiPillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  kpiPillValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  seeAll: { fontSize: 13, color: Colors.brand[500], fontWeight: '500' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  kpiCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  kpiCenter: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 16,
  },
  kpiIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  kpiDonutWrap: {
    width: 53,
    height: 53,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiDonutNumber: {
    position: 'absolute',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  kpiLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.primary, textAlign: 'center' },
  kpiPriorityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiPriorityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  kpiPriorityText: { fontSize: 13, color: Colors.text.primary, textAlign: 'center' },
  feedSkeleton: { marginHorizontal: 16, marginVertical: 5 },
  feedToolbar: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  feedViewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  feedViewBtn: {
    padding: 7,
  },
  feedViewBtnActive: {
    backgroundColor: Colors.brand[500] + '15',
  },
  feedFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feedFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  feedFilterBadge: {
    borderRadius: 6,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  feedFilterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: Colors.brand[500],
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    backgroundColor: '#ffffff40',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: Colors.text.secondary, marginTop: 8 },
  taskFilterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  taskFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 4,
  },
  taskFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskFilterBadge: {
    borderRadius: 6,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  taskFilterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bottomPad: { height: 24 },
  overviewLeft: { flexDirection: 'column', gap: 6 },
  datePresetRow: { flexDirection: 'row', gap: 4 },
  datePresetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  datePresetBtnActive: {
    backgroundColor: Colors.brand[500],
    borderColor: Colors.brand[500],
  },
  datePresetText: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },
  datePresetTextActive: { color: '#ffffff' },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  userEmail: { fontSize: 12, color: Colors.text.secondary },
  roleBadge: {
    backgroundColor: Colors.brand[500] + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleText: { fontSize: 11, fontWeight: '600', color: Colors.brand[500] },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingHorizontal: 20,
  },
  dropdownSheet: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: Colors.brand[500] + '10',
  },
  dropdownItemLeft: { gap: 2 },
  dropdownItemName: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  dropdownItemRole: { fontSize: 12, color: Colors.text.secondary },
});

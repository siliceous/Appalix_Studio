import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Colors } from '@/constants/colors';
import type { FeedItem } from '@/types';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const SOURCE_ICONS: Record<FeedItem['type'], IoniconsName> = {
  form: 'document-text-outline',
  bot: 'hardware-chip-outline',
  email: 'mail-outline',
  ticket: 'ticket-outline',
};

const SOURCE_COLORS: Record<FeedItem['type'], string> = {
  form: '#8b5cf6',
  bot: '#15A4AE',
  email: '#3b82f6',
  ticket: '#f59e0b',
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  item: FeedItem;
  onPress: () => void;
  onReply?: () => void;
  onAssign?: () => void;
  onIgnore?: () => void;
}

export function FeedCard({ item, onPress, onReply, onAssign, onIgnore }: Props) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const iconName = SOURCE_ICONS[item.type];
  const iconColor = SOURCE_COLORS[item.type];

  function renderRightActions() {
    return (
      <Pressable
        style={styles.ignoreAction}
        onPress={() => {
          swipeableRef.current?.close();
          onIgnore?.();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={styles.ignoreInner}>
          <Ionicons name="close-circle" size={22} color="#fff" />
          <Text style={styles.ignoreText}>Ignore</Text>
        </View>
      </Pressable>
    );
  }

  function handleSwipeOpen() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Auto-fire ignore after full swipe open
    setTimeout(() => {
      swipeableRef.current?.close();
      onIgnore?.();
    }, 300);
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={80}
      onSwipeableOpen={handleSwipeOpen}
      friction={2}
      overshootRight={false}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {/* Header row: icon + name + time */}
        <View style={styles.headerRow}>
          <View style={[styles.iconCircle, { backgroundColor: `${iconColor}18` }]}>
            <Ionicons name={iconName} size={16} color={iconColor} />
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.name} numberOfLines={1}>
              {item.contactName ?? 'Unknown'}
            </Text>
            {item.company ? (
              <Text style={styles.company} numberOfLines={1}>
                {item.company}
              </Text>
            ) : null}
          </View>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>

        {/* Summary */}
        {item.summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {item.summary}
          </Text>
        ) : null}

        {/* Footer: pills + priority */}
        <View style={styles.footer}>
          <View style={styles.pills}>
            {item.contactEmail ? (
              <View style={styles.pill}>
                <Ionicons name="mail-outline" size={11} color={Colors.text.muted} />
                <Text style={styles.pillText} numberOfLines={1}>
                  {item.contactEmail}
                </Text>
              </View>
            ) : null}
            {item.contactPhone ? (
              <View style={styles.pill}>
                <Ionicons name="call-outline" size={11} color={Colors.text.muted} />
                <Text style={styles.pillText}>{item.contactPhone}</Text>
              </View>
            ) : null}
          </View>
          <PriorityBadge priority={item.priority} size="sm" />
        </View>

        {/* Quick actions — Reply + Assign only (Ignore moved to swipe) */}
        {(onReply || onAssign) && (
          <View style={styles.actions}>
            {onReply && (
              <Pressable style={styles.actionBtn} onPress={onReply}>
                <Ionicons name="arrow-undo-outline" size={14} color={Colors.brand[500]} />
                <Text style={[styles.actionText, { color: Colors.brand[500] }]}>
                  Reply
                </Text>
              </Pressable>
            )}
            {onAssign && (
              <Pressable style={styles.actionBtn} onPress={onAssign}>
                <Ionicons name="person-add-outline" size={14} color={Colors.text.secondary} />
                <Text style={styles.actionText}>Assign</Text>
              </Pressable>
            )}
            <View style={styles.swipeHint}>
              <Ionicons name="chevron-back" size={11} color={Colors.text.muted} />
              <Text style={styles.swipeHintText}>Swipe to ignore</Text>
            </View>
          </View>
        )}
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  // Swipe action
  ignoreAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 5,
    marginRight: 16,
    borderRadius: 14,
  },
  ignoreInner: {
    alignItems: 'center',
    gap: 3,
  },
  ignoreText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  // Card
  card: {
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
  pressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerCenter: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  company: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  time: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  summary: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pills: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
    maxWidth: 130,
  },
  pillText: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  swipeHintText: {
    fontSize: 11,
    color: Colors.text.muted,
  },
});

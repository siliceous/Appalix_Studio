import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { PRIORITY_LABELS } from '@/constants/config';
import type { SageTicketPriority } from '@/types';

interface Props {
  priority: SageTicketPriority;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'md' }: Props) {
  return (
    <Badge
      label={PRIORITY_LABELS[priority]}
      color={Colors.priority[priority]}
      bgColor={Colors.priorityBg[priority]}
      size={size}
    />
  );
}

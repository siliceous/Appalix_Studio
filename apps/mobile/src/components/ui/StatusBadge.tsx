import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { STATUS_LABELS } from '@/constants/config';
import type { SageTicketStatus } from '@/types';

interface Props {
  status: SageTicketStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <Badge
      label={STATUS_LABELS[status]}
      color={Colors.status[status]}
      bgColor={Colors.statusBg[status]}
      size={size}
    />
  );
}

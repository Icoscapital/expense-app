import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExpenseStatus, ReportStatus } from '../types';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/theme';

type Status = ExpenseStatus | ReportStatus;

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  draft:     { label: 'Draft',     bg: Colors.gray100,      text: Colors.gray600 },
  submitted: { label: 'Submitted', bg: Colors.primaryLight,  text: Colors.primary },
  pending:   { label: 'Pending',   bg: Colors.warningLight,  text: Colors.warning },
  approved:  { label: 'Approved',  bg: Colors.successLight,  text: Colors.success },
  rejected:  { label: 'Rejected',  bg: Colors.dangerLight,   text: Colors.danger  },
};

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSmall && styles.badgeSm]}>
      <Text style={[styles.text, { color: config.text }, isSmall && styles.textSm]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  textSm: {
    fontSize: FontSize.xs,
  },
});

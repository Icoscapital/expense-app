import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Expense } from '../types';
import { CATEGORIES } from '../constants/categories';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { StatusBadge } from './StatusBadge';

interface Props {
  expense: Expense;
  onPress?: () => void;
  showEmployee?: boolean;
}

export function ExpenseCard({ expense, onPress, showEmployee = false }: Props) {
  const category = CATEGORIES[expense.category];
  const formattedAmount = new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: expense.currency || 'EUR',
  }).format(expense.amount);

  const formattedDate = new Date(expense.expense_date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: category?.color + '22' }]}>
        <Text style={styles.icon}>{category?.icon ?? '📋'}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.merchant} numberOfLines={1}>
          {expense.merchant_name || category?.label || 'Expense'}
        </Text>
        {showEmployee && expense.profiles?.full_name && (
          <Text style={styles.employee}>{expense.profiles.full_name}</Text>
        )}
        <Text style={styles.date}>{formattedDate}</Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.amount}>{formattedAmount}</Text>
        <StatusBadge status={expense.status} size="sm" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  merchant: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  employee: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginBottom: 2,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
});

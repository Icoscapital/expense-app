import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useExpenses } from '../../../hooks/useExpenses';
import { ExpenseCard } from '../../../components/ExpenseCard';
import { EmptyState } from '../../../components/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../constants/theme';
import { ExpenseStatus } from '../../../types';

type FilterTab = 'all' | ExpenseStatus;

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function ExpenseListScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { expenses, loading, refetch } = useExpenses({
    userId: profile?.id,
    workspaceId: profile?.workspace_id ?? undefined,
  });
  const [filter, setFilter] = useState<FilterTab>('all');

  // Refresh whenever this screen comes into focus (e.g. after recall/submit on detail screen)
  useFocusEffect(useCallback(() => { refetch(); }, []));

  const filtered = filter === 'all'
    ? expenses
    : expenses.filter((e) => e.status === filter);

  const totalAmount = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Expenses</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(employee)/expenses/new')}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''} · {' '}
            <Text style={styles.summaryAmount}>
              {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(totalAmount)}
            </Text>
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, filtered.length === 0 && { flex: 1 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            onPress={() => router.push(`/(employee)/expenses/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🧾"
            title={filter === 'all' ? 'No expenses yet' : `No ${filter} expenses`}
            subtitle={filter === 'all' ? 'Scan a receipt or add an expense manually' : undefined}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },

  filterBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    height: 32,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Colors.gray100,
  },
  filterTabActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },

  summaryBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primaryLight,
  },
  summaryText: { fontSize: FontSize.sm, color: Colors.primary },
  summaryAmount: { fontWeight: '700' },

  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
});

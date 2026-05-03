import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { useReports } from '../../hooks/useReports';
import { ExpenseCard } from '../../components/ExpenseCard';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  }
  const { expenses, loading, refetch } = useExpenses({
    userId: profile?.id,
    workspaceId: profile?.workspace_id ?? undefined,
  });
  const { reports } = useReports(profile?.workspace_id ?? undefined);

  const thisWeek = getThisWeekWindow();
  const weekExpenses = expenses.filter(
    (e) => e.expense_date >= thisWeek.start && e.expense_date <= thisWeek.end
  );
  const weekTotal = weekExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const draftCount = expenses.filter((e) => e.status === 'draft').length;
  const submittedCount = expenses.filter((e) => e.status === 'submitted').length;

  // Latest report for this user's workspace
  const latestReport = reports[0] ?? null;
  const recentExpenses = expenses.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{profile?.full_name ?? 'Welcome'}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        {/* Week Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Week's Spend</Text>
          <Text style={styles.summaryAmount}>
            {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(weekTotal)}
          </Text>
          <Text style={styles.summaryPeriod}>{toDisplayDate(thisWeek.start)} – {toDisplayDate(thisWeek.end)}</Text>

          <View style={styles.summaryStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{draftCount}</Text>
              <Text style={styles.statLabel}>Drafts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{submittedCount}</Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{weekExpenses.length}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        {/* Latest Report Status */}
        {latestReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Latest Report</Text>
            <View style={styles.reportCard}>
              <View style={styles.reportInfo}>
                <Text style={styles.reportPeriod}>
                  Week of {latestReport.week_start}
                </Text>
                <Text style={styles.reportAmount}>
                  {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
                    .format(latestReport.total_amount ?? 0)}
                </Text>
              </View>
              <StatusBadge status={latestReport.status} />
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(employee)/scan')}
            >
              <Text style={styles.actionIcon}>📷</Text>
              <Text style={styles.actionLabel}>Scan Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(employee)/expenses/new')}
            >
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionLabel}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(employee)/expenses')}
            >
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionLabel}>All Expenses</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => router.push('/(employee)/expenses')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {recentExpenses.length > 0 ? (
            recentExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onPress={() => router.push(`/(employee)/expenses/${expense.id}`)}
              />
            ))
          ) : (
            <EmptyState
              icon="🧾"
              title="No expenses yet"
              subtitle="Tap 'Scan Receipt' or 'Add Expense' to get started"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function toDisplayDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}

function getThisWeekWindow() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  container: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  greeting: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  logoutBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  logoutText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },

  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  summaryAmount: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.white },
  summaryPeriod: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2, marginBottom: Spacing.md },
  summaryStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  statLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  reportInfo: { flex: 1 },
  reportPeriod: { fontSize: FontSize.sm, color: Colors.textSecondary },
  reportAmount: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginTop: 2 },

  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  actionIcon: { fontSize: 26, marginBottom: 6 },
  actionLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text, textAlign: 'center' },
});

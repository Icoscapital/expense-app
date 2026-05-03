import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { useReports } from '../../hooks/useReports';
import { Colors, FontSize, BorderRadius, Shadow } from '../../constants/theme';

export default function AdminDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const { expenses, loading: expLoading, refetch: refetchExp } = useExpenses({
    workspaceId: profile?.workspace_id ?? undefined,
  });
  const { reports, loading: repLoading, refetch: refetchRep } = useReports(
    profile?.workspace_id ?? undefined
  );

  const loading = expLoading || repLoading;
  function refetch() { refetchExp(); refetchRep(); }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const weekStart = getWeekStart();

  const monthExpenses = expenses.filter(e => e.expense_date >= monthStart);
  const weekExpenses  = expenses.filter(e => e.expense_date >= weekStart);
  const pendingReports    = reports.filter(r => r.status === 'pending');
  const submittedExpenses = expenses.filter(e => e.status === 'submitted');

  const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const weekTotal  = weekExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] ?? 'Admin'} 👋</Text>
        <Text style={styles.sub}>Icos Capital · Expense Overview</Text>

        {/* Stats row */}
        <View style={styles.row}>
          <TouchableOpacity style={[styles.statCard, { borderTopColor: Colors.primary }]}
            onPress={() => router.push('/(admin)/reports')}>
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{fmt(weekTotal)}</Text>
            <Text style={styles.statSub}>{weekExpenses.length} expenses</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statCard, { borderTopColor: Colors.success }]}
            onPress={() => router.push('/(admin)/reports')}>
            <Text style={styles.statIcon}>🗓️</Text>
            <Text style={styles.statLabel}>This Month</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{fmt(monthTotal)}</Text>
            <Text style={styles.statSub}>{monthExpenses.length} expenses</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.statCard, { borderTopColor: Colors.warning }]}
            onPress={() => router.push('/(admin)/reports')}>
            <Text style={styles.statIcon}>⏳</Text>
            <Text style={styles.statLabel}>Pending Reports</Text>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{pendingReports.length}</Text>
            <Text style={styles.statSub}>awaiting review</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statCard, { borderTopColor: Colors.danger }]}
            onPress={() => router.push('/(admin)/reports')}>
            <Text style={styles.statIcon}>📬</Text>
            <Text style={styles.statLabel}>Needs Review</Text>
            <Text style={[styles.statValue, { color: Colors.danger }]}>{submittedExpenses.length}</Text>
            <Text style={styles.statSub}>submitted expenses</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation cards */}
        <Text style={styles.sectionTitle}>Navigate</Text>
        <View style={styles.navGrid}>
          <TouchableOpacity style={styles.navCard} onPress={() => router.push('/(admin)/reports')}>
            <Text style={styles.navIcon}>📑</Text>
            <Text style={styles.navLabel}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navCard} onPress={() => router.push('/(admin)/team')}>
            <Text style={styles.navIcon}>👥</Text>
            <Text style={styles.navLabel}>Team</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navCard} onPress={() => router.push('/(admin)/profile')}>
            <Text style={styles.navIcon}>⚙️</Text>
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return monday.toISOString().split('T')[0];
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 16, paddingBottom: 32 },

  greeting: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginTop: 4 },
  sub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 16, marginTop: 2 },

  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },

  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderTopWidth: 3,
    ...Shadow.sm,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', marginTop: 4 },
  statSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 10, marginTop: 6 },

  navGrid: { flexDirection: 'row', gap: 10 },
  navCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    alignItems: 'center',
    ...Shadow.sm,
  },
  navIcon: { fontSize: 28, marginBottom: 6 },
  navLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text },
});

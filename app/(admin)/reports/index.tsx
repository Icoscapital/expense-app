import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useReports } from '../../../hooks/useReports';
import { useExpenses } from '../../../hooks/useExpenses';
import { StatusBadge } from '../../../components/StatusBadge';
import { EmptyState } from '../../../components/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { Report } from '../../../types';

function toDisplayDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}

const fmt = (n: number | null) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

export default function AdminReportsScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { reports, loading, refetch, createManualReport } = useReports(profile?.workspace_id ?? undefined);
  const { expenses } = useExpenses({ workspaceId: profile?.workspace_id ?? undefined });
  const [generating, setGenerating] = useState(false);

  useFocusEffect(useCallback(() => { refetch(); }, []));

  async function handleSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out?')) signOut();
    } else {
      Alert.alert('Sign out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
      ]);
    }
  }

  // Submitted expenses not yet in any report
  const unlinkedCount = expenses.filter(
    (e) => e.status === 'submitted' && !e.report_id
  ).length;

  async function handleGenerateReport() {
    if (!profile?.workspace_id) return;

    async function doGenerate() {
      setGenerating(true);
      try {
        await createManualReport(profile!.workspace_id!);
        Alert.alert('✅ Report created', 'The report is ready for review.');
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setGenerating(false);
      }
    }

    const msg = `Bundle ${unlinkedCount} submitted expense${unlinkedCount !== 1 ? 's' : ''} into a report for review?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doGenerate();
    } else {
      Alert.alert('Generate Report?', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: doGenerate },
      ]);
    }
  }

  function renderReport({ item: report }: { item: Report }) {
    const expenseCount = report.expenses?.length ?? 0;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(admin)/reports/${report.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.period}>
              {toDisplayDate(report.week_start)} – {toDisplayDate(report.week_end)}
            </Text>
            <Text style={styles.expenseCount}>
              {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.total}>{fmt(report.total_amount)}</Text>
            <StatusBadge status={report.status} size="sm" />
          </View>
        </View>
        {report.status === 'pending' && (
          <View style={styles.reviewBanner}>
            <Text style={styles.reviewBannerText}>👆 Tap to review and approve</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Reports</Text>
        <View style={styles.headerRight}>
          {reports.filter((r) => r.status === 'pending').length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {reports.filter((r) => r.status === 'pending').length} pending
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Generate report from submitted expenses */}
      {unlinkedCount > 0 && (
        <TouchableOpacity
          style={styles.generateBanner}
          onPress={handleGenerateReport}
          disabled={generating}
        >
          <Text style={styles.generateIcon}>📊</Text>
          <View style={styles.generateText}>
            <Text style={styles.generateTitle}>
              {unlinkedCount} expense{unlinkedCount !== 1 ? 's' : ''} ready for review
            </Text>
            <Text style={styles.generateSub}>Tap to bundle into a report</Text>
          </View>
          <Text style={styles.generateArrow}>›</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, reports.length === 0 && { flex: 1 }]}
        refreshControl={<RefreshControl refreshing={loading || generating} onRefresh={refetch} />}
        renderItem={renderReport}
        ListEmptyComponent={
          <EmptyState
            icon="📑"
            title="No reports yet"
            subtitle={unlinkedCount > 0
              ? 'Tap the banner above to create your first report'
              : 'Reports are auto-generated every Monday at 8am from submitted expenses.'}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.warning },
  signOutBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  signOutText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },

  generateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  generateIcon: { fontSize: 28 },
  generateText: { flex: 1 },
  generateTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.primary },
  generateSub: { fontSize: FontSize.sm, color: Colors.primary, opacity: 0.8 },
  generateArrow: { fontSize: 22, color: Colors.primary },

  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  period: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  expenseCount: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  total: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  reviewBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  reviewBannerText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
});

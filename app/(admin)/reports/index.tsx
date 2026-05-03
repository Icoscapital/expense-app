import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Modal,
  TouchableOpacity, RefreshControl, Alert, Platform, TextInput,
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
import { supabase } from '../../../lib/supabase';

function toDisplayDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}
function toISO(display: string): string {
  const p = display.split('/');
  if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  return display;
}

const fmt = (n: number | null) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

export default function AdminReportsScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { reports, loading, refetch, createManualReport } = useReports(profile?.workspace_id ?? undefined);
  const { expenses } = useExpenses({ workspaceId: profile?.workspace_id ?? undefined });
  const [generating, setGenerating] = useState(false);

  // Export modal state
  const [exportVisible, setExportVisible] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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

  async function handleExport() {
    setExportError('');
    if (!exportFrom || !exportTo) {
      setExportError('Please enter both a from and to date.');
      return;
    }
    const fromISO = toISO(exportFrom);
    const toISO2 = toISO(exportTo);
    if (fromISO > toISO2) {
      setExportError('"From" date must be before "To" date.');
      return;
    }
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, profiles(full_name)')
        .eq('workspace_id', profile!.workspace_id!)
        .gte('expense_date', fromISO)
        .lte('expense_date', toISO2)
        .order('expense_date', { ascending: true });

      if (error) throw new Error(error.message);
      const rows = data ?? [];

      if (rows.length === 0) {
        setExportError('No expenses found for this date range.');
        setExporting(false);
        return;
      }

      // Calculate total
      const total = rows.reduce((s: number, e: any) => s + Number(e.amount), 0);

      const csvRows = [
        ['Employee', 'Date', 'Merchant', 'Category', 'Amount', 'Currency', 'Description', 'Status', 'Rejection Note'],
        ...rows.map((e: any) => [
          e.profiles?.full_name ?? '',
          e.expense_date,
          e.merchant_name ?? '',
          e.category,
          String(e.amount),
          e.currency ?? 'EUR',
          e.description ?? '',
          e.status,
          e.rejection_note ?? '',
        ]),
        ['', '', '', 'TOTAL', fmt(total), '', '', '', ''],
      ];
      const csv = csvRows.map((r) => r.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses-${fromISO}-to-${toISO2}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setExportVisible(false);
        setExportFrom('');
        setExportTo('');
      } else {
        Alert.alert('CSV ready', `${rows.length} expenses exported. Open on web to download the file.`);
      }
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

  // Pre-fill export dates with current month
  function openExportModal() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = now;
    setExportFrom(toDisplayDate(firstOfMonth.toISOString().split('T')[0]));
    setExportTo(toDisplayDate(today.toISOString().split('T')[0]));
    setExportError('');
    setExportVisible(true);
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
          <TouchableOpacity style={styles.exportBtn} onPress={openExportModal}>
            <Text style={styles.exportBtnText}>⬇ Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Export Modal */}
      <Modal
        visible={exportVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExportVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Export Expenses</Text>
            <Text style={styles.modalSub}>Download all expenses for a date range as a CSV file (opens in Excel).</Text>

            <Text style={styles.modalLabel}>From</Text>
            <TextInput
              style={styles.modalInput}
              value={exportFrom}
              onChangeText={setExportFrom}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.modalLabel}>To</Text>
            <TextInput
              style={styles.modalInput}
              value={exportTo}
              onChangeText={setExportTo}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={Colors.textMuted}
            />

            {!!exportError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {exportError}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setExportVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.downloadBtn, exporting && { opacity: 0.6 }]}
                onPress={handleExport}
                disabled={exporting}
              >
                <Text style={styles.downloadBtnText}>{exporting ? 'Exporting…' : '⬇ Download CSV'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  exportBtn: {
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  exportBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
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

  // Export Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  modalLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, marginBottom: 4, marginTop: 10 },
  modalInput: {
    backgroundColor: Colors.gray50, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingVertical: 8, paddingHorizontal: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: '#FCA5A5', padding: 8, marginTop: 8,
  },
  errorText: { fontSize: FontSize.xs, color: '#B91C1C', fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { fontWeight: '700', color: Colors.gray700, fontSize: FontSize.sm },
  downloadBtn: { backgroundColor: Colors.primary },
  downloadBtnText: { fontWeight: '700', color: Colors.white, fontSize: FontSize.sm },
});

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, TextInput, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useReports } from '../../../hooks/useReports';
import { useExpenses } from '../../../hooks/useExpenses';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { CATEGORIES } from '../../../constants/categories';
import { Expense } from '../../../types';

export default function ReportDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { reports, approveReport, rejectReport, refetch: refetchReports } = useReports(profile?.workspace_id ?? undefined);
  const { approveExpense, rejectExpense } = useExpenses({ workspaceId: profile?.workspace_id ?? undefined });

  const [loading, setLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  // Per-expense reject modal
  const [rejectExpenseId, setRejectExpenseId] = useState<string | null>(null);
  const [rejectExpenseNote, setRejectExpenseNote] = useState('');

  const report = reports.find((r) => r.id === id) ?? null;

  if (!report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Report not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const expenses = report.expenses ?? [];
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
  const toDisplayDate = (iso: string) => {
    if (!iso) return '';
    const p = iso.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  };

  // Count pending (submitted) expenses
  const pendingExpenses = expenses.filter((e) => e.status === 'submitted');

  async function handleApproveAll() {
    async function doApprove() {
      setLoading(true);
      try {
        await approveReport(report!.id, profile!.id);
        Alert.alert('✅ Approved', 'All expenses have been approved.');
        router.back();
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    }

    const msg = `Approve all ${pendingExpenses.length} remaining expense${pendingExpenses.length !== 1 ? 's' : ''}?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doApprove();
    } else {
      Alert.alert('Approve All?', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: doApprove },
      ]);
    }
  }

  async function handleApproveOne(expense: Expense) {
    async function doApprove() {
      setLoading(true);
      try {
        await approveExpense(expense.id);
        await refetchReports();
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    }
    if (Platform.OS === 'web') {
      if (window.confirm(`Approve "${expense.merchant_name || expense.category}"?`)) doApprove();
    } else {
      Alert.alert('Approve?', `Approve "${expense.merchant_name || expense.category}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: doApprove },
      ]);
    }
  }

  async function handleRejectOne() {
    if (!rejectExpenseNote.trim()) {
      Alert.alert('Note required', 'Please add a reason.');
      return;
    }
    const expenseId = rejectExpenseId!;
    const note = rejectExpenseNote.trim();
    setRejectExpenseId(null);
    setRejectExpenseNote('');
    setLoading(true);
    try {
      await rejectExpense(expenseId, note);
      await refetchReports();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRejectReport() {
    if (!rejectNote.trim()) {
      Alert.alert('Note required', 'Please add a note explaining why this report is rejected.');
      return;
    }
    setRejectModalVisible(false);
    setLoading(true);
    try {
      await rejectReport(report!.id, profile!.id, rejectNote.trim());
      Alert.alert('Report rejected', 'Employees will be notified.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadCSV() {
    if (Platform.OS !== 'web') {
      Alert.alert('Web only', 'CSV download is available on the web version.');
      return;
    }
    const rows = [
      ['Employee', 'Date', 'Merchant', 'Category', 'Amount', 'Currency', 'Description', 'Status', 'Rejection Note'],
      ...expenses.map((e) => [
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
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${report!.week_start}-to-${report!.week_end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Group expenses by employee
  const byEmployee: Record<string, typeof expenses> = {};
  expenses.forEach((e) => {
    const name = e.profiles?.full_name ?? 'Unknown';
    if (!byEmployee[name]) byEmployee[name] = [];
    byEmployee[name].push(e);
  });

  return (
    <SafeAreaView style={styles.safe}>
      {loading && <LoadingOverlay message="Processing…" />}

      {/* Nav */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Report Detail</Text>
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadCSV}>
          <Text style={styles.downloadBtnText}>⬇ CSV</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Summary — compact */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryPeriod}>{toDisplayDate(report.week_start)} – {toDisplayDate(report.week_end)}</Text>
            <StatusBadge status={report.status} size="sm" />
          </View>
          <Text style={styles.summaryTotal}>{fmt(report.total_amount ?? 0)}</Text>
          <Text style={styles.summaryCount}>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {Object.keys(byEmployee).length} employee{Object.keys(byEmployee).length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Expenses grouped by employee */}
        {Object.entries(byEmployee).map(([employee, emExpenses]) => {
          const empTotal = emExpenses.reduce((s, e) => s + Number(e.amount), 0);
          return (
            <View key={employee} style={styles.section}>
              {/* Employee row */}
              <View style={styles.employeeHeader}>
                <View style={styles.employeeAvatar}>
                  <Text style={styles.employeeInitial}>{employee[0]}</Text>
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{employee}</Text>
                  <Text style={styles.employeeTotal}>{fmt(empTotal)}</Text>
                </View>
              </View>

              {/* Expense rows with per-item approve/reject */}
              {emExpenses.map((e) => {
                const cat = CATEGORIES[e.category];
                const isPending = e.status === 'submitted';
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.expenseRow}
                    onPress={() => router.push(`/(admin)/expenses/${e.id}`)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.expenseIcon, { backgroundColor: (cat?.color ?? '#6366F1') + '22' }]}>
                      <Text style={styles.expenseIconText}>{cat?.icon ?? '📋'}</Text>
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseMerchant} numberOfLines={1}>
                        {e.merchant_name || cat?.label || 'Expense'}
                      </Text>
                      <Text style={styles.expenseDate}>{toDisplayDate(e.expense_date)}</Text>
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>{fmt(Number(e.amount))}</Text>
                      {isPending && report.status === 'pending' ? (
                        <View style={styles.expenseActions}>
                          <TouchableOpacity
                            style={styles.rejectOneBtn}
                            onPress={() => { setRejectExpenseId(e.id); setRejectExpenseNote(''); }}
                          >
                            <Text style={styles.rejectOneBtnText}>✕</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.approveOneBtn}
                            onPress={() => handleApproveOne(e)}
                          >
                            <Text style={styles.approveOneBtnText}>✓</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <StatusBadge status={e.status} size="sm" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* Bottom action buttons (only if pending expenses remain) */}
        {report.status === 'pending' && pendingExpenses.length > 0 && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => setRejectModalVisible(true)}
            >
              <Text style={styles.rejectBtnText}>✕  Reject All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={handleApproveAll}
            >
              <Text style={styles.approveBtnText}>✓  Approve All</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Reject whole report modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reject Report</Text>
            <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Reason for rejection *</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder="Explain what needs to be corrected…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, { marginTop: Spacing.md }]}
              onPress={handleRejectReport}
            >
              <Text style={styles.rejectBtnText}>Send Rejection</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Reject single expense modal */}
      <Modal
        visible={!!rejectExpenseId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRejectExpenseId(null)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reject Expense</Text>
            <TouchableOpacity onPress={() => setRejectExpenseId(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Reason *</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectExpenseNote}
              onChangeText={setRejectExpenseNote}
              placeholder="Why is this expense rejected?"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, { marginTop: Spacing.md }]}
              onPress={handleRejectOne}
            >
              <Text style={styles.rejectBtnText}>Reject Expense</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: FontSize.sm, color: Colors.textSecondary },
  backLink: { color: Colors.primary, marginTop: Spacing.md, fontSize: FontSize.sm },

  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  navTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  downloadBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  downloadBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },

  container: { padding: 10, paddingBottom: 40 },

  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  summaryPeriod: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', flex: 1 },
  summaryTotal: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  summaryCount: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  section: { marginBottom: 10 },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  employeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  employeeInitial: { color: Colors.white, fontWeight: '700', fontSize: FontSize.xs },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  employeeTotal: { fontSize: FontSize.xs, color: Colors.textSecondary },

  // Compact expense row
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: 8,
    marginBottom: 5,
    ...Shadow.sm,
  },
  expenseIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  expenseIconText: { fontSize: 16 },
  expenseInfo: { flex: 1, marginRight: 6 },
  expenseMerchant: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  expenseDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  expenseRight: { alignItems: 'flex-end', gap: 3 },
  expenseAmount: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  expenseActions: { flexDirection: 'row', gap: 4, marginTop: 2 },
  rejectOneBtn: {
    width: 28,
    height: 22,
    borderRadius: 4,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectOneBtnText: { fontSize: 11, color: Colors.danger, fontWeight: '700' },
  approveOneBtn: {
    width: 28,
    height: 22,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveOneBtnText: { fontSize: 11, color: Colors.white, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: BorderRadius.md, alignItems: 'center' },
  rejectBtn: { backgroundColor: Colors.dangerLight, borderWidth: 1, borderColor: Colors.danger },
  rejectBtnText: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.sm },
  approveBtn: { backgroundColor: Colors.primary },
  approveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },

  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  modalTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  modalClose: { fontSize: FontSize.md, color: Colors.textSecondary },
  modalBody: { padding: Spacing.md },
  modalLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  modalInput: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, TextInput, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useReports } from '../../../hooks/useReports';
import { ExpenseCard } from '../../../components/ExpenseCard';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';

export default function ReportDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { reports, approveReport, rejectReport } = useReports(profile?.workspace_id ?? undefined);

  const [loading, setLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

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

  async function handleApprove() {
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

    if (Platform.OS === 'web') {
      if (window.confirm(`Approve report? This will approve all ${expenses.length} expenses.`)) doApprove();
    } else {
      Alert.alert('Approve report?', `This will approve all ${expenses.length} expenses.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: doApprove },
      ]);
    }
  }

  async function handleReject() {
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
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryPeriod}>{toDisplayDate(report.week_start)} – {toDisplayDate(report.week_end)}</Text>
            <StatusBadge status={report.status} />
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
              <View style={styles.employeeHeader}>
                <View style={styles.employeeAvatar}>
                  <Text style={styles.employeeInitial}>{employee[0]}</Text>
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{employee}</Text>
                  <Text style={styles.employeeTotal}>{fmt(empTotal)}</Text>
                </View>
              </View>
              {emExpenses.map((e) => (
                <ExpenseCard key={e.id} expense={e} showEmployee={false} />
              ))}
            </View>
          );
        })}

        {/* Action Buttons (only for pending reports) */}
        {report.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => setRejectModalVisible(true)}
            >
              <Text style={styles.rejectBtnText}>✕  Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={handleApprove}
            >
              <Text style={styles.approveBtnText}>✓  Approve All</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
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
              numberOfLines={5}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, { marginTop: Spacing.lg }]}
              onPress={handleReject}
            >
              <Text style={styles.rejectBtnText}>Send Rejection</Text>
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
  notFound: { fontSize: FontSize.md, color: Colors.textSecondary },
  backLink: { color: Colors.primary, marginTop: Spacing.md, fontSize: FontSize.base },

  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  navTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },

  container: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  summaryPeriod: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', flex: 1 },
  summaryTotal: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.white },
  summaryCount: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  section: { marginBottom: Spacing.lg },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  employeeInitial: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  employeeTotal: { fontSize: FontSize.sm, color: Colors.textSecondary },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  actionBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  rejectBtn: { backgroundColor: Colors.dangerLight, borderWidth: 1, borderColor: Colors.danger },
  rejectBtnText: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.base },
  approveBtn: { backgroundColor: Colors.primary },
  approveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },

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
  modalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  modalClose: { fontSize: FontSize.lg, color: Colors.textSecondary },
  modalBody: { padding: Spacing.md },
  modalLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: Spacing.sm },
  modalInput: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useExpenses } from '../../../hooks/useExpenses';
import { AmountInput } from '../../../components/AmountInput';
import { CategoryPicker } from '../../../components/CategoryPicker';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { ExpenseCategory } from '../../../types';

function toDisplayDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}
function toISODate(display: string): string {
  const parts = display.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return display;
}

export default function AdminMyExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const {
    expenses, saveDraftExpense, deleteExpense, submitExpense,
    recallExpense, resubmitRejectedExpense, deleteRejectedExpense, loading,
  } = useExpenses({
    userId: profile?.id,
    workspaceId: profile?.workspace_id ?? undefined,
  });

  const expense = expenses.find((e) => e.id === id) ?? null;

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [recallModalVisible, setRecallModalVisible] = useState(false);
  const [recallNote, setRecallNote] = useState('');

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount));
      setCurrency(expense.currency ?? 'EUR');
      setCategory(expense.category);
      setMerchantName(expense.merchant_name ?? '');
      setDescription(expense.description ?? '');
      setExpenseDate(toDisplayDate(expense.expense_date));
    }
  }, [expense?.id]);

  if (!expense) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Expense not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isDraft = expense.status === 'draft';
  const isSubmitted = expense.status === 'submitted';
  const isRejected = expense.status === 'rejected';

  async function handleSave() {
    if (!isDraft) return;
    setSaving(true);
    try {
      await saveDraftExpense(expense!.id, {
        amount: parseFloat(amount),
        currency,
        category: category!,
        merchant_name: merchantName.trim() || null,
        description: description.trim() || null,
        expense_date: toISODate(expenseDate),
      });
      Alert.alert('Saved', 'Expense updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!isDraft) return;
    async function doSubmit() {
      setSaving(true);
      try {
        await saveDraftExpense(expense!.id, {
          amount: parseFloat(amount),
          currency,
          category: category!,
          merchant_name: merchantName.trim() || null,
          description: description.trim() || null,
          expense_date: toISODate(expenseDate),
        });
        await submitExpense(expense!.id);
        router.push('/(admin)/my-expenses');
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setSaving(false);
      }
    }
    if (Platform.OS === 'web') {
      if (window.confirm('Submit expense?')) doSubmit();
    } else {
      Alert.alert('Submit expense?', 'Any unsaved changes will be saved automatically.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: doSubmit },
      ]);
    }
  }

  async function handleDelete() {
    if (!isDraft) return;
    async function doDelete() {
      setSaving(true);
      try {
        await deleteExpense(expense!.id);
        router.push('/(admin)/my-expenses');
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setSaving(false);
      }
    }
    if (Platform.OS === 'web') {
      if (window.confirm('Delete expense? This cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete expense?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function handleRecall() {
    if (!recallNote.trim()) {
      Alert.alert('Reason required', 'Please enter a reason for recalling this expense.');
      return;
    }
    setSaving(true);
    setRecallModalVisible(false);
    try {
      await recallExpense(expense!.id, recallNote.trim());
      setRecallNote('');
      Alert.alert('Recalled', 'Expense is back in Draft — you can now edit and resubmit it.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResubmitRejected() {
    async function doResubmit() {
      setSaving(true);
      try {
        await resubmitRejectedExpense(expense!.id);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setSaving(false);
      }
    }
    if (Platform.OS === 'web') {
      if (window.confirm('Reset this expense to Draft so you can edit and resubmit it?')) doResubmit();
    } else {
      Alert.alert('Edit & Resubmit?', 'This will reset the expense to Draft so you can correct it.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit & Resubmit', onPress: doResubmit },
      ]);
    }
  }

  async function handleDeleteRejected() {
    async function doDelete() {
      setSaving(true);
      try {
        await deleteRejectedExpense(expense!.id);
        router.push('/(admin)/my-expenses');
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setSaving(false);
      }
    }
    if (Platform.OS === 'web') {
      if (window.confirm('Permanently delete this rejected expense? This cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete expense?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {(saving || loading) && <LoadingOverlay />}

      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Expense Details</Text>
        {isDraft && (
          <TouchableOpacity onPress={handleDelete}>
            <Text style={styles.deleteBtn}>🗑</Text>
          </TouchableOpacity>
        )}
        {!isDraft && <View style={{ width: 60 }} />}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.statusRow}>
            <StatusBadge status={expense.status} />
          </View>

          {expense.recall_note && (
            <View style={styles.recallBox}>
              <Text style={styles.recallLabel}>📝 Recall reason:</Text>
              <Text style={styles.recallNote}>{expense.recall_note}</Text>
            </View>
          )}

          {expense.rejection_note && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Admin note:</Text>
              <Text style={styles.rejectionNote}>{expense.rejection_note}</Text>
            </View>
          )}

          {expense.receipt_url && (
            <View style={styles.receiptContainer}>
              <Image source={{ uri: expense.receipt_url }} style={styles.receiptImage} resizeMode="cover" />
            </View>
          )}

          <Text style={styles.label}>Amount</Text>
          {isDraft ? (
            <AmountInput value={amount} onChange={setAmount} currency={currency} onCurrencyChange={setCurrency} />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>
                {new Intl.NumberFormat('en-IE', { style: 'currency', currency: expense.currency ?? 'EUR' }).format(Number(expense.amount))}
              </Text>
            </View>
          )}

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Category</Text>
          {isDraft ? (
            <CategoryPicker value={category} onChange={setCategory} />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{expense.category}</Text>
            </View>
          )}

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Merchant</Text>
          {isDraft ? (
            <TextInput style={styles.input} value={merchantName} onChangeText={setMerchantName}
              placeholder="Merchant name" placeholderTextColor={Colors.textMuted} />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{expense.merchant_name || '—'}</Text>
            </View>
          )}

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Date</Text>
          {isDraft ? (
            <TextInput style={styles.input} value={expenseDate} onChangeText={setExpenseDate}
              placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{toDisplayDate(expense.expense_date)}</Text>
            </View>
          )}

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Description</Text>
          {isDraft ? (
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription}
              placeholder="Optional notes" placeholderTextColor={Colors.textMuted} multiline />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{expense.description || '—'}</Text>
            </View>
          )}

          {isDraft && (
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.saveBtn]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.submitBtn]} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          )}

          {isSubmitted && (
            <TouchableOpacity style={styles.recallBtn} onPress={() => setRecallModalVisible(true)}>
              <Text style={styles.recallBtnText}>↩ Recall & Edit</Text>
            </TouchableOpacity>
          )}

          {isRejected && (
            <View style={[styles.buttonRow, { marginTop: 16 }]}>
              <TouchableOpacity style={[styles.button, styles.deleteRejectedBtn]} onPress={handleDeleteRejected}>
                <Text style={styles.deleteRejectedText}>🗑 Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.resubmitBtn]} onPress={handleResubmitRejected}>
                <Text style={styles.resubmitText}>✏️ Edit & Resubmit</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={recallModalVisible} transparent animationType="slide" onRequestClose={() => setRecallModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Recall Expense</Text>
            <Text style={styles.modalSubtitle}>This will move the expense back to Draft so you can edit and resubmit it.</Text>
            <Text style={styles.modalLabel}>Reason for recall *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={recallNote}
              onChangeText={setRecallNote}
              placeholder="e.g. Wrong date, incorrect amount..."
              placeholderTextColor={Colors.textMuted}
              multiline
              autoFocus
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.saveBtn]} onPress={() => { setRecallModalVisible(false); setRecallNote(''); }}>
                <Text style={styles.saveBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.recallConfirmBtn]} onPress={handleRecall}>
                <Text style={styles.submitBtnText}>Recall</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: FontSize.md, color: Colors.textSecondary },
  backLink: { color: Colors.primary, marginTop: Spacing.md, fontSize: FontSize.base },
  navHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600', width: 60 },
  navTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  deleteBtn: { fontSize: 22, width: 60, textAlign: 'right' },
  container: { padding: 12, paddingBottom: 40 },
  statusRow: { marginBottom: 6 },
  recallBox: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: 8, marginBottom: 6 },
  recallLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, marginBottom: 1 },
  recallNote: { fontSize: FontSize.xs, color: Colors.primary },
  rejectionBox: { backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.md, padding: 8, marginBottom: 6 },
  rejectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.danger, marginBottom: 1 },
  rejectionNote: { fontSize: FontSize.xs, color: Colors.danger },
  receiptContainer: { borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: 10, ...Shadow.sm },
  receiptImage: { width: '100%', height: 140 },
  label: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, marginBottom: 3, marginTop: 8 },
  input: {
    backgroundColor: Colors.gray50, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: 10, paddingVertical: 7,
    fontSize: FontSize.sm, color: Colors.text,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  readonlyField: { backgroundColor: Colors.gray100, borderRadius: BorderRadius.md, paddingHorizontal: 10, paddingVertical: 7 },
  readonlyText: { fontSize: FontSize.sm, color: Colors.gray700 },
  buttonRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 16 },
  button: { flex: 1, paddingVertical: 9, borderRadius: BorderRadius.md, alignItems: 'center' },
  saveBtn: { backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.border },
  saveBtnText: { fontWeight: '700', color: Colors.gray700, fontSize: FontSize.sm },
  submitBtn: { backgroundColor: Colors.primary },
  submitBtnText: { fontWeight: '700', color: Colors.white, fontSize: FontSize.sm },
  recallBtn: {
    marginTop: 16, paddingVertical: 9, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.warning ?? '#F59E0B',
    alignItems: 'center', backgroundColor: '#FFFBEB',
  },
  recallBtnText: { fontWeight: '700', color: '#92400E', fontSize: FontSize.sm },
  deleteRejectedBtn: { backgroundColor: Colors.dangerLight, borderWidth: 1, borderColor: Colors.danger },
  deleteRejectedText: { fontWeight: '700', color: Colors.danger, fontSize: FontSize.sm },
  resubmitBtn: { backgroundColor: Colors.primary },
  resubmitText: { fontWeight: '700', color: Colors.white, fontSize: FontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  modalSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  modalLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  recallConfirmBtn: { backgroundColor: '#F59E0B' },
});

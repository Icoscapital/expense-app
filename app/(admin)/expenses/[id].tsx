import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, KeyboardAvoidingView, Platform,
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

export default function AdminExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const {
    expenses, loading,
    updateExpense, approveExpense, rejectExpense,
  } = useExpenses({ workspaceId: profile?.workspace_id ?? undefined });

  const expense = expenses.find((e) => e.id === id) ?? null;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

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

  const isPending = expense.status === 'submitted';
  const employeeName = expense.profiles?.full_name ?? 'Employee';

  async function handleSave() {
    setSaving(true);
    try {
      await updateExpense(expense!.id, {
        amount: parseFloat(amount),
        currency,
        category: category!,
        merchant_name: merchantName.trim() || null,
        description: description.trim() || null,
        expense_date: toISODate(expenseDate),
      });
      setEditing(false);
      Alert.alert('Saved', 'Expense updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    async function doApprove() {
      setSaving(true);
      try {
        await approveExpense(expense!.id);
        router.back();
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setSaving(false);
      }
    }
    if (Platform.OS === 'web') {
      if (window.confirm('Approve this expense?')) doApprove();
    } else {
      Alert.alert('Approve?', 'Approve this expense?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: doApprove },
      ]);
    }
  }

  async function handleReject() {
    if (!rejectNote.trim()) {
      Alert.alert('Note required', 'Please enter a reason for rejection.');
      return;
    }
    setSaving(true);
    try {
      await rejectExpense(expense!.id, rejectNote.trim());
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {(saving || loading) && <LoadingOverlay />}

      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Expense Detail</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setEditing(false)} style={styles.editBtn}>
            <Text style={[styles.editBtnText, { color: Colors.danger }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Employee + status */}
          <View style={styles.employeeRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{employeeName[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.employeeName}>{employeeName}</Text>
              <Text style={styles.employeeSub}>submitted this expense</Text>
            </View>
            <StatusBadge status={expense.status} />
          </View>

          {/* Rejection note */}
          {expense.rejection_note && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Rejection note:</Text>
              <Text style={styles.rejectionNote}>{expense.rejection_note}</Text>
            </View>
          )}

          {/* Receipt */}
          {expense.receipt_url && (
            <View style={styles.receiptContainer}>
              <Image source={{ uri: expense.receipt_url }} style={styles.receiptImage} resizeMode="contain" />
            </View>
          )}

          {/* Amount */}
          <Text style={styles.label}>Amount</Text>
          {editing ? (
            <AmountInput value={amount} onChange={setAmount} currency={currency} onCurrencyChange={setCurrency} />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>
                {new Intl.NumberFormat('en-IE', { style: 'currency', currency: expense.currency ?? 'EUR' }).format(Number(expense.amount))}
              </Text>
            </View>
          )}

          {/* Category */}
          <Text style={[styles.label, { marginTop: Spacing.sm }]}>Category</Text>
          {editing ? (
            <CategoryPicker value={category} onChange={setCategory} />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{expense.category}</Text>
            </View>
          )}

          {/* Merchant */}
          <Text style={[styles.label, { marginTop: Spacing.sm }]}>Merchant</Text>
          {editing ? (
            <TextInput style={styles.input} value={merchantName} onChangeText={setMerchantName}
              placeholder="Merchant name" placeholderTextColor={Colors.textMuted} />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{expense.merchant_name || '—'}</Text>
            </View>
          )}

          {/* Date */}
          <Text style={[styles.label, { marginTop: Spacing.sm }]}>Date</Text>
          {editing ? (
            <TextInput style={styles.input} value={expenseDate} onChangeText={setExpenseDate}
              placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{toDisplayDate(expense.expense_date)}</Text>
            </View>
          )}

          {/* Description */}
          <Text style={[styles.label, { marginTop: Spacing.sm }]}>Description</Text>
          {editing ? (
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription}
              placeholder="Notes" placeholderTextColor={Colors.textMuted} multiline />
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{expense.description || '—'}</Text>
            </View>
          )}

          {/* Save button when editing */}
          {editing && (
            <TouchableOpacity style={[styles.btn, styles.saveBtn, { marginTop: 16 }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          )}

          {/* Approve / Reject for submitted expenses */}
          {isPending && !editing && (
            <View style={{ marginTop: 16 }}>
              {!showRejectInput ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => setShowRejectInput(true)}
                  >
                    <Text style={styles.rejectBtnText}>✕  Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={handleApprove}>
                    <Text style={styles.approveBtnText}>✓  Approve</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.label}>Reason for rejection *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={rejectNote}
                    onChangeText={setRejectNote}
                    placeholder="Explain what needs to be corrected…"
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    autoFocus
                  />
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.saveBtn]}
                      onPress={() => { setShowRejectInput(false); setRejectNote(''); }}
                    >
                      <Text style={styles.saveBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={handleReject}>
                      <Text style={styles.rejectBtnText}>Send Rejection</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: FontSize.sm, color: Colors.textSecondary },
  backLink: { color: Colors.primary, marginTop: Spacing.md, fontSize: FontSize.sm },

  navHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', width: 60 },
  navTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  editBtn: { width: 70, alignItems: 'flex-end' },
  editBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },

  container: { padding: 12, paddingBottom: 40 },

  employeeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    padding: 10, marginBottom: 10, gap: 10, ...Shadow.sm,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  employeeName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  employeeSub: { fontSize: FontSize.xs, color: Colors.textSecondary },

  rejectionBox: {
    backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.md,
    padding: 8, marginBottom: 8,
  },
  rejectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.danger, marginBottom: 2 },
  rejectionNote: { fontSize: FontSize.xs, color: Colors.danger },

  receiptContainer: {
    borderRadius: BorderRadius.md, overflow: 'hidden',
    marginBottom: 10, backgroundColor: Colors.gray100, ...Shadow.sm,
  },
  receiptImage: { width: '100%', height: 200 },

  label: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, marginBottom: 3 },
  input: {
    backgroundColor: Colors.gray50, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: 10, paddingVertical: 7,
    fontSize: FontSize.sm, color: Colors.text,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  readonlyField: { backgroundColor: Colors.gray100, borderRadius: BorderRadius.md, paddingHorizontal: 10, paddingVertical: 7 },
  readonlyText: { fontSize: FontSize.sm, color: Colors.gray700 },

  actionRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center' },
  saveBtn: { backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.border },
  saveBtnText: { fontWeight: '700', color: Colors.gray700, fontSize: FontSize.sm },
  approveBtn: { backgroundColor: Colors.primary },
  approveBtnText: { fontWeight: '700', color: Colors.white, fontSize: FontSize.sm },
  rejectBtn: { backgroundColor: Colors.dangerLight, borderWidth: 1, borderColor: Colors.danger },
  rejectBtnText: { fontWeight: '700', color: Colors.danger, fontSize: FontSize.sm },
});

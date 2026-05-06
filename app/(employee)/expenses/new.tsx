import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useExpenses } from '../../../hooks/useExpenses';
import { AmountInput } from '../../../components/AmountInput';
import { CategoryPicker } from '../../../components/CategoryPicker';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { ReceiptAttacher } from '../../../components/ReceiptAttacher';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../constants/theme';
import { ExpenseCategory, NewExpenseParams } from '../../../types';

// Convert YYYY-MM-DD → DD/MM/YYYY for display
function toDisplayDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}

// Convert DD/MM/YYYY → YYYY-MM-DD for DB
function toISODate(display: string): string {
  const parts = display.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return display;
}

export default function NewExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const { profile } = useAuth();
  const { addExpense } = useExpenses();

  // Pre-fill from OCR scan if params are provided
  const [amount, setAmount] = useState(params.amount ?? '');
  const [currency, setCurrency] = useState('EUR');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [merchantName, setMerchantName] = useState(params.merchantName ?? '');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(
    toDisplayDate(params.expenseDate ?? new Date().toISOString().split('T')[0])
  );
  const [receiptUrl, setReceiptUrl] = useState<string | null>(params.receiptUrl ?? null);
  const [receiptStoragePath, setReceiptStoragePath] = useState<string | null>(params.receiptStoragePath ?? null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      e.amount = 'Please enter a valid amount';
    }
    if (!category) e.category = 'Please select a category';
    if (!expenseDate) {
      e.expenseDate = 'Please enter a date';
    } else {
      const parts = expenseDate.split('/');
      if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
        e.expenseDate = 'Use format DD/MM/YYYY';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave(submit: boolean) {
    if (!validate()) return;
    if (!profile?.workspace_id) {
      Alert.alert('Error', 'You are not part of a workspace yet.');
      return;
    }

    setLoading(true);
    try {
      await addExpense({
        user_id: profile.id,
        workspace_id: profile.workspace_id,
        amount: parseFloat(amount),
        currency,
        category: category!,
        merchant_name: merchantName.trim() || null,
        description: description.trim() || null,
        expense_date: toISODate(expenseDate),
        receipt_url: receiptUrl,
        receipt_storage_path: receiptStoragePath,
        status: submit ? 'submitted' : 'draft',
        rejection_note: null,
      });

      router.push('/(employee)/expenses');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not save expense.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {loading && <LoadingOverlay message="Saving expense…" />}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* Nav Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>New Expense</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Receipt Attachment */}
          {profile?.workspace_id && (
            <ReceiptAttacher
              workspaceId={profile.workspace_id}
              userId={profile.id}
              receiptUrl={receiptUrl}
              onAttached={(url, path) => { setReceiptUrl(url); setReceiptStoragePath(path); }}
              onOcrResult={(ocr) => {
                if (ocr.amount) setAmount(String(ocr.amount));
                if (ocr.merchantName) setMerchantName(ocr.merchantName);
                if (ocr.currency) setCurrency(ocr.currency);
                if (ocr.date) {
                  const d = new Date(ocr.date);
                  const today = new Date();
                  const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
                  if (diff >= 0 && diff <= 30) setExpenseDate(toDisplayDate(ocr.date));
                }
              }}
            />
          )}

          {/* Amount */}
          <Text style={styles.label}>Amount *</Text>
          <AmountInput
            value={amount}
            onChange={setAmount}
            currency={currency}
            onCurrencyChange={setCurrency}
            error={errors.amount}
          />

          {/* Category */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Category *</Text>
          <CategoryPicker value={category} onChange={setCategory} error={errors.category} />

          {/* Merchant */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Merchant / Vendor</Text>
          <TextInput
            style={styles.input}
            value={merchantName}
            onChangeText={setMerchantName}
            placeholder="e.g. Starbucks, Delta Airlines"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Date */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Date *</Text>
          <TextInput
            style={[styles.input, errors.expenseDate ? styles.inputError : null]}
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={Colors.textMuted}
          />
          {errors.expenseDate && <Text style={styles.errorText}>{errors.expenseDate}</Text>}

          {/* Description */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Description / Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional notes about this expense"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.draftBtn]}
              onPress={() => handleSave(false)}
            >
              <Text style={styles.draftBtnText}>Save as Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitBtn]}
              onPress={() => handleSave(true)}
            >
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600', width: 60 },
  navTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },

  container: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  receiptPreview: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
  },
  receiptImage: { width: '100%', height: 160 },
  receiptLabel: {
    padding: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    backgroundColor: Colors.gray100,
  },
  attachBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    backgroundColor: Colors.gray50,
  },
  attachBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  receiptChangeBtn: { padding: Spacing.sm, backgroundColor: Colors.gray100 },

  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  input: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text,
  },
  inputError: { borderColor: Colors.danger },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  errorText: { fontSize: FontSize.sm, color: Colors.danger, marginTop: 4 },

  buttonRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  button: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  draftBtn: { backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.border },
  draftBtnText: { fontWeight: '700', color: Colors.gray700, fontSize: FontSize.base },
  submitBtn: { backgroundColor: Colors.primary },
  submitBtnText: { fontWeight: '700', color: Colors.white, fontSize: FontSize.base },
});

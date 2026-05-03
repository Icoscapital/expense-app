import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../hooks/useAuth';
import { AmountInput } from '../../../components/AmountInput';
import { CategoryPicker } from '../../../components/CategoryPicker';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../constants/theme';
import { ExpenseCategory } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { uploadReceiptBase64 } from '../../../lib/storage';
import { scanReceiptBase64 } from '../../../lib/ocr';

interface TeamMember { id: string; full_name: string; role: string; }

function toDisplayDate(iso: string) {
  if (!iso) return '';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function toISODate(display: string) {
  const p = display.split('/');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : display;
}

export default function AdminNewExpenseScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(
    toDisplayDate(new Date().toISOString().split('T')[0])
  );
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptStoragePath, setReceiptStoragePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attachingReceipt, setAttachingReceipt] = useState(false);

  useEffect(() => {
    if (!profile?.workspace_id) return;
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('workspace_id', profile.workspace_id)
      .order('full_name')
      .then(({ data }) => setMembers((data ?? []) as TeamMember[]));
  }, [profile?.workspace_id]);

  async function handleAttachReceipt() {
    if (!profile?.workspace_id || !selectedMember) {
      Alert.alert('Select employee first', 'Choose a team member before attaching a receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    const base64 = result.assets[0].base64;
    setAttachingReceipt(true);
    try {
      const tempId = Date.now().toString();
      const { publicUrl, storagePath } = await uploadReceiptBase64(
        base64,
        profile.workspace_id,
        selectedMember.id,
        tempId
      );
      setReceiptUrl(publicUrl);
      setReceiptStoragePath(storagePath);

      // Try OCR to pre-fill fields
      try {
        const ocr = await scanReceiptBase64(base64);
        if (ocr.amount && !amount) setAmount(ocr.amount.toString());
        if (ocr.merchantName && !merchantName) setMerchantName(ocr.merchantName);
        if (ocr.date) {
          const ocrDate = new Date(ocr.date);
          const diffDays = (Date.now() - ocrDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays <= 30) setExpenseDate(toDisplayDate(ocr.date));
        }
      } catch {
        // OCR failure is fine — fields stay blank
      }
    } catch (err: any) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setAttachingReceipt(false);
    }
  }

  async function handleSubmit() {
    if (!selectedMember) {
      Alert.alert('Missing', 'Please select a team member.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Missing', 'Please enter a valid amount.');
      return;
    }
    if (!category) {
      Alert.alert('Missing', 'Please select a category.');
      return;
    }
    if (!profile?.workspace_id) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('add_expense_for_employee', {
        p_user_id: selectedMember.id,
        p_workspace_id: profile.workspace_id,
        p_amount: parseFloat(amount),
        p_currency: currency,
        p_category: category,
        p_merchant_name: merchantName.trim() || null,
        p_description: description.trim() || null,
        p_expense_date: toISODate(expenseDate),
        p_receipt_url: receiptUrl,
        p_receipt_storage_path: receiptStoragePath,
      });
      if (error) throw new Error(error.message);
      if (Platform.OS === 'web') {
        const addAnother = window.confirm(`Expense added for ${selectedMember.full_name}.\n\nAdd another expense?`);
        if (addAnother) resetForm(); else router.back();
      } else {
        Alert.alert('Done', `Expense added for ${selectedMember.full_name}.`, [
          { text: 'Add another', onPress: () => resetForm() },
          { text: 'Done', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedMember(null);
    setAmount('');
    setCategory(null);
    setMerchantName('');
    setDescription('');
    setExpenseDate(toDisplayDate(new Date().toISOString().split('T')[0]));
    setReceiptUrl(null);
    setReceiptStoragePath(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {loading && <LoadingOverlay message="Saving expense…" />}

      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Add Expense for Team</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Employee picker */}
          <Text style={styles.label}>Team Member *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberRow}>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.memberChip, selectedMember?.id === m.id && styles.memberChipSelected]}
                onPress={() => setSelectedMember(m)}
              >
                <View style={[styles.memberAvatar, selectedMember?.id === m.id && styles.memberAvatarSelected]}>
                  <Text style={styles.memberAvatarText}>
                    {(m.full_name ?? '?').split(' ').map((n: string) => n[0] ?? '').join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <Text style={[styles.memberChipName, selectedMember?.id === m.id && styles.memberChipNameSelected]}>
                  {m.full_name?.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Receipt */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Receipt</Text>
          {receiptUrl ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receiptUrl }} style={styles.receiptImage} resizeMode="cover" />
              <TouchableOpacity style={styles.receiptChangeRow} onPress={handleAttachReceipt}>
                <Text style={styles.receiptChangeText}>📎 Receipt attached · tap to change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.attachBtn} onPress={handleAttachReceipt} disabled={attachingReceipt}>
              {attachingReceipt
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.attachBtnText}>📎 Attach from photos · auto-fills fields</Text>
              }
            </TouchableOpacity>
          )}

          {/* Amount */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Amount *</Text>
          <AmountInput value={amount} onChange={setAmount} currency={currency} onCurrencyChange={setCurrency} />

          {/* Category */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Category *</Text>
          <CategoryPicker value={category} onChange={setCategory} />

          {/* Merchant */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Merchant</Text>
          <TextInput
            style={styles.input}
            value={merchantName}
            onChangeText={setMerchantName}
            placeholder="e.g. Starbucks, KLM"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Date */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Date *</Text>
          <TextInput
            style={styles.input}
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Description */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional notes"
            placeholderTextColor={Colors.textMuted}
            multiline
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>
              Submit Expense{selectedMember ? ` for ${selectedMember.full_name.split(' ')[0]}` : ''}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  navHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600', width: 60 },
  navTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  container: { padding: Spacing.md, paddingBottom: 60 },

  label: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },

  memberRow: { marginBottom: 4 },
  memberChip: { alignItems: 'center', marginRight: 12, paddingVertical: 4 },
  memberChipSelected: {},
  memberAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.gray200,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2, borderColor: 'transparent',
  },
  memberAvatarSelected: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  memberAvatarText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  memberChipName: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  memberChipNameSelected: { color: Colors.primary },

  attachBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: BorderRadius.md, padding: Spacing.md,
    alignItems: 'center', backgroundColor: Colors.gray50,
  },
  attachBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },

  receiptPreview: { borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: 4 },
  receiptImage: { width: '100%', height: 140 },
  receiptChangeRow: { padding: 8, backgroundColor: Colors.gray100 },
  receiptChangeText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  input: {
    backgroundColor: Colors.gray50, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: FontSize.sm, color: Colors.text,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },

  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: 12, alignItems: 'center', marginTop: Spacing.xl,
  },
  submitBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});

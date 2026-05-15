import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList, Pressable,
} from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';
import { CURRENCIES, currencySymbol } from '../constants/currencies';

interface Props {
  value: string;
  onChange: (val: string) => void;
  currency?: string;
  onCurrencyChange?: (currency: string) => void;
  error?: string;
  placeholder?: string;
}

export function AmountInput({
  value, onChange, currency = 'EUR',
  onCurrencyChange, error, placeholder = '0.00',
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const symbol = currencySymbol(currency);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  function openPicker() {
    if (!onCurrencyChange) return;
    setSearch('');
    setPickerOpen(true);
  }

  function selectCurrency(code: string) {
    onCurrencyChange?.(code);
    setPickerOpen(false);
  }

  return (
    <View>
      <View style={[styles.container, error ? styles.containerError : null]}>
        <TouchableOpacity
          onPress={openPicker}
          style={styles.currencyBtn}
          disabled={!onCurrencyChange}
        >
          <Text style={styles.currencyText}>{symbol}</Text>
          {onCurrencyChange && <Text style={styles.chevron}>▾</Text>}
        </TouchableOpacity>
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      {onCurrencyChange && (
        <Text style={styles.hint}>Tap {symbol} to change currency · {currency}</Text>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select currency</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by code, name, or symbol…"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
              autoCapitalize="characters"
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.code === currency;
                return (
                  <TouchableOpacity
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => selectCurrency(item.code)}
                  >
                    <Text style={styles.rowSymbol}>{item.symbol}</Text>
                    <View style={styles.rowMeta}>
                      <Text style={styles.rowCode}>{item.code}</Text>
                      <Text style={styles.rowName}>{item.name}</Text>
                    </View>
                    {selected && <Text style={styles.rowCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No currencies match "{search}".</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
  },
  containerError: { borderColor: Colors.danger },
  currencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: 2,
  },
  currencyText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  chevron: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  errorText: { fontSize: FontSize.sm, color: Colors.danger, marginTop: 4 },

  // ─── Modal ─────────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  closeBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  closeBtnText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: '700' },
  searchInput: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    margin: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  rowSelected: { backgroundColor: Colors.gray50 },
  rowSymbol: {
    width: 44,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  rowMeta: { flex: 1 },
  rowCode: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  rowName: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  rowCheck: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: '700' },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    padding: Spacing.xl,
  },
});

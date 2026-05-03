import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'AED', 'CAD', 'AUD'];

const SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'Fr',
  AED: 'د.إ', CAD: 'C$', AUD: 'A$',
};

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
  const symbol = SYMBOLS[currency] ?? currency;

  function cycleCurrency() {
    if (!onCurrencyChange) return;
    const idx = CURRENCIES.indexOf(currency);
    const next = CURRENCIES[(idx + 1) % CURRENCIES.length];
    onCurrencyChange(next);
  }

  return (
    <View>
      <View style={[styles.container, error ? styles.containerError : null]}>
        <TouchableOpacity
          onPress={cycleCurrency}
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
        <Text style={styles.hint}>Tap {symbol} to change currency · showing: {currency}</Text>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
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
});

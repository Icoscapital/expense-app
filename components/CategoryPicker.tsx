import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpenseCategory } from '../types';
import { CATEGORY_OPTIONS } from '../constants/categories';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../constants/theme';

interface Props {
  value: ExpenseCategory | null;
  onChange: (value: ExpenseCategory) => void;
  error?: string;
}

export function CategoryPicker({ value, onChange, error }: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  const selected = CATEGORY_OPTIONS.find((c) => c.value === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>
          {selected ? `${selected.icon}  ${selected.label}` : 'Select category'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={CATEGORY_OPTIONS}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.option,
                  item.value === value && styles.optionSelected,
                ]}
                onPress={() => {
                  onChange(item.value as ExpenseCategory);
                  setModalVisible(false);
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: item.color + '22' }]}>
                  <Text style={styles.optionEmoji}>{item.icon}</Text>
                </View>
                <Text style={styles.optionLabel}>{item.label}</Text>
                {item.value === value && (
                  <Text style={[styles.checkmark, { color: item.color }]}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  triggerError: { borderColor: Colors.danger },
  triggerText: { fontSize: FontSize.base, color: Colors.text },
  chevron: { fontSize: 20, color: Colors.textMuted },
  errorText: { fontSize: FontSize.sm, color: Colors.danger, marginTop: 4 },

  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  closeBtn: { fontSize: FontSize.lg, color: Colors.textSecondary, padding: Spacing.xs },

  list: { padding: Spacing.md, gap: Spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  optionSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionEmoji: { fontSize: 20 },
  optionLabel: { flex: 1, fontSize: FontSize.base, fontWeight: '500', color: Colors.text },
  checkmark: { fontSize: FontSize.md, fontWeight: '700' },
});

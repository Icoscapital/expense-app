import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../constants/theme';

interface Props {
  message?: string;
}

export function LoadingOverlay({ message }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color={Colors.primary} />
        {message && <Text style={styles.text}>{message}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    minWidth: 140,
  },
  text: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

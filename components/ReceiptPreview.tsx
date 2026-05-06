/**
 * ReceiptPreview
 * Read-only receipt display used in expense detail screens.
 * Shows an image thumbnail or a PDF icon with tap-to-open.
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { isPdf } from './ReceiptAttacher';

interface Props {
  receiptUrl: string;
  /** Optional: triggered when user taps download */
  onDownload?: () => void;
  downloadLabel?: string;
}

export function ReceiptPreview({ receiptUrl, onDownload, downloadLabel = '⬇ Download Receipt' }: Props) {
  const pdf = isPdf(receiptUrl);

  function handleOpen() {
    if (Platform.OS === 'web') {
      window.open(receiptUrl, '_blank');
    } else {
      Alert.alert('Open receipt', 'Open on the web app to view this PDF.');
    }
  }

  return (
    <View style={styles.container}>
      {pdf ? (
        <TouchableOpacity style={styles.pdfBox} onPress={handleOpen}>
          <Text style={styles.pdfIcon}>📄</Text>
          <Text style={styles.pdfLabel}>PDF Receipt</Text>
          <Text style={styles.pdfSub}>Tap to open</Text>
        </TouchableOpacity>
      ) : (
        <Image source={{ uri: receiptUrl }} style={styles.image} resizeMode="contain" />
      )}
      {onDownload && (
        <TouchableOpacity style={styles.downloadBtn} onPress={onDownload}>
          <Text style={styles.downloadText}>{downloadLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md, overflow: 'hidden',
    marginBottom: 10, backgroundColor: Colors.gray100, ...Shadow.sm,
  },
  image: { width: '100%', height: 200 },
  pdfBox: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.xl, backgroundColor: '#FEF2F2',
  },
  pdfIcon: { fontSize: 48, marginBottom: 8 },
  pdfLabel: { fontSize: FontSize.base, fontWeight: '700', color: Colors.danger },
  pdfSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  downloadBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 7, alignItems: 'center',
  },
  downloadText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.white },
});

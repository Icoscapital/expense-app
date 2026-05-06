/**
 * ReceiptAttacher
 * Shared component for attaching a receipt (photo or PDF) to an expense.
 * Handles picking, uploading, and displaying the receipt preview.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, Alert, Platform, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadReceiptFile } from '../lib/storage';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';

interface Props {
  workspaceId: string;
  userId: string;
  receiptUrl: string | null;
  onAttached: (url: string, storagePath: string) => void;
}

export function isPdf(url: string | null): boolean {
  return !!url && url.toLowerCase().includes('.pdf');
}

export function ReceiptAttacher({ workspaceId, userId, receiptUrl, onAttached }: Props) {
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    await upload(asset.base64!, mimeType);
  }

  async function pickPdf() {
    if (Platform.OS === 'web') {
      // Web: use a hidden file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.onchange = async (e: any) => {
        const file: File = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = (ev.target?.result as string).split(',')[1];
          await upload(base64, 'application/pdf');
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    // Read file as base64 using expo-file-system
    const FileSystem = require('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await upload(base64, 'application/pdf');
  }

  async function upload(base64: string, mimeType: string) {
    setUploading(true);
    try {
      const tempId = Date.now().toString();
      const { publicUrl, storagePath } = await uploadReceiptFile(
        base64, mimeType, workspaceId, userId, tempId
      );
      onAttached(publicUrl, storagePath);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  }

  if (uploading) {
    return (
      <View style={styles.uploadingBox}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.uploadingText}>Uploading…</Text>
      </View>
    );
  }

  if (receiptUrl) {
    const pdf = isPdf(receiptUrl);
    return (
      <View style={styles.previewBox}>
        {pdf ? (
          <TouchableOpacity
            style={styles.pdfPreview}
            onPress={() => Platform.OS === 'web' ? window.open(receiptUrl, '_blank') : null}
          >
            <Text style={styles.pdfIcon}>📄</Text>
            <Text style={styles.pdfLabel}>PDF receipt attached</Text>
            <Text style={styles.pdfSub}>Tap to open</Text>
          </TouchableOpacity>
        ) : (
          <Image source={{ uri: receiptUrl }} style={styles.imagePreview} resizeMode="cover" />
        )}
        <View style={styles.changeRow}>
          <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
            <Text style={styles.changeBtnText}>📷 Change photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.changeBtn} onPress={pickPdf}>
            <Text style={styles.changeBtnText}>📄 Change PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.attachRow}>
      <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
        <Text style={styles.attachIcon}>📷</Text>
        <Text style={styles.attachText}>Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.attachBtn} onPress={pickPdf}>
        <Text style={styles.attachIcon}>📄</Text>
        <Text style={styles.attachText}>PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  uploadingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: Spacing.md, backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md, marginBottom: Spacing.md,
  },
  uploadingText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  previewBox: {
    borderRadius: BorderRadius.md, overflow: 'hidden',
    backgroundColor: Colors.gray100, marginBottom: Spacing.md,
  },
  imagePreview: { width: '100%', height: 160 },
  pdfPreview: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.xl, backgroundColor: '#FEF2F2',
  },
  pdfIcon: { fontSize: 40, marginBottom: 6 },
  pdfLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.danger },
  pdfSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  changeRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border,
  },
  changeBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    backgroundColor: Colors.gray100,
  },
  changeBtnText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },

  attachRow: {
    flexDirection: 'row', gap: 8, marginBottom: Spacing.md,
  },
  attachBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: BorderRadius.md, backgroundColor: Colors.gray50,
    gap: 4,
  },
  attachIcon: { fontSize: 24 },
  attachText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
});

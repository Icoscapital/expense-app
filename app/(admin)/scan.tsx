import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { scanReceiptBase64 } from '../../lib/ocr';
import { uploadReceiptBase64 } from '../../lib/storage';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme';

let CameraView: any = null;
let useCamera: any = null;
if (Platform.OS !== 'web') {
  CameraView = require('expo-camera').CameraView;
  useCamera = require('../../hooks/useCamera').useCamera;
}

type ScanState = 'idle' | 'capturing' | 'uploading' | 'scanning' | 'done' | 'error';

// ─── Web version ──────────────────────────────────────────────────────────────
function WebScanScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const isProcessing = ['uploading', 'scanning'].includes(scanState);

  async function handlePickFile() {
    if (!profile?.workspace_id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    const base64 = result.assets[0].base64;
    let uploadedUrl = '';
    let uploadedPath = '';

    try {
      setScanState('uploading');
      setStatusMessage('Uploading receipt…');
      const tempId = Date.now().toString();
      const { publicUrl, storagePath } = await uploadReceiptBase64(
        base64, profile.workspace_id, profile.id, tempId
      );
      uploadedUrl = publicUrl;
      uploadedPath = storagePath;

      setScanState('scanning');
      setStatusMessage('Reading receipt…');
      const ocrResult = await scanReceiptBase64(base64);
      setScanState('done');

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      let expenseDate = todayStr;
      if (ocrResult.date) {
        const ocrDate = new Date(ocrResult.date);
        const diffDays = (today.getTime() - ocrDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays <= 30) expenseDate = ocrResult.date;
      }

      router.push({
        pathname: '/(admin)/my-expenses/new',
        params: {
          amount: ocrResult.amount?.toString() ?? '',
          merchantName: ocrResult.merchantName ?? '',
          expenseDate,
          receiptStoragePath: storagePath,
          receiptUrl: publicUrl,
        },
      });
    } catch (err: any) {
      setScanState('error');
      setStatusMessage('Could not read receipt — fill in details manually.');
      setTimeout(() => router.push({
        pathname: '/(admin)/my-expenses/new',
        params: { receiptUrl: uploadedUrl, receiptStoragePath: uploadedPath },
      }), 2000);
    }
  }

  const stateMessages: Record<ScanState, string> = {
    idle: 'Upload a receipt photo to auto-fill the form',
    capturing: '📸 Capturing…',
    uploading: '☁️ Uploading receipt…',
    scanning: '🔍 Reading receipt with AI…',
    done: '✅ Done!',
    error: statusMessage,
  };

  return (
    <SafeAreaView style={webStyles.safe}>
      <View style={webStyles.container}>
        <Text style={webStyles.icon}>🧾</Text>
        <Text style={webStyles.title}>Scan Receipt</Text>
        <Text style={webStyles.subtitle}>{stateMessages[scanState]}</Text>

        {isProcessing ? (
          <View style={webStyles.processingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={webStyles.processingText}>{stateMessages[scanState]}</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={webStyles.uploadBtn} onPress={handlePickFile}>
              <Text style={webStyles.uploadBtnText}>📂 Choose receipt photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={webStyles.manualBtn}
              onPress={() => router.push('/(admin)/my-expenses/new')}
            >
              <Text style={webStyles.manualBtnText}>Enter manually instead</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Native version ───────────────────────────────────────────────────────────
function NativeScanScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { cameraRef, hasPermission, canAskPermission, requestPermission, capture } = useCamera();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          We need your camera to scan receipts and auto-fill expense details.
        </Text>
        {canAskPermission ? (
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.permissionHint}>Please enable camera access in your device Settings.</Text>
        )}
        <TouchableOpacity onPress={() => router.push('/(admin)/my-expenses/new')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Enter expense manually instead</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  async function handleCapture() {
    if (!profile?.workspace_id) return;
    let uploadedUrl = '';
    let uploadedPath = '';

    try {
      setScanState('capturing');
      const photo = await capture();
      if (!photo || !photo.base64) {
        setScanState('error');
        setStatusMessage('Capture failed. Please try again.');
        return;
      }

      setScanState('uploading');
      setStatusMessage('Uploading receipt…');
      const tempId = Date.now().toString();
      const { publicUrl, storagePath } = await uploadReceiptBase64(
        photo.base64, profile.workspace_id, profile.id, tempId
      );
      uploadedUrl = publicUrl;
      uploadedPath = storagePath;

      setScanState('scanning');
      setStatusMessage('Reading receipt…');
      const ocrResult = await scanReceiptBase64(photo.base64);
      setScanState('done');

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      let expenseDate = todayStr;
      if (ocrResult.date) {
        const ocrDate = new Date(ocrResult.date);
        const diffDays = (today.getTime() - ocrDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays <= 30) expenseDate = ocrResult.date;
      }

      router.push({
        pathname: '/(admin)/my-expenses/new',
        params: {
          amount: ocrResult.amount?.toString() ?? '',
          merchantName: ocrResult.merchantName ?? '',
          expenseDate,
          receiptStoragePath: storagePath,
          receiptUrl: publicUrl,
        },
      });
    } catch (err: any) {
      setScanState('error');
      setStatusMessage('Could not read receipt — fill in details manually.');
      setTimeout(() => router.push({
        pathname: '/(admin)/my-expenses/new',
        params: { receiptUrl: uploadedUrl, receiptStoragePath: uploadedPath },
      }), 2000);
    }
  }

  async function handlePickFromLibrary() {
    if (!profile?.workspace_id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.9, base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    const base64 = result.assets[0].base64;
    let uploadedUrl = '';
    let uploadedPath = '';

    try {
      setScanState('uploading');
      setStatusMessage('Uploading receipt…');
      const tempId = Date.now().toString();
      const { publicUrl, storagePath } = await uploadReceiptBase64(
        base64, profile.workspace_id, profile.id, tempId
      );
      uploadedUrl = publicUrl;
      uploadedPath = storagePath;

      setScanState('scanning');
      setStatusMessage('Reading receipt…');
      const ocrResult = await scanReceiptBase64(base64);
      setScanState('done');

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      let expenseDate = todayStr;
      if (ocrResult.date) {
        const ocrDate = new Date(ocrResult.date);
        const diffDays = (today.getTime() - ocrDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays <= 30) expenseDate = ocrResult.date;
      }

      router.push({
        pathname: '/(admin)/my-expenses/new',
        params: {
          amount: ocrResult.amount?.toString() ?? '',
          merchantName: ocrResult.merchantName ?? '',
          expenseDate,
          receiptStoragePath: storagePath,
          receiptUrl: publicUrl,
        },
      });
    } catch (err: any) {
      setScanState('error');
      setStatusMessage('Could not read receipt — fill in details manually.');
      setTimeout(() => router.push({
        pathname: '/(admin)/my-expenses/new',
        params: { receiptUrl: uploadedUrl, receiptStoragePath: uploadedPath },
      }), 2000);
    }
  }

  const isProcessing = ['capturing', 'uploading', 'scanning'].includes(scanState);
  const stateMessages: Record<ScanState, string> = {
    idle: 'Point at a receipt and tap the button',
    capturing: '📸 Capturing…',
    uploading: '☁️ Uploading receipt…',
    scanning: '🔍 Reading receipt with AI…',
    done: '✅ Done!',
    error: statusMessage,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
          </View>
        </CameraView>
      </View>
      <View style={styles.controls}>
        <Text style={styles.hint}>{stateMessages[scanState]}</Text>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.processingText}>{stateMessages[scanState]}</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.captureBtn, scanState === 'error' && styles.captureBtnError]}
              onPress={handleCapture}
              activeOpacity={0.8}
            >
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.libraryBtn} onPress={handlePickFromLibrary}>
              <Text style={styles.libraryBtnText}>📂 Choose from library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manualBtn} onPress={() => router.push('/(admin)/my-expenses/new')}>
              <Text style={styles.manualBtnText}>Enter manually instead</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function AdminScanScreen() {
  if (Platform.OS === 'web') return <WebScanScreen />;
  return <NativeScanScreen />;
}

const webStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  icon: { fontSize: 72, marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  processingBox: { alignItems: 'center', gap: Spacing.md },
  processingText: { fontSize: FontSize.base, color: Colors.textSecondary },
  uploadBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md,
  },
  uploadBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  manualBtn: { paddingVertical: Spacing.sm },
  manualBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  permissionIcon: { fontSize: 64, marginBottom: Spacing.lg },
  permissionTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  permissionText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 24 },
  permissionBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md,
  },
  permissionBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  permissionHint: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  skipBtn: { marginTop: Spacing.xl },
  skipText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: '600' },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: '88%', height: 260, borderWidth: 2.5, borderColor: Colors.white, borderRadius: BorderRadius.md, backgroundColor: 'transparent' },
  controls: {
    backgroundColor: Colors.white, padding: Spacing.lg,
    paddingBottom: Spacing.xxl, alignItems: 'center',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  hint: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  captureBtnError: { backgroundColor: Colors.danger },
  captureBtnInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.white },
  processingContainer: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  processingText: { fontSize: FontSize.base, color: Colors.textSecondary },
  libraryBtn: {
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: BorderRadius.md, paddingVertical: 8, paddingHorizontal: 20, marginBottom: Spacing.sm,
  },
  libraryBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  manualBtn: { paddingVertical: Spacing.sm },
  manualBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
});

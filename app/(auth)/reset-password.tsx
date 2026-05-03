import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, FontSize, BorderRadius } from '../../constants/theme';
import { LoadingOverlay } from '../../components/LoadingOverlay';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase fires PASSWORD_RECOVERY event when the reset link is opened
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSave() {
    if (!password || password.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('No match', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {loading && <LoadingOverlay message="Updating password…" />}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Image
              source={require('../../assets/icos-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Set new password</Text>
            <Text style={styles.subtitle}>Choose a new password for your account.</Text>

            {!ready && (
              <View style={styles.waitBox}>
                <Text style={styles.waitText}>
                  ⏳ Waiting for reset confirmation… Make sure you opened this page via the link in your email.
                </Text>
              </View>
            )}

            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Min. 6 characters"
              placeholderTextColor={Colors.textMuted}
              editable={ready}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Repeat new password"
              placeholderTextColor={Colors.textMuted}
              editable={ready}
            />

            <TouchableOpacity
              style={[styles.button, !ready && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!ready}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Update Password</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.backBtn}>
              <Text style={styles.backText}>← Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingVertical: 24, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 140, height: 48 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 16 },

  waitBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  waitText: { fontSize: FontSize.xs, color: '#92400E' },

  label: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, marginBottom: 3, marginTop: 10 },
  input: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
  },

  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  backBtn: { alignItems: 'center', marginTop: 12 },
  backText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
});

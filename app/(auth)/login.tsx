import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  Platform, Alert, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme';
import { LoadingOverlay } from '../../components/LoadingOverlay';

const ALLOWED_DOMAIN = '@icoscapital.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (!email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      Alert.alert('Access restricted', `Only ${ALLOWED_DOMAIN} accounts can access this app.`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) Alert.alert('Login failed', error.message);
  }

  async function handleForgotPassword() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Enter your email', 'Type your email address above, then tap "Forgot password?".');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: 'https://expense-app-gray-two.vercel.app/(auth)/reset-password',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Check your inbox',
        `A password reset link has been sent to ${trimmed}.\n\nOpen the link on a device running the app.`
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {loading && <LoadingOverlay message="Signing in…" />}
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Compact header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/icos-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={`you${ALLOWED_DOMAIN}`}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
            />

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to the team? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity><Text style={styles.link}>Create account</Text></TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: 12 },
  logo: { width: 140, height: 48 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text, marginBottom: 8 },

  label: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, marginBottom: 3, marginTop: 6 },
  input: {
    backgroundColor: Colors.gray50, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingVertical: 8, paddingHorizontal: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 4 },
  forgotText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },

  button: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: 10, alignItems: 'center', marginTop: 10,
  },
  buttonText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  link: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
});

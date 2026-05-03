import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  Platform, Alert, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme';
import { LoadingOverlay } from '../../components/LoadingOverlay';

WebBrowser.maybeCompleteAuthSession();

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
      redirectTo: 'http://localhost:8081/(auth)/reset-password',
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

  async function handleMicrosoftLogin() {
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('/auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile openid',
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.exchangeCodeForSession(result.url);
        if (sessionError) throw sessionError;
      }
    } catch (err: any) {
      Alert.alert('Microsoft login failed', err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
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

            <TouchableOpacity style={styles.microsoftBtn} onPress={handleMicrosoftLogin} activeOpacity={0.85}>
              <View style={styles.msLogo}>
                <View style={[styles.msSquare, { backgroundColor: '#F25022' }]} />
                <View style={[styles.msSquare, { backgroundColor: '#7FBA00' }]} />
                <View style={[styles.msSquare, { backgroundColor: '#00A4EF' }]} />
                <View style={[styles.msSquare, { backgroundColor: '#FFB900' }]} />
              </View>
              <Text style={styles.microsoftBtnText}>Sign in with Microsoft</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or email</Text>
              <View style={styles.dividerLine} />
            </View>

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

  microsoftBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingVertical: 8, paddingHorizontal: 12,
  },
  msLogo: { width: 16, height: 16, flexDirection: 'row', flexWrap: 'wrap', marginRight: 8 },
  msSquare: { width: 7, height: 7, margin: 0.5 },
  microsoftBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.xs, color: Colors.textMuted, marginHorizontal: 8 },

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

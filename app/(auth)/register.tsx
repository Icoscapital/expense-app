import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Image,
  Platform, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, FontSize, BorderRadius } from '../../constants/theme';
import { LoadingOverlay } from '../../components/LoadingOverlay';

const ALLOWED_DOMAIN = '@icoscapital.com';
const WORKSPACE_CODE = '143c3347-d983-4dc4-8a05-e599dbd4405b';

type Mode = 'create' | 'join';

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [mode, setMode] = useState<Mode>('join');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  // Pre-fill workspace code from URL param or use known workspace code
  const [workspaceCode, setWorkspaceCode] = useState(params.code ?? WORKSPACE_CODE);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (!email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      Alert.alert('Access restricted', `Only ${ALLOWED_DOMAIN} email addresses can register.`);
      return;
    }
    if (mode === 'create' && (!workspaceName.trim() || !adminEmail.trim())) {
      Alert.alert('Missing fields', 'Please enter a workspace name and admin email.');
      return;
    }
    if (mode === 'join' && !workspaceCode.trim()) {
      Alert.alert('Missing fields', 'Please enter your workspace invite code.');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: mode === 'create' ? 'admin' : 'employee',
          },
        },
      });
      if (signupError) throw signupError;
      if (!authData.user) throw new Error('User creation failed.');

      const userId = authData.user.id;

      // Small delay to ensure session is active before DB calls
      await new Promise(r => setTimeout(r, 500));

      if (mode === 'create') {
        // Use SECURITY DEFINER function to bypass RLS
        const { data: workspaceId, error: wsError } = await supabase.rpc('create_workspace_and_profile', {
          p_workspace_name: workspaceName.trim(),
          p_admin_email: adminEmail.trim().toLowerCase(),
          p_full_name: fullName.trim(),
          p_user_id: userId,
        });
        if (wsError) throw wsError;

        Alert.alert('🎉 Workspace created!', `Share this code with your team:\n\n${workspaceId}`, [{ text: 'OK' }]);
      } else {
        const { data: success, error: joinError } = await supabase
          .rpc('join_workspace', {
            p_workspace_id: workspaceCode.trim(),
            p_full_name: fullName.trim(),
            p_user_id: userId,
          });
        if (joinError) throw joinError;
        if (!success) throw new Error('Invalid workspace code. Please check with your admin.');
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Registration failed', err.message ?? 'Something went wrong.');
      return;
    }

    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {loading && <LoadingOverlay message="Creating account…" />}
      <KeyboardAvoidingView behavior="padding" style={styles.flex} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Image source={require('../../assets/icos-logo.png')} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create account</Text>

            {/* Mode Toggle */}
            <View style={styles.toggle}>
              <TouchableOpacity style={[styles.toggleBtn, mode === 'join' && styles.toggleBtnActive]} onPress={() => setMode('join')}>
                <Text style={[styles.toggleText, mode === 'join' && styles.toggleTextActive]}>Join Workspace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, mode === 'create' && styles.toggleBtnActive]} onPress={() => setMode('create')}>
                <Text style={[styles.toggleText, mode === 'create' && styles.toggleTextActive]}>Create Workspace</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
              placeholder="Jane Smith" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              placeholder={`you${ALLOWED_DOMAIN}`} placeholderTextColor={Colors.textMuted} />

            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword}
              secureTextEntry placeholder="Min. 6 characters" placeholderTextColor={Colors.textMuted} />

            {mode === 'create' ? (
              <>
                <Text style={styles.sectionLabel}>Workspace</Text>
                <Text style={styles.label}>Workspace Name</Text>
                <TextInput style={styles.input} value={workspaceName} onChangeText={setWorkspaceName}
                  placeholder="Icos Capital" placeholderTextColor={Colors.textMuted} />
                <Text style={styles.label}>Report Email</Text>
                <TextInput style={styles.input} value={adminEmail} onChangeText={setAdminEmail}
                  keyboardType="email-address" autoCapitalize="none"
                  placeholder="reports@company.com" placeholderTextColor={Colors.textMuted} />
              </>
            ) : (
              <>
                <Text style={styles.label}>Workspace Code</Text>
                <TextInput style={styles.input} value={workspaceCode} onChangeText={setWorkspaceCode}
                  autoCapitalize="none" autoCorrect={false}
                  placeholder="Paste code from your admin" placeholderTextColor={Colors.textMuted} />
                <Text style={styles.codeHint}>
                  {workspaceCode === WORKSPACE_CODE ? '✅ Icos Capital workspace' : ''}
                </Text>
              </>
            )}

            <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.85}>
              <Text style={styles.buttonText}>
                {mode === 'create' ? 'Create & Sign Up' : 'Join & Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity><Text style={styles.link}>Sign In</Text></TouchableOpacity>
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

  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: 10,
  },
  toggleBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: BorderRadius.sm },
  toggleBtnActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: FontSize.xs, fontWeight: '500', color: Colors.textSecondary },
  toggleTextActive: { color: Colors.primary, fontWeight: '700' },

  label: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, marginBottom: 3, marginTop: 6 },
  input: {
    backgroundColor: Colors.gray50, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingVertical: 8, paddingHorizontal: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },

  sectionLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary,
    marginTop: 10, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  button: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: 10, alignItems: 'center', marginTop: 10,
  },
  buttonText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  codeHint: { fontSize: FontSize.xs, color: Colors.success ?? '#10B981', marginTop: 3 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  link: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
});

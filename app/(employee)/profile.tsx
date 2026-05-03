import React from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../constants/theme';

export default function ProfileScreen() {
  const { profile, session } = useAuth();

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
          <Text style={styles.email}>{session?.user?.email ?? '—'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>👤 {profile?.role ?? 'employee'}</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Info</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Workspace ID</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {profile?.workspace_id ?? 'Not set'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Member since</Text>
            <Text style={styles.rowValue}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </Text>
          </View>
        </View>

        {/* Share workspace code (for admins) */}
        {profile?.workspace_id && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Workspace Code</Text>
            <Text style={styles.codeHint}>Share this code with your colleagues so they can join:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} selectable>{profile.workspace_id}</Text>
            </View>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  avatarSection: { alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.white },
  name: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  email: { fontSize: FontSize.base, color: Colors.textSecondary, marginBottom: Spacing.sm },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  roleText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', textTransform: 'capitalize' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  rowLabel: { fontSize: FontSize.base, color: Colors.textSecondary },
  rowValue: { fontSize: FontSize.base, color: Colors.text, fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },

  codeHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  codeBox: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeText: { fontSize: FontSize.sm, color: Colors.text, fontFamily: 'monospace' },

  logoutBtn: {
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },
});

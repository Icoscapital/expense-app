import React from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, Alert, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../constants/theme';

export default function AdminProfileScreen() {
  const { profile, session, signOut } = useAuth();

  async function handleLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) signOut();
    } else {
      Alert.alert('Sign out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
      ]);
    }
  }

  const initials = profile?.full_name
    ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
          <Text style={styles.email}>{session?.user?.email ?? '—'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>🔑 Admin</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workspace Info</Text>
          <Row label="Workspace ID" value={profile?.workspace_id ?? '—'} mono />
          <View style={styles.divider} />
          <Row label="Reports sent to" value={session?.user?.email ?? '—'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite Code</Text>
          <Text style={styles.hint}>Share this with your team members:</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText} selectable>{profile?.workspace_id ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monday Reports</Text>
          <Text style={styles.hint}>
            Every Monday at 8am, a CSV expense report is automatically generated and emailed to your admin address. You can review and approve/reject the report in the Reports tab.
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && { fontFamily: 'monospace', fontSize: 11 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.white },
  name: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  email: { fontSize: FontSize.base, color: Colors.textSecondary, marginBottom: Spacing.sm },
  roleBadge: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  roleText: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '700' },
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.sm,
  },
  cardTitle: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  rowLabel: { fontSize: FontSize.base, color: Colors.textSecondary },
  rowValue: { fontSize: FontSize.base, color: Colors.text, fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  hint: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  codeBox: {
    backgroundColor: Colors.gray50, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  codeText: { fontSize: FontSize.sm, color: Colors.text, fontFamily: 'monospace' },
  logoutBtn: {
    backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },
});

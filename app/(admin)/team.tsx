import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { EmptyState } from '../../components/EmptyState';

export default function TeamScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { expenses, loading: expLoading, refetch } = useExpenses({
    workspaceId: profile?.workspace_id ?? undefined,
  });
  const [members, setMembers] = useState<Profile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    if (!profile?.workspace_id) return;
    fetchMembers();
  }, [profile?.workspace_id]);

  async function fetchMembers() {
    if (!profile?.workspace_id) return;
    setLoadingMembers(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .order('full_name');
    setMembers((data ?? []) as Profile[]);
    setLoadingMembers(false);
  }

  const loading = expLoading || loadingMembers;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Team</Text>
          <Text style={styles.count}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.addExpenseBtn}
          onPress={() => router.push('/(admin)/expenses/new')}
        >
          <Text style={styles.addExpenseBtnText}>+ Add Expense</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, members.length === 0 && { flex: 1 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { refetch(); fetchMembers(); }} />}
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            title="No team members yet"
            subtitle="Share your workspace code from your profile so colleagues can join."
          />
        }
        renderItem={({ item: member }) => {
          const memberExpenses = expenses.filter((e) => e.user_id === member.id);
          const totalSpend = memberExpenses.reduce((s, e) => s + Number(e.amount), 0);
          const pendingCount = memberExpenses.filter((e) => e.status === 'submitted').length;
          const initials = (member.full_name ?? '?').split(' ').map((n: string) => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';

          return (
            <View style={styles.memberCard}>
              <View style={[styles.avatar, member.role === 'admin' && styles.avatarAdmin]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{member.full_name}</Text>
                  {member.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberStats}>
                  {memberExpenses.length} expenses · {fmt(totalSpend)} total
                </Text>
                {pendingCount > 0 && (
                  <Text style={styles.pendingNote}>
                    ⏳ {pendingCount} awaiting review
                  </Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  count: { fontSize: FontSize.sm, color: Colors.textSecondary },
  addExpenseBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  addExpenseBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },

  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarAdmin: { backgroundColor: Colors.primaryDark },
  avatarText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  memberName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  adminBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  adminBadgeText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },
  memberStats: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  pendingNote: { fontSize: FontSize.xs, color: Colors.warning, marginTop: 2, fontWeight: '600' },
});

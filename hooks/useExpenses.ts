import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Expense, ExpenseStatus } from '../types';

interface UseExpensesOptions {
  workspaceId?: string;
  userId?: string;
  status?: ExpenseStatus | ExpenseStatus[];
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef(`expenses-${Math.random().toString(36).slice(2)}`);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('expenses')
      .select('*, profiles(full_name)')
      .order('expense_date', { ascending: false });

    if (options.userId) query = query.eq('user_id', options.userId);
    if (options.workspaceId) query = query.eq('workspace_id', options.workspaceId);

    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setExpenses((data ?? []) as Expense[]);
    }
    setLoading(false);
  }, [options.userId, options.workspaceId, JSON.stringify(options.status)]);

  useEffect(() => {
    fetchExpenses();

    // Real-time subscription
    const channel = supabase
      .channel(channelRef.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => fetchExpenses()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchExpenses]);

  // ── CRUD Operations ───────────────────────────────────────────────────────

  async function addExpense(data: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'report_id'>) {
    const { error } = await supabase.from('expenses').insert(data);
    if (error) throw new Error(error.message);
    await fetchExpenses();
  }

  async function updateExpense(id: string, data: Partial<Expense>) {
    const { error } = await supabase
      .from('expenses')
      .update(data)
      .eq('id', id);
    if (error) throw new Error(error.message);
    await fetchExpenses();
  }

  async function saveDraftExpense(
    id: string,
    fields: {
      amount: number;
      currency: string;
      category: string;
      merchant_name: string | null;
      description: string | null;
      expense_date: string;
    }
  ) {
    const { error } = await supabase.rpc('save_draft_expense', {
      p_expense_id: id,
      p_amount: fields.amount,
      p_currency: fields.currency,
      p_category: fields.category,
      p_merchant_name: fields.merchant_name ?? '',
      p_description: fields.description ?? '',
      p_expense_date: fields.expense_date,
    });
    if (error) throw new Error(error.message);
    await fetchExpenses();
  }

  async function deleteExpense(id: string) {
    const { error } = await supabase.rpc('delete_draft_expense', { p_expense_id: id });
    if (error) throw new Error(error.message);
    await fetchExpenses();
  }

  async function submitExpense(id: string) {
    const { error } = await supabase.rpc('submit_expense', { p_expense_id: id });
    if (error) throw new Error(error.message);
    await fetchExpenses();
  }

  async function approveExpense(id: string) {
    return updateExpense(id, { status: 'approved' });
  }

  async function rejectExpense(id: string, rejectionNote: string) {
    return updateExpense(id, { status: 'rejected', rejection_note: rejectionNote });
  }

  async function recallExpense(id: string, recallNote: string) {
    const { error } = await supabase.rpc('recall_expense', {
      p_expense_id: id,
      p_recall_note: recallNote,
    });
    if (error) throw new Error(error.message);
    await fetchExpenses();
  }

  return {
    expenses,
    loading,
    error,
    refetch: fetchExpenses,
    addExpense,
    updateExpense,
    saveDraftExpense,
    deleteExpense,
    submitExpense,
    approveExpense,
    rejectExpense,
    recallExpense,
  };
}

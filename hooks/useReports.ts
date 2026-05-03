import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Report } from '../types';

export function useReports(workspaceId?: string) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef(`reports-${Math.random().toString(36).slice(2)}`);

  const fetchReports = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('reports')
      .select(`*, expenses(*, profiles(full_name))`)
      .eq('workspace_id', workspaceId)
      .order('week_start', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setReports((data ?? []) as Report[]);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchReports();

    const channel = supabase
      .channel(channelRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () =>
        fetchReports()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  async function approveReport(reportId: string, reviewerId: string) {
    const { error } = await supabase.rpc('approve_report', {
      p_report_id: reportId,
      p_reviewer_id: reviewerId,
    });
    if (error) throw new Error(error.message);
    await fetchReports();
  }

  async function rejectReport(reportId: string, reviewerId: string, note: string) {
    const { error } = await supabase.rpc('reject_report', {
      p_report_id: reportId,
      p_reviewer_id: reviewerId,
      p_note: note,
    });
    if (error) throw new Error(error.message);
    await fetchReports();
  }

  async function createManualReport(workspaceId: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_manual_report', {
      p_workspace_id: workspaceId,
    });
    if (error) throw new Error(error.message);
    await fetchReports();
    return data as string;
  }

  return { reports, loading, error, refetch: fetchReports, approveReport, rejectReport, createManualReport };
}

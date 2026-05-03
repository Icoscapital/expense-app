# Resume checklist for tomorrow

## ✅ Done while you were away
- Approve/reject now uses SECURITY DEFINER RPCs (no more RLS errors)
- "Generate Report" button added to admin Reports screen — Marieke can bundle submitted expenses immediately without waiting for Monday
- EUR currency fixed in ALL screens (ExpenseCard, dashboard, reports, weekly email)
- Dates now show DD/MM/YYYY everywhere (ExpenseCard, admin reports, detail screen)
- SafeAreaView imports fixed in admin reports screens
- Weekly report Edge Function updated with EUR + European dates
- Register screen now pre-fills the workspace code automatically for new joiners
- App icon updated to Icos logo

## ⚠️ SQL to run in Supabase FIRST thing tomorrow
Go to Supabase → SQL Editor and run these one at a time:

### 1. Approve report RPC
```sql
CREATE OR REPLACE FUNCTION approve_report(p_report_id UUID, p_reviewer_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE reports SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = NOW() WHERE id = p_report_id;
  UPDATE expenses SET status = 'approved', updated_at = NOW() WHERE report_id = p_report_id AND status = 'submitted';
END;
$$;
```

### 2. Reject report RPC
```sql
CREATE OR REPLACE FUNCTION reject_report(p_report_id UUID, p_reviewer_id UUID, p_note TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE reports SET status = 'rejected', reviewed_by = p_reviewer_id, reviewed_at = NOW() WHERE id = p_report_id;
  UPDATE expenses SET status = 'rejected', rejection_note = p_note, updated_at = NOW() WHERE report_id = p_report_id AND status = 'submitted';
END;
$$;
```

### 3. Create manual report RPC
```sql
CREATE OR REPLACE FUNCTION create_manual_report(p_workspace_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_report_id UUID;
  v_total NUMERIC;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  v_week_end := (v_week_start + INTERVAL '6 days')::DATE;
  SELECT COALESCE(SUM(amount), 0) INTO v_total FROM expenses
  WHERE workspace_id = p_workspace_id AND status = 'submitted' AND report_id IS NULL;
  IF v_total = 0 THEN RAISE EXCEPTION 'No unlinked submitted expenses found'; END IF;
  INSERT INTO reports (workspace_id, week_start, week_end, status, total_amount)
  VALUES (p_workspace_id, v_week_start, v_week_end, 'pending', v_total)
  ON CONFLICT (workspace_id, week_start) DO UPDATE SET total_amount = EXCLUDED.total_amount, status = 'pending'
  RETURNING id INTO v_report_id;
  UPDATE expenses SET report_id = v_report_id
  WHERE workspace_id = p_workspace_id AND status = 'submitted' AND report_id IS NULL;
  RETURN v_report_id;
END;
$$;
```

## 📋 Test flow after SQL is run
1. Start Expo: `npx expo start --clear`
2. Nityen submits an expense (employee view)
3. Marieke logs in → Reports tab → sees banner "X expenses ready for review" → taps to generate report
4. Marieke opens the report → taps Approve All
5. Nityen refreshes → expense shows "Approved" ✅

## 🔜 Still to do
- SendGrid account + API key → deploy weekly report Edge Function
- Build standalone APK with EAS so team doesn't need Expo Go + laptop
- Add Peter, Stefan and other team members

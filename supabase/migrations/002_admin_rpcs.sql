-- ─── Admin RPC Functions ─────────────────────────────────────────────────────
-- Run these in Supabase SQL Editor

-- Approve a report and all its expenses
CREATE OR REPLACE FUNCTION approve_report(
  p_report_id UUID,
  p_reviewer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE reports
  SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = NOW()
  WHERE id = p_report_id;

  UPDATE expenses
  SET status = 'approved', updated_at = NOW()
  WHERE report_id = p_report_id AND status = 'submitted';
END;
$$;

-- Reject a report and all its expenses
CREATE OR REPLACE FUNCTION reject_report(
  p_report_id UUID,
  p_reviewer_id UUID,
  p_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE reports
  SET status = 'rejected', reviewed_by = p_reviewer_id, reviewed_at = NOW()
  WHERE id = p_report_id;

  UPDATE expenses
  SET status = 'rejected', rejection_note = p_note, updated_at = NOW()
  WHERE report_id = p_report_id AND status = 'submitted';
END;
$$;

-- Create a report manually from all current submitted expenses (for testing / ad-hoc)
CREATE OR REPLACE FUNCTION create_manual_report(
  p_workspace_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id UUID;
  v_total     NUMERIC;
  v_week_start DATE;
  v_week_end   DATE;
BEGIN
  -- Current week Mon–Sun
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  v_week_end   := (v_week_start + INTERVAL '6 days')::DATE;

  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM expenses
  WHERE workspace_id = p_workspace_id
    AND status = 'submitted'
    AND report_id IS NULL;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'No unlinked submitted expenses found in this workspace';
  END IF;

  -- Upsert report (in case one already exists for this week)
  INSERT INTO reports (workspace_id, week_start, week_end, status, total_amount)
  VALUES (p_workspace_id, v_week_start, v_week_end, 'pending', v_total)
  ON CONFLICT (workspace_id, week_start) DO UPDATE
    SET total_amount = EXCLUDED.total_amount, status = 'pending'
  RETURNING id INTO v_report_id;

  -- Link expenses
  UPDATE expenses
  SET report_id = v_report_id
  WHERE workspace_id = p_workspace_id
    AND status = 'submitted'
    AND report_id IS NULL;

  RETURN v_report_id;
END;
$$;

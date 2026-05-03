-- ─── Rejected Expense RPC Functions ─────────────────────────────────────────
-- Run these in Supabase SQL Editor

-- Allow an employee to reset their own rejected expense back to draft
-- so they can correct it and resubmit.
CREATE OR REPLACE FUNCTION resubmit_rejected_expense(p_expense_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE expenses
  SET
    status         = 'draft',
    rejection_note = NULL,
    report_id      = NULL,
    updated_at     = NOW()
  WHERE id      = p_expense_id
    AND user_id = auth.uid()
    AND status  = 'rejected';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found or cannot be reset (must be rejected and owned by you)';
  END IF;
END;
$$;

-- Allow an employee to delete their own rejected expense.
CREATE OR REPLACE FUNCTION delete_rejected_expense(p_expense_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM expenses
  WHERE id      = p_expense_id
    AND user_id = auth.uid()
    AND status  = 'rejected';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found or cannot be deleted (must be rejected and owned by you)';
  END IF;
END;
$$;

-- Allow an admin to delete any expense in their workspace.
CREATE OR REPLACE FUNCTION admin_delete_expense(p_expense_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM expenses
  WHERE id = p_expense_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  -- Caller must be an admin in the same workspace
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id           = auth.uid()
      AND workspace_id = v_workspace_id
      AND role         = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorised: must be an admin in the expense workspace';
  END IF;

  DELETE FROM expenses WHERE id = p_expense_id;
END;
$$;

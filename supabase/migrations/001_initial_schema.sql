-- ============================================================
-- ExpenseApp — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── PROFILES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id  UUID,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'employee'
                  CHECK (role IN ('employee', 'admin')),
  push_token    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── WORKSPACES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  admin_email   TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles
  ADD CONSTRAINT fk_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- ── EXPENSES ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  report_id       UUID,
  amount          NUMERIC(10, 2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  category        TEXT NOT NULL
                    CHECK (category IN (
                      'meals', 'travel', 'accommodation', 'software',
                      'office_supplies', 'entertainment', 'other'
                    )),
  description     TEXT,
  merchant_name   TEXT,
  receipt_url     TEXT,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── REPORTS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  total_amount    NUMERIC(10, 2),
  csv_storage_key TEXT,
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, week_start)
);

ALTER TABLE expenses
  ADD CONSTRAINT fk_report
  FOREIGN KEY (report_id) REFERENCES reports(id);

-- ── UPDATED_AT TRIGGER ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────────────────────────
-- This trigger fires when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports     ENABLE ROW LEVEL SECURITY;

-- ── PROFILES RLS ───────────────────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "profiles_own_select"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_own_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can read all profiles in their workspace
CREATE POLICY "profiles_admin_workspace_select"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.workspace_id = profiles.workspace_id
    )
  );

-- Allow insert during signup (handled by trigger + service role)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── WORKSPACES RLS ─────────────────────────────────────────────────────────────

-- Workspace members can read their workspace
CREATE POLICY "workspaces_member_select"
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.workspace_id = workspaces.id
    )
  );

-- Admins can update their workspace
CREATE POLICY "workspaces_admin_update"
  ON workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.workspace_id = workspaces.id
    )
  );

-- Allow insert so users can create workspaces during registration
CREATE POLICY "workspaces_insert_authenticated"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── EXPENSES RLS ───────────────────────────────────────────────────────────────

-- Employees read their own expenses
CREATE POLICY "expenses_own_select"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

-- Employees insert their own expenses
CREATE POLICY "expenses_own_insert"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Employees can only update their DRAFT expenses
CREATE POLICY "expenses_own_update_draft"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft');

-- Employees can delete their draft expenses
CREATE POLICY "expenses_own_delete_draft"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id AND status = 'draft');

-- Admins can read all expenses in their workspace
CREATE POLICY "expenses_admin_workspace_select"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.workspace_id = expenses.workspace_id
    )
  );

-- Admins can update expense status (approve/reject)
CREATE POLICY "expenses_admin_update_status"
  ON expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.workspace_id = expenses.workspace_id
    )
  );

-- ── REPORTS RLS ────────────────────────────────────────────────────────────────

-- All workspace members can read reports
CREATE POLICY "reports_workspace_select"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.workspace_id = reports.workspace_id
    )
  );

-- Admins can update report status
CREATE POLICY "reports_admin_update"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.workspace_id = reports.workspace_id
    )
  );

-- Service role (Edge Function) inserts reports — no RLS needed for service role

-- ════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- Run these separately in the Supabase Dashboard → Storage
-- or via the Supabase CLI:
-- ════════════════════════════════════════════════════════════
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);

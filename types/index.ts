// ─── Core Domain Types ───────────────────────────────────────────────────────

export type UserRole = 'employee' | 'admin';

export type ExpenseCategory =
  | 'meals'
  | 'travel'
  | 'accommodation'
  | 'software'
  | 'office_supplies'
  | 'entertainment'
  | 'other';

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export type ReportStatus = 'pending' | 'approved' | 'rejected';

// ─── Database Row Types ──────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  admin_email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  workspace_id: string | null;
  full_name: string;
  role: UserRole;
  push_token: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  workspace_id: string;
  report_id: string | null;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string | null;
  merchant_name: string | null;
  receipt_url: string | null;
  receipt_storage_path: string | null;
  expense_date: string; // ISO date string: YYYY-MM-DD
  status: ExpenseStatus;
  rejection_note: string | null;
  recall_note: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  profiles?: Pick<Profile, 'full_name'>;
}

export interface Report {
  id: string;
  workspace_id: string;
  week_start: string; // YYYY-MM-DD
  week_end: string;   // YYYY-MM-DD
  status: ReportStatus;
  total_amount: number | null;
  csv_storage_key: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined fields (optional)
  expenses?: Expense[];
}

// ─── Auth / Session Types ─────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
}

// ─── OCR Result Type ──────────────────────────────────────────────────────────

export interface OcrResult {
  amount: number | null;
  currency: string | null;
  merchantName: string | null;
  date: string | null; // YYYY-MM-DD
  rawText: string;
}

// ─── Navigation Param Types ───────────────────────────────────────────────────

export interface NewExpenseParams {
  amount?: string;
  merchantName?: string;
  expenseDate?: string;
  receiptStoragePath?: string;
  receiptUrl?: string;
}

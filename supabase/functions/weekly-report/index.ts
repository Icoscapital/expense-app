// Supabase Edge Function — Weekly Expense Report
// Cron schedule: Every Monday at 08:00 UTC  → "0 8 * * 1"
//
// Deploy:  supabase functions deploy weekly-report
// Secrets: supabase secrets set SENDGRID_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
//
// The function:
//  1. Calculates the previous week window (Mon–Sun)
//  2. For each workspace, collects all 'submitted' expenses in that window
//  3. Creates a report record in the DB
//  4. Generates a CSV file
//  5. Emails the CSV to the workspace admin via SendGrid
//  6. Sends Expo push notifications to all employees

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'reports@expenseapp.com';

// Admin client — bypasses RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (_req) => {
  try {
    // ── 1. Calculate last week's Mon–Sun window ──────────────────────────────
    const now = new Date();
    // "Last Sunday" = yesterday if today is Monday, else most recent Sunday
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon … 6=Sat
    const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - daysToLastSunday);
    weekEnd.setHours(23, 59, 59, 0);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    console.log(`Generating reports for ${weekStartStr} – ${weekEndStr}`);

    // ── 2. Fetch all workspaces ───────────────────────────────────────────────
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, admin_email');

    if (wsError) throw wsError;
    if (!workspaces || workspaces.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No workspaces found.' }), { status: 200 });
    }

    const results = [];

    for (const workspace of workspaces) {
      // ── 3. Fetch submitted expenses for this workspace this week ─────────
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select(`
          id, amount, currency, category, description,
          merchant_name, expense_date, receipt_url, status,
          profiles!inner(full_name, push_token)
        `)
        .eq('workspace_id', workspace.id)
        .eq('status', 'submitted')
        .gte('expense_date', weekStartStr)
        .lte('expense_date', weekEndStr);

      if (expError) {
        console.error(`Error fetching expenses for workspace ${workspace.id}:`, expError);
        continue;
      }

      if (!expenses || expenses.length === 0) {
        console.log(`No submitted expenses for workspace ${workspace.name} — skipping.`);
        results.push({ workspace: workspace.name, skipped: true });
        continue;
      }

      const total = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      // ── 4. Check if report already exists (idempotency) ──────────────────
      const { data: existing } = await supabase
        .from('reports')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('week_start', weekStartStr)
        .single();

      if (existing) {
        console.log(`Report already exists for workspace ${workspace.name} week ${weekStartStr} — skipping.`);
        results.push({ workspace: workspace.name, skipped: true, reason: 'already exists' });
        continue;
      }

      // ── 5. Create report record ───────────────────────────────────────────
      const { data: report, error: repError } = await supabase
        .from('reports')
        .insert({
          workspace_id: workspace.id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          status: 'pending',
          total_amount: total,
        })
        .select()
        .single();

      if (repError || !report) {
        console.error(`Error creating report for workspace ${workspace.id}:`, repError);
        continue;
      }

      // ── 6. Link expenses to report ────────────────────────────────────────
      await supabase
        .from('expenses')
        .update({ report_id: report.id })
        .in('id', expenses.map((e: any) => e.id));

      // ── 7. Generate CSV ───────────────────────────────────────────────────
      const csvLines = [
        'Employee,Date,Category,Merchant,Description,Amount,Currency,Receipt URL',
        ...expenses.map((e: any) => [
          e.profiles?.full_name ?? 'Unknown',
          e.expense_date,
          e.category,
          e.merchant_name ?? '',
          e.description ?? '',
          e.amount,
          e.currency,
          e.receipt_url ?? '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ];
      const csvContent = csvLines.join('\n');

      // ── 8. Upload CSV to Supabase Storage ─────────────────────────────────
      const csvKey = `${workspace.id}/week-${weekStartStr}.csv`;
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(csvKey, new TextEncoder().encode(csvContent), {
          contentType: 'text/csv',
          upsert: true,
        });

      if (!uploadError) {
        await supabase.from('reports').update({ csv_storage_key: csvKey }).eq('id', report.id);
      }

      // ── 9. Send Email via SendGrid ────────────────────────────────────────
      const dateRange = `${weekStartStr} – ${weekEndStr}`;
      const emailBody = buildEmailHtml(workspace.name, dateRange, expenses, total);

      const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: workspace.admin_email }] }],
          from: { email: FROM_EMAIL, name: 'ExpenseApp Reports' },
          subject: `[${workspace.name}] Weekly Expense Report — ${dateRange}`,
          content: [{ type: 'text/html', value: emailBody }],
          attachments: [
            {
              content: btoa(csvContent),
              filename: `expense-report-${weekStartStr}.csv`,
              type: 'text/csv',
              disposition: 'attachment',
            },
          ],
        }),
      });

      const emailOk = sgResponse.ok;
      if (!emailOk) {
        const errText = await sgResponse.text();
        console.error(`SendGrid error for ${workspace.name}:`, errText);
      }

      // ── 10. Send Push Notifications to Employees ──────────────────────────
      const pushTokens = expenses
        .map((e: any) => e.profiles?.push_token)
        .filter((t: string | null) => Boolean(t));

      const uniqueTokens = [...new Set(pushTokens)] as string[];

      if (uniqueTokens.length > 0) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            uniqueTokens.map((token) => ({
              to: token,
              title: '📊 Weekly Report Submitted',
              body: `Your expenses for ${dateRange} have been sent to admin for review.`,
              data: { type: 'report_submitted', reportId: report.id },
            }))
          ),
        });
      }

      results.push({
        workspace: workspace.name,
        reportId: report.id,
        expenseCount: expenses.length,
        total,
        emailSent: emailOk,
        pushSent: uniqueTokens.length,
      });

      console.log(`✅ Report created for ${workspace.name}: ${expenses.length} expenses, €${total}`);
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('weekly-report error:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ── Email Template ─────────────────────────────────────────────────────────────

function buildEmailHtml(workspaceName: string, dateRange: string, expenses: any[], total: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const toDisplayDate = (iso: string) => {
    const p = iso.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  };

  const rows = expenses.map((e: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;">${e.profiles?.full_name ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;">${toDisplayDate(e.expense_date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-transform:capitalize;">${e.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;">${e.merchant_name ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;">${fmt(e.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9FAFB;margin:0;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <!-- Header -->
        <div style="background:#4F46E5;padding:24px 32px;">
          <h1 style="color:#fff;margin:0;font-size:22px;">💸 Weekly Expense Report</h1>
          <p style="color:rgba(255,255,255,.8);margin:6px 0 0;">${workspaceName} · ${dateRange}</p>
        </div>
        <!-- Summary -->
        <div style="padding:24px 32px;background:#EEF2FF;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0;font-size:14px;color:#6B7280;">Total Expenses</p>
          <p style="margin:4px 0 0;font-size:36px;font-weight:800;color:#4F46E5;">${fmt(total)}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#6B7280;">${expenses.length} expense${expenses.length !== 1 ? 's' : ''} · Pending your approval</p>
        </div>
        <!-- Table -->
        <div style="padding:24px 32px;">
          <h2 style="margin:0 0 16px;font-size:16px;color:#111827;">Expense Details</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#F3F4F6;">
                <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#6B7280;">Employee</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#6B7280;">Date</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#6B7280;">Category</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#6B7280;">Merchant</th>
                <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#6B7280;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:#F9FAFB;">
                <td colspan="4" style="padding:12px;font-weight:700;font-size:15px;color:#111827;">Total</td>
                <td style="padding:12px;text-align:right;font-weight:800;font-size:16px;color:#4F46E5;">${fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <!-- Footer -->
        <div style="padding:20px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;text-align:center;">
          <p style="margin:0;font-size:13px;color:#9CA3AF;">
            Log in to ExpenseApp to approve or reject this report.<br>
            The full CSV is attached to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Auto-rendered «إيضاحات» block for BalanceSheetReport / export preview.
 */
import type { FinancialStatementNote } from "@/services/financialStatementNotes";

type Props = {
  notes: FinancialStatementNote[] | undefined;
  loading?: boolean;
  tr: (ar: string, en: string) => string;
};

export function BalanceSheetNotesSection({ notes, loading, tr }: Props) {
  if (loading) {
    return (
      <section className="bs-notes-section" dir="rtl" aria-busy="true">
        <h3>{tr("إيضاحات", "Notes")}</h3>
        <p>{tr("جاري التحميل…", "Loading…")}</p>
      </section>
    );
  }
  if (!notes?.length) return null;

  return (
    <section className="bs-notes-section" dir="rtl" data-testid="bs-statement-notes">
      <h3 style={{ marginBottom: 12 }}>{tr("إيضاحات", "Notes")}</h3>
      <ol style={{ listStyle: "arabic-indic", paddingInlineStart: 28, margin: 0 }}>
        {notes.map((n) => (
          <li key={n.id} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600 }}>
              {n.title_ar}
              {n.account_code ? (
                <span style={{ marginInlineStart: 8, opacity: 0.7, fontWeight: 400 }}>
                  ({tr("حساب", "Acct")} {n.account_code})
                </span>
              ) : null}
            </div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginTop: 6 }}>
              {n.body_ar}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

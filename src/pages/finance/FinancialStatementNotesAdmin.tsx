/**
 * Admin list/edit UI for financial statement notes (إيضاحات).
 * Wire route e.g. /finance/settings/statement-notes
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  useFinancialStatementNotesAdmin,
  useUpsertFinancialStatementNote,
  type FinancialStatementNote,
} from "@/hooks/finance/useFinancialStatementNotes";

const emptyForm = {
  id: undefined as string | undefined,
  as_of_date: "2025-12-31",
  account_code: "",
  note_key: "",
  title_ar: "",
  body_ar: "",
  sort_order: 100,
  is_active: true,
};

export default function FinancialStatementNotesAdmin() {
  const list = useFinancialStatementNotesAdmin();
  const upsert = useUpsertFinancialStatementNote();
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    const all = list.data ?? [];
    const q = filter.trim();
    if (!q) return all;
    return all.filter(
      (r) =>
        r.note_key.includes(q) ||
        (r.account_code ?? "").includes(q) ||
        r.title_ar.includes(q) ||
        r.as_of_date.includes(q)
    );
  }, [list.data, filter]);

  const edit = (row: FinancialStatementNote) => {
    setForm({
      id: row.id,
      as_of_date: row.as_of_date,
      account_code: row.account_code ?? "",
      note_key: row.note_key,
      title_ar: row.title_ar,
      body_ar: row.body_ar,
      sort_order: row.sort_order,
      is_active: row.is_active,
    });
  };

  const save = async () => {
    if (form.title_ar.trim().length < 3 || form.body_ar.trim().length < 20) {
      toast.error("العنوان والنص مطلوبان");
      return;
    }
    await upsert.mutateAsync({
      id: form.id,
      as_of_date: form.as_of_date,
      account_code: form.account_code || null,
      note_key: form.note_key,
      title_ar: form.title_ar,
      body_ar: form.body_ar,
      sort_order: Number(form.sort_order) || 100,
      is_active: form.is_active,
    });
    setForm(emptyForm);
  };

  return (
    <div className="fin-reports-workspace" dir="rtl" style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>إيضاحات القوائم المالية</h1>
      <p style={{ opacity: 0.75, marginBottom: 20 }}>
        تُعرض تلقائياً في الميزانية العمومية عند مطابقة تاريخ القطع.
      </p>

      <div style={{ display: "grid", gap: 12, maxWidth: 720, marginBottom: 28 }}>
        <div>
          <Label>تاريخ القطع</Label>
          <Input
            type="date"
            value={form.as_of_date}
            onChange={(e) => setForm((f) => ({ ...f, as_of_date: e.target.value }))}
          />
        </div>
        <div>
          <Label>المفتاح note_key</Label>
          <Input
            value={form.note_key}
            onChange={(e) => setForm((f) => ({ ...f, note_key: e.target.value }))}
            placeholder="trade_ar_1200"
          />
        </div>
        <div>
          <Label>رمز الحساب (اختياري)</Label>
          <Input
            value={form.account_code}
            onChange={(e) => setForm((f) => ({ ...f, account_code: e.target.value }))}
            placeholder="1200"
          />
        </div>
        <div>
          <Label>العنوان</Label>
          <Input
            value={form.title_ar}
            onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
          />
        </div>
        <div>
          <Label>النص</Label>
          <Textarea
            rows={8}
            value={form.body_ar}
            onChange={(e) => setForm((f) => ({ ...f, body_ar: e.target.value }))}
          />
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div>
            <Label>الترتيب</Label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 100 }))
              }
            />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 18 }}>
            <Checkbox
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: Boolean(v) }))}
            />
            نشط
          </label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="button" onClick={() => void save()} disabled={upsert.isPending}>
            حفظ
          </Button>
          <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
            جديد
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: 12, maxWidth: 360 }}>
        <Input
          placeholder="بحث…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {list.isLoading ? (
        <LoadingSpinner />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>المفتاح</TableHead>
              <TableHead>الحساب</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>نشط</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.as_of_date}</TableCell>
                <TableCell>
                  <code>{r.note_key}</code>
                </TableCell>
                <TableCell>{r.account_code ?? "—"}</TableCell>
                <TableCell>{r.title_ar}</TableCell>
                <TableCell>{r.is_active ? "نعم" : "لا"}</TableCell>
                <TableCell>
                  <Button type="button" size="sm" variant="ghost" onClick={() => edit(r)}>
                    تعديل
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Search,
  RefreshCw,
  UsersRound,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useRelinkViolations } from "@/hooks/useRelinkViolations";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

export function CustomerAssignmentDialog({
  companyId,
  onClose,
}: {
  companyId: string | null | undefined;
  onClose: () => void;
}) {
  const { preview, assignment } = useRelinkViolations(companyId);
  const { formatCurrency } = useCurrencyFormatter();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const rows = useMemo(() => preview.data ?? [], [preview.data]);
  const ready = rows.filter((row) => row.ready);
  const chosen = rows.filter(
    (row) => row.ready && selected[row.id] === row.token
  );
  const visible = rows.filter(
    (row) =>
      (filter === "all" || (filter === "ready" ? row.ready : !row.ready)) &&
      [
        row.penalty_number,
        row.vehicle_plate,
        row.reason,
        ...row.candidates.flatMap((c) => [c.customer_name, c.contract_number]),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase())
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(visible.length / 25) - 1)
  );
  const busy = assignment.isPending;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        dir="rtl"
        className="traffic-violations-dialog max-w-6xl max-h-[92vh] overflow-y-auto bg-white text-slate-900"
      >
        <DialogHeader className="text-start">
          <div className="flex items-center gap-2 text-emerald-700 text-sm">
            <UsersRound className="h-5 w-5" />
            إدارة مسؤولية المخالفات
          </div>
          <DialogTitle className="text-2xl">
            إسناد المخالفات للعملاء
          </DialogTitle>
          <DialogDescription>
            راجع العميل والعقد قبل الاعتماد. تتم المطابقة حسب المركبة وتاريخ
            المخالفة، وتُحفظ الدفعة كاملة بعد إعادة التحقق.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["بانتظار الإسناد", rows.length],
            ["جاهزة للاعتماد", ready.length],
            ["تحتاج مراجعة", rows.length - ready.length],
          ].map(([label, count]) => (
            <div
              key={label}
              className="rounded-2xl bg-slate-50 border border-slate-100 p-3"
            >
              <div className="text-xs text-slate-500">{label}</div>
              <div className="text-2xl font-semibold mt-1">{preview.isPending || preview.isError ? '—' : count}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              aria-label="البحث في إسناد المخالفات"
              placeholder="رقم المخالفة، اللوحة، العميل أو العقد"
              className="pr-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="حالة المطابقة"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            className="h-10 border rounded-md px-3 bg-white"
          >
            <option value="all">جميع النتائج</option>
            <option value="ready">جاهزة للاعتماد</option>
            <option value="review">تحتاج مراجعة</option>
          </select>
          <Button
            variant="outline"
            disabled={busy || preview.isFetching}
            onClick={() => {
              setSelected({});
              void preview.refetch();
            }}
          >
            <RefreshCw
              className={`h-4 w-4 ml-2 ${
                preview.isFetching ? "animate-spin" : ""
              }`}
            />
            تحديث المعاينة
          </Button>
        </div>
        {preview.isError ? (
          <div role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">
            تعذر تحميل المعاينة: {preview.error.message}
          </div>
        ) : preview.isPending ? (
          <p role="status" className="py-10 text-center">
            جارٍ فحص المخالفات والعقود وسجلات المركبات…
          </p>
        ) : (
          <>
            <div className="flex justify-between flex-wrap gap-2 text-sm items-center">
              <span>
                {visible.length} نتيجة · تم اختيار {chosen.length} / 50
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || preview.isFetching}
                  onClick={() =>
                    setSelected(
                      Object.fromEntries(
                        visible
                          .filter((row) => row.ready)
                          .slice(0, 50)
                          .map((row) => [row.id, row.token])
                      )
                    )
                  }
                >
                  اختيار أول 50 مطابقة معروضة
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setSelected({})}
                >
                  مسح الاختيار
                </Button>
              </div>
            </div>
            <div className="border rounded-xl overflow-auto max-h-[40vh]">
              <table className="w-full text-sm min-w-[740px] text-start">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    {[
                      "اختيار",
                      "المخالفة / المركبة",
                      "العميل والعقد",
                      "نتيجة المراجعة",
                      "المبلغ",
                    ].map((label) => (
                      <th
                        key={label}
                        className="p-3 text-start font-medium text-slate-600"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible
                    .slice(currentPage * 25, (currentPage + 1) * 25)
                    .map((row) => (
                      <tr
                        key={row.id}
                        className="border-t align-top hover:bg-slate-50/60"
                      >
                        <td className="p-3">
                          <Checkbox
                            aria-label={`اختيار المخالفة ${row.penalty_number}`}
                            checked={
                              selected[row.id] === row.token && row.ready
                            }
                            disabled={
                              !row.ready ||
                              busy ||
                              preview.isFetching ||
                              (chosen.length >= 50 &&
                                selected[row.id] !== row.token)
                            }
                            onCheckedChange={(checked) =>
                              setSelected((prev) => {
                                const next = { ...prev };
                                if (checked) next[row.id] = row.token;
                                else delete next[row.id];
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className="p-3">
                          <strong className="block">
                            {row.penalty_number}
                          </strong>
                          <span className="block text-slate-500 mt-1">
                            {row.vehicle_plate || "لوحة غير مسجلة"} ·{" "}
                            {row.penalty_date}
                          </span>
                        </td>
                        <td className="p-3 space-y-2">
                          {row.candidates.length ? (
                            row.candidates.map((c) => (
                              <div key={c.contract_id}>
                                <Link
                                  className="text-emerald-800 font-medium hover:underline"
                                  to={`/customers/${c.customer_id}`}
                                >
                                  {c.customer_name}
                                </Link>
                                <Link
                                  className="block text-xs text-slate-500 hover:underline"
                                  to={`/contracts/${c.contract_id}`}
                                >
                                  {c.contract_number} · {c.start_date} —{" "}
                                  {c.end_date}
                                </Link>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400">
                              لا يوجد عقد مطابق
                            </span>
                          )}
                        </td>
                        <td className="p-3 max-w-[240px]">
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs mb-1 ${
                              row.ready
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {row.ready ? "جاهزة للاعتماد" : "تحتاج مراجعة"}
                          </span>
                          <p className="text-xs text-slate-500 leading-5">
                            {row.reason}
                          </p>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!visible.length && (
                <p className="p-8 text-center text-slate-500">
                  {rows.length
                    ? "لا توجد نتائج لهذا البحث"
                    : "لا توجد مخالفات بانتظار إسنادها للعملاء"}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>
                صفحة {currentPage + 1} من{" "}
                {Math.max(1, Math.ceil(visible.length / 25))}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(currentPage + 1) * 25 >= visible.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          </>
        )}
        <div className="rounded-xl bg-emerald-50/60 p-3 flex gap-2 text-xs leading-6 text-emerald-900">
          <ShieldCheck className="h-5 w-5 shrink-0 mt-1" />
          الحالات التي تحتاج مراجعة تبقى دون إسناد. اعتماد الدفعة يربط المخالفة
          بالعميل والعقد ويسجل العملية، ولا يسجل دفعة سداد.
        </div>
        {assignment.isSuccess && (
          <p role="status" className="text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            تم إسناد {assignment.data.assigned} مخالفة بنجاح.
          </p>
        )}
        {assignment.isError && (
          <p role="alert" className="text-red-700 text-sm">
            {assignment.error.message}
          </p>
        )}
        <div className="flex flex-wrap justify-between items-center gap-3 border-t pt-4">
          <span className="text-sm">
            إجمالي المحدد:{" "}
            <strong>
              {formatCurrency(chosen.reduce((sum, row) => sum + row.amount, 0))}
            </strong>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={onClose}>
              إغلاق
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={
                !chosen.length || busy || preview.isFetching || preview.isError
              }
              onClick={() =>
                assignment.mutate(chosen, { onSuccess: () => setSelected({}) })
              }
            >
              {busy
                ? "جارٍ اعتماد الإسناد…"
                : `اعتماد إسناد ${chosen.length} مخالفة`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

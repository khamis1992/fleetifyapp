import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, FileText, Search } from "lucide-react";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { Input } from "@/components/ui/input";
import { useFinanceNavigation } from "@/components/finance/workspace/useFinanceNavigation";
export default function ReportsLibrary() {
  const [search, setSearch] = useState("");
  const { searchGroups, language, isLoading } = useFinanceNavigation();
  const reports = searchGroups
    .flatMap((group) => group.items)
    .filter((item) => item.parentId === "reports");
  const visible = reports.filter((item) =>
    `${item.ar} ${item.en}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  return (
    <section dir="rtl" className="space-y-5">
      <FinancePageHeader
        title="مكتبة التقارير"
        description="اختر تقريرًا لفتح صفحته وضبط الفترة المالية والمرشحات."
        icon={FileText}
      />
      <div className="relative max-w-xl">
        <Search
          className="absolute right-3 top-3 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="بحث في التقارير"
          placeholder="ابحث باسم التقرير…"
          className="pr-10"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className="group flex min-h-28 items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <FileText
              className="h-6 w-6 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <span className="flex-1 font-bold">{item[language]}</span>
            <ArrowUpLeft
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
      {!visible.length && (
        <p role="status" className="rounded-xl border p-6">
          {isLoading ? "جاري تحميل التقارير…" : "لا توجد تقارير مطابقة متاحة."}
        </p>
      )}
    </section>
  );
}

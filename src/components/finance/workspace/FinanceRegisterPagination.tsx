import { Button } from "@/components/ui/button";
export function FinanceRegisterPagination({
  page,
  pages,
  total,
  setPage,
}: {
  page: number;
  pages: number;
  total: number;
  setPage: (page: number) => void;
}) {
  return (
    <nav
      aria-label="صفحات السجل"
      className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs"
    >
      <p role="status">
        {total.toLocaleString("ar-QA")} سجل · الصفحة {page} من {pages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          السابق
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          التالي
        </Button>
      </div>
    </nav>
  );
}

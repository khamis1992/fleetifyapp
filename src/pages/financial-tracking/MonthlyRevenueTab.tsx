import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Filter, X, Loader2 } from "lucide-react";
import type { MonthlySummaryItem } from "./types";

interface MonthlyRevenueTabProps {
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  filteredMonthlySummary: MonthlySummaryItem[];
  monthlySummary: MonthlySummaryItem[];
  selectedMonthFilter: string;
  onMonthFilterChange: (filter: string) => void;
}

const MonthlyRevenueTab: React.FC<MonthlyRevenueTabProps> = ({
  loading,
  error,
  onRetry,
  filteredMonthlySummary,
  monthlySummary,
  selectedMonthFilter,
  onMonthFilterChange,
}) => {
  if (error)
    return (
      <Card>
        <CardContent className="p-6" role="alert">
          <p>{error.message}</p>
          <Button variant="outline" className="mt-3" onClick={onRetry}>
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            التحصيل الشهري
          </CardTitle>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="relative">
              <select
                value={selectedMonthFilter}
                onChange={(e) => onMonthFilterChange(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-white appearance-none pr-8"
                disabled={loading}
              >
                <option value="all">جميع الأشهر</option>
                {monthlySummary.map((month) => (
                  <option key={month.monthKey} value={month.monthKey}>
                    {month.month}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
            {selectedMonthFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMonthFilterChange("all")}
                className="h-8"
                disabled={loading}
              >
                <X className="h-4 w-4 ml-1" />
                إلغاء الفلتر
              </Button>
            )}
          </div>
          {(loading || monthlySummary.length === 0) && (
            <div className="text-sm text-muted-foreground mt-2">
              {loading ? (
                <span>جاري تحميل البيانات...</span>
              ) : (
                <span>لا توجد بيانات شهرية متاحة</span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          الدفعات المكتملة بالريال القطري حسب تاريخ القبض حتى اليوم، بعد استبعاد
          الدفعات الملغاة. الإيراد المحاسبي معروض في قائمة الدخل.
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mr-2">جاري التحميل...</span>
          </div>
        ) : filteredMonthlySummary.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {selectedMonthFilter === "all"
                ? "لا توجد بيانات شهرية بعد"
                : `لا توجد بيانات للشهر المحدد`}
            </p>
            <p className="text-sm mt-2">
              {selectedMonthFilter === "all"
                ? "قم بإضافة مدفوعات للعملاء لرؤية الإحصائيات"
                : "جرب اختيار شهر آخر أو عرض جميع الأشهر"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      إجمالي المقبوضات
                    </p>
                    <p className="text-3xl font-bold text-primary mt-2">
                      {filteredMonthlySummary
                        .reduce((sum, m) => sum + (m.total || 0), 0)
                        .toLocaleString("en-US")}{" "}
                      ريال
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      أصل الإيجار المسدد
                    </p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {filteredMonthlySummary
                        .reduce((sum, m) => sum + (m.rent || 0), 0)
                        .toLocaleString("en-US")}{" "}
                      ريال
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      رسوم التأخير المحصلة
                    </p>
                    <p className="text-3xl font-bold text-destructive mt-2">
                      {filteredMonthlySummary
                        .reduce((sum, m) => sum + (m.fines || 0), 0)
                        .toLocaleString("en-US")}{" "}
                      ريال
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">عدد الدفعات</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {filteredMonthlySummary
                        .reduce((sum, m) => sum + (m.count || 0), 0)
                        .toLocaleString("en-US")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الشهر</TableHead>
                    <TableHead className="text-right">عدد الدفعات</TableHead>
                    <TableHead className="text-right">أصل الإيجار</TableHead>
                    <TableHead className="text-right">رسوم التأخير</TableHead>
                    <TableHead className="text-right">
                      دفعات مقدمة وغير مخصصة
                    </TableHead>
                    <TableHead className="text-right">تخصيصات أخرى</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMonthlySummary.map((monthData) => (
                    <TableRow key={monthData.monthKey}>
                      <TableCell className="font-bold">
                        {monthData.month || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {(monthData.count || 0).toLocaleString("en-US")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-blue-600">
                          {(monthData.rent || 0).toLocaleString("en-US")} ريال
                        </span>
                      </TableCell>
                      <TableCell>
                        {(monthData.fines || 0) > 0 ? (
                          <Badge variant="destructive">
                            {(monthData.fines || 0).toLocaleString("en-US")}{" "}
                            ريال
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {monthData.advances.toLocaleString("en-US")} ريال
                      </TableCell>
                      <TableCell>
                        {monthData.other.toLocaleString("en-US")} ريال
                      </TableCell>
                      <TableCell>
                        <span className="text-lg font-bold text-primary">
                          {(monthData.total || 0).toLocaleString("en-US")} ريال
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyRevenueTab;

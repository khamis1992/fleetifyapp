import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { format, addMonths } from "date-fns";
import { ar } from "date-fns/locale";

interface InstallmentCalendarProps {
  startDate: string;
  numberOfInstallments: number;
  installmentAmount: number;
  maxDisplay?: number;
}

export function InstallmentCalendar({
  startDate,
  numberOfInstallments,
  installmentAmount,
  maxDisplay = 6,
}: InstallmentCalendarProps) {
  const { formatCurrency } = useCurrencyFormatter();

  const schedule = useMemo(() => {
    if (!startDate || numberOfInstallments <= 0) return [];

    const scheduleList = [];
    const start = new Date(startDate);

    for (let i = 0; i < Math.min(numberOfInstallments, maxDisplay); i++) {
      const dueDate = addMonths(start, i);
      scheduleList.push({
        number: i + 1,
        dueDate,
        amount: installmentAmount,
      });
    }

    return scheduleList;
  }, [startDate, numberOfInstallments, installmentAmount, maxDisplay]);

  if (!startDate || numberOfInstallments <= 0) {
    return (
      <Card className="bg-neutral-50 border-dashed">
        <CardContent className="p-6 text-center">
          <Calendar className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
          <p className="text-neutral-500">
            أدخل تاريخ البداية وعدد الأقساط لعرض الجدول
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-coral-500" />
            جدول الأقساط
          </div>
          <Badge variant="outline" className="text-xs">
            {numberOfInstallments} قسط
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {schedule.map((item, index) => (
            <div
              key={item.number}
              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-neutral-50 to-white border border-neutral-100 hover:border-coral-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-coral-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-coral-600">
                    {item.number}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">
                    القسط رقم {item.number}
                  </p>
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(item.dueDate, "dd MMMM yyyy", { locale: ar })}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-coral-600">
                  {formatCurrency(item.amount)}
                </p>
              </div>
            </div>
          ))}

          {/* عرض المزيد */}
          {numberOfInstallments > maxDisplay && (
            <div className="text-center py-3 border-t border-dashed">
              <Badge variant="secondary" className="text-xs">
                + {numberOfInstallments - maxDisplay} قسط آخر
              </Badge>
              <p className="text-xs text-neutral-500 mt-1">
                آخر قسط في{" "}
                {format(
                  addMonths(new Date(startDate), numberOfInstallments - 1),
                  "dd MMMM yyyy",
                  { locale: ar }
                )}
              </p>
            </div>
          )}
        </div>

        {/* ملخص */}
        <div className="mt-4 p-3 bg-coral-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">إجمالي الأقساط</span>
            <span className="font-bold text-coral-600">
              {formatCurrency(installmentAmount * numberOfInstallments)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


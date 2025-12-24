import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Printer, 
  Download, 
  Building2, 
  Car, 
  Calendar,
  CreditCard,
  CheckCircle2
} from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { format, addMonths } from "date-fns";
import { ar } from "date-fns/locale";

interface Vehicle {
  id: string;
  plate_number: string;
  make?: string;
  model?: string;
  year?: number;
  allocated_amount: number;
}

interface AgreementPreviewProps {
  vendorName: string;
  vendorPhone: string;
  agreementNumber: string;
  agreementDate: string;
  totalAmount: number;
  downPayment: number;
  numberOfInstallments: number;
  interestRate: number;
  startDate: string;
  installmentAmount: number;
  vehicles: Vehicle[];
  notes?: string;
  onPrint: () => void;
  onExportPDF: () => void;
}

export function AgreementPreview({
  vendorName,
  vendorPhone,
  agreementNumber,
  agreementDate,
  totalAmount,
  downPayment,
  numberOfInstallments,
  interestRate,
  startDate,
  installmentAmount,
  vehicles,
  notes,
  onPrint,
  onExportPDF,
}: AgreementPreviewProps) {
  const { formatCurrency } = useCurrencyFormatter();

  const totalWithInterest = installmentAmount * numberOfInstallments + downPayment;
  const endDate = startDate 
    ? format(addMonths(new Date(startDate), numberOfInstallments), "dd MMMM yyyy", { locale: ar })
    : "---";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    try {
      return format(new Date(dateStr), "dd MMMM yyyy", { locale: ar });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* أزرار الطباعة والتصدير */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="w-4 h-4 ml-2" />
          طباعة
        </Button>
        <Button variant="outline" size="sm" onClick={onExportPDF}>
          <Download className="w-4 h-4 ml-2" />
          تصدير PDF
        </Button>
      </div>

      {/* معاينة الاتفاقية */}
      <Card className="bg-white border-2 border-coral-200" id="agreement-preview">
        <CardHeader className="bg-gradient-to-r from-coral-500 to-orange-500 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6" />
              اتفاقية أقساط مركبات
            </CardTitle>
            <Badge className="bg-white/20 text-white border-white/30">
              {agreementNumber || "رقم الاتفاقية"}
            </Badge>
          </div>
          <p className="text-white/80 text-sm mt-2">
            تاريخ الاتفاقية: {formatDate(agreementDate)}
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* معلومات الوكيل */}
          <div>
            <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-coral-500" />
              معلومات الوكيل / المورد
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-xs text-neutral-500">اسم الوكيل</p>
                <p className="font-medium">{vendorName || "---"}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">رقم الهاتف</p>
                <p className="font-medium" dir="ltr">{vendorPhone || "---"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* المركبات */}
          <div>
            <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-coral-500" />
              المركبات ({vehicles.length})
            </h3>
            <div className="space-y-2">
              {vehicles.map((vehicle, index) => (
                <div
                  key={vehicle.id || index}
                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-coral-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-coral-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {vehicle.plate_number}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" - ")}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-coral-600">
                    {formatCurrency(vehicle.allocated_amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* التفاصيل المالية */}
          <div>
            <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-coral-500" />
              التفاصيل المالية
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-500">المبلغ الإجمالي</p>
                <p className="font-bold text-lg">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-500">الدفعة المقدمة</p>
                <p className="font-bold text-lg text-emerald-600">{formatCurrency(downPayment)}</p>
              </div>
              <div className="p-3 bg-coral-50 rounded-lg border border-coral-200">
                <p className="text-xs text-neutral-500">القسط الشهري</p>
                <p className="font-bold text-lg text-coral-600">{formatCurrency(installmentAmount)}</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-500">عدد الأقساط</p>
                <p className="font-bold text-lg">{numberOfInstallments} شهر</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-500">معدل الفائدة</p>
                <p className="font-bold text-lg">{interestRate}%</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-500">الإجمالي مع الفوائد</p>
                <p className="font-bold text-lg">{formatCurrency(totalWithInterest)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* مواعيد السداد */}
          <div>
            <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-coral-500" />
              مواعيد السداد
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-xs text-neutral-500">تاريخ بداية الأقساط</p>
                <p className="font-medium">{formatDate(startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">تاريخ انتهاء الأقساط</p>
                <p className="font-medium">{endDate}</p>
              </div>
            </div>
          </div>

          {/* ملاحظات */}
          {notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">ملاحظات</h3>
                <p className="text-neutral-600 bg-neutral-50 p-3 rounded-lg">
                  {notes}
                </p>
              </div>
            </>
          )}

          {/* تأكيد */}
          <div className="flex items-center gap-2 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-emerald-700">
              تم مراجعة جميع البيانات وهي جاهزة للحفظ
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


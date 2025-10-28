import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { useContractTemplate, useContractMainClauses, useContractFullText } from '@/hooks/useContractTemplate';

interface OfficialContractViewProps {
  contract: any;
  customer: any;
  vehicle?: any;
}

/**
 * مكون عرض العقد الرسمي لشركة العراف
 */
export const OfficialContractView: React.FC<OfficialContractViewProps> = ({
  contract,
  customer,
  vehicle
}) => {
  const template = useContractTemplate({ contract, customer, vehicle });
  const mainClauses = useContractMainClauses(template);
  const fullText = useContractFullText(template);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `عقد_${template?.معلومات_العقد_الأساسية?.رقم_العقد || 'جديد'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!template) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">لا توجد بيانات كافية لعرض العقد</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* أزرار الإجراءات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>العقد الرسمي - شركة العراف</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button
                onClick={handleDownloadText}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                تنزيل
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* معاينة سريعة للبنود الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainClauses.map((section, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">{section.icon}</span>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="text-sm">
                    <span className="text-muted-foreground">{item.label}:</span>
                    <p className="font-medium">{item.value || '—'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* عرض كامل العقد للطباعة */}
      <Card>
        <CardContent className="p-0">
          <div
            className="contract-print-view p-8 bg-white"
            dir="rtl"
            style={{
              fontFamily: 'Cairo, sans-serif',
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#000'
            }}
          >
            {/* رأس العقد */}
            <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-3xl font-bold mb-2">عقد إيجار سيارة</h1>
              <h2 className="text-xl font-semibold text-gray-700">
                {template.الطرف_الأول_المؤجر.اسم_الشركة}
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                رقم العقد: {template.معلومات_العقد_الأساسية.رقم_العقد}
              </p>
              <p className="text-sm text-gray-600">
                التاريخ: {template.معلومات_العقد_الأساسية.تاريخ_العقد}
              </p>
            </div>

            {/* الطرف الأول */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 bg-gray-100 p-2">الطرف الأول (المؤجر):</h3>
              <div className="pr-4 space-y-1">
                <p><strong>الشركة:</strong> {template.الطرف_الأول_المؤجر.اسم_الشركة}</p>
                <p><strong>السجل التجاري:</strong> {template.الطرف_الأول_المؤجر.السجل_التجاري}</p>
                <p><strong>المقر:</strong> {template.الطرف_الأول_المؤجر.المقر}</p>
                <p><strong>ممثل بـ:</strong> {template.الطرف_الأول_المؤجر.الممثل_القانوني.الاسم} ({template.الطرف_الأول_المؤجر.الممثل_القانوني.الصفة})</p>
              </div>
            </div>

            {/* الطرف الثاني */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 bg-gray-100 p-2">الطرف الثاني (المستأجر):</h3>
              <div className="pr-4 space-y-1">
                <p><strong>الاسم:</strong> {template.الطرف_الثاني_المستأجر.الاسم_الكامل}</p>
                <p><strong>رقم الهوية:</strong> {template.الطرف_الثاني_المستأجر.رقم_الهوية}</p>
                <p><strong>العنوان:</strong> {template.الطرف_الثاني_المستأجر.العنوان}</p>
                <p><strong>الجوال:</strong> {template.الطرف_الثاني_المستأجر.رقم_الجوال}</p>
                <p><strong>الجنسية:</strong> {template.الطرف_الثاني_المستأجر.الجنسية}</p>
                <p><strong>رخصة القيادة:</strong> {template.الطرف_الثاني_المستأجر.رقم_رخصة_القيادة}</p>
              </div>
            </div>

            {/* تفاصيل المركبة */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 bg-gray-100 p-2">تفاصيل المركبة:</h3>
              <div className="pr-4 space-y-1">
                <p><strong>النوع:</strong> {template.تفاصيل_المركبة.النوع}</p>
                <p><strong>الموديل:</strong> {template.تفاصيل_المركبة.الموديل}</p>
                <p><strong>رقم اللوحة:</strong> {template.تفاصيل_المركبة.رقم_اللوحة}</p>
                <p><strong>رقم الهيكل:</strong> {template.تفاصيل_المركبة.رقم_الهيكل}</p>
                <p><strong>سنة الصنع:</strong> {template.تفاصيل_المركبة.سنة_الصنع}</p>
                <p><strong>الحالة عند التسليم:</strong> {template.تفاصيل_المركبة.الحالة_عند_التسليم}</p>
              </div>
            </div>

            {/* الشروط المالية */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 bg-gray-100 p-2">الشروط المالية:</h3>
              <div className="pr-4 space-y-2">
                <div>
                  <p className="font-semibold">مدة العقد:</p>
                  <p className="pr-4">{template.الشروط_المالية.مدة_العقد.القيمة} {template.الشروط_المالية.مدة_العقد.الوحدة}</p>
                  <p className="pr-4 text-sm">من {template.الشروط_المالية.مدة_العقد.تاريخ_البداية} إلى {template.الشروط_المالية.مدة_العقد.تاريخ_النهاية_المتوقع}</p>
                </div>
                <p><strong>الإيجار الشهري:</strong> {template.الشروط_المالية.قيمة_الإيجار_الشهري.المبلغ} {template.الشروط_المالية.قيمة_الإيجار_الشهري.العملة}</p>
                <p><strong>إجمالي قيمة العقد:</strong> {template.الشروط_المالية.إجمالي_قيمة_العقد.المبلغ} {template.الشروط_المالية.إجمالي_قيمة_العقد.العملة}</p>
                <p><strong>مبلغ التأمين:</strong> {template.الشروط_المالية.مبلغ_التأمين.المبلغ} {template.الشروط_المالية.مبلغ_التأمين.العملة} ({template.الشروط_المالية.مبلغ_التأمين.النوع})</p>
                <p><strong>طريقة الدفع:</strong> {template.الشروط_المالية.طريقة_الدفع.التوقيت}</p>
              </div>
            </div>

            {/* الغرامات والعقوبات */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 bg-gray-100 p-2">الغرامات والعقوبات:</h3>
              <div className="pr-4 space-y-2">
                <div>
                  <p className="font-semibold">1. غرامة التأخير في الدفع:</p>
                  <ul className="pr-6 list-disc space-y-1">
                    <li>{template.الغرامات_والعقوبات.غرامة_التأخير_في_الدفع.المبلغ_اليومي} ريال قطري لكل يوم تأخير</li>
                    <li>رسوم إدارية ثابتة: {template.الغرامات_والعقوبات.غرامة_التأخير_في_الدفع.رسوم_إدارية_ثابتة} ريال قطري</li>
                    <li>الحد الأقصى: {template.الغرامات_والعقوبات.غرامة_التأخير_في_الدفع.الحد_الأقصى_بالأيام} يوم</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">2. غرامة التأخير في إرجاع المركبة:</p>
                  <p className="pr-6">{template.الغرامات_والعقوبات.غرامة_التأخير_في_إرجاع_المركبة.المبلغ_اليومي} ريال قطري/يوم</p>
                </div>
                <div>
                  <p className="font-semibold">3. الشرط الجزائي:</p>
                  <p className="pr-6">{template.الشرط_الجزائي.المبلغ} {template.الشرط_الجزائي.العملة}</p>
                  <p className="pr-6 text-sm">يطبق عند الإخلال بالالتزامات التعاقدية</p>
                </div>
              </div>
            </div>

            {/* القانون الحاكم */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 bg-gray-100 p-2">القانون الحاكم والاختصاص القضائي:</h3>
              <div className="pr-4 space-y-1">
                <p><strong>القانون الحاكم:</strong> {template.معلومات_العقد_الأساسية.القانون_الحاكم}</p>
                <p><strong>الاختصاص القضائي:</strong> {template.معلومات_العقد_الأساسية.الاختصاص_القضائي} ({template.معلومات_العقد_الأساسية.طبيعة_الاختصاص})</p>
              </div>
            </div>

            {/* التوقيعات */}
            <div className="mt-12 grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-t-2 border-black pt-2 mt-16">
                  <p className="font-bold">الطرف الأول (المؤجر)</p>
                  <p className="text-sm">{template.الطرف_الأول_المؤجر.الممثل_القانوني.الاسم}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-black pt-2 mt-16">
                  <p className="font-bold">الطرف الثاني (المستأجر)</p>
                  <p className="text-sm">{template.الطرف_الثاني_المستأجر.الاسم_الكامل}</p>
                </div>
              </div>
            </div>

            {/* ختم الصفحة */}
            <div className="mt-8 text-center text-xs text-gray-500">
              <p>تم إنشاء هذا العقد بواسطة نظام إدارة الأسطول - {template.الطرف_الأول_المؤجر.اسم_الشركة}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* رسالة تأكيد */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">عقد رسمي معتمد</p>
              <p className="text-sm text-green-700 mt-1">
                هذا العقد تم إنشاؤه تلقائياً بناءً على القالب الرسمي المعتمد لشركة العراف لتأجير السيارات.
                جميع البنود والشروط مطابقة للقالب القانوني المعتمد.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// CSS للطباعة
const printStyles = `
  @media print {
    .contract-print-view {
      padding: 20mm;
    }
    
    @page {
      size: A4;
      margin: 15mm;
    }
    
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

// إضافة styles للطباعة
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = printStyles;
  document.head.appendChild(styleElement);
}


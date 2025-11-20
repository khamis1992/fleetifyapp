import React from 'react';
import { DollarSign, Search, CreditCard, CheckCircle, History, Filter, Download } from 'lucide-react';

export function QuickPaymentPageHelpContent() {
  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          مساعدة صفحة الدفعات
        </h2>
        <p className="text-muted-foreground">
          صفحة الدفعات توفر واجهة متقدمة لتسجيل وإدارة جميع دفعات العملاء بسرعة وكفاءة.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Search className="h-5 w-5" />
          تسجيل الدفعات السريع
        </h3>
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <h4 className="font-medium">خطوات تسجيل دفعة جديدة:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>ابحث عن العميل باستخدام اسمه أو رقم هاتفه</li>
            <li>اختر العميل من قائمة النتائج</li>
            <li>اختر الفاتورة المراد دفعها من الفواتير المستحقة</li>
            <li>أدخل المبلغ واختر طريقة الدفع</li>
            <li>اضغط على "تأكيد الدفعة" لإتمام العملية</li>
          </ol>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>ملاحظة:</strong> يتم إرسال إيصال الدفع تلقائياً عبر واتساب للعميل عند إتمام الدفعة
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          طرق الدفع المدعومة
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="border rounded-lg p-3">
            <div className="font-medium mb-1">💵 نقدي</div>
            <p className="text-muted-foreground">الدفع نقداً عند الاستلام</p>
          </div>
          <div className="border rounded-lg p-3">
            <div className="font-medium mb-1">🏦 تحويل بنكي</div>
            <p className="text-muted-foreground">التحويل البنكي المباشر</p>
          </div>
          <div className="border rounded-lg p-3">
            <div className="font-medium mb-1">📄 شيك</div>
            <p className="text-muted-foreground">الدفع بشيكات بنكية</p>
          </div>
          <div className="border rounded-lg p-3">
            <div className="font-medium mb-1">💳 بطاقة ائتمان</div>
            <p className="text-muted-foreground">الدفع بالبطاقات الائتمانية</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" />
          سجل الدفعات
        </h3>
        <div className="space-y-3 text-sm">
          <h4 className="font-medium">ميزات سجل الدفعات:</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>عرض جميع الدفعات المسجلة مع التفاصيل الكاملة</li>
            <li>البحث والتصفية حسب العميل، التاريخ، أو الحالة</li>
            <li>تصدير البيانات إلى ملفات CSV</li>
            <li>عرض وتعديل وحذف سجلات الدفعات</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="h-5 w-5" />
          خيارات التصفية
        </h3>
        <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
          <h4 className="font-medium">يمكنك تصفية الدفعات حسب:</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>الحالة:</strong> مكتمل، قيد الانتظار، فشل، مسترد</li>
            <li><strong>طريقة الدفع:</strong> نقدي، تحويل بنكي، شيك، بطاقة ائتمان</li>
            <li><strong>الفترة الزمنية:</strong> اليوم، آخر 7 أيام، هذا الشهر، كل الوقت</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
 نصائح هامة
        </h3>
        <div className="space-y-2 text-sm">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800">
              <strong>نصيحة:</strong> يمكنك البحث عن العملاء بأي جزء من اسمهم أو رقم هاتفهم للعثور السريع
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800">
              <strong>تنبيه:</strong> تأكد من صحة المبلغ المدفوع قبل تأكيد الدفعة حيث لا يمكن التراجع عن العملية
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800">
              <strong>معلومة:</strong> يتم تحديث رصيد العميل تلقائياً بعد تسجيل الدفعة بنجاح
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">أسئلة شائعة</h3>
        <div className="space-y-3 text-sm">
          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-1">كيف يمكنني إيصال العميل بالدفعة؟</h4>
            <p className="text-muted-foreground">
              يتم إرسال إيصال الدفع تلقائياً عبر واتساب إلى رقم هاتف العميل المسجل في النظام
            </p>
          </div>
          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-1">هل يمكنني تعديل دفعة مسجلة؟</h4>
            <p className="text-muted-foreground">
              نعم، يمكنك تعديل تفاصيل الدفعة من خلال سجل الدفعات باستخدام زر التعديل
            </p>
          </div>
          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-1">ماذا يحدث إذا أخطأت في إدخال المبلغ؟</h4>
            <p className="text-muted-foreground">
              يمكنك حذف الدفعة الخاطئة وتسجيل دفعة جديدة بالمبلغ الصحيح
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
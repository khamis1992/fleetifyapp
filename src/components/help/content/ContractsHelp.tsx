import React from 'react';
import { HelpSection, HelpStep, HelpList, HelpNote } from '../HelpContent';

export const CreateContractHelp = () => (
  <>
    <HelpSection title="ما هو إنشاء عقد جديد؟" icon="info">
      <p>
        إنشاء عقد جديد يتيح لك توثيق اتفاقية تأجير مركبة مع عميل، مع تحديد المدة، القيمة، والشروط.
      </p>
    </HelpSection>

    <HelpSection title="خطوات إنشاء عقد جديد" icon="check">
      <div className="space-y-4">
        <HelpStep
          number={1}
          title="انقر على 'إنشاء عقد جديد'"
          description="اختر بين الوضع السريع (Express) أو المعالج الكامل (Wizard) حسب احتياجك."
        />
        <HelpStep
          number={2}
          title="اختر العميل"
          description="ابحث عن العميل واختره من القائمة. إذا لم يكن موجوداً، يمكنك إضافته مباشرة."
        />
        <HelpStep
          number={3}
          title="اختر المركبة"
          description="حدد المركبة المراد تأجيرها. ستظهر فقط المركبات المتاحة (غير المؤجرة)."
        />
        <HelpStep
          number={4}
          title="حدد تفاصيل العقد"
          description="أدخل تاريخ البداية، المدة، القيمة الشهرية، والتأمين إن وجد."
        />
        <HelpStep
          number={5}
          title="أضف الشروط والملاحظات"
          description="يمكنك إضافة شروط خاصة أو ملاحظات مهمة للعقد."
        />
        <HelpStep
          number={6}
          title="راجع واحفظ"
          description="راجع جميع التفاصيل ثم انقر على &quot;حفظ" لإنشاء العقد."
        />
      </div>
    </HelpSection>

    <HelpSection title="الحقول المطلوبة" icon="alert">
      <HelpList
        type="check"
        items={[
          'العميل (إلزامي)',
          'المركبة (إلزامي)',
          'تاريخ البداية (إلزامي)',
          'مدة العقد بالأشهر (إلزامي)',
          'القيمة الشهرية (إلزامي)',
          'نوع العقد (إلزامي)',
        ]}
      />
    </HelpSection>

    <HelpNote type="tip">
      <strong>نصيحة:</strong> استخدم الوضع السريع (Express) للعقود البسيطة، والمعالج الكامل (Wizard) للعقود المعقدة التي تحتاج تفاصيل إضافية.
    </HelpNote>

    <HelpNote type="warning">
      <strong>تنبيه:</strong> بمجرد تفعيل العقد، لا يمكن تعديل العميل أو المركبة. يمكن فقط تعديل التفاصيل المالية والشروط.
    </HelpNote>
  </>
);

export const RenewContractHelp = () => (
  <>
    <HelpSection title="تجديد العقد" icon="info">
      <p>
        تجديد العقد يتيح لك إنشاء عقد جديد بناءً على عقد منتهي أو قارب على الانتهاء، مع الاحتفاظ بنفس التفاصيل أو تعديلها.
      </p>
    </HelpSection>

    <HelpSection title="خطوات التجديد" icon="check">
      <div className="space-y-4">
        <HelpStep
          number={1}
          title="اختر العقد المراد تجديده"
          description="ابحث عن العقد المنتهي أو القارب على الانتهاء."
        />
        <HelpStep
          number={2}
          title="انقر على 'تجديد'"
          description="سيفتح نموذج تجديد مع بيانات العقد السابق."
        />
        <HelpStep
          number={3}
          title="عدّل التفاصيل إن لزم"
          description="يمكنك تعديل المدة، القيمة، أو أي تفاصيل أخرى."
        />
        <HelpStep
          number={4}
          title="احفظ العقد الجديد"
          description="سيتم إنشاء عقد جديد مرتبط بالعقد السابق."
        />
      </div>
    </HelpSection>

    <HelpNote type="info">
      <strong>ملاحظة:</strong> التجديد ينشئ عقداً جديداً منفصلاً. العقد القديم يبقى في السجلات للمرجعية.
    </HelpNote>

    <HelpNote type="tip">
      <strong>نصيحة:</strong> يمكنك تفعيل التجديد التلقائي للعقود التي تتجدد بشكل دوري.
    </HelpNote>
  </>
);

export const CancelContractHelp = () => (
  <>
    <HelpSection title="إلغاء العقد" icon="alert">
      <p>
        إلغاء العقد يوقف العقد قبل انتهاء مدته الطبيعية. قد يترتب عليه غرامات أو تسويات مالية.
      </p>
    </HelpSection>

    <HelpSection title="خطوات الإلغاء" icon="check">
      <div className="space-y-4">
        <HelpStep
          number={1}
          title="اختر العقد المراد إلغاؤه"
          description="تأكد من أن العقد نشط وقابل للإلغاء."
        />
        <HelpStep
          number={2}
          title="انقر على 'إلغاء العقد'"
          description="سيفتح نموذج الإلغاء."
        />
        <HelpStep
          number={3}
          title="حدد سبب الإلغاء"
          description="اختر السبب من القائمة أو أدخل سبباً مخصصاً."
        />
        <HelpStep
          number={4}
          title="احسب التسوية المالية"
          description="النظام سيحسب تلقائياً المبالغ المستحقة أو المستردة."
        />
        <HelpStep
          number={5}
          title="أكد الإلغاء"
          description="راجع التفاصيل وأكد الإلغاء."
        />
      </div>
    </HelpSection>

    <HelpSection title="أسباب الإلغاء الشائعة" icon="info">
      <HelpList
        items={[
          'طلب العميل',
          'عدم السداد',
          'تلف المركبة',
          'انتهاك شروط العقد',
          'ظروف قاهرة',
        ]}
      />
    </HelpSection>

    <HelpNote type="warning">
      <strong>تحذير:</strong> إلغاء العقد إجراء نهائي ولا يمكن التراجع عنه. تأكد من تسوية جميع المستحقات المالية.
    </HelpNote>

    <HelpNote type="info">
      <strong>ملاحظة:</strong> المركبة ستصبح متاحة للتأجير فوراً بعد إلغاء العقد.
    </HelpNote>
  </>
);

export const ContractStatusHelp = () => (
  <>
    <HelpSection title="حالات العقد" icon="info">
      <p>
        العقد يمر بعدة حالات خلال دورة حياته، كل حالة لها خصائص وإجراءات مختلفة.
      </p>
    </HelpSection>

    <HelpSection title="الحالات المتاحة" icon="check">
      <div className="space-y-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-bold text-blue-900 mb-1">مسودة (Draft)</h4>
          <p className="text-sm text-blue-800">
            عقد قيد الإنشاء ولم يتم تفعيله بعد. يمكن تعديله أو حذفه بحرية.
          </p>
        </div>
        
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-bold text-yellow-900 mb-1">قيد المراجعة (Under Review)</h4>
          <p className="text-sm text-yellow-800">
            عقد تم إرساله للمراجعة والموافقة من المدير.
          </p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-bold text-green-900 mb-1">نشط (Active)</h4>
          <p className="text-sm text-green-800">
            عقد مفعّل وساري المفعول. المركبة مؤجرة والفواتير تُنشأ تلقائياً.
          </p>
        </div>
        
        <div className="p-3 bg-orange-50 rounded-lg">
          <h4 className="font-bold text-orange-900 mb-1">قارب على الانتهاء (Expiring Soon)</h4>
          <p className="text-sm text-orange-800">
            عقد نشط لكنه سينتهي خلال 30 يوماً. يحتاج تجديد أو إنهاء.
          </p>
        </div>
        
        <div className="p-3 bg-red-50 rounded-lg">
          <h4 className="font-bold text-red-900 mb-1">ملغى (Cancelled)</h4>
          <p className="text-sm text-red-800">
            عقد تم إلغاؤه قبل انتهاء مدته. المركبة أصبحت متاحة.
          </p>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-bold text-gray-900 mb-1">منتهي (Expired)</h4>
          <p className="text-sm text-gray-800">
            عقد انتهت مدته بشكل طبيعي. المركبة أصبحت متاحة.
          </p>
        </div>
      </div>
    </HelpSection>

    <HelpNote type="tip">
      <strong>نصيحة:</strong> راقب العقود "القاربة على الانتهاء" بانتظام لتجديدها في الوقت المناسب.
    </HelpNote>
  </>
);

export const ContractInvoicesHelp = () => (
  <>
    <HelpSection title="فواتير العقد" icon="info">
      <p>
        النظام ينشئ فواتير تلقائية شهرية لكل عقد نشط بناءً على القيمة المحددة في العقد.
      </p>
    </HelpSection>

    <HelpSection title="كيف تعمل الفواتير التلقائية؟" icon="check">
      <HelpList
        type="check"
        items={[
          'تُنشأ فاتورة جديدة في بداية كل شهر',
          'القيمة تُحسب من القيمة الشهرية في العقد',
          'تُضاف الغرامات تلقائياً إذا تأخر السداد',
          'تُرسل إشعارات للعميل عند إنشاء الفاتورة',
          'يمكن عرض وطباعة الفواتير من صفحة العقد',
        ]}
      />
    </HelpSection>

    <HelpNote type="info">
      <strong>ملاحظة:</strong> يمكنك إنشاء فواتير يدوية إضافية لأي رسوم أخرى (صيانة، تأمين، إلخ).
    </HelpNote>
  </>
);

import React from 'react';
import { HelpSection, HelpStep, HelpList, HelpNote } from '../HelpContent';

export const ReportsPageHelpContent = () => (
  <>
    {/* نظرة عامة */}
    <HelpSection title="نظرة عامة على صفحة التقارير" icon="info">
      <p>
        تُعد صفحة <strong>التقارير (Reports)</strong> المركز الرئيسي لإنشاء وعرض وتصدير جميع التقارير المالية والتشغيلية في النظام.
        توفر هذه الصفحة رؤية شاملة لأداء الأعمال من خلال تقارير متنوعة ومفصلة.
      </p>
      <p>
        يمكنك من خلال هذه الصفحة:
      </p>
      <HelpList items={[
        'إنشاء تقارير مالية شاملة',
        'عرض تقارير الأسطول والمركبات',
        'إنشاء تقارير العقارات والإيجارات',
        'تصدير التقارير بصيغ متعددة (PDF, Excel, HTML)',
        'تطبيق فلاتر متقدمة على البيانات'
      ]} />
    </HelpSection>

    {/* أنواع التقارير */}
    <HelpSection title="أنواع التقارير المتاحة" icon="check">
      
      <h4 className="font-semibold text-lg mt-4 mb-2">1. التقارير المالية</h4>
      <HelpList items={[
        'تقرير الميزانية العمومية',
        'تقرير الأرباح والخسائر',
        'تقرير التدفقات النقدية',
        'تقرير المدفوعات والإيرادات',
        'تقرير الفواتير المستحقة'
      ]} />

      <h4 className="font-semibold text-lg mt-4 mb-2">2. تقارير الأسطول</h4>
      <HelpList items={[
        'تقرير حالة المركبات',
        'تقرير الصيانة الدورية',
        'تقرير المخالفات المرورية',
        'تقرير أداء السائقين',
        'تقرير تكاليف التشغيل'
      ]} />

      <h4 className="font-semibold text-lg mt-4 mb-2">3. تقارير العقارات</h4>
      <HelpList items={[
        'تقرير الوحدات المتاحة والمؤجرة',
        'تقرير الإيرادات الإيجارية',
        'تقرير انتهاء العقود',
        'تقرير صيانة الممتلكات',
        'تقرير أداء الملاك'
      ]} />

      <h4 className="font-semibold text-lg mt-4 mb-2">4. تقارير العملاء</h4>
      <HelpList items={[
        'تقرير العملاء النشطين',
        'تقرير أرصدة العملاء',
        'تقرير المدفوعات المتأخرة',
        'تقرير العقود النشطة',
        'تقرير تحليل العملاء'
      ]} />
    </HelpSection>

    {/* كيفية إنشاء تقرير */}
    <HelpSection title="كيفية إنشاء تقرير جديد" icon="check">
      <HelpStep number={1} title="اختر نوع التقرير">
        <p>
          انقر على التبويب المناسب (مالية، أسطول، عقارات، إلخ) لعرض التقارير المتاحة في هذا القسم.
        </p>
      </HelpStep>

      <HelpStep number={2} title="حدد التقرير المطلوب">
        <p>
          اضغط على بطاقة التقرير الذي تريد عرضه من قائمة التقارير المتاحة.
        </p>
      </HelpStep>

      <HelpStep number={3} title="تطبيق الفلاتر">
        <p>
          استخدم أدوات التصفية المتاحة لتخصيص البيانات:
        </p>
        <HelpList items={[
          'تحديد نطاق التاريخ (من - إلى)',
          'اختيار الشركة أو الفرع',
          'تحديد الحالة (نشط، منتهي، إلخ)',
          'تصفية حسب القسم أو النوع'
        ]} />
      </HelpStep>

      <HelpStep number={4} title="عرض وتحليل البيانات">
        <p>
          سيتم عرض التقرير في واجهة تفاعلية مع:
        </p>
        <HelpList items={[
          'جداول بيانات تفصيلية',
          'رسوم بيانية توضيحية',
          'مؤشرات أداء رئيسية (KPIs)',
          'ملخصات وإحصائيات'
        ]} />
      </HelpStep>

      <HelpStep number={5} title="تصدير التقرير">
        <p>
          اضغط على زر "تصدير" واختر الصيغة المطلوبة:
        </p>
        <HelpList items={[
          'PDF - للطباعة والمشاركة',
          'Excel - للتحليل والتعديل',
          'HTML - للعرض على الويب',
          'CSV - للاستيراد في أنظمة أخرى'
        ]} />
      </HelpStep>
    </HelpSection>

    {/* الفلاتر المتقدمة */}
    <HelpSection title="استخدام الفلاتر المتقدمة" icon="tip">
      <p>
        توفر صفحة التقارير نظام فلترة متقدم يساعدك على الحصول على البيانات المطلوبة بدقة:
      </p>

      <h4 className="font-semibold mt-3 mb-2">فلتر التاريخ</h4>
      <HelpList items={[
        'اليوم الحالي',
        'آخر 7 أيام',
        'آخر 30 يوماً',
        'الشهر الحالي',
        'الشهر السابق',
        'نطاق مخصص (من - إلى)'
      ]} />

      <h4 className="font-semibold mt-3 mb-2">فلتر الحالة</h4>
      <HelpList items={[
        'نشط / غير نشط',
        'مكتمل / قيد التنفيذ',
        'مدفوع / غير مدفوع',
        'منتهي / ساري'
      ]} />

      <h4 className="font-semibold mt-3 mb-2">فلتر المبلغ</h4>
      <HelpList items={[
        'من مبلغ - إلى مبلغ',
        'أقل من مبلغ معين',
        'أكبر من مبلغ معين'
      ]} />

      <HelpNote type="tip">
        <strong>نصيحة:</strong> يمكنك حفظ الفلاتر المفضلة لديك لاستخدامها لاحقاً بسرعة.
      </HelpNote>
    </HelpSection>

    {/* التصدير والطباعة */}
    <HelpSection title="تصدير وطباعة التقارير" icon="check">
      
      <h4 className="font-semibold text-lg mb-2">خيارات التصدير</h4>
      
      <div className="space-y-3">
        <div>
          <h5 className="font-semibold">PDF</h5>
          <p className="text-sm text-muted-foreground">
            مناسب للطباعة والمشاركة عبر البريد الإلكتروني. يحافظ على التنسيق والشعارات.
          </p>
        </div>

        <div>
          <h5 className="font-semibold">Excel (XLSX)</h5>
          <p className="text-sm text-muted-foreground">
            مناسب للتحليل والتعديل. يمكنك إجراء حسابات إضافية ورسوم بيانية مخصصة.
          </p>
        </div>

        <div>
          <h5 className="font-semibold">HTML</h5>
          <p className="text-sm text-muted-foreground">
            مناسب للعرض على المواقع أو إرساله عبر البريد الإلكتروني بتنسيق HTML.
          </p>
        </div>

        <div>
          <h5 className="font-semibold">CSV</h5>
          <p className="text-sm text-muted-foreground">
            مناسب للاستيراد في برامج أخرى أو قواعد البيانات.
          </p>
        </div>
      </div>

      <HelpNote type="tip">
        <strong>للحصول على أفضل نتائج الطباعة:</strong>
        <br />
        - استخدم وضع "Landscape" للتقارير العريضة
        <br />
        - تأكد من تحديد حجم الورق المناسب (A4 أو Letter)
        <br />
        - قم بمعاينة الطباعة قبل الطباعة النهائية
      </HelpNote>
    </HelpSection>

    {/* الرسوم البيانية */}
    <HelpSection title="فهم الرسوم البيانية" icon="info">
      <p>
        توفر التقارير رسوماً بيانية تفاعلية لتسهيل فهم البيانات:
      </p>

      <HelpList items={[
        'رسم بياني خطي: لعرض الاتجاهات عبر الزمن',
        'رسم بياني دائري: لعرض النسب والتوزيعات',
        'رسم بياني عمودي: لمقارنة القيم',
        'رسم بياني مساحي: لعرض الحجم التراكمي'
      ]} />

      <HelpNote type="info">
        يمكنك النقر على أي عنصر في الرسم البياني لإخفائه أو إظهاره، أو التكبير على منطقة معينة.
      </HelpNote>
    </HelpSection>

    {/* الجدولة التلقائية */}
    <HelpSection title="جدولة التقارير التلقائية" icon="tip">
      <p>
        يمكنك جدولة إرسال التقارير تلقائياً عبر البريد الإلكتروني:
      </p>

      <HelpStep number={1} title="اختر التقرير">
        <p>حدد التقرير الذي تريد جدولته</p>
      </HelpStep>

      <HelpStep number={2} title="حدد التكرار">
        <HelpList items={[
          'يومياً',
          'أسبوعياً',
          'شهرياً',
          'ربع سنوي',
          'سنوي'
        ]} />
      </HelpStep>

      <HelpStep number={3} title="أضف المستلمين">
        <p>أدخل عناوين البريد الإلكتروني للأشخاص الذين سيتلقون التقرير</p>
      </HelpStep>

      <HelpStep number={4} title="احفظ الجدولة">
        <p>سيتم إرسال التقرير تلقائياً في المواعيد المحددة</p>
      </HelpStep>

      <HelpNote type="alert">
        <strong>تنبيه:</strong> تأكد من صحة عناوين البريد الإلكتروني قبل حفظ الجدولة.
      </HelpNote>
    </HelpSection>

    {/* حلول المشاكل الشائعة */}
    <HelpSection title="حل المشاكل الشائعة" icon="alert">
      
      <div className="space-y-3">
        <div>
          <h5 className="font-semibold">التقرير لا يعرض بيانات</h5>
          <HelpList items={[
            'تأكد من اختيار نطاق التاريخ الصحيح',
            'تحقق من أن الفلاتر المطبقة ليست متعارضة',
            'تأكد من وجود بيانات في الفترة المحددة'
          ]} />
        </div>

        <div>
          <h5 className="font-semibold">فشل التصدير</h5>
          <HelpList items={[
            'تأكد من اتصالك بالإنترنت',
            'حاول تصغير نطاق التاريخ (قد تكون البيانات كثيرة)',
            'امسح ذاكرة التخزين المؤقت للمتصفح',
            'جرب صيغة تصدير أخرى'
          ]} />
        </div>

        <div>
          <h5 className="font-semibold">الرسوم البيانية لا تظهر</h5>
          <HelpList items={[
            'قم بتحديث الصفحة',
            'تأكد من تفعيل JavaScript في متصفحك',
            'جرب متصفحاً آخر',
            'امسح الكاش والكوكيز'
          ]} />
        </div>
      </div>

      <HelpNote type="alert">
        إذا استمرت المشكلة، اتصل بالدعم الفني مع توضيح نوع التقرير والخطأ الذي تواجهه.
      </HelpNote>
    </HelpSection>

    {/* نصائح وأفضل الممارسات */}
    <HelpSection title="نصائح وأفضل الممارسات" icon="tip">
      <HelpList items={[
        'قم بإنشاء التقارير بانتظام لمراقبة أداء الأعمال',
        'احفظ الفلاتر المستخدمة بكثرة كقوالب سريعة',
        'استخدم جدولة التقارير للتقارير الدورية',
        'قارن التقارير بين فترات مختلفة لرصد الاتجاهات',
        'صدّر التقارير المهمة واحفظها كنسخة احتياطية',
        'شارك التقارير مع الفريق المعني فقط',
        'استخدم الرسوم البيانية لتبسيط البيانات المعقدة',
        'راجع التقارير المالية شهرياً على الأقل'
      ]} />
    </HelpSection>

    {/* الاختصارات */}
    <HelpSection title="اختصارات لوحة المفاتيح" icon="info">
      <div className="space-y-2 font-mono text-sm">
        <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl + P</kbd> - طباعة التقرير</p>
        <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl + E</kbd> - تصدير التقرير</p>
        <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl + F</kbd> - فتح نافذة البحث</p>
        <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl + R</kbd> - تحديث البيانات</p>
      </div>
    </HelpSection>
  </>
);


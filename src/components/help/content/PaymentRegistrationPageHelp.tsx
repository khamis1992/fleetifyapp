import React from 'react';
import { HelpSection, HelpStep, HelpList, HelpNote } from '../HelpContent';

export const PaymentRegistrationPageHelpContent = () => (
  <>
    {/* نظرة عامة */}
    <HelpSection title="نظرة عامة على صفحة تسجيل الدفعات" icon="info">
      <p>
        صفحة <strong>تسجيل الدفعات (Payment Registration)</strong> هي واجهة سريعة وفعالة لتسجيل المدفوعات الواردة من العملاء للعقود النشطة.
        تم تصميمها لتسهيل عملية التسجيل اليومي للدفعات بأقل عدد من الخطوات.
      </p>
      <p>
        المزايا الرئيسية:
      </p>
      <HelpList items={[
        'واجهة بسيطة ومباشرة',
        'بحث سريع عن العملاء والعقود',
        'تسجيل دفعات متعددة بضغطة واحدة',
        'معاينة فورية للأرصدة والمستحقات',
        'تحليل ذكي بالذكاء الاصطناعي للدفعات',
        'تصدير البيانات إلى Excel'
      ]} />
    </HelpSection>

    {/* واجهة الصفحة */}
    <HelpSection title="فهم واجهة الصفحة" icon="info">
      <p>
        تتكون الصفحة من عدة أقسام رئيسية:
      </p>

      <h4 className="font-semibold mt-3 mb-2">1. الإحصائيات العامة (في الأعلى)</h4>
      <HelpList items={[
        'إجمالي العقود النشطة',
        'إجمالي المستحقات الشهرية',
        'عدد الدفعات المسجلة اليوم',
        'المبلغ الإجمالي المحصل اليوم'
      ]} />

      <h4 className="font-semibold mt-3 mb-2">2. شريط البحث</h4>
      <p>
        للبحث السريع عن العملاء حسب:
      </p>
      <HelpList items={[
        'اسم العميل',
        'رقم الهاتف',
        'رقم لوحة المركبة',
        'رقم العقد'
      ]} />

      <h4 className="font-semibold mt-3 mb-2">3. قائمة العقود</h4>
      <p>
        جدول يعرض جميع العقود النشطة مع:
      </p>
      <HelpList items={[
        'معلومات العميل الأساسية',
        'رقم لوحة المركبة ولونها',
        'القسط الشهري',
        'حالة الدفع (مدفوع/معلق)',
        'زر تسجيل الدفعة'
      ]} />

      <h4 className="font-semibold mt-3 mb-2">4. أزرار الإجراءات</h4>
      <HelpList items={[
        'حفظ الدفعات - لحفظ جميع الدفعات المحددة',
        'تصدير Excel - لتصدير القائمة الكاملة',
        'FleetifyAI - للتحليل الذكي للدفعات'
      ]} />
    </HelpSection>

    {/* تسجيل دفعة */}
    <HelpSection title="كيفية تسجيل دفعة جديدة" icon="check">
      
      <HelpStep number={1} title="ابحث عن العقد">
        <p>
          استخدم شريط البحث للعثور على العميل أو العقد المطلوب:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1 mt-2">
          <li>اكتب اسم العميل، رقم الهاتف، أو رقم اللوحة</li>
          <li>سيتم تصفية القائمة تلقائياً</li>
          <li>يمكنك البحث بجزء من الاسم أو الرقم</li>
        </ul>
      </HelpStep>

      <HelpStep number={2} title="حدد العقد">
        <p>
          من القائمة المصفاة، اعثر على العقد المطلوب.
          تحقق من:
        </p>
        <HelpList items={[
          'اسم العميل صحيح',
          'رقم اللوحة صحيح',
          'المبلغ الشهري مطابق'
        ]} />
      </HelpStep>

      <HelpStep number={3} title="اضغط على زر 'تسجيل دفعة'">
        <p>
          اضغط على الزر الأخضر "تسجيل دفعة" في صف العقد المطلوب.
        </p>
      </HelpStep>

      <HelpStep number={4} title="أدخل تفاصيل الدفعة">
        <p>
          في النافذة المنبثقة، أدخل:
        </p>
        <HelpList items={[
          'المبلغ المدفوع (سيظهر القسط الشهري افتراضياً)',
          'تاريخ الدفع',
          'طريقة الدفع (نقدي، تحويل، شيك، إلخ)',
          'رقم المرجع (إن وجد)',
          'ملاحظات إضافية (اختياري)'
        ]} />
      </HelpStep>

      <HelpStep number={5} title="احفظ الدفعة">
        <p>
          اضغط على "حفظ" لتسجيل الدفعة.
          سيتم:
        </p>
        <HelpList items={[
          'حفظ الدفعة في قاعدة البيانات',
          'تحديث حالة العقد إلى "مدفوع"',
          'إنشاء إيصال دفع تلقائياً',
          'تحديث رصيد العميل',
          'تحديث الإحصائيات في أعلى الصفحة'
        ]} />
      </HelpStep>

      <HelpNote type="tip">
        <strong>نصيحة:</strong> يمكنك تسجيل عدة دفعات ثم حفظها جميعاً دفعة واحدة بالضغط على "حفظ جميع الدفعات".
      </HelpNote>
    </HelpSection>

    {/* تسجيل دفعات متعددة */}
    <HelpSection title="تسجيل دفعات متعددة" icon="check">
      <p>
        لتسريع عملية التسجيل عند استلام عدة دفعات في نفس الوقت:
      </p>

      <HelpStep number={1} title="حدد جميع العقود">
        <p>
          استخدم خانة الاختيار بجانب كل عقد لتحديد العقود التي تم استلام دفعاتها.
        </p>
      </HelpStep>

      <HelpStep number={2} title="راجع القائمة">
        <p>
          تأكد من تحديد العقود الصحيحة فقط.
        </p>
      </HelpStep>

      <HelpStep number={3} title="احفظ جميع الدفعات">
        <p>
          اضغط على زر "حفظ جميع الدفعات" في أسفل الصفحة.
          سيتم تسجيل جميع الدفعات دفعة واحدة.
        </p>
      </HelpStep>

      <HelpNote type="alert">
        <strong>تنبيه:</strong> تأكد من صحة جميع العقود المحددة قبل الحفظ، حيث لا يمكن التراجع عن العملية بسهولة.
      </HelpNote>
    </HelpSection>

    {/* البحث والتصفية */}
    <HelpSection title="استخدام البحث والتصفية" icon="tip">
      
      <h4 className="font-semibold mt-3 mb-2">البحث السريع</h4>
      <p>
        شريط البحث يدعم البحث في عدة حقول في نفس الوقت:
      </p>
      <HelpList items={[
        'اسم العميل بالعربي أو الإنجليزي',
        'رقم الهاتف (بدون أو مع رمز الدولة)',
        'رقم لوحة المركبة (جزئي أو كامل)',
        'رقم العقد'
      ]} />

      <h4 className="font-semibold mt-3 mb-2">أمثلة على البحث</h4>
      <div className="space-y-2 text-sm">
        <p>• <code>محمد</code> - سيعرض جميع العملاء الذين اسمهم يحتوي على "محمد"</p>
        <p>• <code>555</code> - سيعرض جميع العقود التي رقم الهاتف أو اللوحة يحتوي على "555"</p>
        <p>• <code>ABC</code> - سيعرض العقود التي لوحة المركبة تحتوي على "ABC"</p>
      </div>

      <HelpNote type="tip">
        البحث يتم تلقائياً أثناء الكتابة، لا حاجة للضغط على Enter.
      </HelpNote>
    </HelpSection>

    {/* FleetifyAI */}
    <HelpSection title="استخدام FleetifyAI للتحليل الذكي" icon="tip">
      <p>
        <strong>FleetifyAI</strong> هو محرك ذكاء اصطناعي متقدم يحلل أنماط الدفع ويقدم توصيات.
      </p>

      <HelpStep number={1} title="تفعيل التحليل">
        <p>
          اضغط على زر "FleetifyAI" الموجود في أعلى الصفحة (أيقونة Sparkles).
        </p>
      </HelpStep>

      <HelpStep number={2} title="عرض التحليلات">
        <p>
          سيعرض لك النظام:
        </p>
        <HelpList items={[
          'العملاء المتوقع تأخرهم في الدفع',
          'أنماط الدفع الشهرية',
          'توصيات للمتابعة',
          'احتمالية السداد لكل عميل',
          'أفضل وقت للتذكير'
        ]} />
      </HelpStep>

      <HelpStep number={3} title="تنفيذ التوصيات">
        <p>
          استخدم التوصيات لـ:
        </p>
        <HelpList items={[
          'إرسال تذكيرات مبكرة',
          'ترتيب أولويات التحصيل',
          'تحسين سياسات الدفع'
        ]} />
      </HelpStep>

      <HelpNote type="info">
        كلما زاد عدد الدفعات المسجلة، زادت دقة توقعات FleetifyAI.
      </HelpNote>
    </HelpSection>

    {/* طرق الدفع */}
    <HelpSection title="طرق الدفع المتاحة" icon="check">
      <p>
        يدعم النظام جميع طرق الدفع الشائعة:
      </p>

      <div className="space-y-3">
        <div>
          <h5 className="font-semibold">نقدي (Cash)</h5>
          <p className="text-sm text-muted-foreground">
            الدفع المباشر نقداً. لا حاجة لرقم مرجع.
          </p>
        </div>

        <div>
          <h5 className="font-semibold">تحويل بنكي (Bank Transfer)</h5>
          <p className="text-sm text-muted-foreground">
            تحويل من بنك العميل إلى حسابك. يُفضل إدخال رقم التحويل كمرجع.
          </p>
        </div>

        <div>
          <h5 className="font-semibold">شيك (Cheque)</h5>
          <p className="text-sm text-muted-foreground">
            دفع بشيك. أدخل رقم الشيك واسم البنك في الملاحظات.
          </p>
        </div>

        <div>
          <h5 className="font-semibold">بطاقة ائتمان (Credit Card)</h5>
          <p className="text-sm text-muted-foreground">
            دفع ببطاقة ائتمان. أدخل آخر 4 أرقام من البطاقة كمرجع.
          </p>
        </div>

        <div>
          <h5 className="font-semibold">محفظة إلكترونية (E-Wallet)</h5>
          <p className="text-sm text-muted-foreground">
            دفع عبر محافظ مثل Apple Pay، Google Pay، أو محافظ محلية.
          </p>
        </div>
      </div>

      <HelpNote type="tip">
        تحديد طريقة الدفع بدقة يساعد في التسويات المحاسبية والتقارير المالية.
      </HelpNote>
    </HelpSection>

    {/* التصدير */}
    <HelpSection title="تصدير البيانات إلى Excel" icon="check">
      <p>
        يمكنك تصدير قائمة العقود والدفعات إلى ملف Excel للمراجعة أو التحليل الخارجي.
      </p>

      <HelpStep number={1} title="اضغط على 'تصدير Excel'">
        <p>
          اضغط على زر "تصدير Excel" في أعلى الصفحة.
        </p>
      </HelpStep>

      <HelpStep number={2} title="سيتم تنزيل الملف">
        <p>
          سيتم إنشاء ملف Excel يحتوي على:
        </p>
        <HelpList items={[
          'قائمة جميع العقود النشطة',
          'معلومات العملاء',
          'المستحقات الشهرية',
          'حالة الدفع',
          'تواريخ آخر دفعة'
        ]} />
      </HelpStep>

      <HelpStep number={3} title="استخدم الملف">
        <p>
          يمكنك استخدام الملف لـ:
        </p>
        <HelpList items={[
          'المراجعة الشهرية',
          'إعداد تقارير للإدارة',
          'التحليل الإحصائي',
          'المقارنة بين الفترات'
        ]} />
      </HelpStep>
    </HelpSection>

    {/* الحالات والشارات */}
    <HelpSection title="فهم الحالات والشارات" icon="info">
      <p>
        تستخدم الصفحة نظام ألوان وشارات لتوضيح حالة كل عقد:
      </p>

      <div className="space-y-2 mt-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">مدفوع</span>
          <span className="text-sm">- تم دفع القسط لهذا الشهر</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">معلق</span>
          <span className="text-sm">- لم يتم الدفع بعد</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">متأخر</span>
          <span className="text-sm">- فات موعد الاستحقاق</span>
        </div>
      </div>

      <HelpNote type="info">
        الحالات تتحدث تلقائياً عند تسجيل أو إلغاء دفعة.
      </HelpNote>
    </HelpSection>

    {/* نصائح وأفضل الممارسات */}
    <HelpSection title="نصائح وأفضل الممارسات" icon="tip">
      <HelpList items={[
        'سجّل الدفعات فوراً عند استلامها لتجنب النسيان',
        'تحقق دائماً من اسم العميل ورقم اللوحة قبل التسجيل',
        'أدخل رقم المرجع لجميع الدفعات الإلكترونية',
        'استخدم حقل الملاحظات لتوثيق أي تفاصيل مهمة',
        'راجع الإحصائيات اليومية في نهاية كل يوم للتأكد من الدقة',
        'صدّر البيانات إلى Excel شهرياً كنسخة احتياطية',
        'استخدم FleetifyAI لتحديد العملاء الذين يحتاجون متابعة',
        'عند الشك في دفعة، لا تسجلها حتى تتأكد',
        'احتفظ بالإيصالات الورقية حتى بعد التسجيل الإلكتروني',
        'راجع قائمة الدفعات المعلقة يومياً'
      ]} />
    </HelpSection>

    {/* حلول المشاكل */}
    <HelpSection title="حل المشاكل الشائعة" icon="alert">
      
      <div className="space-y-3">
        <div>
          <h5 className="font-semibold">لا أجد عقد العميل في القائمة</h5>
          <HelpList items={[
            'تأكد من أن العقد في حالة "نشط"',
            'استخدم البحث بطرق مختلفة (الاسم، الهاتف، اللوحة)',
            'تحقق من الإملاء الصحيح',
            'تأكد من اختيار الشركة الصحيحة (إن كان متعدد الشركات)'
          ]} />
        </div>

        <div>
          <h5 className="font-semibold">زر "حفظ" لا يعمل</h5>
          <HelpList items={[
            'تأكد من ملء جميع الحقول المطلوبة',
            'تحقق من اتصالك بالإنترنت',
            'حاول إعادة تحميل الصفحة',
            'امسح الكاش والكوكيز'
          ]} />
        </div>

        <div>
          <h5 className="font-semibold">سجّلت دفعة خاطئة بالخطأ</h5>
          <HelpList items={[
            'اذهب إلى صفحة "المدفوعات" أو "المالية"',
            'ابحث عن الدفعة المسجلة',
            'اضغط على "حذف" أو "إلغاء"',
            'أو اتصل بالدعم الفني للمساعدة'
          ]} />
        </div>

        <div>
          <h5 className="font-semibold">الإحصائيات غير دقيقة</h5>
          <HelpList items={[
            'قم بتحديث الصفحة (F5)',
            'انتظر قليلاً، قد يكون النظام يحدّث البيانات',
            'تأكد من عدم وجود دفعات معلقة لم تُحفظ',
            'راجع صفحة التقارير للتأكد من الأرقام'
          ]} />
        </div>
      </div>

      <HelpNote type="alert">
        إذا واجهت مشكلة لا يمكنك حلها، اتصل بالدعم الفني فوراً مع توضيح خطوات المشكلة.
      </HelpNote>
    </HelpSection>

    {/* الاختصارات */}
    <HelpSection title="اختصارات لوحة المفاتيح" icon="info">
      <div className="space-y-2 font-mono text-sm">
        <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl + F</kbd> - التركيز على شريط البحث</p>
        <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl + S</kbd> - حفظ الدفعات (إن كانت محددة)</p>
        <p><kbd className="px-2 py-1 bg-muted rounded">Ctrl + E</kbd> - تصدير إلى Excel</p>
        <p><kbd className="px-2 py-1 bg-muted rounded">Esc</kbd> - إغلاق النافذة المنبثقة</p>
      </div>
    </HelpSection>
  </>
);


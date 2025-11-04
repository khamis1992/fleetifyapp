# دليل نظام المساعدة التفاعلي

## نظرة عامة

تم إنشاء نظام مساعدة تفاعلي شامل لجميع صفحات التطبيق. النظام يوفر:

- **زر مساعدة ثابت** في الزاوية السفلية اليسرى من كل صفحة
- **لوحة جانبية** تفتح عند الضغط على زر المساعدة
- **محتوى مفصل** لكل صفحة وخدمة
- **شروحات خطوة بخطوة** لجميع العمليات
- **نصائح وتحذيرات** مهمة

---

## المكونات الأساسية

### 1. PageHelp
مكون رئيسي يعرض زر المساعدة الثابت ولوحة المساعدة الجانبية.

**الموقع:** `src/components/help/PageHelp.tsx`

**الاستخدام:**
```tsx
import { PageHelp } from '@/components/help';
import { YourPageHelpContent } from '@/components/help/content/YourPageHelp';

// في نهاية مكون الصفحة، قبل إغلاق return
<PageHelp
  title="دليل استخدام صفحة [اسم الصفحة]"
  description="وصف مختصر للصفحة"
>
  <YourPageHelpContent />
</PageHelp>
```

### 2. HelpButton
زر مساعدة يمكن إضافته بجانب أي عنصر في الصفحة.

**الموقع:** `src/components/help/HelpButton.tsx`

**الاستخدام:**
```tsx
import { HelpButton } from '@/components/help';
import { AddCustomerHelp } from '@/components/help/content/CustomersHelp';

// بجانب زر أو عنوان
<HelpButton
  title="كيفية إضافة عميل جديد"
  content={<AddCustomerHelp />}
  size="md"
  variant="icon"
/>
```

### 3. مكونات المحتوى

**الموقع:** `src/components/help/HelpContent.tsx`

#### HelpSection
قسم رئيسي في محتوى المساعدة:
```tsx
<HelpSection title="العنوان" icon="info">
  <p>المحتوى هنا...</p>
</HelpSection>
```

الأيقونات المتاحة: `'check' | 'alert' | 'info' | 'tip'`

#### HelpStep
خطوة في شرح عملية:
```tsx
<HelpStep
  number={1}
  title="عنوان الخطوة"
  description="شرح الخطوة"
/>
```

#### HelpList
قائمة نقطية أو قائمة تحقق:
```tsx
<HelpList
  type="check"  // أو "bullet"
  items={[
    'العنصر الأول',
    'العنصر الثاني',
  ]}
/>
```

#### HelpNote
ملاحظة مهمة أو تحذير:
```tsx
<HelpNote type="tip">  // أو "info" أو "warning"
  <strong>نصيحة:</strong> النص هنا...
</HelpNote>
```

---

## كيفية إضافة المساعدة لصفحة جديدة

### الخطوة 1: إنشاء ملف محتوى المساعدة

أنشئ ملف جديد في `src/components/help/content/` باسم `[PageName]PageHelp.tsx`:

```tsx
import React from 'react';
import { 
  HelpSection, 
  HelpStep, 
  HelpList, 
  HelpNote 
} from '../HelpContent';

export const YourPageHelpContent = () => (
  <>
    {/* نظرة عامة */}
    <HelpSection title="نظرة عامة على الصفحة" icon="info">
      <p>
        وصف مختصر عن الصفحة ووظائفها الرئيسية.
      </p>
    </HelpSection>

    {/* الوظائف الرئيسية */}
    <HelpSection title="الوظائف الرئيسية" icon="check">
      <HelpList
        type="check"
        items={[
          'الوظيفة الأولى',
          'الوظيفة الثانية',
          'الوظيفة الثالثة',
        ]}
      />
    </HelpSection>

    {/* شرح عملية معينة */}
    <div className="border-t pt-6">
      <h2 className="text-xl font-bold mb-4 text-blue-600">كيفية [اسم العملية]</h2>
      <HelpSection title="الخطوات" icon="check">
        <div className="space-y-4">
          <HelpStep
            number={1}
            title="الخطوة الأولى"
            description="شرح الخطوة الأولى بالتفصيل."
          />
          <HelpStep
            number={2}
            title="الخطوة الثانية"
            description="شرح الخطوة الثانية بالتفصيل."
          />
        </div>
      </HelpSection>
    </div>

    {/* نصائح */}
    <div className="border-t pt-6">
      <HelpNote type="tip">
        <strong>نصيحة:</strong> نصائح مفيدة للمستخدم.
      </HelpNote>
    </div>

    {/* تحذيرات */}
    <div className="border-t pt-6">
      <HelpNote type="warning">
        <strong>تحذير:</strong> أمور مهمة يجب الانتباه لها.
      </HelpNote>
    </div>
  </>
);
```

### الخطوة 2: تصدير المحتوى

أضف التصدير في `src/components/help/content/index.tsx`:

```tsx
export * from './YourPageHelp';
```

### الخطوة 3: دمج المساعدة في الصفحة

في ملف الصفحة (مثل `src/pages/YourPage.tsx`):

1. **أضف الـ imports:**
```tsx
import { PageHelp } from '@/components/help';
import { YourPageHelpContent } from '@/components/help/content/YourPageHelp';
```

2. **أضف المكون قبل نهاية return:**
```tsx
return (
  <div>
    {/* محتوى الصفحة */}
    
    {/* Help System */}
    <PageHelp
      title="دليل استخدام صفحة [اسم الصفحة]"
      description="وصف مختصر"
    >
      <YourPageHelpContent />
    </PageHelp>
  </div>
);
```

---

## الصفحات المكتملة

✅ **صفحة العملاء** (`src/pages/Customers.tsx`)
- محتوى المساعدة: `src/components/help/content/CustomersPageHelp.tsx`
- يشمل: إضافة عميل، تعديل، حذف، بحث، أنواع العملاء

✅ **صفحة العقود** (`src/pages/Contracts.tsx`)
- محتوى المساعدة: `src/components/help/content/ContractsPageHelp.tsx`
- يشمل: إنشاء عقد، تجديد، إلغاء، حالات العقد، الفواتير

---

## الصفحات المطلوب إضافة المساعدة لها

### صفحات ذات أولوية عالية:

1. **صفحة المركبات** (`src/pages/Vehicles.tsx`)
   - إضافة مركبة جديدة
   - تعديل بيانات المركبة
   - إدارة الصيانة
   - حالات المركبة

2. **صفحة النظام المالي** (`src/pages/FinancialTracking.tsx`)
   - فهم النظام المحاسبي
   - إضافة معاملة مالية
   - التقارير المالية
   - الفواتير والمدفوعات

3. **صفحة الصيانة** (`src/pages/Maintenance.tsx`)
   - جدولة صيانة
   - تسجيل صيانة منجزة
   - تتبع تكاليف الصيانة
   - تذكيرات الصيانة الدورية

4. **صفحة تصاريح الخروج** (`src/pages/VehicleExitPermits.tsx`)
   - إنشاء تصريح خروج
   - الموافقة على التصاريح
   - تتبع التصاريح

5. **صفحة لوحة التحكم** (`src/pages/Dashboard.tsx`)
   - فهم الإحصائيات
   - قراءة الرسوم البيانية
   - التنبيهات والإشعارات

### صفحات ذات أولوية متوسطة:

6. **صفحة الإعدادات** (`src/pages/Settings.tsx`)
7. **صفحة التقارير** (`src/pages/Reports.tsx`)
8. **صفحة المستخدمين** (`src/pages/Users.tsx`)
9. **صفحة الشركات** (`src/pages/Companies.tsx`)

---

## نصائح لكتابة محتوى مساعدة جيد

### 1. استخدم لغة واضحة وبسيطة
- تجنب المصطلحات التقنية المعقدة
- اشرح كل خطوة بوضوح
- استخدم أمثلة عملية

### 2. نظّم المحتوى بشكل منطقي
- ابدأ بنظرة عامة
- ثم الوظائف الرئيسية
- ثم الشروحات التفصيلية
- اختم بالنصائح والتحذيرات

### 3. استخدم العناصر البصرية
- `HelpSection` مع أيقونات مناسبة
- `HelpStep` للعمليات المتسلسلة
- `HelpList` للقوائم
- `HelpNote` للتأكيد على النقاط المهمة

### 4. أضف نصائح عملية
- نصائح للاستخدام الأمثل
- أخطاء شائعة وكيفية تجنبها
- اختصارات لوحة المفاتيح إن وجدت

### 5. لا تنسَ التحذيرات
- عمليات لا يمكن التراجع عنها
- شروط مسبقة للعمليات
- تأثيرات جانبية محتملة

---

## أمثلة على محتوى مساعدة جيد

### مثال 1: شرح عملية بسيطة

```tsx
<HelpSection title="كيفية إضافة مركبة جديدة" icon="check">
  <div className="space-y-4">
    <HelpStep
      number={1}
      title="انقر على زر 'إضافة مركبة'"
      description="ستجد الزر في أعلى يمين الصفحة."
    />
    <HelpStep
      number={2}
      title="أدخل بيانات المركبة"
      description="املأ الحقول المطلوبة: رقم اللوحة، النوع، الموديل، السنة."
    />
    <HelpStep
      number={3}
      title="احفظ البيانات"
      description="انقر على 'حفظ' لإضافة المركبة إلى النظام."
    />
  </div>
</HelpSection>
```

### مثال 2: شرح مفهوم معقد

```tsx
<HelpSection title="فهم النظام المحاسبي" icon="info">
  <p className="mb-4">
    النظام المحاسبي في التطبيق يعتمد على مبدأ القيد المزدوج، حيث كل معاملة مالية 
    تؤثر على حسابين على الأقل: حساب مدين وحساب دائن.
  </p>
  
  <div className="space-y-3">
    <div className="p-3 bg-blue-50 rounded-lg">
      <h4 className="font-bold text-blue-900 mb-1">الحساب المدين (Debit)</h4>
      <p className="text-sm text-blue-800">
        الحساب الذي يزيد رصيده عند استلام أموال أو أصول.
      </p>
    </div>
    
    <div className="p-3 bg-green-50 rounded-lg">
      <h4 className="font-bold text-green-900 mb-1">الحساب الدائن (Credit)</h4>
      <p className="text-sm text-green-800">
        الحساب الذي يزيد رصيده عند دفع أموال أو التزامات.
      </p>
    </div>
  </div>
  
  <HelpNote type="tip">
    <strong>مثال:</strong> عند استلام دفعة من عميل، يزيد رصيد حساب "الصندوق" (مدين) 
    ويقل رصيد حساب "الذمم المدينة" (دائن).
  </HelpNote>
</HelpSection>
```

### مثال 3: قائمة بالحقول المطلوبة

```tsx
<HelpSection title="الحقول المطلوبة" icon="alert">
  <HelpList
    type="check"
    items={[
      'رقم اللوحة (إلزامي)',
      'نوع المركبة (إلزامي)',
      'الموديل (إلزامي)',
      'سنة الصنع (إلزامي)',
      'اللون (اختياري)',
      'رقم الشاصي (اختياري ولكن مُوصى به)',
    ]}
  />
</HelpSection>
```

---

## التكامل مع الأزرار والعمليات

يمكنك أيضاً إضافة أزرار مساعدة صغيرة بجانب العمليات المهمة:

```tsx
import { HelpButton } from '@/components/help';
import { AddVehicleHelp } from '@/components/help/content/VehiclesHelp';

// في الكود
<div className="flex items-center gap-2">
  <Button onClick={handleAddVehicle}>
    إضافة مركبة
  </Button>
  <HelpButton
    title="كيفية إضافة مركبة جديدة"
    content={<AddVehicleHelp />}
    size="sm"
  />
</div>
```

---

## الأسلوب المرئي

### الألوان المستخدمة:

- **أزرق** (`blue-600`): معلومات عامة
- **أخضر** (`green-600`): نجاح، خطوات صحيحة
- **برتقالي** (`orange-600`): تحذيرات، انتباه
- **أحمر** (`red-600`): أخطاء، عمليات خطيرة
- **أصفر** (`yellow-600`): نصائح

### الأيقونات:

- `HelpCircle`: المساعدة العامة
- `CheckCircle2`: خطوات ناجحة
- `AlertCircle`: تحذيرات
- `Info`: معلومات
- `Lightbulb`: نصائح

---

## الاختبار

بعد إضافة نظام المساعدة لأي صفحة:

1. ✅ تأكد من ظهور زر المساعدة في الزاوية السفلية اليسرى
2. ✅ اختبر فتح لوحة المساعدة
3. ✅ تأكد من أن المحتوى منظم وسهل القراءة
4. ✅ اختبر التمرير في المحتوى الطويل
5. ✅ تأكد من أن الأزرار الصغيرة (إن وجدت) تعمل بشكل صحيح
6. ✅ اختبر على الموبايل والديسكتوب

---

## الصيانة والتحديث

- **عند إضافة ميزة جديدة:** أضف شرحها في محتوى المساعدة
- **عند تغيير واجهة:** حدّث الشروحات والصور إن وجدت
- **عند اكتشاف خطأ شائع:** أضف تحذيراً أو نصيحة عنه
- **استمع للمستخدمين:** إذا سألوا عن شيء كثيراً، أضفه للمساعدة

---

## الخلاصة

نظام المساعدة التفاعلي الآن جاهز ومطبق في صفحتي العملاء والعقود كنموذج. 
يمكنك بسهولة إضافته لباقي الصفحات باتباع الخطوات الموضحة أعلاه.

**الفوائد:**
- ✅ تحسين تجربة المستخدم
- ✅ تقليل الحاجة للدعم الفني
- ✅ تسريع تعلم النظام
- ✅ توثيق شامل ومتكامل
- ✅ سهولة الصيانة والتحديث

**للمساعدة أو الأسئلة:**
راجع الملفات الموجودة في `src/components/help/` كمرجع.

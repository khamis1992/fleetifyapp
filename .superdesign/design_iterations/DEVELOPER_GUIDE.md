# دليل المطور - صفحة التقارير المالية الجديدة
## Developer Guide - Financial Reports Redesign

---

## 🚀 البدء السريع

### 1. معاينة التصميم

#### HTML Prototype
```bash
# افتح الملف مباشرة في المتصفح
open .superdesign/design_iterations/financial_reports_2.html

# أو
start .superdesign/design_iterations/financial_reports_2.html  # Windows
```

#### React Application
```bash
# تشغيل السيرفر
npm run dev

# ثم افتح المتصفح على
http://localhost:5173/finance/reports
```

---

## 📦 الملفات المحدثة

```
✅ src/pages/finance/Reports.tsx          # الصفحة الرئيسية
✅ src/index.css                          # الحركات الجديدة
✅ .superdesign/design_iterations/        # ملفات التصميم
```

---

## 🎨 كيفية استخدام الأنماط الجديدة

### 1. الحركات (Animations)

```jsx
// حركة الدخول التدريجي
<div className="animate-slide-up">
  <Card>...</Card>
</div>

// حركة متأخرة (stagger)
<div className="animate-slide-up stagger-1">...</div>
<div className="animate-slide-up stagger-2">...</div>
<div className="animate-slide-up stagger-3">...</div>
```

### 2. البطاقات المحسنة

```jsx
// بطاقة بدون حدود مع ظل
<Card className="border-0 shadow-card">
  <CardContent>...</CardContent>
</Card>

// بطاقة مع hover effect
<Card className="border-0 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
  <CardContent>...</CardContent>
</Card>
```

### 3. الأزرار بتدرجات

```jsx
// زر أساسي بتدرج
<Button className="gap-2 bg-gradient-to-br from-primary to-primary-dark">
  <Download className="h-4 w-4" />
  تحميل التقرير
</Button>

// زر ثانوي
<Button variant="outline" className="gap-2">
  <Filter className="h-4 w-4" />
  تصفية
</Button>
```

### 4. الأيقونات الملونة

```jsx
// أيقونة في دائرة ملونة
<div className="p-2.5 rounded-lg bg-primary/10">
  <FileBarChart className="h-5 w-5 text-primary" />
</div>

<div className="p-2.5 rounded-lg bg-success/10">
  <CheckCircle className="h-5 w-5 text-success" />
</div>

<div className="p-2.5 rounded-lg bg-warning/10">
  <Calendar className="h-5 w-5 text-warning" />
</div>
```

### 5. الجداول المحسنة

```jsx
// صف مع hover effect
<TableRow className="hover:bg-accent/50 transition-colors">
  <TableCell className="font-medium">...</TableCell>
  <TableCell className="text-left font-semibold">
    <span className="text-success">{formatCurrency(amount)}</span>
  </TableCell>
</TableRow>

// صف إجمالي مع تدرج
<TableRow className="bg-gradient-to-br from-accent-light to-accent font-bold">
  <TableCell className="text-lg">إجمالي</TableCell>
  <TableCell className="text-left text-lg">
    <span className="text-success">{total}</span>
  </TableCell>
</TableRow>
```

### 6. Headers مع أيقونات

```jsx
// Header قسم
<div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-primary">
  <TrendingUp className="h-5 w-5 text-primary" />
  <h3 className="font-bold text-lg">الأصول</h3>
</div>
```

### 7. Badges ملونة

```jsx
// Badge نجاح
<Badge variant="secondary" className="bg-success/10 text-success hover:bg-success/20">
  +12%
</Badge>

// Badge تحذير
<Badge variant="secondary" className="bg-warning/10 text-warning hover:bg-warning/20">
  متأخر
</Badge>
```

---

## 🎨 نظام الألوان

### ألوان الأرقام المالية

```jsx
// أرقام موجبة (أرباح، أصول)
<span className="text-success">{amount}</span>

// أرقام سالبة (خسائر، مصروفات)
<span className="text-destructive">{amount}</span>

// أرقام محايدة (ديون، التزامات)
<span className="text-muted-foreground">{amount}</span>
```

### الخلفيات الملونة

```jsx
// خلفية نجاح
<div className="bg-success/10 border border-success/20">...</div>

// خلفية تحذير
<div className="bg-warning/10 border border-warning/20">...</div>

// خلفية خطر
<div className="bg-destructive/10 border border-destructive/20">...</div>

// خلفية أساسية
<div className="bg-primary/10 border border-primary/20">...</div>
```

### التدرجات

```jsx
// تدرج أساسي
className="bg-gradient-to-br from-primary to-primary-dark"

// تدرج ثانوي
className="bg-gradient-to-br from-accent-light to-accent"

// تدرج البطاقات
className="bg-gradient-card"
```

---

## 🔧 الأدوات المساعدة

### 1. تنسيق العملة

```jsx
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"

const { formatCurrency } = useCurrencyFormatter()

// الاستخدام
<span>{formatCurrency(1234.56)}</span>
// النتيجة: "1,234.56 ر.ق"
```

### 2. تنسيق التاريخ

```jsx
// بالعربية
{new Date().toLocaleDateString('ar-QA')}
// النتيجة: "٢/١١/٢٠٢٥"

// بالإنجليزية
{new Date().toLocaleDateString('en-GB')}
// النتيجة: "02/11/2025"
```

---

## 📱 التصميم المتجاوب

### Breakpoints

```jsx
// Mobile first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  ...
</div>

// Text sizing
<h1 className="text-2xl md:text-3xl font-bold">...</h1>

// Padding
<div className="p-4 md:p-6 lg:p-8">...</div>

// Flex direction
<div className="flex flex-col md:flex-row gap-4">...</div>
```

### نقاط التوقف

```
sm:  640px  - Tablets (portrait)
md:  768px  - Tablets (landscape) 
lg:  1024px - Small laptops
xl:  1280px - Desktops
2xl: 1536px - Large screens
```

---

## 🎭 الحركات المتقدمة

### إضافة حركة جديدة

```css
/* في src/index.css */
@keyframes myAnimation {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-my-animation {
  animation: myAnimation 0.3s ease-out forwards;
}
```

### استخدام الحركة

```jsx
<div className="animate-my-animation">
  ...
</div>
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: الحركات لا تعمل

**الحل:**
```bash
# تأكد من وجود الأنماط في index.css
grep -A5 "slideInUp" src/index.css

# تأكد من استيراد index.css في main.tsx
grep "index.css" src/main.tsx
```

### المشكلة: الألوان غير صحيحة

**الحل:**
```bash
# تحقق من متغيرات CSS
grep -A10 ":root" src/index.css

# تأكد من استخدام الأسماء الصحيحة
# صحيح: text-success
# خطأ: text-green-600 (إلا إذا كنت تريد تجاوز النظام)
```

### المشكلة: الأيقونات لا تظهر

**الحل:**
```jsx
// تأكد من استيراد الأيقونات
import { FileText, Download, Calendar } from "lucide-react"

// تحقق من التهجئة
<FileText />  // ✅ صحيح
<FileTexT />  // ❌ خطأ
```

---

## 📚 الموارد

### المكتبات المستخدمة

- **Lucide React:** https://lucide.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **Radix UI:** https://www.radix-ui.com/
- **React Hook Form:** https://react-hook-form.com/

### ملفات مرجعية

```
.superdesign/design_iterations/
├── financial_reports_theme.css       # جميع الأنماط
├── financial_reports_2.html          # Prototype كامل
└── FINANCIAL_REPORTS_REDESIGN_SUMMARY.md  # التوثيق الكامل
```

---

## 💡 نصائح وأفضل الممارسات

### 1. استخدم المكونات الموجودة

```jsx
// ✅ جيد - استخدام المكونات
import { Card, CardContent } from "@/components/ui/card"
<Card>...</Card>

// ❌ سيء - إنشاء مكونات جديدة بدون داعي
<div className="rounded-lg border bg-card">...</div>
```

### 2. حافظ على التناسق

```jsx
// ✅ جيد - استخدام نظام الألوان
className="text-success"

// ❌ سيء - ألوان عشوائية
className="text-green-600"
```

### 3. استخدم الـ Semantic Classes

```jsx
// ✅ جيد
className="font-semibold"

// ❌ سيء
className="font-[600]"
```

### 4. احترم التسلسل الهرمي

```jsx
// ✅ جيد
<h1 className="text-2xl md:text-3xl font-bold">العنوان الرئيسي</h1>
<h2 className="text-xl md:text-2xl font-semibold">عنوان فرعي</h2>
<p className="text-base">نص عادي</p>

// ❌ سيء - أحجام عشوائية
<h1 className="text-lg">...</h1>
<p className="text-2xl">...</p>
```

---

## 🔄 التحديثات المستقبلية

### v2.1 (قريباً)
- [ ] إضافة Dark Mode
- [ ] تحسين الأداء
- [ ] إضافة المزيد من الحركات

### v2.2 (متوسط المدى)
- [ ] رسوم بيانية تفاعلية
- [ ] تصدير PDF محسن
- [ ] فلاتر متقدمة

---

## 🤝 المساهمة

إذا كنت تريد إضافة تحسينات:

1. اتبع نفس نمط التصميم
2. استخدم نفس نظام الألوان
3. أضف تعليقات عربية للكود
4. اختبر على جميع أحجام الشاشات

---

## 📞 الدعم

للأسئلة أو المشاكل:
1. راجع `FINANCIAL_REPORTS_REDESIGN_SUMMARY.md`
2. تحقق من `financial_reports_2.html` للمرجع
3. راجع الأنماط في `financial_reports_theme.css`

---

**آخر تحديث:** 2 نوفمبر 2025  
**الإصدار:** 2.0

تم بحمد الله ✨

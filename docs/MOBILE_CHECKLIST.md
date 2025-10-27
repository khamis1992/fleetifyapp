# ✅ قائمة التحقق - Native Mobile UI

## للمطورين: عند إنشاء صفحة جديدة

### 1. التحقق من الجهاز
```tsx
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple'

const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint()
```

### 2. استخدام المكونات الصحيحة

#### ✅ للبطاقات:
```tsx
{isMobile ? (
  <NativeCard pressable>
    {/* محتوى */}
  </NativeCard>
) : (
  <Card>
    {/* محتوى */}
  </Card>
)}
```

#### ✅ للأزرار:
```tsx
{isMobile ? (
  <NativeButton fullWidth>حفظ</NativeButton>
) : (
  <Button>حفظ</Button>
)}
```

#### ✅ للـ Modals:
```tsx
{isMobile ? (
  <NativeBottomSheet>
    <NativeBottomSheetContent dragToDismiss>
      {/* نموذج */}
    </NativeBottomSheetContent>
  </NativeBottomSheet>
) : (
  <Dialog>
    <DialogContent>{/* نموذج */}</DialogContent>
  </Dialog>
)}
```

### 3. استخدام Typography الصحيح

```tsx
{/* بدلاً من */}
<h1 className="text-2xl font-bold">عنوان</h1>
<p className="text-sm">نص</p>

{/* استخدم */}
<h1 className="native-title">عنوان</h1>
<p className="native-body">نص</p>
```

### 4. تفعيل Haptic Feedback

```tsx
<NativeButton 
  haptic={true}  // تلقائي
  onClick={handleClick}
>
  زر
</NativeButton>
```

### 5. استخدام Safe Areas

```tsx
{/* للعناصر الثابتة في الأسفل */}
<div className="pb-[env(safe-area-inset-bottom)]">
  {/* محتوى */}
</div>

{/* أو استخدم native-bottom-nav class */}
<nav className="native-bottom-nav">
  {/* تلقائياً يضيف safe area */}
</nav>
```

---

## 📋 قائمة التحقق السريعة

عند إنشاء صفحة جديدة، تأكد من:

- [ ] استخدام `useSimpleBreakpoint()` للتحقق من الجهاز
- [ ] استخدام `NativeCard` للبطاقات على الجوال
- [ ] استخدام `NativeButton` للأزرار الرئيسية
- [ ] استخدام `NativeBottomSheet` بدلاً من Dialog
- [ ] استخدام Native Typography classes
- [ ] إضافة `aria-label` لجميع الأزرار
- [ ] استخدام `fullWidth` للأزرار على الجوال
- [ ] تفعيل `haptic` للأزرار الرئيسية
- [ ] استخدام `pressable` للبطاقات القابلة للنقر
- [ ] إضافة safe area padding للعناصر الثابتة

---

## 🎨 Styling Classes السريعة

### Typography
```tsx
<h1 className="native-title">عنوان رئيسي</h1>
<h2 className="native-heading">عنوان فرعي</h2>
<h3 className="native-subheading">عنوان صغير</h3>
<p className="native-body">نص عادي</p>
<p className="native-caption">نص توضيحي</p>
<span className="native-label">LABEL</span>
```

### Badges
```tsx
<span className="native-badge">عادي</span>
<span className="native-badge native-badge-primary">Primary</span>
<span className="native-badge native-badge-success">Success</span>
<span className="native-badge native-badge-warning">Warning</span>
<span className="native-badge native-badge-danger">Danger</span>
```

### Lists
```tsx
<div className="native-list">
  <div className="native-list-item">عنصر 1</div>
  <div className="native-list-item">عنصر 2</div>
</div>
```

### Inputs
```tsx
<input className="native-input" placeholder="أدخل النص" />
```

### Dividers
```tsx
<div className="native-divider" />        {/* رفيع */}
<div className="native-divider-thick" />  {/* سميك */}
```

---

## ⚠️ الأخطاء الشائعة

### ❌ خطأ 1: استخدام المكونات العادية على الجوال
```tsx
// خطأ
const MyPage = () => (
  <Card>محتوى</Card>
)

// صح
const MyPage = () => {
  const { isMobile } = useSimpleBreakpoint()
  return isMobile ? (
    <NativeCard>محتوى</NativeCard>
  ) : (
    <Card>محتوى</Card>
  )
}
```

### ❌ خطأ 2: نسيان fullWidth للأزرار
```tsx
// خطأ (زر صغير على الجوال)
<NativeButton>حفظ</NativeButton>

// صح
<NativeButton fullWidth>حفظ</NativeButton>
```

### ❌ خطأ 3: استخدام Dialog بدلاً من BottomSheet
```tsx
// خطأ على الجوال
<Dialog>
  <DialogContent>Form</DialogContent>
</Dialog>

// صح
<NativeBottomSheet>
  <NativeBottomSheetContent dragToDismiss>
    Form
  </NativeBottomSheetContent>
</NativeBottomSheet>
```

### ❌ خطأ 4: Touch targets صغيرة
```tsx
// خطأ
<button className="h-8 w-8">×</button>

// صح
<NativeButton size="icon">
  <X className="h-5 w-5" />
</NativeButton>
```

---

## 🎓 أفضل الممارسات

### 1. Conditional Components
دائماً استخدم conditional rendering للجوال:
```tsx
{isMobile ? <MobileView /> : <DesktopView />}
```

### 2. Full Width Layouts
الأزرار الرئيسية يجب أن تكون full width:
```tsx
<NativeButton fullWidth size="lg">
  زر رئيسي
</NativeButton>
```

### 3. Spacing
استخدم spacing مناسب للجوال:
```tsx
<div className="space-y-4 p-4">  {/* للجوال */}
<div className="space-y-6 p-6">  {/* للديسكتوب */}
```

### 4. Loading States
دائماً استخدم loading states:
```tsx
{loading ? (
  <NativeSpinner size="lg" />
) : (
  <Content />
)}
```

---

## 📱 اختبار على أحجام مختلفة

تأكد من الاختبار على:
- ✅ iPhone SE (320px)
- ✅ iPhone 11 Pro (375px)
- ✅ iPhone 14 Pro Max (428px)
- ✅ iPad Mini (768px)
- ✅ iPad Pro (1024px)

---

## 📖 موارد إضافية

- **دليل كامل:** `/docs/NATIVE_MOBILE_GUIDE.md`
- **البدء السريع:** `/docs/QUICK_START_NATIVE.md`
- **مثال حي:** `/native-demo` page
- **ملف الأنماط:** `/src/styles/native-mobile.css`

---

**استمتع بالتطوير! 🎉**

حفظ هذا الملف كمرجع سريع أثناء التطوير.


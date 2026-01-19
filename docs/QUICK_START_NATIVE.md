# 🚀 البدء السريع - Native Mobile Components

## كيف تبدأ في 5 دقائق

### 1️⃣ Import المكونات

```tsx
import {
  NativeCard,
  NativeButton,
  NativeBottomSheet,
  NativeBottomSheetContent,
  NativeSpinner
} from '@/components/ui/native'
```

### 2️⃣ استخدم الـ Hook للتحقق من الجوال

```tsx
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple'

const { isMobile } = useSimpleBreakpoint()
```

### 3️⃣ ابدأ الاستخدام!

```tsx
{isMobile && (
  <NativeCard pressable onClick={handleClick}>
    <NativeCardContent>
      بطاقة Native!
    </NativeCardContent>
  </NativeCard>
)}
```

---

## 🎯 الأمثلة الأكثر شيوعاً

### مثال 1: قائمة بطاقات

```tsx
const ItemsList = () => {
  const { isMobile } = useSimpleBreakpoint()
  
  return (
    <div className="space-y-4 p-4">
      {items.map(item => (
        <NativeCard 
          key={item.id}
          pressable 
          variant="elevated"
          onClick={() => navigate(`/items/${item.id}`)}
        >
          <NativeCardHeader>
            <NativeCardTitle>{item.name}</NativeCardTitle>
          </NativeCardHeader>
          <NativeCardContent>
            <p className="native-caption">{item.description}</p>
          </NativeCardContent>
        </NativeCard>
      ))}
    </div>
  )
}
```

### مثال 2: نموذج في Bottom Sheet

```tsx
const [open, setOpen] = useState(false)

<NativeBottomSheet open={open} onOpenChange={setOpen}>
  <NativeBottomSheetTrigger asChild>
    <NativeButton fullWidth>إضافة عنصر</NativeButton>
  </NativeBottomSheetTrigger>
  
  <NativeBottomSheetContent>
    <NativeBottomSheetHeader>
      <NativeBottomSheetTitle>عنصر جديد</NativeBottomSheetTitle>
    </NativeBottomSheetHeader>
    
    <div className="px-6 space-y-4">
      <input className="native-input" placeholder="الاسم" />
      
      <NativeButton fullWidth loading={saving}>
        حفظ
      </NativeButton>
    </div>
  </NativeBottomSheetContent>
</NativeBottomSheet>
```

### مثال 3: حالة التحميل

```tsx
{loading ? (
  <div className="flex justify-center py-12">
    <NativeSpinner size="lg" />
  </div>
) : (
  <ContentView />
)}

{/* أو Skeleton */}
<div className="space-y-3">
  <NativeSkeleton width="100%" height="60px" />
  <NativeSkeleton width="100%" height="40px" />
  <NativeSkeleton width="80%" height="40px" />
</div>
```

---

## ⚡ نصائح سريعة

### 1. استخدم CSS Classes مباشرة

```tsx
{/* Typography */}
<h1 className="native-title">عنوان</h1>
<p className="native-body">نص</p>

{/* Badges */}
<span className="native-badge native-badge-primary">جديد</span>

{/* Lists */}
<div className="native-list">
  <div className="native-list-item">عنصر</div>
</div>
```

### 2. Conditional Rendering للجوال

```tsx
{isMobile ? (
  <NativeCard>Mobile View</NativeCard>
) : (
  <Card>Desktop View</Card>
)}
```

### 3. Full Width Buttons للجوال

```tsx
<NativeButton fullWidth size="lg">
  زر بعرض كامل
</NativeButton>
```

---

## 🎨 Styling Quick Reference

| Class | Description |
|-------|-------------|
| `native-title` | عنوان رئيسي (28px, bold) |
| `native-heading` | عنوان فرعي (20px, semibold) |
| `native-body` | نص عادي (16px) |
| `native-caption` | نص صغير (14px) |
| `native-badge` | Badge/Pill |
| `native-input` | Input field محسّن |
| `native-ripple` | تأثير Ripple |
| `native-skeleton` | Skeleton loader |

---

## 📖 المزيد من المعلومات

راجع الوثائق الكاملة:
- 📘 `/docs/NATIVE_MOBILE_GUIDE.md` - دليل كامل
- 📗 `/docs/NATIVE_MOBILE_TRANSFORMATION.md` - تقرير التحويل
- 📕 `/tasks/todo.md` - ملخص التحسينات

---

**استمتع بتجربة Native! 🎉**


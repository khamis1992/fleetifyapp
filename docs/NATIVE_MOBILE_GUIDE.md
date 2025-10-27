# دليل المكونات Native للجوال

## نظرة عامة

تم تصميم هذه المكونات لجعل تطبيق FleetifyApp يبدو تماماً كتطبيق جوال أصلي (Native Mobile App) مع دعم iOS و Android design patterns.

## المميزات الرئيسية

### ✨ iOS/Android Native Design
- 🎨 **تصميم مُستوحى من iOS** - Blur effects, smooth shadows, rounded corners
- 🤖 **Material Design principles** - Ripple effects, elevation, transitions
- 📱 **Mobile-first approach** - Optimized for touch interactions
- ⚡ **Smooth animations** - Spring-based physics animations
- 🎯 **Touch feedback** - Haptic feedback + visual feedback
- 🌗 **Dark mode support** - Automatic dark mode detection

---

## المكونات المتاحة

### 1. Native Card

بطاقة محسّنة للجوال مع تأثيرات Native.

#### الاستخدام الأساسي

```tsx
import { NativeCard, NativeCardHeader, NativeCardTitle, NativeCardContent } from '@/components/ui/native'

<NativeCard>
  <NativeCardHeader>
    <NativeCardTitle>عنوان البطاقة</NativeCardTitle>
  </NativeCardHeader>
  <NativeCardContent>
    محتوى البطاقة
  </NativeCardContent>
</NativeCard>
```

#### بطاقة قابلة للضغط (Pressable)

```tsx
<NativeCard pressable onClick={() => console.log('تم الضغط!')}>
  <NativeCardContent>
    اضغط هنا
  </NativeCardContent>
</NativeCard>
```

#### أنواع البطاقات (Variants)

```tsx
{/* بطاقة عادية */}
<NativeCard variant="default">...</NativeCard>

{/* بطاقة مرفوعة (elevated) */}
<NativeCard variant="elevated">...</NativeCard>

{/* بطاقة مع gradient */}
<NativeCard variant="gradient">...</NativeCard>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "elevated" \| "gradient"` | `"default"` | نوع البطاقة |
| `pressable` | `boolean` | `false` | تفعيل التأثير عند الضغط |
| `ripple` | `boolean` | `true` | تفعيل تأثير الـ Ripple |
| `onClick` | `() => void` | - | دالة عند الضغط |

---

### 2. Native Bottom Sheet

Bottom Sheet محسّن مع drag-to-dismiss.

#### الاستخدام الأساسي

```tsx
import { 
  NativeBottomSheet, 
  NativeBottomSheetTrigger, 
  NativeBottomSheetContent,
  NativeBottomSheetHeader,
  NativeBottomSheetTitle 
} from '@/components/ui/native'

<NativeBottomSheet>
  <NativeBottomSheetTrigger>
    <Button>فتح</Button>
  </NativeBottomSheetTrigger>
  
  <NativeBottomSheetContent>
    <NativeBottomSheetHeader>
      <NativeBottomSheetTitle>عنوان</NativeBottomSheetTitle>
    </NativeBottomSheetHeader>
    <div className="px-6">
      محتوى الـ Sheet
    </div>
  </NativeBottomSheetContent>
</NativeBottomSheet>
```

#### مع Drag to Dismiss

```tsx
<NativeBottomSheetContent dragToDismiss={true} closeThreshold={150}>
  {/* المحتوى */}
</NativeBottomSheetContent>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxHeight` | `string` | `"90vh"` | أقصى ارتفاع |
| `showHandle` | `boolean` | `true` | إظهار handle للسحب |
| `dragToDismiss` | `boolean` | `true` | تفعيل السحب للإغلاق |
| `closeThreshold` | `number` | `100` | مسافة السحب للإغلاق (px) |

---

### 3. Native Button

زر محسّن مع haptic feedback وانيميشن.

#### الاستخدام الأساسي

```tsx
import { NativeButton } from '@/components/ui/native'

<NativeButton onClick={() => console.log('clicked')}>
  اضغط هنا
</NativeButton>
```

#### أنواع الأزرار (Variants)

```tsx
{/* Primary (default) */}
<NativeButton variant="default">Primary</NativeButton>

{/* Secondary */}
<NativeButton variant="secondary">Secondary</NativeButton>

{/* Outline */}
<NativeButton variant="outline">Outline</NativeButton>

{/* Success */}
<NativeButton variant="success">Success</NativeButton>

{/* Warning */}
<NativeButton variant="warning">Warning</NativeButton>

{/* Destructive */}
<NativeButton variant="destructive">Delete</NativeButton>
```

#### أحجام مختلفة

```tsx
<NativeButton size="sm">Small</NativeButton>
<NativeButton size="default">Default</NativeButton>
<NativeButton size="lg">Large</NativeButton>
```

#### مع Loading

```tsx
<NativeButton loading={isLoading}>
  حفظ
</NativeButton>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "secondary" \| "outline" \| ...` | `"default"` | نوع الزر |
| `size` | `"sm" \| "default" \| "lg" \| "icon"` | `"default"` | حجم الزر |
| `fullWidth` | `boolean` | `false` | عرض كامل |
| `loading` | `boolean` | `false` | حالة التحميل |
| `haptic` | `boolean` | `true` | تفعيل الاهتزاز |

---

### 4. Native Loading States

#### Native Spinner

```tsx
import { NativeSpinner } from '@/components/ui/native'

{/* أحجام مختلفة */}
<NativeSpinner size="sm" />
<NativeSpinner size="default" />
<NativeSpinner size="lg" />
<NativeSpinner size="xl" />

{/* ألوان مختلفة */}
<NativeSpinner variant="primary" />
<NativeSpinner variant="white" />
<NativeSpinner variant="muted" />
```

#### Native Skeleton

```tsx
import { NativeSkeleton } from '@/components/ui/native'

{/* مستطيل */}
<NativeSkeleton width="100%" height="40px" />

{/* دائري */}
<NativeSkeleton width="60px" height="60px" circle />

{/* مجموعة */}
<div className="space-y-3">
  <NativeSkeleton width="100%" height="20px" />
  <NativeSkeleton width="80%" height="20px" />
  <NativeSkeleton width="90%" height="20px" />
</div>
```

#### Pull to Refresh

```tsx
import { NativePullRefresh } from '@/components/ui/native'

<NativePullRefresh 
  pulling={isPulling} 
  refreshing={isRefreshing} 
/>
```

---

## Native Styles (CSS Classes)

يمكنك استخدام الـ CSS classes مباشرة:

### Header

```tsx
<header className="native-mobile-header">
  {/* محتوى الهيدر */}
</header>
```

### Bottom Navigation

```tsx
<nav className="native-bottom-nav">
  <div className="native-bottom-nav-item active">
    {/* عنصر التنقل */}
  </div>
</nav>
```

### Typography

```tsx
<h1 className="native-title">عنوان رئيسي</h1>
<h2 className="native-heading">عنوان فرعي</h2>
<h3 className="native-subheading">عنوان صغير</h3>
<p className="native-body">نص عادي</p>
<p className="native-caption">نص توضيحي</p>
<span className="native-label">Label</span>
```

### Badges

```tsx
<span className="native-badge">Badge</span>
<span className="native-badge native-badge-primary">Primary</span>
<span className="native-badge native-badge-success">Success</span>
<span className="native-badge native-badge-warning">Warning</span>
<span className="native-badge native-badge-danger">Danger</span>
```

### Ripple Effect

```tsx
<div className="native-ripple">
  {/* أي عنصر قابل للضغط */}
</div>
```

---

## أفضل الممارسات

### 1. استخدم المكونات Native للجوال فقط

```tsx
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple'

const MyComponent = () => {
  const { isMobile } = useSimpleBreakpoint()
  
  return isMobile ? (
    <NativeCard pressable>
      {/* محتوى للجوال */}
    </NativeCard>
  ) : (
    <Card>
      {/* محتوى للديسكتوب */}
    </Card>
  )
}
```

### 2. استخدم Bottom Sheets بدلاً من Modals على الجوال

```tsx
const { isMobile } = useSimpleBreakpoint()

{isMobile ? (
  <NativeBottomSheet>
    {/* محتوى */}
  </NativeBottomSheet>
) : (
  <Dialog>
    {/* محتوى */}
  </Dialog>
)}
```

### 3. استخدم Haptic Feedback

```tsx
import { useHapticFeedback } from '@/hooks/useHapticFeedback'

const { vibrate } = useHapticFeedback()

<NativeButton 
  haptic={true} // تلقائي
  onClick={() => {
    vibrate('medium') // أو 'light' أو 'heavy'
    // باقي الكود
  }}
>
  زر
</NativeButton>
```

### 4. استخدم Native Typography

```tsx
{/* بدلاً من */}
<h1 className="text-2xl font-bold">عنوان</h1>

{/* استخدم */}
<h1 className="native-title">عنوان</h1>
```

---

## أمثلة كاملة

### مثال 1: صفحة قائمة مع Native Components

```tsx
import { 
  NativeCard, 
  NativeCardHeader, 
  NativeCardTitle, 
  NativeCardContent,
  NativeSpinner 
} from '@/components/ui/native'

export const ItemsList = () => {
  const [loading, setLoading] = useState(true)
  const { isMobile } = useSimpleBreakpoint()
  
  if (!isMobile) return <DesktopView />
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <NativeSpinner size="lg" />
      </div>
    )
  }
  
  return (
    <div className="space-y-4 p-4">
      <h1 className="native-title">العناصر</h1>
      
      {items.map(item => (
        <NativeCard 
          key={item.id} 
          pressable 
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

### مثال 2: نموذج مع Bottom Sheet

```tsx
import { 
  NativeBottomSheet, 
  NativeBottomSheetTrigger, 
  NativeBottomSheetContent,
  NativeBottomSheetHeader,
  NativeBottomSheetTitle,
  NativeButton 
} from '@/components/ui/native'

export const CreateItemForm = () => {
  const [open, setOpen] = useState(false)
  
  return (
    <NativeBottomSheet open={open} onOpenChange={setOpen}>
      <NativeBottomSheetTrigger asChild>
        <NativeButton fullWidth>إضافة عنصر جديد</NativeButton>
      </NativeBottomSheetTrigger>
      
      <NativeBottomSheetContent maxHeight="80vh">
        <NativeBottomSheetHeader>
          <NativeBottomSheetTitle>عنصر جديد</NativeBottomSheetTitle>
        </NativeBottomSheetHeader>
        
        <div className="px-6 space-y-4">
          <input className="native-input" placeholder="الاسم" />
          <input className="native-input" placeholder="الوصف" />
          
          <NativeButton fullWidth loading={saving}>
            حفظ
          </NativeButton>
        </div>
      </NativeBottomSheetContent>
    </NativeBottomSheet>
  )
}
```

---

## CSS Variables المتاحة

يمكنك تخصيص المتغيرات في `src/styles/native-mobile.css`:

```css
:root {
  --native-header-height: 64px;
  --native-bottom-nav-height: 68px;
  --native-card-radius: 16px;
  --native-sheet-radius: 24px;
  --native-input-radius: 12px;
  
  /* Shadows */
  --native-shadow-sm: ...;
  --native-shadow-md: ...;
  --native-shadow-lg: ...;
  
  /* Transitions */
  --native-transition-fast: 150ms;
  --native-transition-base: 250ms;
  --native-transition-slow: 350ms;
}
```

---

## Support

للمزيد من المعلومات أو المساعدة، يرجى الرجوع إلى:
- `src/styles/native-mobile.css` - جميع الأنماط
- `src/components/ui/native/` - المكونات
- `/docs/MOBILE_DESIGN_SYSTEM.md` - نظام التصميم الكامل

---

**تم الإنشاء:** 27 أكتوبر 2025  
**الإصدار:** 1.0.0  
**المؤلف:** FleetifyApp Team


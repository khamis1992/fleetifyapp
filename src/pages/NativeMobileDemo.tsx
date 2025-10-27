/**
 * Native Mobile Demo Page
 * عرض توضيحي لجميع مكونات Native Mobile
 */

import { useState } from 'react'
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple'
import {
  NativeCard,
  NativeCardHeader,
  NativeCardTitle,
  NativeCardDescription,
  NativeCardContent,
  NativeButton,
  NativeBottomSheet,
  NativeBottomSheetTrigger,
  NativeBottomSheetContent,
  NativeBottomSheetHeader,
  NativeBottomSheetTitle,
  NativeBottomSheetDescription,
  NativeSpinner,
  NativeSkeleton,
} from '@/components/ui/native'
import { 
  Heart, 
  Star, 
  Share2, 
  Bell, 
  Settings,
  Plus,
  ShoppingCart,
  User,
  Home,
  Search
} from 'lucide-react'
import { PageCustomizer } from '@/components/PageCustomizer'

export default function NativeMobileDemo() {
  const { isMobile } = useSimpleBreakpoint()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)

  const handleSave = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  // Redirect to desktop view if not mobile
  if (!isMobile) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">عرض توضيحي للجوال فقط</h1>
          <p className="text-muted-foreground">
            يرجى فتح هذه الصفحة على جهاز جوال أو تصغير نافذة المتصفح
          </p>
        </div>
      </div>
    )
  }

  return (
    <PageCustomizer
      pageId="native-mobile-demo"
      title="Native Mobile Demo"
      titleAr="عرض النمط Native"
    >
      <div className="space-y-6 pb-24">
        {/* Page Title */}
        <div className="px-4 pt-2">
          <h1 className="native-title">مكونات Native</h1>
          <p className="native-caption mt-1">
            عرض توضيحي لجميع مكونات التصميم Native
          </p>
        </div>

        {/* Section: Cards */}
        <div className="space-y-4 px-4">
          <h2 className="native-heading">البطاقات (Cards)</h2>
          
          {/* Default Card */}
          <NativeCard>
            <NativeCardHeader>
              <NativeCardTitle>بطاقة عادية</NativeCardTitle>
              <NativeCardDescription>
                بطاقة بتصميم Native بسيط
              </NativeCardDescription>
            </NativeCardHeader>
            <NativeCardContent>
              <p className="native-body">
                هذه بطاقة عادية مع تصميم iOS/Android Native
              </p>
            </NativeCardContent>
          </NativeCard>

          {/* Elevated Card */}
          <NativeCard variant="elevated">
            <NativeCardHeader>
              <NativeCardTitle>بطاقة مرفوعة</NativeCardTitle>
            </NativeCardHeader>
            <NativeCardContent>
              <p className="native-caption">
                بطاقة مع shadow أكبر لإبراز المحتوى
              </p>
            </NativeCardContent>
          </NativeCard>

          {/* Gradient Card */}
          <NativeCard variant="gradient">
            <NativeCardHeader>
              <NativeCardTitle>بطاقة مع Gradient</NativeCardTitle>
            </NativeCardHeader>
            <NativeCardContent>
              <p className="native-caption">
                بطاقة مع خلفية gradient جميلة
              </p>
            </NativeCardContent>
          </NativeCard>

          {/* Pressable Card */}
          <NativeCard 
            pressable 
            ripple
            onClick={() => alert('تم الضغط على البطاقة!')}
          >
            <NativeCardContent className="flex items-center justify-between">
              <div>
                <p className="native-subheading">بطاقة قابلة للضغط</p>
                <p className="native-caption">اضغط هنا لتجربة التأثير</p>
              </div>
              <Heart className="h-6 w-6 text-primary" />
            </NativeCardContent>
          </NativeCard>
        </div>

        {/* Section: Buttons */}
        <div className="space-y-4 px-4">
          <h2 className="native-heading">الأزرار (Buttons)</h2>
          
          <div className="space-y-3">
            <NativeButton fullWidth variant="default">
              زر Primary
            </NativeButton>
            
            <NativeButton fullWidth variant="secondary">
              زر Secondary
            </NativeButton>
            
            <NativeButton fullWidth variant="outline">
              زر Outline
            </NativeButton>
            
            <NativeButton fullWidth variant="success">
              زر Success
            </NativeButton>
            
            <NativeButton fullWidth variant="warning">
              زر Warning
            </NativeButton>
            
            <NativeButton fullWidth variant="destructive">
              زر Destructive
            </NativeButton>
            
            <NativeButton fullWidth loading={loading} onClick={handleSave}>
              زر مع Loading
            </NativeButton>
          </div>

          {/* Button Sizes */}
          <div className="flex gap-3 justify-center">
            <NativeButton size="sm">صغير</NativeButton>
            <NativeButton size="default">عادي</NativeButton>
            <NativeButton size="lg">كبير</NativeButton>
          </div>

          {/* Icon Buttons */}
          <div className="flex gap-3 justify-center">
            <NativeButton size="icon" variant="outline">
              <Heart className="h-5 w-5" />
            </NativeButton>
            <NativeButton size="icon" variant="outline">
              <Star className="h-5 w-5" />
            </NativeButton>
            <NativeButton size="icon" variant="outline">
              <Share2 className="h-5 w-5" />
            </NativeButton>
          </div>
        </div>

        {/* Section: Bottom Sheet */}
        <div className="space-y-4 px-4">
          <h2 className="native-heading">Bottom Sheet</h2>
          
          <NativeBottomSheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <NativeBottomSheetTrigger asChild>
              <NativeButton fullWidth>فتح Bottom Sheet</NativeButton>
            </NativeBottomSheetTrigger>
            
            <NativeBottomSheetContent dragToDismiss closeThreshold={100}>
              <NativeBottomSheetHeader>
                <NativeBottomSheetTitle>نموذج مثال</NativeBottomSheetTitle>
                <NativeBottomSheetDescription>
                  يمكنك السحب للأسفل لإغلاق الـ Sheet
                </NativeBottomSheetDescription>
              </NativeBottomSheetHeader>
              
              <div className="px-6 space-y-4 pb-6">
                <div>
                  <label className="native-label mb-2 block">الاسم</label>
                  <input 
                    className="native-input w-full" 
                    placeholder="أدخل الاسم" 
                  />
                </div>
                
                <div>
                  <label className="native-label mb-2 block">البريد الإلكتروني</label>
                  <input 
                    className="native-input w-full" 
                    type="email"
                    placeholder="example@email.com" 
                  />
                </div>
                
                <div className="flex gap-3">
                  <NativeButton 
                    fullWidth 
                    variant="outline"
                    onClick={() => setSheetOpen(false)}
                  >
                    إلغاء
                  </NativeButton>
                  <NativeButton fullWidth>
                    حفظ
                  </NativeButton>
                </div>
              </div>
            </NativeBottomSheetContent>
          </NativeBottomSheet>
        </div>

        {/* Section: Loading States */}
        <div className="space-y-4 px-4">
          <h2 className="native-heading">حالات التحميل</h2>
          
          <NativeCard>
            <NativeCardHeader>
              <NativeCardTitle>Spinners</NativeCardTitle>
            </NativeCardHeader>
            <NativeCardContent>
              <div className="flex items-center justify-around">
                <NativeSpinner size="sm" />
                <NativeSpinner size="default" />
                <NativeSpinner size="lg" />
                <NativeSpinner size="xl" />
              </div>
            </NativeCardContent>
          </NativeCard>

          <NativeCard>
            <NativeCardHeader>
              <NativeCardTitle>Skeleton Loaders</NativeCardTitle>
            </NativeCardHeader>
            <NativeCardContent>
              <div className="space-y-3">
                <NativeSkeleton width="100%" height="24px" />
                <NativeSkeleton width="80%" height="20px" />
                <NativeSkeleton width="60%" height="20px" />
                <div className="flex gap-3 pt-3">
                  <NativeSkeleton width="60px" height="60px" circle />
                  <div className="flex-1 space-y-2">
                    <NativeSkeleton width="100%" height="16px" />
                    <NativeSkeleton width="70%" height="16px" />
                  </div>
                </div>
              </div>
            </NativeCardContent>
          </NativeCard>
        </div>

        {/* Section: Typography */}
        <div className="space-y-4 px-4">
          <h2 className="native-heading">الخطوط (Typography)</h2>
          
          <NativeCard>
            <NativeCardContent className="space-y-3">
              <h1 className="native-title">عنوان رئيسي (Title)</h1>
              <h2 className="native-heading">عنوان فرعي (Heading)</h2>
              <h3 className="native-subheading">عنوان صغير (Subheading)</h3>
              <p className="native-body">نص عادي (Body)</p>
              <p className="native-caption">نص توضيحي (Caption)</p>
              <span className="native-label">Label Text</span>
            </NativeCardContent>
          </NativeCard>
        </div>

        {/* Section: Badges */}
        <div className="space-y-4 px-4">
          <h2 className="native-heading">الشارات (Badges)</h2>
          
          <NativeCard>
            <NativeCardContent>
              <div className="flex flex-wrap gap-2">
                <span className="native-badge">عادي</span>
                <span className="native-badge native-badge-primary">Primary</span>
                <span className="native-badge native-badge-success">Success</span>
                <span className="native-badge native-badge-warning">Warning</span>
                <span className="native-badge native-badge-danger">Danger</span>
              </div>
            </NativeCardContent>
          </NativeCard>
        </div>

        {/* Section: Lists */}
        <div className="space-y-4 px-4">
          <h2 className="native-heading">القوائم (Lists)</h2>
          
          <div className="native-list">
            <div className="native-list-item">
              <Home className="h-5 w-5 text-primary" />
              <span className="flex-1 native-body">الرئيسية</span>
              <span className="native-badge native-badge-primary">3</span>
            </div>
            <div className="native-list-item">
              <Search className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 native-body">البحث</span>
            </div>
            <div className="native-list-item">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 native-body">الإشعارات</span>
              <span className="native-badge native-badge-danger">12</span>
            </div>
            <div className="native-list-item">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 native-body">الملف الشخصي</span>
            </div>
            <div className="native-list-item">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 native-body">الإعدادات</span>
            </div>
          </div>
        </div>

        {/* Section: Interactive Examples */}
        <div className="space-y-4 px-4">
          <h2 className="native-heading">أمثلة تفاعلية</h2>
          
          {/* Product Card Example */}
          <NativeCard pressable variant="elevated">
            <NativeCardContent className="flex items-start gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="native-subheading">منتج مميز</h3>
                <p className="native-caption mt-1">
                  وصف المنتج يظهر هنا مع تفاصيل إضافية
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="native-badge native-badge-success">متوفر</span>
                  <span className="native-body font-bold text-primary">299 ر.س</span>
                </div>
              </div>
            </NativeCardContent>
          </NativeCard>

          {/* Stats Card */}
          <div className="grid grid-cols-2 gap-3">
            <NativeCard pressable>
              <NativeCardContent className="text-center py-6">
                <div className="text-3xl font-bold text-primary mb-1">
                  1,234
                </div>
                <p className="native-caption">إجمالي الطلبات</p>
              </NativeCardContent>
            </NativeCard>
            
            <NativeCard pressable>
              <NativeCardContent className="text-center py-6">
                <div className="text-3xl font-bold text-success mb-1">
                  98%
                </div>
                <p className="native-caption">معدل النجاح</p>
              </NativeCardContent>
            </NativeCard>
          </div>
        </div>

        {/* Section: Toggle Skeleton Demo */}
        <div className="space-y-4 px-4">
          <h2 className="native-heading">Skeleton Loading</h2>
          
          <NativeButton 
            fullWidth 
            variant="outline"
            onClick={() => setShowSkeleton(!showSkeleton)}
          >
            {showSkeleton ? 'إخفاء' : 'عرض'} Skeleton
          </NativeButton>
          
          {showSkeleton && (
            <NativeCard>
              <NativeCardContent className="space-y-3">
                <div className="flex gap-3">
                  <NativeSkeleton width="60px" height="60px" circle />
                  <div className="flex-1 space-y-2">
                    <NativeSkeleton width="100%" height="20px" />
                    <NativeSkeleton width="70%" height="16px" />
                  </div>
                </div>
                <NativeSkeleton width="100%" height="100px" />
                <div className="flex gap-2">
                  <NativeSkeleton width="80px" height="32px" rounded />
                  <NativeSkeleton width="80px" height="32px" rounded />
                </div>
              </NativeCardContent>
            </NativeCard>
          )}
        </div>

        {/* Divider */}
        <div className="native-divider-thick" />

        {/* Info Card */}
        <div className="px-4">
          <NativeCard variant="gradient">
            <NativeCardContent className="py-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="native-heading mb-2">تصميم Native مثالي!</h3>
              <p className="native-caption">
                التطبيق الآن يبدو تماماً مثل تطبيق iOS/Android أصلي
              </p>
            </NativeCardContent>
          </NativeCard>
        </div>
      </div>
    </PageCustomizer>
  )
}


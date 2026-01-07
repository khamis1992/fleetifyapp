# إصلاح مشكلة تطبيق الجوال - البيانات تظهر كـ 0

## المشكلة
بعد تسجيل الدخول في تطبيق الجوال (APK)، جميع المعلومات تظهر كـ 0.

## السبب
في صفحات Mobile كان يتم استخدام:
```javascript
const companyId = user?.user_metadata?.company_id || '';
```
هذا خطأ! الـ `company_id` الصحيح موجود في `user.profile.company_id` أو `user.company.id`.

## المهام

- [x] إصلاح `MobileHome.tsx`
- [x] إصلاح `MobileContractWizard.tsx` (3 مواقع)
- [x] إصلاح `MobileOverdue.tsx` (2 موقعين)
- [x] إصلاح `MobileCars.tsx`
- [x] إصلاح `MobileContracts.tsx`
- [x] التحقق من عدم وجود أخطاء linter

## الملفات المعدلة
1. `src/pages/mobile/MobileHome.tsx`
2. `src/pages/mobile/MobileContractWizard.tsx`
3. `src/pages/mobile/MobileOverdue.tsx`
4. `src/pages/mobile/MobileCars.tsx`
5. `src/pages/mobile/MobileContracts.tsx`

## التغيير
من:
```javascript
const companyId = user?.user_metadata?.company_id || '';
```
إلى:
```javascript
const companyId = user?.profile?.company_id || user?.company?.id || '';
```

## الخطوات القادمة
لإعادة بناء تطبيق الجوال:
```bash
npm run build:mobile
npm run mobile:sync
npm run android:build
```

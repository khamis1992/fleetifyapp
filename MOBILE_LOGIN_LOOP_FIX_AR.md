# إصلاح مشكلة حلقة تسجيل الدخول في تطبيق الجوال (APK)

## 🔴 المشكلة

عند تسجيل الدخول في تطبيق الجوال (APK):
1. ✅ إدخال البريد الإلكتروني وكلمة المرور
2. ✅ الضغط على "تسجيل الدخول"
3. ⏳ يظهر "جاري تسجيل الدخول..."
4. ❌ الصفحة تُحمّل ثم تعود لصفحة تسجيل الدخول
5. ❌ لا يتم الدخول للتطبيق (حلقة لا نهائية)

---

## 🔍 الأسباب المحتملة

### السبب 1: Session لا يتم حفظها في Capacitor Storage
```
المشكلة:
- تسجيل الدخول ينجح في Supabase ✅
- لكن الـ Session لا يتم حفظها في Preferences ❌
- عند إعادة التحقق، لا يوجد session ❌
- النتيجة: العودة لصفحة تسجيل الدخول
```

### السبب 2: AuthContext لا يتعرف على الـ Session
```
المشكلة:
- الـ Session محفوظة ✅
- لكن AuthContext لا يجدها ❌
- السبب: عدم انتظار syncFromPreferences ❌
```

### السبب 3: Redirect يحدث قبل حفظ الـ Session
```
المشكلة:
- Login ينجح ✅
- Redirect يحدث فوراً ❌
- الـ Session لم يتم حفظها بعد ❌
- الصفحة الجديدة تتحقق من الـ Session → لا يوجد ❌
- Redirect لصفحة تسجيل الدخول
```

---

## ✅ الإصلاحات المطبقة

### 1. تحسين Logging في MobileLogin
```typescript
// إضافة logs مفصلة لتتبع المشكلة
console.log('🔄 [MobileLogin useEffect] State:', {
  hasRedirected,
  authLoading,
  user: !!user,
  userId: user?.id,
  loginSuccess,
  pathname: window.location.pathname
});
```

### 2. زيادة وقت التحقق من الـ Session
```typescript
// ❌ قبل: 1 ثانية
const checkDelay = 1000;

// ✅ بعد: 2 ثانية للـ native platforms
const checkDelay = Capacitor.isNativePlatform() ? 2000 : 1000;
```

### 3. تحسين Redirect Logic
```typescript
// إضافة setTimeout للتأكد من اكتمال حفظ الـ state
setTimeout(() => {
  navigate('/mobile/employee/home', { replace: true });
}, 100);
```

### 4. إضافة Error Handling للحلقة
```typescript
// إذا لم يتم تحديث user بعد 3 ثوانٍ
if (loginSuccess && !user) {
  setTimeout(() => {
    if (!user) {
      // إعادة تعيين الحالة للسماح بإعادة المحاولة
      setLoginSuccess(false);
      setIsSubmitting(false);
      setError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    }
  }, 3000);
}
```

### 5. التحقق من localStorage مباشرة
```typescript
// فحص مفاتيح التخزين بعد تسجيل الدخول
const keys = Object.keys(localStorage);
const authKeys = keys.filter(k => k.startsWith('sb-'));
console.log('🔍 [MobileLogin] LocalStorage auth keys:', authKeys);
```

---

## 🧪 خطوات التشخيص

### الخطوة 1: فحص الـ Logs
بعد محاولة تسجيل الدخول، افتح Chrome DevTools:
```bash
chrome://inspect/#devices
```

ابحث عن هذه الرسائل:

#### ✅ تسجيل دخول ناجح:
```
✅ [MobileLogin] Login successful for user: email@example.com
🔑 [MobileLogin] Session received: { access_token: 'present', ... }
🔍 [MobileLogin] Session check after 2000ms: { sessionFound: true, ... }
🔍 [MobileLogin] LocalStorage auth keys: ['sb-alaraf-auth-token', ...]
✅ [MobileLogin] User found, preparing redirect...
✅ [MobileLogin] Navigating to employee home...
```

#### ❌ تسجيل دخول فاشل (حلقة):
```
✅ [MobileLogin] Login successful for user: email@example.com
🔑 [MobileLogin] Session received: { access_token: 'present', ... }
🔍 [MobileLogin] Session check after 2000ms: { sessionFound: false } ❌
🚨 [MobileLogin] CRITICAL: Session not found after login! ❌
⏳ [MobileLogin] Login successful, waiting for AuthContext...
⚠️ [MobileLogin] AuthContext timeout (3s) - user still not set! ❌
```

### الخطوة 2: فحص Capacitor Storage
```javascript
// في Chrome DevTools Console
localStorage.getItem('sb-alaraf-auth-token')
// يجب أن يعيد token
```

### الخطوة 3: فحص Preferences API
```bash
adb shell
run-as com.alaraf.fleetify
cd shared_prefs
cat CapacitorStorage.xml
# يجب أن يحتوي على sb-alaraf-auth-token
```

---

## 🛠️ الحلول الإضافية

### الحل 1: زيادة Timeout في AuthContext
إذا كانت المشكلة في بطء الجهاز:

```typescript
// في AuthContext.tsx
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('Session timeout')), 
    Capacitor.isNativePlatform() ? 15000 : 8000 // 15s للـ native
  )
);
```

### الحل 2: Force Reload بعد Login
إذا استمرت المشكلة:

```typescript
// في MobileLogin.tsx - بعد setLoginSuccess(true)
if (Capacitor.isNativePlatform()) {
  // إعادة تحميل الصفحة للتأكد من تحميل الـ session
  setTimeout(() => {
    window.location.href = '/mobile/employee/home';
  }, 1500);
}
```

### الحل 3: Disable Auto-Redirect
للتشخيص فقط:

```typescript
// تعطيل الـ redirect التلقائي لفحص الـ session
if (user && false) { // تعطيل مؤقت
  navigate('/mobile/employee/home');
}
```

---

## 📋 Checklist للتشخيص

- [ ] تحقق من الـ logs في Chrome DevTools
- [ ] تأكد من وجود `sb-alaraf-auth-token` في localStorage
- [ ] تحقق من أن `sessionFound: true` بعد Login
- [ ] تأكد من أن `user` يتم تحديثه في AuthContext
- [ ] فحص أن الـ redirect يحدث مرة واحدة فقط
- [ ] تأكد من عدم وجود أخطاء في Console

---

## 🎯 الخطوات التالية

### 1. إعادة بناء APK
```bash
npm run build:mobile
npm run android:build
```

### 2. تثبيت على الهاتف
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### 3. الاختبار
1. افتح التطبيق
2. سجل الدخول
3. راقب الـ logs في Chrome DevTools
4. تحقق من الرسائل

### 4. إذا استمرت المشكلة
أرسل لي الـ logs الكاملة من Chrome DevTools وسأحدد المشكلة بالضبط.

---

## 💡 نصائح إضافية

### للتطوير:
- استخدم `chrome://inspect/#devices` لمراقبة الـ logs
- فعّل "Preserve log" في DevTools
- راقب Network tab للتأكد من نجاح الطلبات

### للإنتاج:
- تأكد من أن Capacitor Storage permissions صحيحة
- تحقق من أن `androidScheme: 'https'` في capacitor.config.ts
- تأكد من أن الـ app له صلاحيات الكتابة على Storage

---

## ✅ التحسينات المطبقة

1. ✅ Logging محسّن لتتبع المشكلة
2. ✅ زيادة وقت التحقق من الـ Session (2s للـ native)
3. ✅ إضافة setTimeout قبل الـ navigate
4. ✅ إضافة error handling للحلقة
5. ✅ فحص localStorage مباشرة
6. ✅ إضافة timeout أطول (3s بدلاً من 2s)

**جرب الآن وأخبرني بالنتيجة!** 🎉

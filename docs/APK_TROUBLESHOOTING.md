# APK Troubleshooting Guide
# دليل استكشاف أخطاء APK

## مشكلة: تسجيل الدخول لا يعمل في APK
## Problem: Login Not Working in APK

### الأسباب المحتملة / Possible Causes

1. **متغيرات البيئة غير موجودة / Missing Environment Variables**
   - عند بناء APK، يجب تضمين متغيرات البيئة في وقت البناء
   - Environment variables must be embedded at build time

2. **مشكلة في الاتصال بقاعدة البيانات / Database Connection Issue**
   - تحقق من أن Supabase URL و API Key صحيحة
   - Verify Supabase URL and API Key are correct

3. **مشكلة في التخزين المحلي / Local Storage Issue**
   - Capacitor قد يحتاج إلى أذونات خاصة
   - Capacitor may need special permissions

### خطوات التشخيص / Diagnostic Steps

#### 1. استخدم صفحة التشخيص / Use Diagnostics Page

بعد تثبيت APK، افتح:
After installing APK, open:

```
https://your-app-url/diagnostics
```

أو في التطبيق، انتقل إلى:
Or in the app, navigate to:

```
/diagnostics
```

هذه الصفحة ستعرض:
This page will show:

- ✅ حالة الاتصال بقاعدة البيانات / Database connection status
- ✅ متغيرات البيئة / Environment variables
- ✅ حالة المصادقة / Authentication state
- ✅ التخزين المحلي / Local storage
- ✅ حالة الشبكة / Network status

#### 2. تحقق من السجلات / Check Logs

في Android Studio أو عبر ADB:
In Android Studio or via ADB:

```bash
adb logcat | grep -i "supabase\|auth\|env"
```

ابحث عن:
Look for:

- `[ENV] Supabase Config` - يظهر إعدادات Supabase
- `[SUPABASE]` - رسائل اتصال Supabase
- `[AUTH]` - رسائل المصادقة

#### 3. تحقق من إعدادات Capacitor / Check Capacitor Settings

في `capacitor.config.ts`:

```typescript
server: {
  androidScheme: 'https',
  cleartext: true,  // للسماح بـ HTTP في التطوير
  allowNavigation: ['*']
}
```

### الحلول / Solutions

#### الحل 1: تحديث GitHub Secrets

تأكد من أن GitHub Secrets تحتوي على:
Ensure GitHub Secrets contain:

```
VITE_SUPABASE_URL=https://qwhunliohlkkahbspfiu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=qwhunliohlkkahbspfiu
VITE_API_URL=https://fleetify-backend-production.up.railway.app
VITE_ENCRYPTION_SECRET=your-32-char-secret
```

#### الحل 2: إعادة بناء APK مع المتغيرات الصحيحة

```bash
# محلياً
npm run build
npx cap sync android
npx cap build android

# أو عبر GitHub Actions
git push origin main
```

#### الحل 3: استخدام القيم الاحتياطية

الكود يحتوي على قيم احتياطية (fallback) في `src/lib/env.ts`:

```typescript
const FALLBACK_SUPABASE_URL = "https://qwhunliohlkkahbspfiu.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

هذه القيم يجب أن تعمل حتى لو لم تكن متغيرات البيئة موجودة.
These values should work even if environment variables are missing.

### اختبار الاتصال يدوياً / Test Connection Manually

افتح Chrome DevTools في WebView:
Open Chrome DevTools in WebView:

```bash
# تفعيل WebView debugging
adb shell settings put global webview_devtools_remote_enabled 1

# ثم افتح
# Then open: chrome://inspect
```

في Console، جرب:
In Console, try:

```javascript
// اختبار الاتصال بـ Supabase
// Test Supabase connection
fetch('https://qwhunliohlkkahbspfiu.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'YOUR_ANON_KEY',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### الأخطاء الشائعة / Common Errors

#### خطأ: "Failed to load Supabase configuration"

**السبب:** متغيرات البيئة مفقودة
**الحل:** تحقق من أن `.env` موجود وقت البناء

#### خطأ: "Network request failed"

**السبب:** مشكلة في الاتصال بالإنترنت أو CORS
**الحل:** 
- تحقق من اتصال الإنترنت
- تحقق من إعدادات Supabase CORS

#### خطأ: "Invalid API key"

**السبب:** API Key خاطئ أو منتهي الصلاحية
**الحل:** احصل على API Key جديد من Supabase Dashboard

### معلومات إضافية / Additional Information

#### ملفات مهمة / Important Files

- `src/lib/env.ts` - إدارة متغيرات البيئة
- `src/integrations/supabase/client.ts` - عميل Supabase
- `src/lib/capacitorStorage.ts` - تخزين Capacitor
- `.github/workflows/build-android-apk.yml` - بناء APK

#### روابط مفيدة / Useful Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Debug Bridge (ADB)](https://developer.android.com/tools/adb)

### الدعم / Support

إذا استمرت المشكلة، يرجى:
If the problem persists, please:

1. تشغيل صفحة التشخيص وأخذ لقطة شاشة
   Run diagnostics page and take screenshot

2. جمع السجلات من `adb logcat`
   Collect logs from `adb logcat`

3. التحقق من إصدار التطبيق
   Check app version

4. إرسال تقرير مفصل
   Send detailed report

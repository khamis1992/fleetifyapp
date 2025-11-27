# ⚡ حل سريع - متغيرات البيئة

## 🎯 المشكلة
```
VITE_SUPABASE_ANON_KEY is not set
```

## ✅ الحل (دقيقة واحدة)

### 1. أنشئ ملف `.env.local` في المجلد الرئيسي

**Command Prompt:**
```bash
cd C:\Users\khamis\Desktop\fleetifyapp-3
notepad .env.local
```

### 2. انسخ هذا النص في الملف:

```env
VITE_SUPABASE_URL=https://qwhunliohlkkahbspfiu.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_KEY_HERE
```

### 3. احصل على المفتاح

**من Supabase Dashboard:**
1. https://supabase.com/dashboard
2. اختر المشروع: `qwhunliohlkkahbspfiu`
3. Settings → API
4. انسخ المفتاح `anon` / `public`
5. استبدل `YOUR_KEY_HERE` بالمفتاح الحقيقي

### 4. احفظ وأعد التشغيل

```bash
# أوقف الخادم (Ctrl+C)
# ثم:
npm run dev
```

---

## ✅ تحقق من النجاح

افتح المتصفح وConsole (F12):
- ✅ يظهر: `✅ [SUPABASE] Environment variables validated successfully`
- ✅ التطبيق يعمل بشكل صحيح

---

**للتفاصيل الكاملة:** اقرأ `ENV_SETUP_INSTRUCTIONS.md`


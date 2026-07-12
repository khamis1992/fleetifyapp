# 🔑 إعداد متغيرات البيئة (Environment Variables)

## ❌ المشكلة الحالية

التطبيق لا يعمل لأن ملف `.env.local` غير موجود أو لا يحتوي على المتغيرات المطلوبة.

**الخطأ:**
```
VITE_SUPABASE_ANON_KEY environment variable is not set
```

---

## ✅ الحل (خطوة بخطوة)

### الخطوة 1: إنشاء ملف `.env.local`

في المجلد الرئيسي للمشروع (`C:\Users\khamis\Desktop\fleetifyapp-3`), أنشئ ملف جديد باسم:
```
.env.local
```

**كيفية إنشاء الملف:**

#### طريقة 1: باستخدام Command Prompt
```bash
cd C:\Users\khamis\Desktop\fleetifyapp-3
echo # Supabase Configuration > .env.local
```

#### طريقة 2: باستخدام Notepad
1. افتح Notepad
2. احفظ الملف باسم `.env.local` (مع النقطة في البداية)
3. اختر "All Files" في نوع الملف (وليس Text Document)
4. احفظه في المجلد الرئيسي للمشروع

#### طريقة 3: باستخدام VS Code/Cursor
1. في Explorer، اضغط زر الفأرة الأيمن على المجلد الرئيسي
2. اختر "New File"
3. سمه `.env.local`

---

### الخطوة 2: املأ الملف بالمحتوى التالي

انسخ والصق هذا النص **بالضبط** في ملف `.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://qwhunliohlkkahbspfiu.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ACTUAL_SUPABASE_ANON_KEY_HERE
```

⚠️ **مهم:** استبدل `YOUR_ACTUAL_SUPABASE_ANON_KEY_HERE` بالمفتاح الحقيقي!

---

### الخطوة 3: احصل على Supabase Anon Key

#### الطريقة الأولى: من Supabase Dashboard
1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك: `qwhunliohlkkahbspfiu`
3. اذهب إلى: **Settings** → **API**
4. انزل إلى قسم **Project API keys**
5. انسخ المفتاح بجوار `anon` أو `public`

#### الطريقة الثانية: إذا كان لديك المفتاح بالفعل
- ابحث في ملفات المشروع القديمة
- ابحث في Vercel Environment Variables
- ابحث في notes/emails قديمة

---

### الخطوة 4: احفظ الملف وأعد تشغيل الخادم

```bash
# 1. أوقف الخادم الحالي
Ctrl+C

# 2. شغل الخادم من جديد
npm run dev

# 3. افتح المتصفح
http://localhost:5173
```

---

## 🔍 التحقق من الإعداد الصحيح

بعد إنشاء الملف وإعادة التشغيل، افتح Console في المتصفح (F12):

### ✅ إذا رأيت:
```
✅ [SUPABASE] Environment variables validated successfully
```
**يعني: نجح الإعداد! 🎉**

### ❌ إذا رأيت:
```
❌ Error: VITE_SUPABASE_ANON_KEY environment variable is not set
```
**يعني: المفتاح غير صحيح أو الملف غير موجود**

---

## 📝 مثال على ملف `.env.local` صحيح

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://qwhunliohlkkahbspfiu.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

⚠️ **تحذير:** المفتاح أعلاه مثال فقط. استخدم مفتاحك الحقيقي!

---

## ❓ الأسئلة الشائعة

### س: أين أجد ملف `.env.local`؟
**ج:** في المجلد الرئيسي للمشروع:
```
C:\Users\khamis\Desktop\fleetifyapp-3\.env.local
```

### س: لماذا لا أرى الملف في File Explorer؟
**ج:** الملفات التي تبدأ بنقطة (.) مخفية في Windows. في File Explorer:
1. اذهب إلى **View** → **Show** → **Hidden items**
2. أو افتح المشروع في VS Code/Cursor

### س: هل يمكنني استخدام `.env` بدلاً من `.env.local`؟
**ج:** نعم، ولكن `.env.local` أفضل لأنه:
- لا يُرفع إلى Git
- خاص بجهازك المحلي
- أكثر أماناً

### س: نسيت المفتاح، ماذا أفعل؟
**ج:** يمكنك:
1. الحصول عليه من Supabase Dashboard
2. إنشاء مفتاح جديد في Supabase
3. التواصل مع المطور الأصلي

---

## 🆘 إذا لم ينجح الحل

أرسل لي:
1. Screenshot من ملف `.env.local` (احذف المفتاح من Screenshot!)
2. Screenshot من Console (F12)
3. رسائل Terminal عند تشغيل `npm run dev`

**سأساعدك في الحل! 💪**

---

## 📌 ملاحظة مهمة

**لا تنشر ملف `.env.local` على GitHub!**
- المفتاح سري ويجب حمايته
- الملف مُضاف تلقائياً إلى `.gitignore`
- لا تشاركه مع أحد

---

**بالتوفيق! 🚀**


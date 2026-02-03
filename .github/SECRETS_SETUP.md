# GitHub Secrets Setup Guide
# دليل إعداد أسرار GitHub

## Required Secrets for APK Build
## الأسرار المطلوبة لبناء APK

لبناء APK بنجاح، يجب إضافة الأسرار التالية في GitHub:
To build APK successfully, add the following secrets in GitHub:

### خطوات الإضافة / Steps to Add

1. اذهب إلى / Go to: `Settings` → `Secrets and variables` → `Actions`
2. انقر / Click: `New repository secret`
3. أضف كل سر من القائمة أدناه / Add each secret from the list below

### قائمة الأسرار المطلوبة / Required Secrets List

#### 1. Supabase Configuration

```
Name: VITE_SUPABASE_URL
Value: https://qwhunliohlkkahbspfiu.supabase.co
```

```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs
```

```
Name: VITE_SUPABASE_PROJECT_ID
Value: qwhunliohlkkahbspfiu
```

#### 2. API Configuration

```
Name: VITE_API_URL
Value: https://fleetify-backend-production.up.railway.app
```

#### 3. Security

```
Name: VITE_ENCRYPTION_SECRET
Value: 12345678901234567890123456789012
```

⚠️ **مهم:** يجب أن يكون طول VITE_ENCRYPTION_SECRET بالضبط 32 حرف
⚠️ **Important:** VITE_ENCRYPTION_SECRET must be exactly 32 characters

#### 4. Android Signing (Optional - للإصدارات / for releases)

```
Name: ANDROID_KEYSTORE_FILE
Value: <base64 encoded keystore file>
```

```
Name: ANDROID_KEYSTORE_PASSWORD
Value: <your keystore password>
```

```
Name: ANDROID_KEY_ALIAS
Value: <your key alias>
```

```
Name: ANDROID_KEY_PASSWORD
Value: <your key password>
```

### كيفية إنشاء Keystore / How to Create Keystore

```bash
keytool -genkey -v -keystore release.keystore -alias alaraf -keyalg RSA -keysize 2048 -validity 10000
```

### كيفية تحويل Keystore إلى Base64 / How to Convert Keystore to Base64

```bash
# Linux/Mac
base64 release.keystore | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore"))
```

### التحقق من الأسرار / Verify Secrets

بعد إضافة الأسرار، يمكنك التحقق من خلال:
After adding secrets, you can verify by:

1. تشغيل workflow يدوياً / Run workflow manually
2. التحقق من السجلات / Check logs
3. تنزيل APK واختباره / Download APK and test

### استكشاف الأخطاء / Troubleshooting

#### المشكلة: "Missing required Supabase configuration"

**الحل:**
- تأكد من إضافة `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`
- تحقق من عدم وجود مسافات إضافية في القيم

#### المشكلة: "Build failed - environment variables not found"

**الحل:**
- تأكد من أن أسماء الأسرار صحيحة تماماً (حساسة لحالة الأحرف)
- تحقق من أن workflow يستخدم الأسرار بشكل صحيح

#### المشكلة: "Login not working in APK"

**الحل:**
- تحقق من أن القيم في الأسرار صحيحة
- راجع `docs/APK_TROUBLESHOOTING.md`
- استخدم صفحة `/diagnostics` في التطبيق

### ملاحظات أمنية / Security Notes

⚠️ **لا تشارك هذه القيم علناً / DO NOT share these values publicly**

- الأسرار حساسة ويجب حمايتها
- لا تضعها في الكود أو commit
- استخدم GitHub Secrets فقط
- غيّر الأسرار بشكل دوري

### موارد إضافية / Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Capacitor Android Configuration](https://capacitorjs.com/docs/android/configuration)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

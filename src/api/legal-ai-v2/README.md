# المستشار القانوني الذكي v2.0 🤖⚖️

> نظام ذكي متقدم للاستشارات القانونية والاستعلامات الذكية عن بيانات تطبيق Fleetify

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](tests/)

## ✨ الميزات الجديدة

### 🧠 فهم متقدم للاستفسارات العربية
- **معالجة اللغة الطبيعية**: فهم عميق للنصوص العربية مع دعم التشكيل واللهجات
- **المرادفات الذكية**: يفهم "مركبة، سيارة، عربة، آلية" كمعنى واحد
- **اللهجات المحلية**: دعم اللهجات الكويتية والسعودية والعراقية
- **التصحيح التلقائي**: تصحيح الأخطاء الإملائية البسيطة

### 🔍 استعلامات ذكية عن البيانات
- **استعلامات العد**: "كم عدد العملاء؟"، "كم مركبة متاحة؟"
- **استعلامات العرض**: "اعرض العملاء المتأخرين"
- **الحسابات المالية**: "إجمالي المتأخرات"، "متوسط الإيجار"
- **التقارير التفاعلية**: ملخصات وإحصائيات مفصلة

### ⚖️ استشارات قانونية محسنة
- **نزاعات الإيجار**: كيفية التعامل مع العملاء المتأخرين
- **المخالفات المرورية**: الإجراءات القانونية المطلوبة
- **إنهاء العقود**: الخطوات القانونية الصحيحة
- **تحصيل الديون**: الطرق القانونية للتحصيل

### 🚀 أداء محسن
- **تخزين مؤقت ذكي**: استجابة سريعة للاستفسارات المتكررة
- **معالجة متوازية**: دعم الاستفسارات المتزامنة
- **تحسين قاعدة البيانات**: استعلامات محسنة وفهارس ذكية

## 🏗️ البنية التقنية

```
src/api/legal-ai-v2/
├── 🧠 enhanced_unified_legal_ai_system.py    # النظام الموحد الرئيسي
├── 🔤 arabic_query_processor.py              # معالج الاستفسارات العربية
├── ⚡ smart_query_engine.py                  # محرك الاستعلامات الذكي
├── 🗄️ real_database_connector.py             # موصل قاعدة البيانات
├── 🌐 api_endpoints.py                       # نقاط النهاية للAPI
├── 🐳 Dockerfile                             # إعدادات Docker
├── 🔧 docker-compose.yml                     # تكوين الخدمات
├── 📋 requirements.txt                       # المتطلبات
├── 🧪 tests/                                 # الاختبارات الشاملة
└── 📚 docs/                                  # التوثيق
```

## 🚀 البدء السريع

### 1. المتطلبات الأساسية

```bash
# Python 3.11+
python --version

# Redis للتخزين المؤقت
redis-server --version

# قاعدة بيانات Supabase
# حساب Supabase نشط
```

### 2. التثبيت

```bash
# استنساخ المشروع
git clone https://github.com/khamis1992/fleetifyapp.git
cd fleetifyapp/src/api/legal-ai-v2

# إنشاء البيئة الافتراضية
python -m venv venv
source venv/bin/activate  # Linux/Mac
# أو
venv\Scripts\activate     # Windows

# تثبيت المتطلبات
pip install -r requirements.txt
```

### 3. الإعداد

```bash
# إنشاء ملف البيئة
cp .env.example .env

# تحرير الإعدادات
nano .env
```

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
REDIS_HOST=localhost
REDIS_PORT=6379
DEBUG=true
HOST=0.0.0.0
PORT=8000
```

### 4. التشغيل

```bash
# تشغيل الاختبارات
python run_tests.py

# تشغيل الخادم
python api_endpoints.py

# أو باستخدام uvicorn
uvicorn api_endpoints:app --host 0.0.0.0 --port 8000 --reload
```

### 5. الاختبار

```bash
# فحص صحة الخدمة
curl http://localhost:8000/api/legal-ai/health

# اختبار استفسار
curl -X POST http://localhost:8000/api/legal-ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "كم عدد العملاء؟"}'
```

## 🐳 النشر باستخدام Docker

```bash
# بناء الصورة
docker build -t legal-ai:v2.0 .

# تشغيل الحاوية
docker run -p 8000:8000 --env-file .env legal-ai:v2.0

# أو استخدام docker-compose
docker-compose up -d
```

## 📖 أمثلة الاستخدام

### استعلامات البيانات

```python
import requests

# عدد العملاء
response = requests.post('http://localhost:8000/api/legal-ai/query', 
    json={'query': 'كم عدد العملاء المسجلين؟'})

# المركبات في الصيانة
response = requests.post('http://localhost:8000/api/legal-ai/query', 
    json={'query': 'كم مركبة في الصيانة؟'})

# إجمالي المتأخرات
response = requests.post('http://localhost:8000/api/legal-ai/query', 
    json={'query': 'إجمالي المتأخرات على العملاء'})
```

### الاستشارات القانونية

```python
# التعامل مع العملاء المتأخرين
response = requests.post('http://localhost:8000/api/legal-ai/query', 
    json={'query': 'كيف أتعامل مع عميل متأخر في الدفع؟'})

# إجراءات إنهاء العقد
response = requests.post('http://localhost:8000/api/legal-ai/query', 
    json={'query': 'ما هي إجراءات إنهاء العقد؟'})
```

### الاستفسارات المختلطة

```python
# بيانات مع استشارة قانونية
response = requests.post('http://localhost:8000/api/legal-ai/query', 
    json={'query': 'ما هي المتأخرات وكيف أحصلها قانونياً؟'})
```

## 🧪 الاختبار

### تشغيل جميع الاختبارات

```bash
# الاختبارات الشاملة
python run_tests.py

# اختبارات محددة
python -m pytest tests/test_arabic_query_processor.py -v
python -m pytest tests/test_performance.py -v -s
```

### تقرير التغطية

```bash
pytest --cov=. --cov-report=html --cov-report=term
```

## 📊 مراقبة الأداء

### نقاط النهاية للمراقبة

```bash
# فحص الصحة
GET /api/legal-ai/health

# حالة النظام
GET /api/legal-ai/status

# الإحصائيات
GET /api/legal-ai/analytics
```

### مؤشرات الأداء

- **وقت الاستجابة**: < 500ms للاستفسارات البسيطة
- **معدل النجاح**: > 95% للاستفسارات المفهومة
- **دقة الفهم**: > 85% للاستفسارات العربية
- **التخزين المؤقت**: تحسين 70% في السرعة للاستفسارات المتكررة

## 🔧 التخصيص والتطوير

### إضافة مرادفات جديدة

```python
# في arabic_query_processor.py
self.synonyms = {
    'vehicles': ['سيارة', 'مركبة', 'عربة', 'آلية', 'كلمة_جديدة'],
    'customers': ['عميل', 'زبون', 'مستأجر', 'مرادف_جديد'],
}
```

### إضافة قوالب قانونية

```python
# في enhanced_unified_legal_ai_system.py
self.legal_templates = {
    'new_category': {
        'title': 'عنوان جديد',
        'template': 'نص القالب مع {placeholder}',
        'keywords': ['كلمة1', 'كلمة2'],
        'confidence': 0.8
    }
}
```

## 📚 التوثيق

- **[دليل المستخدم](USER_GUIDE.md)**: كيفية استخدام النظام
- **[دليل التطوير](DEVELOPER_GUIDE.md)**: التطوير والتخصيص
- **[دليل النشر](DEPLOYMENT_GUIDE.md)**: النشر والتشغيل
- **[توثيق API](API_DOCUMENTATION.md)**: مرجع شامل للAPI

## 🔒 الأمان

- **تشفير البيانات**: جميع البيانات الحساسة مشفرة
- **التحقق من الصلاحيات**: وصول محدود حسب المستخدم
- **تسجيل العمليات**: تسجيل شامل لجميع الأنشطة
- **حماية من الهجمات**: حماية من SQL injection وXSS

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى قراءة [دليل المساهمة](CONTRIBUTING.md) قبل البدء.

### خطوات المساهمة

1. Fork المشروع
2. إنشاء branch للميزة الجديدة
3. تطوير الميزة مع الاختبارات
4. تشغيل جميع الاختبارات
5. إنشاء Pull Request

## 📈 الإحصائيات

- **🔤 دعم اللغة**: 100% عربي مع دعم اللهجات
- **⚡ الأداء**: استجابة < 500ms
- **🎯 الدقة**: > 85% في فهم الاستفسارات
- **🧪 التغطية**: > 80% تغطية اختبارات
- **📊 الاستعلامات**: دعم 15+ نوع استعلام

## 🗺️ خارطة الطريق

### الإصدار 2.1 (قريباً)
- [ ] دعم الصوت (Speech-to-Text)
- [ ] واجهة مستخدم محسنة
- [ ] تقارير PDF تلقائية
- [ ] دعم المزيد من اللهجات

### الإصدار 2.2
- [ ] تكامل مع WhatsApp
- [ ] ذكاء اصطناعي متقدم
- [ ] تحليلات تنبؤية
- [ ] دعم متعدد اللغات

## 📞 الدعم

- **📧 البريد الإلكتروني**: support@fleetify.com
- **💬 Discord**: [رابط الخادم](https://discord.gg/fleetify)
- **📱 Telegram**: [@FleetifySupport](https://t.me/FleetifySupport)
- **🐛 تقارير الأخطاء**: [GitHub Issues](https://github.com/khamis1992/fleetifyapp/issues)

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 🙏 شكر وتقدير

- **فريق Fleetify**: للرؤية والدعم
- **مجتمع Python**: للأدوات الرائعة
- **مجتمع المطورين العرب**: للإلهام والدعم

---

<div align="center">

**صنع بـ ❤️ في الكويت**

[![GitHub Stars](https://img.shields.io/github/stars/khamis1992/fleetifyapp?style=social)](https://github.com/khamis1992/fleetifyapp)
[![GitHub Forks](https://img.shields.io/github/forks/khamis1992/fleetifyapp?style=social)](https://github.com/khamis1992/fleetifyapp)
[![GitHub Issues](https://img.shields.io/github/issues/khamis1992/fleetifyapp)](https://github.com/khamis1992/fleetifyapp/issues)

</div>


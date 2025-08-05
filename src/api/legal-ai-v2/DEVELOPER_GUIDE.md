# دليل التطوير والصيانة - المستشار القانوني الذكي v2.0

## نظرة عامة على البنية

### المكونات الأساسية

```
src/api/legal-ai-v2/
├── enhanced_unified_legal_ai_system.py    # النظام الموحد الرئيسي
├── arabic_query_processor.py              # معالج الاستفسارات العربية
├── smart_query_engine.py                  # محرك الاستعلامات الذكي
├── real_database_connector.py             # موصل قاعدة البيانات
├── api_endpoints.py                       # نقاط النهاية للAPI
├── requirements.txt                       # المتطلبات
├── Dockerfile                             # إعدادات Docker
├── docker-compose.yml                     # تكوين الخدمات
└── tests/                                 # الاختبارات
    ├── test_arabic_query_processor.py
    ├── test_enhanced_unified_system.py
    └── test_performance.py
```

## البنية التقنية

### 1. معالج الاستفسارات العربية (ArabicQueryProcessor)

**الوظائف الأساسية:**
- تطبيع النص العربي
- استخراج الكيانات (entities)
- تصنيف نوع الاستفسار
- تحديد نوع العملية المطلوبة

**الكلاسات والوظائف:**
```python
class ArabicQueryProcessor:
    def normalize_text(self, text: str) -> str
    def extract_entities(self, text: str) -> List[Tuple[str, str]]
    def classify_query_type(self, text: str, entities: List) -> QueryType
    def determine_action(self, text: str) -> QueryAction
    def process_query(self, query: str) -> QueryResult
```

### 2. محرك الاستعلامات الذكي (SmartQueryEngine)

**الوظائف الأساسية:**
- تحويل الاستفسارات إلى SQL
- تنفيذ الاستعلامات على قاعدة البيانات
- معالجة النتائج وتنسيقها
- إدارة التخزين المؤقت

**الكلاسات والوظائف:**
```python
class SmartQueryEngine:
    def build_sql_query(self, query_result: QueryResult) -> str
    def execute_query(self, sql: str) -> Dict[str, Any]
    def format_response(self, data: Dict, query_type: QueryType) -> str
    def process_query(self, query: str) -> SmartQueryResponse
```

### 3. النظام الموحد المحسن (EnhancedUnifiedLegalAISystem)

**الوظائف الأساسية:**
- تنسيق العمل بين المكونات
- تصنيف نية الاستفسار
- معالجة الاستشارات القانونية
- إدارة الاستجابات المختلطة

## إعداد بيئة التطوير

### 1. المتطلبات الأساسية

```bash
# Python 3.11+
python --version

# قاعدة بيانات Supabase
# Redis للتخزين المؤقت
# Docker (اختياري)
```

### 2. تثبيت المتطلبات

```bash
# إنشاء بيئة افتراضية
python -m venv legal_ai_env
source legal_ai_env/bin/activate  # Linux/Mac
# أو
legal_ai_env\Scripts\activate     # Windows

# تثبيت المتطلبات
pip install -r requirements.txt
```

### 3. إعداد متغيرات البيئة

```bash
# إنشاء ملف .env
cat > .env << EOF
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
REDIS_HOST=localhost
REDIS_PORT=6379
DEBUG=true
HOST=0.0.0.0
PORT=8000
EOF
```

## التطوير والتخصيص

### 1. إضافة مرادفات جديدة

```python
# في arabic_query_processor.py
def __init__(self):
    self.synonyms = {
        'vehicles': ['سيارة', 'مركبة', 'عربة', 'آلية', 'مركبة_جديدة'],
        'customers': ['عميل', 'زبون', 'مستأجر', 'عضو', 'مشترك_جديد'],
        # إضافة مرادفات جديدة هنا
    }
```

### 2. إضافة قوالب قانونية جديدة

```python
# في enhanced_unified_legal_ai_system.py
def __init__(self, db_config):
    self.legal_templates = {
        'new_category': {
            'title': 'عنوان القالب الجديد',
            'template': 'نص القالب مع {placeholder}',
            'keywords': ['كلمة1', 'كلمة2', 'كلمة3'],
            'confidence': 0.8
        }
    }
```

### 3. إضافة نوع استعلام جديد

```python
# في arabic_query_processor.py
class QueryType(Enum):
    VEHICLES = "vehicles"
    CUSTOMERS = "customers"
    PAYMENTS = "payments"
    NEW_TYPE = "new_type"  # نوع جديد

# إضافة منطق التصنيف
def classify_query_type(self, text: str, entities: List) -> QueryType:
    if any(keyword in text for keyword in ['كلمة_مفتاحية_جديدة']):
        return QueryType.NEW_TYPE
```

### 4. تخصيص استجابات قاعدة البيانات

```python
# في smart_query_engine.py
def build_sql_query(self, query_result: QueryResult) -> str:
    if query_result.query_type == QueryType.NEW_TYPE:
        return self._build_new_type_query(query_result)
    
def _build_new_type_query(self, query_result: QueryResult) -> str:
    # منطق بناء الاستعلام الجديد
    return "SELECT * FROM new_table WHERE condition"
```

## الاختبار والجودة

### 1. تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
python run_tests.py

# تشغيل اختبارات محددة
python -m pytest tests/test_arabic_query_processor.py -v

# اختبارات الأداء
python -m pytest tests/test_performance.py -v -s
```

### 2. فحص جودة الكود

```bash
# فحص التنسيق
black --check *.py

# فحص الأخطاء
flake8 --max-line-length=100 *.py

# تقرير التغطية
pytest --cov=. --cov-report=html
```

### 3. إضافة اختبارات جديدة

```python
# مثال على اختبار جديد
def test_new_feature(self, processor):
    """اختبار الميزة الجديدة"""
    result = processor.process_query('استفسار جديد')
    assert result.success == True
    assert result.query_type == QueryType.NEW_TYPE
```

## النشر والإنتاج

### 1. النشر باستخدام Docker

```bash
# بناء الصورة
docker build -t legal-ai:v2.0 .

# تشغيل الحاوية
docker run -p 8000:8000 --env-file .env legal-ai:v2.0

# أو استخدام docker-compose
docker-compose up -d
```

### 2. النشر على خادم الإنتاج

```bash
# تحديث الكود
git pull origin main

# تثبيت المتطلبات
pip install -r requirements.txt

# تشغيل الاختبارات
python run_tests.py

# إعادة تشغيل الخدمة
systemctl restart legal-ai-service
```

### 3. مراقبة الأداء

```bash
# فحص حالة الخدمة
curl http://localhost:8000/api/legal-ai/health

# فحص حالة النظام
curl http://localhost:8000/api/legal-ai/status

# مراقبة السجلات
tail -f /var/log/legal-ai/app.log
```

## الصيانة والتحسين

### 1. تحسين الأداء

**قاعدة البيانات:**
```sql
-- إضافة فهارس للاستعلامات السريعة
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_vehicles_maintenance ON vehicles(maintenance_status);
CREATE INDEX idx_payments_overdue ON payments(is_overdue);
```

**التخزين المؤقت:**
```python
# تحسين إعدادات Redis
redis_config = {
    'host': 'localhost',
    'port': 6379,
    'db': 0,
    'max_connections': 20,
    'socket_keepalive': True,
    'socket_keepalive_options': {}
}
```

### 2. مراقبة الأخطاء

```python
# إضافة تسجيل مفصل
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('legal_ai.log'),
        logging.StreamHandler()
    ]
)
```

### 3. النسخ الاحتياطي

```bash
# نسخ احتياطي لقاعدة البيانات
pg_dump -U username -h hostname database_name > backup.sql

# نسخ احتياطي للتكوين
tar -czf config_backup.tar.gz *.env *.conf *.yml
```

## استكشاف الأخطاء وحلها

### 1. مشاكل الاتصال بقاعدة البيانات

```python
# فحص الاتصال
def test_database_connection():
    try:
        response = supabase.table('customers').select('count').execute()
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
```

### 2. مشاكل معالجة النصوص العربية

```python
# فحص تشفير النص
def debug_text_processing(text):
    logger.info(f"Original text: {text}")
    logger.info(f"Encoding: {text.encode('utf-8')}")
    normalized = normalize_text(text)
    logger.info(f"Normalized: {normalized}")
```

### 3. مشاكل الأداء

```python
# قياس أوقات التنفيذ
import time
from functools import wraps

def measure_time(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        logger.info(f"{func.__name__} took {end-start:.3f}s")
        return result
    return wrapper
```

## الأمان والحماية

### 1. التحقق من الصلاحيات

```python
def verify_permissions(user_id: str, company_id: str) -> bool:
    # التحقق من صلاحيات المستخدم
    user = get_user(user_id)
    return user.company_id == company_id and user.has_legal_ai_access
```

### 2. تشفير البيانات الحساسة

```python
from cryptography.fernet import Fernet

def encrypt_sensitive_data(data: str) -> str:
    key = os.getenv('ENCRYPTION_KEY')
    f = Fernet(key)
    return f.encrypt(data.encode()).decode()
```

### 3. تسجيل العمليات

```python
def log_user_activity(user_id: str, query: str, response_type: str):
    activity_log = {
        'user_id': user_id,
        'timestamp': datetime.now(),
        'query': query[:100],  # أول 100 حرف فقط
        'response_type': response_type
    }
    # حفظ في قاعدة البيانات أو ملف السجل
```

## المساهمة في التطوير

### 1. إرشادات المساهمة

- اتبع معايير PEP 8 للكود Python
- اكتب اختبارات لأي ميزة جديدة
- وثق التغييرات في CHANGELOG.md
- استخدم رسائل commit واضحة

### 2. عملية المراجعة

1. إنشاء branch جديد للميزة
2. تطوير الميزة مع الاختبارات
3. تشغيل جميع الاختبارات
4. إنشاء Pull Request
5. مراجعة الكود
6. دمج التغييرات

### 3. معايير الجودة

- تغطية اختبارات > 80%
- جميع الاختبارات تنجح
- لا توجد تحذيرات من flake8
- الكود منسق بـ black

---

*آخر تحديث: أغسطس 2025*
*الإصدار: 2.0.0*


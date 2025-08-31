# React/TypeScript Application Developer Guide

This document provides a comprehensive developer guide for the React/TypeScript application built on Lovable platform, focusing on type safety, database integration, and error prevention.

## Project Overview

### Technology Stack

This application is built using:
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: Supabase (PostgreSQL)
- **Build Tool**: Vite
- **Platform**: Lovable (automated deployment and development)
- **State Management**: React hooks and context
- **UI Components**: Custom components with shadcn/ui

### Architecture Principles

1. **Type Safety First**: Comprehensive TypeScript coverage
2. **Database-Driven**: Supabase-first architecture with generated types
3. **Component-Based**: Modular, reusable React components
4. **Design System**: Consistent styling with semantic tokens
5. **Error Prevention**: Proactive error handling and validation

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── finance/         # Financial management components
│   ├── legal/           # Legal case management
│   └── shared/          # Shared business components
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── integrations/        # External service integrations
│   └── supabase/        # Supabase client and types
├── pages/               # Application pages/routes
├── lib/                 # Utility functions and configs
├── assets/              # Static assets
└── styles/              # Global styles and design system

docs/                    # Documentation
├── TYPE_SAFETY_GUIDE.md
├── DATABASE_SCHEMA_GUIDE.md
├── INTEGRATION_PATTERNS_GUIDE.md
└── ERROR_PREVENTION_GUIDE.md

scripts/                 # Development and validation scripts
├── schema-validator.js
└── type-checker.js
```

## Development Environment Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git for version control
- VS Code (recommended) with TypeScript extensions

### Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Environment Configuration

```bash
# .env file
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Development settings
VITE_ENABLE_DEBUG=true
VITE_API_BASE_URL=http://localhost:3000
```

## Type Safety and Development Standards

### TypeScript Configuration

Our `tsconfig.json` is configured for strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Database Type Integration

Always use generated Supabase types:

```typescript
import { Database } from '@/integrations/supabase/types';

// Extract table types
type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

// Use in components
interface CustomerListProps {
  customers: Customer[];
  onUpdate: (customer: CustomerUpdate) => void;
}
```

### Component Development Standards

```typescript
// Component structure
interface ComponentProps {
  // Required props first
  data: Customer;
  onAction: (id: string) => void;
  
  // Optional props last
  className?: string;
  variant?: 'default' | 'compact';
}

export function Component({ 
  data, 
  onAction, 
  className,
  variant = 'default' 
}: ComponentProps) {
  // Hooks at the top
  const [loading, setLoading] = useState(false);
  
  // Event handlers
  const handleClick = useCallback(() => {
    onAction(data.id);
  }, [onAction, data.id]);
  
  // Early returns for loading/error states
  if (!data) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className={cn("base-styles", className)}>
      {/* Component content */}
    </div>
  );
}
```

## Quality Assurance and Testing

### Automated Quality Checks

We've implemented comprehensive quality checks to prevent TypeScript errors and maintain code quality:

```bash
# Run all quality checks
npm run quality-check

# Individual checks
npm run type-check        # TypeScript compilation
npm run validate-schema   # Database schema validation
npm run check-types       # Custom type consistency checking
npm run lint             # ESLint validation
npm run test             # Unit tests
```

### Pre-commit Validation

Before committing code, run:

```bash
npm run pre-commit
```

This runs:
1. TypeScript type checking
2. Schema validation
3. Type consistency checks
4. Linting
5. Unit tests

### Database Migration Workflow

1. **Plan Changes**: Document required database changes
2. **Create Migration**: Use Supabase migration tool
3. **Update Types**: Regenerate TypeScript types
4. **Update Code**: Modify application code to use new types
5. **Test**: Run all quality checks
6. **Deploy**: Deploy changes through Lovable platform

### Testing Strategy

```typescript
// Example test structure
describe('Customer Management', () => {
  describe('useCustomers hook', () => {
    it('should fetch customers successfully', async () => {
      const { result } = renderHook(() => useCustomers('company-id'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.customers).toEqual(expect.any(Array));
      expect(result.current.error).toBeNull();
    });
  });

  describe('CustomerForm component', () => {
    it('should validate required fields', async () => {
      render(<CustomerForm />);
      
      fireEvent.click(screen.getByText('Submit'));
      
      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });
    });
  });
});
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


# توثيق API - المستشار القانوني الذكي v2.0

## نظرة عامة

يوفر المستشار القانوني الذكي واجهة برمجية RESTful للتفاعل مع النظام. جميع نقاط النهاية تدعم JSON وتتطلب ترويسات HTTP مناسبة.

**Base URL**: `http://localhost:8000/api/legal-ai`

## المصادقة

النظام يدعم المصادقة عبر الترويسات:

```http
X-Company-ID: your-company-id
X-User-ID: your-user-id
Authorization: Bearer your-jwt-token
```

## نقاط النهاية

### 1. فحص صحة الخدمة

**GET** `/health`

فحص سريع لحالة الخدمة.

#### الاستجابة

```json
{
  "status": "healthy",
  "timestamp": "2025-08-05T14:30:00Z",
  "version": "2.0.0"
}
```

#### أمثلة

```bash
curl -X GET http://localhost:8000/api/legal-ai/health
```

```python
import requests

response = requests.get('http://localhost:8000/api/legal-ai/health')
print(response.json())
```

---

### 2. حالة النظام

**GET** `/status`

الحصول على حالة تفصيلية لجميع مكونات النظام.

#### الاستجابة

```json
{
  "legal_ai": true,
  "smart_engine": true,
  "database": true,
  "cache": true,
  "timestamp": "2025-08-05T14:30:00Z"
}
```

#### أمثلة

```bash
curl -X GET http://localhost:8000/api/legal-ai/status
```

```python
import requests

response = requests.get('http://localhost:8000/api/legal-ai/status')
status = response.json()

if all(status.values()):
    print("جميع الأنظمة تعمل بشكل طبيعي")
else:
    print("يوجد مشكلة في بعض الأنظمة")
```

---

### 3. معالجة الاستفسار

**POST** `/query`

معالجة استفسار المستخدم والحصول على الاستجابة.

#### طلب البيانات

```json
{
  "query": "كم عدد العملاء المسجلين؟",
  "company_id": "optional-company-id",
  "user_id": "optional-user-id"
}
```

#### الاستجابة

```json
{
  "success": true,
  "response_type": "data_query",
  "response_text": "عدد العملاء المسجلين في النظام هو 150 عميل.",
  "data": {
    "count": 150,
    "active": 120,
    "inactive": 30
  },
  "confidence": 0.95,
  "execution_time": 0.234,
  "suggestions": [
    "كم عدد العملاء النشطين؟",
    "اعرض العملاء المتأخرين"
  ],
  "legal_references": null,
  "query_understood": true,
  "cached": false,
  "error_message": null
}
```

#### أنواع الاستجابة

- `legal_advice`: استشارة قانونية
- `data_query`: استعلام بيانات
- `mixed`: مزيج من الاثنين
- `error`: خطأ في المعالجة

#### أمثلة

**استعلام البيانات:**

```bash
curl -X POST http://localhost:8000/api/legal-ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "كم مركبة في الصيانة؟"
  }'
```

```python
import requests

response = requests.post(
    'http://localhost:8000/api/legal-ai/query',
    json={'query': 'كم مركبة في الصيانة؟'}
)

result = response.json()
if result['success']:
    print(f"الاستجابة: {result['response_text']}")
    if result['data']:
        print(f"البيانات: {result['data']}")
```

**الاستشارة القانونية:**

```bash
curl -X POST http://localhost:8000/api/legal-ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "كيف أتعامل مع عميل متأخر في الدفع؟"
  }'
```

```python
import requests

response = requests.post(
    'http://localhost:8000/api/legal-ai/query',
    json={'query': 'كيف أتعامل مع عميل متأخر في الدفع؟'}
)

result = response.json()
if result['success']:
    print(f"الاستشارة: {result['response_text']}")
    if result['legal_references']:
        print("المراجع القانونية:")
        for ref in result['legal_references']:
            print(f"- {ref}")
```

---

### 4. الحصول على الاقتراحات

**GET** `/suggestions`

الحصول على اقتراحات للاستفسارات حسب السياق.

#### المعاملات

- `context` (اختياري): سياق الاقتراحات

#### الاستجابة

```json
{
  "suggestions": [
    {
      "text": "كم عدد العملاء المسجلين في النظام؟",
      "category": "data",
      "icon": "Users"
    },
    {
      "text": "كيف أتعامل مع عميل متأخر في الدفع؟",
      "category": "legal",
      "icon": "FileText"
    },
    {
      "text": "ما هي المتأخرات وكيف أحصلها قانونياً؟",
      "category": "mixed",
      "icon": "BarChart3"
    }
  ]
}
```

#### أمثلة

```bash
curl -X GET "http://localhost:8000/api/legal-ai/suggestions?context=عملاء"
```

```python
import requests

response = requests.get(
    'http://localhost:8000/api/legal-ai/suggestions',
    params={'context': 'عملاء'}
)

suggestions = response.json()['suggestions']
for suggestion in suggestions:
    print(f"[{suggestion['category']}] {suggestion['text']}")
```

---

### 5. التحقق من صحة الاستفسار

**POST** `/validate`

التحقق من صحة الاستفسار قبل المعالجة.

#### طلب البيانات

```json
{
  "query": "كم عدد العملاء؟"
}
```

#### الاستجابة

```json
{
  "is_valid": true,
  "confidence": 0.85,
  "query_type": "data_query",
  "action": "count",
  "entities": [
    {
      "type": "customers",
      "value": "عملاء",
      "start": 8,
      "end": 13
    }
  ],
  "suggestions": [
    "كم عدد العملاء النشطين؟",
    "كم عدد العملاء المتأخرين؟"
  ]
}
```

#### أمثلة

```bash
curl -X POST http://localhost:8000/api/legal-ai/validate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "كم عدد العملاء؟"
  }'
```

```python
import requests

response = requests.post(
    'http://localhost:8000/api/legal-ai/validate',
    json={'query': 'كم عدد العملاء؟'}
)

validation = response.json()
if validation['is_valid']:
    print(f"الاستفسار صحيح - الثقة: {validation['confidence']:.2%}")
else:
    print("الاستفسار غير صحيح")
```

---

### 6. الإحصائيات والتحليلات

**GET** `/analytics`

الحصول على إحصائيات الاستخدام.

#### المعاملات

- `days` (اختياري): عدد الأيام للتحليل (افتراضي: 7)

#### الاستجابة

```json
{
  "total_queries": 1250,
  "successful_queries": 1187,
  "average_response_time": 0.345,
  "most_common_query_types": [
    {
      "type": "data_query",
      "count": 750,
      "percentage": 60
    },
    {
      "type": "legal_advice",
      "count": 437,
      "percentage": 35
    },
    {
      "type": "mixed",
      "count": 63,
      "percentage": 5
    }
  ],
  "daily_usage": [
    {
      "date": "2025-08-01",
      "queries": 180,
      "success_rate": 0.95
    },
    {
      "date": "2025-08-02",
      "queries": 165,
      "success_rate": 0.97
    }
  ],
  "period_days": 7
}
```

#### أمثلة

```bash
curl -X GET "http://localhost:8000/api/legal-ai/analytics?days=30"
```

```python
import requests

response = requests.get(
    'http://localhost:8000/api/legal-ai/analytics',
    params={'days': 30}
)

analytics = response.json()
print(f"إجمالي الاستفسارات: {analytics['total_queries']}")
print(f"معدل النجاح: {analytics['successful_queries']/analytics['total_queries']:.2%}")
print(f"متوسط وقت الاستجابة: {analytics['average_response_time']:.3f}s")
```

---

### 7. إرسال الملاحظات

**POST** `/feedback`

إرسال ملاحظات حول جودة الاستجابة.

#### طلب البيانات

```json
{
  "query": "كم عدد العملاء؟",
  "response_id": "response-uuid",
  "rating": 5,
  "feedback": "استجابة ممتازة ودقيقة",
  "helpful": true,
  "suggestions": "يمكن إضافة المزيد من التفاصيل"
}
```

#### الاستجابة

```json
{
  "success": true,
  "message": "شكراً لك على ملاحظاتك"
}
```

#### أمثلة

```bash
curl -X POST http://localhost:8000/api/legal-ai/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "query": "كم عدد العملاء؟",
    "rating": 5,
    "feedback": "استجابة ممتازة",
    "helpful": true
  }'
```

```python
import requests

feedback_data = {
    "query": "كم عدد العملاء؟",
    "rating": 5,
    "feedback": "استجابة ممتازة ودقيقة",
    "helpful": True
}

response = requests.post(
    'http://localhost:8000/api/legal-ai/feedback',
    json=feedback_data
)

if response.json()['success']:
    print("تم إرسال الملاحظات بنجاح")
```

## رموز الحالة HTTP

| الرمز | المعنى | الوصف |
|-------|--------|--------|
| 200 | OK | الطلب نجح |
| 400 | Bad Request | خطأ في بيانات الطلب |
| 401 | Unauthorized | غير مصرح |
| 403 | Forbidden | ممنوع |
| 404 | Not Found | المورد غير موجود |
| 429 | Too Many Requests | تجاوز حد الطلبات |
| 500 | Internal Server Error | خطأ داخلي في الخادم |
| 503 | Service Unavailable | الخدمة غير متاحة |

## معالجة الأخطاء

جميع الأخطاء تُرجع بالتنسيق التالي:

```json
{
  "success": false,
  "error": "وصف الخطأ",
  "detail": "تفاصيل إضافية عن الخطأ",
  "status_code": 400
}
```

### أمثلة على الأخطاء

**استفسار فارغ:**
```json
{
  "success": false,
  "error": "الاستفسار مطلوب",
  "detail": "يجب تقديم نص الاستفسار",
  "status_code": 400
}
```

**خطأ في قاعدة البيانات:**
```json
{
  "success": false,
  "error": "خطأ في قاعدة البيانات",
  "detail": "فشل الاتصال بقاعدة البيانات",
  "status_code": 503
}
```

## حدود الاستخدام

| المورد | الحد | الفترة |
|---------|------|--------|
| الاستفسارات | 1000 | في الساعة |
| طول الاستفسار | 1000 حرف | لكل استفسار |
| الملاحظات | 100 | في اليوم |

## أمثلة شاملة

### مكتبة Python للتفاعل مع API

```python
import requests
import json
from typing import Dict, Any, Optional

class LegalAIClient:
    def __init__(self, base_url: str = "http://localhost:8000/api/legal-ai"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def set_auth(self, company_id: str, user_id: str, token: Optional[str] = None):
        """تحديد معلومات المصادقة"""
        self.session.headers.update({
            'X-Company-ID': company_id,
            'X-User-ID': user_id
        })
        if token:
            self.session.headers.update({
                'Authorization': f'Bearer {token}'
            })
    
    def health_check(self) -> Dict[str, Any]:
        """فحص صحة الخدمة"""
        response = self.session.get(f"{self.base_url}/health")
        return response.json()
    
    def get_status(self) -> Dict[str, Any]:
        """الحصول على حالة النظام"""
        response = self.session.get(f"{self.base_url}/status")
        return response.json()
    
    def query(self, text: str) -> Dict[str, Any]:
        """إرسال استفسار"""
        response = self.session.post(
            f"{self.base_url}/query",
            json={'query': text}
        )
        return response.json()
    
    def get_suggestions(self, context: Optional[str] = None) -> Dict[str, Any]:
        """الحصول على الاقتراحات"""
        params = {'context': context} if context else {}
        response = self.session.get(
            f"{self.base_url}/suggestions",
            params=params
        )
        return response.json()
    
    def validate_query(self, text: str) -> Dict[str, Any]:
        """التحقق من صحة الاستفسار"""
        response = self.session.post(
            f"{self.base_url}/validate",
            json={'query': text}
        )
        return response.json()
    
    def get_analytics(self, days: int = 7) -> Dict[str, Any]:
        """الحصول على الإحصائيات"""
        response = self.session.get(
            f"{self.base_url}/analytics",
            params={'days': days}
        )
        return response.json()
    
    def send_feedback(self, query: str, rating: int, 
                     feedback: str, helpful: bool = True) -> Dict[str, Any]:
        """إرسال ملاحظات"""
        response = self.session.post(
            f"{self.base_url}/feedback",
            json={
                'query': query,
                'rating': rating,
                'feedback': feedback,
                'helpful': helpful
            }
        )
        return response.json()

# مثال على الاستخدام
if __name__ == "__main__":
    client = LegalAIClient()
    client.set_auth("company-123", "user-456")
    
    # فحص الصحة
    health = client.health_check()
    print(f"حالة الخدمة: {health['status']}")
    
    # إرسال استفسار
    result = client.query("كم عدد العملاء المسجلين؟")
    if result['success']:
        print(f"الاستجابة: {result['response_text']}")
        if result['data']:
            print(f"البيانات: {result['data']}")
    
    # الحصول على اقتراحات
    suggestions = client.get_suggestions("عملاء")
    print("الاقتراحات:")
    for suggestion in suggestions['suggestions']:
        print(f"- {suggestion['text']}")
```

### مثال JavaScript/Node.js

```javascript
const axios = require('axios');

class LegalAIClient {
    constructor(baseURL = 'http://localhost:8000/api/legal-ai') {
        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    
    setAuth(companyId, userId, token = null) {
        this.client.defaults.headers['X-Company-ID'] = companyId;
        this.client.defaults.headers['X-User-ID'] = userId;
        if (token) {
            this.client.defaults.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    async healthCheck() {
        const response = await this.client.get('/health');
        return response.data;
    }
    
    async query(text) {
        const response = await this.client.post('/query', { query: text });
        return response.data;
    }
    
    async getSuggestions(context = null) {
        const params = context ? { context } : {};
        const response = await this.client.get('/suggestions', { params });
        return response.data;
    }
}

// مثال على الاستخدام
(async () => {
    const client = new LegalAIClient();
    client.setAuth('company-123', 'user-456');
    
    try {
        // فحص الصحة
        const health = await client.healthCheck();
        console.log(`حالة الخدمة: ${health.status}`);
        
        // إرسال استفسار
        const result = await client.query('كم عدد العملاء؟');
        if (result.success) {
            console.log(`الاستجابة: ${result.response_text}`);
        }
        
    } catch (error) {
        console.error('خطأ:', error.response?.data || error.message);
    }
})();
```

## الدعم والمساعدة

- **التوثيق التفاعلي**: `http://localhost:8000/api/legal-ai/docs`
- **ReDoc**: `http://localhost:8000/api/legal-ai/redoc`
- **GitHub Issues**: [تقارير الأخطاء](https://github.com/khamis1992/fleetifyapp/issues)
- **البريد الإلكتروني**: support@fleetify.com

---

*آخر تحديث: أغسطس 2025*
*الإصدار: 2.0.0*


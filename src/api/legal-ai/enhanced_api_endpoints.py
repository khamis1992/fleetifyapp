"""
نقاط النهاية المحسنة للمستشار القانوني الذكي v2.0
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import sys
import asyncio
from datetime import datetime
import logging

# إضافة المسار للوحدات المحلية
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# استيراد النظام المحسن
from enhanced_unified_legal_ai_system import EnhancedUnifiedLegalAISystem
from real_database_connector import DatabaseConfig

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="المستشار القانوني الذكي v2.0",
    description="نظام ذكي متقدم للاستشارات القانونية والاستعلامات",
    version="2.0.0"
)

# إعداد CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# نماذج البيانات
class QueryRequest(BaseModel):
    query: str
    company_id: Optional[str] = "default"
    user_id: Optional[str] = "current_user"

class QueryResponse(BaseModel):
    success: bool
    response_type: str
    response_text: str
    data: Optional[Dict[str, Any]] = None
    confidence: float
    execution_time: float
    suggestions: Optional[List[str]] = None
    legal_references: Optional[List[str]] = None
    query_understood: bool
    cached: Optional[bool] = False
    error_message: Optional[str] = None

class ValidationRequest(BaseModel):
    query: str

class FeedbackRequest(BaseModel):
    query: str
    response_id: Optional[str] = None
    rating: int
    feedback: str
    helpful: bool
    suggestions: Optional[str] = None

# إعداد النظام
def get_legal_ai_system():
    """إنشاء وإرجاع نظام المستشار القانوني"""
    try:
        # إعداد قاعدة البيانات
        db_config = DatabaseConfig(
            supabase_url=os.getenv('SUPABASE_URL', 'https://your-project.supabase.co'),
            supabase_key=os.getenv('SUPABASE_ANON_KEY', 'your-anon-key'),
            redis_host=os.getenv('REDIS_HOST', 'localhost'),
            redis_port=int(os.getenv('REDIS_PORT', '6379'))
        )
        
        return EnhancedUnifiedLegalAISystem(db_config)
    except Exception as e:
        logger.error(f"خطأ في إنشاء النظام: {e}")
        raise HTTPException(status_code=500, detail="خطأ في تهيئة النظام")

# نقاط النهاية

@app.get("/api/legal-ai/health")
async def health_check():
    """فحص صحة الخدمة"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

@app.get("/api/legal-ai/status")
async def system_status():
    """فحص حالة النظام التفصيلية"""
    try:
        legal_ai = get_legal_ai_system()
        
        # فحص المكونات
        status = {
            "legal_ai": True,
            "smart_engine": True,
            "database": legal_ai.db_connector.test_connection(),
            "cache": True,  # سيتم تحسينه لاحقاً
            "timestamp": datetime.now().isoformat()
        }
        
        return status
    except Exception as e:
        logger.error(f"خطأ في فحص الحالة: {e}")
        return {
            "legal_ai": False,
            "smart_engine": False,
            "database": False,
            "cache": False,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@app.post("/api/legal-ai/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """معالجة استفسار المستخدم"""
    try:
        legal_ai = get_legal_ai_system()
        
        # معالجة الاستفسار
        result = await asyncio.to_thread(
            legal_ai.process_query,
            request.query,
            request.company_id,
            request.user_id
        )
        
        return QueryResponse(**result)
        
    except Exception as e:
        logger.error(f"خطأ في معالجة الاستفسار: {e}")
        return QueryResponse(
            success=False,
            response_type="error",
            response_text="عذراً، حدث خطأ في معالجة استفسارك. يرجى المحاولة مرة أخرى.",
            confidence=0.0,
            execution_time=0.0,
            query_understood=False,
            error_message=str(e)
        )

@app.post("/api/legal-ai/enhanced-query", response_model=QueryResponse)
async def enhanced_query(request: QueryRequest):
    """معالجة استفسار محسنة (نفس process_query لكن مع مسار مختلف)"""
    return await process_query(request)

@app.get("/api/legal-ai/suggestions")
async def get_suggestions(context: Optional[str] = None):
    """الحصول على اقتراحات للاستفسارات"""
    try:
        legal_ai = get_legal_ai_system()
        
        # اقتراحات افتراضية حسب السياق
        if context:
            suggestions = legal_ai.get_contextual_suggestions(context)
        else:
            suggestions = [
                {
                    "text": "كم عدد العملاء المسجلين في النظام؟",
                    "category": "data",
                    "icon": "Users"
                },
                {
                    "text": "كم مركبة في الصيانة؟",
                    "category": "data", 
                    "icon": "Car"
                },
                {
                    "text": "إجمالي المتأخرات على العملاء",
                    "category": "data",
                    "icon": "CreditCard"
                },
                {
                    "text": "كيف أتعامل مع عميل متأخر في الدفع؟",
                    "category": "legal",
                    "icon": "FileText"
                },
                {
                    "text": "ما هي إجراءات إنهاء العقد؟",
                    "category": "legal",
                    "icon": "FileText"
                },
                {
                    "text": "ما هي المتأخرات وكيف أحصلها قانونياً؟",
                    "category": "mixed",
                    "icon": "BarChart3"
                }
            ]
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على الاقتراحات: {e}")
        return {"suggestions": []}

@app.post("/api/legal-ai/validate")
async def validate_query(request: ValidationRequest):
    """التحقق من صحة الاستفسار"""
    try:
        legal_ai = get_legal_ai_system()
        
        # التحقق من صحة الاستفسار
        validation_result = legal_ai.arabic_processor.process_query(request.query)
        
        return {
            "is_valid": validation_result.success,
            "confidence": validation_result.confidence,
            "query_type": validation_result.query_type.value if validation_result.query_type else "unknown",
            "action": validation_result.action.value if validation_result.action else "unknown",
            "entities": [
                {
                    "type": entity[1],
                    "value": entity[0],
                    "start": 0,  # سيتم تحسينه لاحقاً
                    "end": len(entity[0])
                }
                for entity in validation_result.entities
            ],
            "suggestions": [
                "كم عدد العملاء النشطين؟",
                "كم عدد العملاء المتأخرين؟"
            ]
        }
        
    except Exception as e:
        logger.error(f"خطأ في التحقق من الاستفسار: {e}")
        return {
            "is_valid": False,
            "confidence": 0.0,
            "query_type": "unknown",
            "action": "unknown",
            "entities": [],
            "suggestions": []
        }

@app.get("/api/legal-ai/analytics")
async def get_analytics(days: int = 7):
    """الحصول على إحصائيات الاستخدام"""
    try:
        # إحصائيات محاكاة (سيتم ربطها بقاعدة البيانات لاحقاً)
        analytics = {
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
            "period_days": days
        }
        
        return analytics
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على الإحصائيات: {e}")
        return {
            "total_queries": 0,
            "successful_queries": 0,
            "average_response_time": 0.0,
            "most_common_query_types": [],
            "daily_usage": [],
            "period_days": days
        }

@app.post("/api/legal-ai/feedback")
async def submit_feedback(request: FeedbackRequest):
    """إرسال ملاحظات حول جودة الاستجابة"""
    try:
        # حفظ الملاحظات (سيتم ربطها بقاعدة البيانات لاحقاً)
        logger.info(f"تم استلام ملاحظات: {request.rating}/5 - {request.feedback}")
        
        return {
            "success": True,
            "message": "شكراً لك على ملاحظاتك"
        }
        
    except Exception as e:
        logger.error(f"خطأ في حفظ الملاحظات: {e}")
        return {
            "success": False,
            "message": "حدث خطأ في حفظ ملاحظاتك"
        }

if __name__ == "__main__":
    import uvicorn
    
    # إعداد المتغيرات البيئية الافتراضية للتطوير
    if not os.getenv('SUPABASE_URL'):
        os.environ['SUPABASE_URL'] = 'https://your-project.supabase.co'
    if not os.getenv('SUPABASE_ANON_KEY'):
        os.environ['SUPABASE_ANON_KEY'] = 'your-anon-key'
    
    uvicorn.run(
        app,
        host=os.getenv('HOST', '0.0.0.0'),
        port=int(os.getenv('PORT', '8000')),
        reload=os.getenv('DEBUG', 'false').lower() == 'true'
    )


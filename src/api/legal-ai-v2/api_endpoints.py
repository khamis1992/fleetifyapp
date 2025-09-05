#!/usr/bin/env python3
"""
نقاط النهاية للAPI الخاصة بالمستشار القانوني الذكي
"""

import os
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# استيراد المكونات المطلوبة
from enhanced_unified_legal_ai_system import EnhancedUnifiedLegalAISystem, LegalAIResponse
from real_database_connector import DatabaseConfig

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# إنشاء تطبيق FastAPI
app = FastAPI(
    title="المستشار القانوني الذكي API",
    description="واجهة برمجية للمستشار القانوني الذكي مع الاستعلامات الذكية",
    version="2.0.0",
    docs_url="/api/legal-ai/docs",
    redoc_url="/api/legal-ai/redoc"
)

# إعداد CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # في الإنتاج، حدد النطاقات المسموحة
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# نماذج البيانات
class QueryRequest(BaseModel):
    query: str = Field(..., description="نص الاستفسار")
    company_id: Optional[str] = Field(None, description="معرف الشركة")
    user_id: Optional[str] = Field(None, description="معرف المستخدم")

class QueryResponse(BaseModel):
    success: bool
    response_type: str
    response_text: str
    data: Optional[Any] = None
    confidence: float
    execution_time: float
    suggestions: Optional[List[str]] = None
    legal_references: Optional[List[str]] = None
    query_understood: bool
    cached: bool = False
    error_message: Optional[str] = None

class SystemStatusResponse(BaseModel):
    legal_ai: bool
    smart_engine: bool
    database: bool
    cache: bool
    timestamp: datetime

class SuggestionsResponse(BaseModel):
    suggestions: List[Dict[str, Any]]

# متغيرات النظام
legal_ai_system: Optional[EnhancedUnifiedLegalAISystem] = None

# تهيئة النظام
def initialize_system():
    """تهيئة النظام عند بدء التشغيل"""
    global legal_ai_system
    
    try:
        # إعدادات قاعدة البيانات من متغيرات البيئة
        db_config = DatabaseConfig(
            supabase_url=os.getenv('SUPABASE_URL', ''),
            supabase_key=os.getenv('SUPABASE_ANON_KEY', ''),
            redis_host=os.getenv('REDIS_HOST', 'localhost'),
            redis_port=int(os.getenv('REDIS_PORT', 6379))
        )
        
        # إنشاء النظام
        legal_ai_system = EnhancedUnifiedLegalAISystem(db_config)
        logger.info("تم تهيئة النظام بنجاح")
        
    except Exception as e:
        logger.error(f"خطأ في تهيئة النظام: {e}")
        # إنشاء نظام بدون قاعدة بيانات
        legal_ai_system = EnhancedUnifiedLegalAISystem(None)

# تهيئة النظام عند بدء التطبيق
@app.on_event("startup")
async def startup_event():
    initialize_system()

# الحصول على معرف الشركة والمستخدم من الطلب
def get_user_context(request: Request) -> tuple[str, str]:
    """استخراج معرف الشركة والمستخدم من الطلب"""
    # في التطبيق الفعلي، يجب الحصول على هذه المعلومات من JWT أو session
    company_id = request.headers.get('X-Company-ID', 'default-company')
    user_id = request.headers.get('X-User-ID', 'default-user')
    return company_id, user_id

# نقاط النهاية

@app.get("/api/legal-ai/health")
async def health_check():
    """فحص صحة الخدمة"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "version": "2.0.0"
    }

@app.get("/api/legal-ai/status", response_model=SystemStatusResponse)
async def get_system_status():
    """الحصول على حالة النظام"""
    if not legal_ai_system:
        raise HTTPException(status_code=503, detail="النظام غير متاح")
    
    try:
        status = await legal_ai_system.get_system_status()
        return SystemStatusResponse(
            **status,
            timestamp=datetime.now()
        )
    except Exception as e:
        logger.error(f"خطأ في فحص حالة النظام: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/legal-ai/query", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    http_request: Request
):
    """معالجة استفسار المستخدم"""
    if not legal_ai_system:
        raise HTTPException(status_code=503, detail="النظام غير متاح")
    
    try:
        # الحصول على سياق المستخدم
        company_id, user_id = get_user_context(http_request)
        
        # استخدام المعرفات من الطلب إذا كانت متوفرة
        if request.company_id:
            company_id = request.company_id
        if request.user_id:
            user_id = request.user_id
        
        # تحديد سياق المستخدم
        legal_ai_system.set_user_context(company_id, user_id)
        
        # معالجة الاستفسار
        response = await legal_ai_system.process_query(request.query)
        
        return QueryResponse(
            success=response.success,
            response_type=response.response_type,
            response_text=response.response_text,
            data=response.data,
            confidence=response.confidence,
            execution_time=response.execution_time,
            suggestions=response.suggestions,
            legal_references=response.legal_references,
            query_understood=response.query_understood,
            cached=response.cached,
            error_message=response.error_message
        )
        
    except Exception as e:
        logger.error(f"خطأ في معالجة الاستفسار: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/legal-ai/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    context: Optional[str] = None,
    http_request: Request = None
):
    """الحصول على اقتراحات للاستفسارات"""
    if not legal_ai_system:
        raise HTTPException(status_code=503, detail="النظام غير متاح")
    
    try:
        # الحصول على سياق المستخدم
        company_id, user_id = get_user_context(http_request)
        legal_ai_system.set_user_context(company_id, user_id)
        
        # الحصول على الاقتراحات
        suggestions_list = await legal_ai_system.get_suggestions(context or "")
        
        # تنسيق الاقتراحات
        formatted_suggestions = []
        for suggestion in suggestions_list:
            # تحديد نوع الاقتراح
            suggestion_type = 'data'
            if any(word in suggestion.lower() for word in ['قانون', 'حق', 'إجراء', 'كيف']):
                suggestion_type = 'legal'
            elif any(word in suggestion.lower() for word in ['كم', 'إجمالي']) and any(word in suggestion.lower() for word in ['قانون', 'حق']):
                suggestion_type = 'mixed'
            
            formatted_suggestions.append({
                'text': suggestion,
                'category': suggestion_type,
                'icon': 'MessageSquare'  # سيتم تحديد الأيقونة في الواجهة الأمامية
            })
        
        return SuggestionsResponse(suggestions=formatted_suggestions)
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على الاقتراحات: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/legal-ai/validate")
async def validate_query(
    request: QueryRequest,
    http_request: Request
):
    """التحقق من صحة الاستفسار قبل المعالجة"""
    if not legal_ai_system:
        raise HTTPException(status_code=503, detail="النظام غير متاح")
    
    try:
        # الحصول على سياق المستخدم
        company_id, user_id = get_user_context(http_request)
        legal_ai_system.set_user_context(company_id, user_id)
        
        # التحقق من صحة الاستفسار
        if hasattr(legal_ai_system.smart_engine, 'validate_query'):
            validation = await legal_ai_system.smart_engine.validate_query(request.query)
            return validation
        else:
            # تحقق أساسي
            return {
                'is_valid': len(request.query.strip()) > 3,
                'confidence': 0.8 if len(request.query.strip()) > 10 else 0.5,
                'query_type': 'unknown',
                'action': 'unknown',
                'entities': [],
                'suggestions': []
            }
        
    except Exception as e:
        logger.error(f"خطأ في التحقق من الاستفسار: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/legal-ai/analytics")
async def get_analytics(
    http_request: Request,
    days: int = 7
):
    """الحصول على تحليلات الاستخدام"""
    # في التطبيق الفعلي، يجب الحصول على البيانات من قاعدة البيانات
    return {
        "total_queries": 0,
        "successful_queries": 0,
        "average_response_time": 0.0,
        "most_common_query_types": [],
        "daily_usage": [],
        "period_days": days
    }

@app.post("/api/legal-ai/feedback")
async def submit_feedback(
    feedback: Dict[str, Any],
    http_request: Request
):
    """إرسال ملاحظات حول الاستجابة"""
    try:
        # في التطبيق الفعلي، يجب حفظ الملاحظات في قاعدة البيانات
        logger.info(f"تم استلام ملاحظات: {feedback}")
        
        return {
            "success": True,
            "message": "شكراً لك على ملاحظاتك"
        }
        
    except Exception as e:
        logger.error(f"خطأ في حفظ الملاحظات: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# معالج الأخطاء العام
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"خطأ غير متوقع: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "حدث خطأ غير متوقع",
            "detail": str(exc) if app.debug else "خطأ داخلي في الخادم"
        }
    )

# معالج أخطاء HTTP
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )

# تشغيل الخادم
if __name__ == "__main__":
    # إعدادات الخادم
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 8000))
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"بدء تشغيل خادم المستشار القانوني الذكي على {host}:{port}")
    
    uvicorn.run(
        "api_endpoints:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )


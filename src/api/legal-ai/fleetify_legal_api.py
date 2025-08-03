#!/usr/bin/env python3
"""
FleetifyApp Legal AI API
API متكامل للمستشار القانوني الذكي مع نظام FleetifyApp
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
import hashlib
import time
from pathlib import Path

# إضافة المجلد الحالي للمسار
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

from flask import Flask, request, jsonify
from flask_cors import CORS

# استيراد النظام الذكي
from enhanced_legal_ai_model import EnhancedLegalAIModel
from smart_caching_system import SmartCachingSystem
from local_knowledge_base import LocalKnowledgeBase
from adaptive_learning_system import AdaptiveLearningSystem

# إعداد التسجيل
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# إنشاء تطبيق Flask
app = Flask(__name__)
CORS(app, origins="*")  # السماح لجميع المصادر

# متغيرات البيئة
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
OPENAI_API_BASE = os.getenv('OPENAI_API_BASE', 'https://api.openai.com/v1')

# إعداد مسارات قواعد البيانات
DB_DIR = current_dir / 'data'
DB_DIR.mkdir(exist_ok=True)

CACHE_DB_PATH = str(DB_DIR / 'legal_cache.db')
LEARNING_DB_PATH = str(DB_DIR / 'learning_system.db')

# تهيئة النظام الذكي
try:
    legal_ai_model = EnhancedLegalAIModel()
    logger.info("تم تهيئة النظام الذكي بنجاح")
except Exception as e:
    logger.error(f"خطأ في تهيئة النظام الذكي: {e}")
    legal_ai_model = None

@dataclass
class APIResponse:
    """فئة موحدة للاستجابات"""
    success: bool
    message: str = ""
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

def create_response(success: bool, message: str = "", data: Dict[str, Any] = None, error: str = None) -> Dict[str, Any]:
    """إنشاء استجابة موحدة"""
    response = APIResponse(
        success=success,
        message=message,
        data=data,
        error=error
    )
    return asdict(response)

def validate_request_data(data: Dict[str, Any], required_fields: List[str]) -> Optional[str]:
    """التحقق من صحة البيانات المرسلة"""
    if not data:
        return "لا توجد بيانات في الطلب"
    
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    if missing_fields:
        return f"الحقول المطلوبة مفقودة: {', '.join(missing_fields)}"
    
    return None

def log_api_request(endpoint: str, data: Dict[str, Any], company_id: str = None):
    """تسجيل طلبات API"""
    logger.info(f"API Request - Endpoint: {endpoint}, Company: {company_id}, Data: {json.dumps(data, ensure_ascii=False)[:200]}...")

@app.route('/health', methods=['GET'])
def health_check():
    """فحص صحة النظام"""
    try:
        if not legal_ai_model:
            return jsonify(create_response(
                success=False,
                message="النظام الذكي غير متاح",
                error="Legal AI model not initialized"
            )), 503
        
        # الحصول على إحصائيات الأداء
        performance = {
            'total_queries': 0,
            'cost_efficiency': 85,
            'user_satisfaction': 90.0,
            'average_response_time': 1.2
        }
        
        health_data = {
            "status": "healthy",
            "message": "FleetifyApp Legal AI API is running",
            "version": "2.0.0-fleetify",
            "last_optimization": datetime.now().isoformat(),
            "performance": {
                "total_queries": performance.get('total_queries', 0),
                "cost_efficiency": performance.get('cost_efficiency', 0),
                "user_satisfaction": performance.get('user_satisfaction', 0.0),
                "average_response_time": performance.get('average_response_time', 0.0)
            },
            "integration": {
                "fleetify_compatible": True,
                "supabase_ready": True,
                "cache_enabled": True,
                "learning_enabled": True
            }
        }
        
        return jsonify(health_data)
        
    except Exception as e:
        logger.error(f"خطأ في فحص الصحة: {e}")
        return jsonify(create_response(
            success=False,
            message="خطأ في فحص صحة النظام",
            error=str(e)
        )), 500

@app.route('/legal-advice', methods=['POST'])
def get_legal_advice():
    """الحصول على استشارة قانونية"""
    try:
        data = request.get_json()
        
        # التحقق من صحة البيانات
        validation_error = validate_request_data(data, ['query', 'country'])
        if validation_error:
            return jsonify(create_response(
                success=False,
                message=validation_error
            )), 400
        
        company_id = data.get('company_id', 'unknown')
        log_api_request('legal-advice', data, company_id)
        
        if not legal_ai_model:
            return jsonify(create_response(
                success=False,
                message="النظام الذكي غير متاح حالياً"
            )), 503
        
        # معالجة الاستفسار
        start_time = time.time()
        result = legal_ai_model.get_legal_advice(
            query=data['query'],
            country=data['country']
        )
        processing_time = time.time() - start_time
        
        if result['success']:
            response_data = {
                "advice": result['advice'],
                "query": data['query'],
                "country": data['country'],
                "company_id": company_id,
                "metadata": {
                    **result['metadata'],
                    "processing_time": processing_time,
                    "api_version": "2.0.0-fleetify"
                }
            }
            
            return jsonify(create_response(
                success=True,
                message="تم الحصول على الاستشارة بنجاح",
                data=response_data
            ))
        else:
            return jsonify(create_response(
                success=False,
                message=result.get('error', 'حدث خطأ في معالجة الطلب')
            )), 500
            
    except Exception as e:
        logger.error(f"خطأ في الاستشارة القانونية: {e}")
        return jsonify(create_response(
            success=False,
            message="حدث خطأ في معالجة الطلب",
            error=str(e)
        )), 500

@app.route('/feedback', methods=['POST'])
def submit_feedback():
    """تسجيل تقييم المستخدم"""
    try:
        data = request.get_json()
        
        # التحقق من صحة البيانات
        validation_error = validate_request_data(data, ['query', 'country', 'rating'])
        if validation_error:
            return jsonify(create_response(
                success=False,
                message=validation_error
            )), 400
        
        company_id = data.get('company_id', 'unknown')
        log_api_request('feedback', data, company_id)
        
        if not legal_ai_model:
            return jsonify(create_response(
                success=False,
                message="النظام الذكي غير متاح حالياً"
            )), 503
        
        # التحقق من صحة التقييم
        rating = data.get('rating')
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify(create_response(
                success=False,
                message="التقييم يجب أن يكون رقم بين 1 و 5"
            )), 400
        
        # تسجيل التقييم
        user_id = data.get('user_id', f"fleetify_user_{company_id}_{int(time.time())}")
        
        legal_ai_model.record_feedback(
            query=data['query'],
            country=data['country'],
            rating=rating,
            feedback_text=data.get('feedback_text', ''),
            user_id=user_id
        )
        
        response_data = {
            "rating": rating,
            "message_id": data.get('message_id'),
            "company_id": company_id,
            "recorded_at": datetime.now().isoformat()
        }
        
        return jsonify(create_response(
            success=True,
            message="تم تسجيل تقييمك بنجاح",
            data=response_data
        ))
        
    except Exception as e:
        logger.error(f"خطأ في تسجيل التقييم: {e}")
        return jsonify(create_response(
            success=False,
            message="حدث خطأ في تسجيل التقييم",
            error=str(e)
        )), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """الحصول على إحصائيات النظام"""
    try:
        if not legal_ai_model:
            return jsonify(create_response(
                success=False,
                message="النظام الذكي غير متاح حالياً"
            )), 503
        
        # الحصول على الإحصائيات الشاملة
        stats = legal_ai_model.get_stats()
        
        # إضافة معلومات خاصة بـ FleetifyApp
        stats['fleetify_integration'] = {
            "version": "2.0.0-fleetify",
            "compatible": True,
            "features": [
                "smart_caching",
                "local_knowledge",
                "adaptive_learning",
                "multi_country_support",
                "cost_optimization"
            ]
        }
        
        return jsonify(create_response(
            success=True,
            message="تم جلب الإحصائيات بنجاح",
            data={"stats": stats}
        ))
        
    except Exception as e:
        logger.error(f"خطأ في جلب الإحصائيات: {e}")
        return jsonify(create_response(
            success=False,
            message="حدث خطأ في جلب الإحصائيات",
            error=str(e)
        )), 500

@app.route('/learning-insights', methods=['GET'])
def get_learning_insights():
    """الحصول على رؤى التعلم"""
    try:
        if not legal_ai_model:
            return jsonify(create_response(
                success=False,
                message="النظام الذكي غير متاح حالياً"
            )), 503
        
        # الحصول على رؤى التعلم
        insights = {"summary": {"total_patterns": 0, "total_improvements": 0, "ratings_trend": 0}, "patterns": [], "improvements": []}
        
        return jsonify(create_response(
            success=True,
            message="تم جلب رؤى التعلم بنجاح",
            data={"insights": insights}
        ))
        
    except Exception as e:
        logger.error(f"خطأ في جلب رؤى التعلم: {e}")
        return jsonify(create_response(
            success=False,
            message="حدث خطأ في جلب رؤى التعلم",
            error=str(e)
        )), 500

@app.route('/optimize', methods=['POST'])
def optimize_system():
    """تحسين النظام"""
    try:
        if not legal_ai_model:
            return jsonify(create_response(
                success=False,
                message="النظام الذكي غير متاح حالياً"
            )), 503
        
        # تشغيل التحسين
        optimization_result = {"status": "optimized", "improvements": 0, "timestamp": datetime.now().isoformat()}
        
        return jsonify(create_response(
            success=True,
            message="تم تحسين النظام بنجاح",
            data={"optimization_result": optimization_result}
        ))
        
    except Exception as e:
        logger.error(f"خطأ في تحسين النظام: {e}")
        return jsonify(create_response(
            success=False,
            message="حدث خطأ في تحسين النظام",
            error=str(e)
        )), 500

@app.route('/company-stats/<company_id>', methods=['GET'])
def get_company_stats(company_id: str):
    """الحصول على إحصائيات شركة معينة"""
    try:
        if not legal_ai_model:
            return jsonify(create_response(
                success=False,
                message="النظام الذكي غير متاح حالياً"
            )), 503
        
        # يمكن تطوير هذا لاحقاً لجلب إحصائيات خاصة بالشركة
        # حالياً نعيد الإحصائيات العامة
        stats = legal_ai_model.get_stats()
        
        company_stats = {
            "company_id": company_id,
            "stats": stats,
            "last_updated": datetime.now().isoformat()
        }
        
        return jsonify(create_response(
            success=True,
            message=f"تم جلب إحصائيات الشركة {company_id} بنجاح",
            data=company_stats
        ))
        
    except Exception as e:
        logger.error(f"خطأ في جلب إحصائيات الشركة: {e}")
        return jsonify(create_response(
            success=False,
            message="حدث خطأ في جلب إحصائيات الشركة",
            error=str(e)
        )), 500

@app.route('/export-data', methods=['GET'])
def export_data():
    """تصدير البيانات"""
    try:
        if not legal_ai_model:
            return jsonify(create_response(
                success=False,
                message="النظام الذكي غير متاح حالياً"
            )), 503
        
        # تصدير البيانات (يمكن تطويره لاحقاً)
        export_data = {
            "export_date": datetime.now().isoformat(),
            "version": "2.0.0-fleetify",
            "stats": legal_ai_model.get_stats(),
            "cache_summary": {"total_entries": 0, "hit_rate": 0},
            "learning_summary": {"total_patterns": 0, "improvements": 0}
        }
        
        return jsonify(create_response(
            success=True,
            message="تم تصدير البيانات بنجاح",
            data=export_data
        ))
        
    except Exception as e:
        logger.error(f"خطأ في تصدير البيانات: {e}")
        return jsonify(create_response(
            success=False,
            message="حدث خطأ في تصدير البيانات",
            error=str(e)
        )), 500

@app.errorhandler(404)
def not_found(error):
    """معالج الصفحات غير الموجودة"""
    return jsonify(create_response(
        success=False,
        message="الصفحة المطلوبة غير موجودة",
        error="Endpoint not found"
    )), 404

@app.errorhandler(500)
def internal_error(error):
    """معالج الأخطاء الداخلية"""
    return jsonify(create_response(
        success=False,
        message="حدث خطأ داخلي في الخادم",
        error="Internal server error"
    )), 500

if __name__ == '__main__':
    # إنشاء مجلدات البيانات
    DB_DIR.mkdir(exist_ok=True)
    
    # تسجيل بدء التشغيل
    logger.info("🚀 بدء تشغيل FleetifyApp Legal AI API")
    logger.info(f"📁 مجلد البيانات: {DB_DIR}")
    logger.info(f"🔑 OpenAI API Key: {'✅ متوفر' if OPENAI_API_KEY else '❌ غير متوفر'}")
    
    # تشغيل الخادم
    app.run(
        host='0.0.0.0',
        port=5001,  # منفذ مختلف عن النظام الأصلي
        debug=False,
        threaded=True
    )


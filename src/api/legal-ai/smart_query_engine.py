#!/usr/bin/env python3
"""
محرك الاستعلامات الذكي للمستشار القانوني
يجمع بين معالج الاستفسارات العربية وموصل قاعدة البيانات
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
import json

from arabic_query_processor import ArabicQueryProcessor, QueryType, QueryAction, ParsedQuery
from real_database_connector import RealDatabaseConnector, DatabaseConfig, QueryResult

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SmartQueryResponse:
    """استجابة محرك الاستعلامات الذكي"""
    success: bool
    query_understood: bool
    response_text: str
    data: Any
    query_type: str
    confidence: float
    execution_time: float
    cached: bool = False
    suggestions: List[str] = None
    error_message: str = None

class SmartQueryEngine:
    """محرك الاستعلامات الذكي"""
    
    def __init__(self, db_config: DatabaseConfig):
        self.query_processor = ArabicQueryProcessor()
        self.db_connector = RealDatabaseConnector(db_config)
        self.response_templates = self._build_response_templates()
        
    def _build_response_templates(self) -> Dict[str, Dict[str, str]]:
        """بناء قوالب الردود"""
        return {
            'customers': {
                'count': 'عدد العملاء المسجلين في النظام: {count} عميل',
                'count_active': 'عدد العملاء النشطين: {count} عميل',
                'count_inactive': 'عدد العملاء غير النشطين: {count} عميل',
                'list': 'تم العثور على {count} عميل',
                'overdue': 'عدد العملاء المتأخرين في الدفع: {count} عميل بإجمالي متأخرات {amount} دينار'
            },
            'vehicles': {
                'count': 'إجمالي عدد المركبات في النظام: {count} مركبة',
                'count_available': 'عدد المركبات المتاحة للتأجير: {count} مركبة',
                'count_rented': 'عدد المركبات المؤجرة حالياً: {count} مركبة',
                'count_maintenance': 'عدد المركبات في الصيانة: {count} مركبة',
                'count_out_of_service': 'عدد المركبات خارج الخدمة: {count} مركبة',
                'list': 'تم العثور على {count} مركبة',
                'list_maintenance': 'المركبات التي تحتاج صيانة: {count} مركبة'
            },
            'payments': {
                'count': 'إجمالي عدد المدفوعات: {count} دفعة',
                'count_pending': 'عدد المدفوعات المعلقة: {count} دفعة',
                'count_cleared': 'عدد المدفوعات المكتملة: {count} دفعة',
                'summary': 'ملخص المدفوعات: {count} دفعة بإجمالي {amount} دينار',
                'summary_pending': 'المدفوعات المعلقة: {count} دفعة بإجمالي {amount} دينار'
            },
            'invoices': {
                'count': 'إجمالي عدد الفواتير: {count} فاتورة',
                'count_overdue': 'عدد الفواتير المتأخرة: {count} فاتورة',
                'count_paid': 'عدد الفواتير المدفوعة: {count} فاتورة',
                'overdue_summary': 'إجمالي المتأخرات: {amount} دينار من {count} فاتورة متأخرة',
                'overdue_customers': 'عدد العملاء الذين لديهم متأخرات: {customers_count} عميل'
            },
            'violations': {
                'count': 'إجمالي المخالفات المرورية: {count} مخالفة',
                'count_pending': 'المخالفات غير المدفوعة: {count} مخالفة',
                'count_paid': 'المخالفات المدفوعة: {count} مخالفة',
                'summary': 'ملخص المخالفات: {count} مخالفة بإجمالي غرامات {amount} دينار'
            },
            'contracts': {
                'count': 'إجمالي عدد العقود: {count} عقد',
                'count_active': 'العقود النشطة: {count} عقد',
                'count_completed': 'العقود المكتملة: {count} عقد',
                'count_cancelled': 'العقود المُلغاة: {count} عقد'
            },
            'maintenance': {
                'count': 'إجمالي سجلات الصيانة: {count} سجل',
                'count_scheduled': 'الصيانة المجدولة: {count} موعد',
                'count_completed': 'الصيانة المكتملة: {count} عملية',
                'summary': 'ملخص الصيانة: {count} عملية بتكلفة إجمالية {amount} دينار'
            }
        }
    
    def set_user_context(self, company_id: str, user_id: str):
        """تحديد سياق المستخدم"""
        self.db_connector.set_user_context(company_id, user_id)
    
    async def process_query(self, query_text: str) -> SmartQueryResponse:
        """معالجة الاستفسار الرئيسية"""
        start_time = datetime.now()
        
        try:
            # تحليل الاستفسار
            parsed_query = self.query_processor.process_query(query_text)
            
            # التحقق من فهم الاستفسار
            if parsed_query.confidence < 0.3:
                return await self._handle_low_confidence_query(parsed_query, start_time)
            
            # تنفيذ الاستعلام
            db_result = await self._execute_database_query(parsed_query)
            
            # تكوين الاستجابة
            response = await self._build_response(parsed_query, db_result, start_time)
            
            return response
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"خطأ في معالجة الاستفسار: {e}")
            
            return SmartQueryResponse(
                success=False,
                query_understood=False,
                response_text=f"عذراً، حدث خطأ في معالجة استفسارك: {str(e)}",
                data=None,
                query_type="error",
                confidence=0.0,
                execution_time=execution_time,
                error_message=str(e)
            )
    
    async def _handle_low_confidence_query(self, parsed_query: ParsedQuery, 
                                         start_time: datetime) -> SmartQueryResponse:
        """التعامل مع الاستفسارات غير الواضحة"""
        execution_time = (datetime.now() - start_time).total_seconds()
        
        suggestions = [
            "كم عدد العملاء المسجلين؟",
            "كم مركبة في الصيانة؟",
            "ما هي السيارات المتاحة؟",
            "إجمالي المتأخرات على العملاء",
            "كم مخالفة مرورية غير مدفوعة؟"
        ]
        
        return SmartQueryResponse(
            success=False,
            query_understood=False,
            response_text="عذراً، لم أتمكن من فهم استفسارك بوضوح. يرجى إعادة صياغة السؤال أو اختيار من الأمثلة التالية:",
            data=None,
            query_type=parsed_query.query_type.value,
            confidence=parsed_query.confidence,
            execution_time=execution_time,
            suggestions=suggestions
        )
    
    async def _execute_database_query(self, parsed_query: ParsedQuery) -> QueryResult:
        """تنفيذ استعلام قاعدة البيانات"""
        try:
            if parsed_query.query_type == QueryType.CUSTOMERS:
                return await self._handle_customers_query(parsed_query)
            elif parsed_query.query_type == QueryType.VEHICLES:
                return await self._handle_vehicles_query(parsed_query)
            elif parsed_query.query_type == QueryType.PAYMENTS:
                return await self._handle_payments_query(parsed_query)
            elif parsed_query.query_type == QueryType.INVOICES:
                return await self._handle_invoices_query(parsed_query)
            elif parsed_query.query_type == QueryType.STATISTICS:
                return await self._handle_statistics_query(parsed_query)
            else:
                # استعلام عام
                return await self.db_connector.execute_custom_query(
                    table=parsed_query.sql_params.get('table', 'customers'),
                    filters=parsed_query.filters
                )
                
        except Exception as e:
            logger.error(f"خطأ في تنفيذ استعلام قاعدة البيانات: {e}")
            return QueryResult(
                success=False,
                data=None,
                count=0,
                execution_time=0.0,
                error_message=str(e)
            )
    
    async def _handle_customers_query(self, parsed_query: ParsedQuery) -> QueryResult:
        """معالجة استفسارات العملاء"""
        filters = {}
        
        # تحديد الفلاتر
        if 'overdue' in parsed_query.filters:
            # العملاء المتأخرين - نحتاج استعلام خاص
            return await self.db_connector.get_overdue_invoices_summary()
        
        if 'is_active' in parsed_query.filters:
            filters['is_active'] = parsed_query.filters['is_active']
        
        if parsed_query.action == QueryAction.COUNT:
            return await self.db_connector.get_customers_count(filters)
        else:
            return await self.db_connector.execute_custom_query('customers', filters=filters)
    
    async def _handle_vehicles_query(self, parsed_query: ParsedQuery) -> QueryResult:
        """معالجة استفسارات المركبات"""
        status = parsed_query.filters.get('status')
        
        if parsed_query.action == QueryAction.COUNT or status:
            return await self.db_connector.get_vehicles_by_status(status)
        else:
            return await self.db_connector.execute_custom_query('vehicles', filters=parsed_query.filters)
    
    async def _handle_payments_query(self, parsed_query: ParsedQuery) -> QueryResult:
        """معالجة استفسارات المدفوعات"""
        status = None
        
        # تحديد حالة المدفوعات
        if 'overdue' in parsed_query.filters:
            status = 'pending'
        elif 'status' in parsed_query.filters:
            status = parsed_query.filters['status']
        
        return await self.db_connector.get_payments_summary(status)
    
    async def _handle_invoices_query(self, parsed_query: ParsedQuery) -> QueryResult:
        """معالجة استفسارات الفواتير"""
        if 'overdue' in parsed_query.filters or any('متأخر' in entity[1] for entity in parsed_query.entities):
            return await self.db_connector.get_overdue_invoices_summary()
        else:
            return await self.db_connector.execute_custom_query('invoices', filters=parsed_query.filters)
    
    async def _handle_statistics_query(self, parsed_query: ParsedQuery) -> QueryResult:
        """معالجة استفسارات الإحصائيات"""
        # تحديد نوع الإحصائية المطلوبة بناءً على الكيانات
        entities = [entity[0] for entity in parsed_query.entities]
        
        if 'vehicles' in entities:
            return await self._handle_vehicles_query(parsed_query)
        elif 'customers' in entities:
            return await self._handle_customers_query(parsed_query)
        elif 'payments' in entities or 'overdue' in entities:
            return await self._handle_payments_query(parsed_query)
        else:
            # إحصائية عامة - عدد العملاء
            return await self.db_connector.get_customers_count()
    
    async def _build_response(self, parsed_query: ParsedQuery, db_result: QueryResult, 
                            start_time: datetime) -> SmartQueryResponse:
        """بناء الاستجابة النهائية"""
        execution_time = (datetime.now() - start_time).total_seconds()
        
        if not db_result.success:
            return SmartQueryResponse(
                success=False,
                query_understood=True,
                response_text=f"عذراً، حدث خطأ في الحصول على البيانات: {db_result.error_message}",
                data=None,
                query_type=parsed_query.query_type.value,
                confidence=parsed_query.confidence,
                execution_time=execution_time,
                error_message=db_result.error_message
            )
        
        # تكوين النص الاستجابة
        response_text = self._format_response_text(parsed_query, db_result)
        
        return SmartQueryResponse(
            success=True,
            query_understood=True,
            response_text=response_text,
            data=db_result.data,
            query_type=parsed_query.query_type.value,
            confidence=parsed_query.confidence,
            execution_time=execution_time,
            cached=db_result.cached
        )
    
    def _format_response_text(self, parsed_query: ParsedQuery, db_result: QueryResult) -> str:
        """تنسيق نص الاستجابة"""
        query_type = parsed_query.query_type.value
        action = parsed_query.action.value
        
        # الحصول على القالب المناسب
        templates = self.response_templates.get(query_type, {})
        
        # تحديد المفتاح المناسب
        template_key = action
        if 'overdue' in parsed_query.filters:
            template_key = 'overdue'
        elif 'status' in parsed_query.filters:
            status = parsed_query.filters['status']
            template_key = f"{action}_{status}"
        
        # الحصول على القالب
        template = templates.get(template_key, templates.get(action, "تم العثور على {count} نتيجة"))
        
        # تحضير البيانات للقالب
        format_data = {'count': db_result.count}
        
        # إضافة بيانات إضافية حسب نوع الاستعلام
        if isinstance(db_result.data, dict):
            if 'total_overdue_amount' in db_result.data:
                format_data['amount'] = f"{db_result.data['total_overdue_amount']:.3f}"
            if 'customers_with_overdue' in db_result.data:
                format_data['customers_count'] = db_result.data['customers_with_overdue']
            if 'total_amount' in db_result.data:
                format_data['amount'] = f"{db_result.data['total_amount']:.3f}"
        
        try:
            return template.format(**format_data)
        except KeyError as e:
            logger.warning(f"مفتاح مفقود في قالب الاستجابة: {e}")
            return f"تم العثور على {db_result.count} نتيجة"
    
    async def get_suggestions(self, partial_query: str = "") -> List[str]:
        """الحصول على اقتراحات للاستفسارات"""
        suggestions = [
            # استفسارات العملاء
            "كم عدد العملاء المسجلين في النظام؟",
            "كم عميل نشط لدينا؟",
            "من هم العملاء المتأخرين في الدفع؟",
            
            # استفسارات المركبات
            "كم مركبة متاحة للتأجير؟",
            "كم سيارة في الصيانة؟",
            "ما هي المركبات المؤجرة حالياً؟",
            "كم عربة خارج الخدمة؟",
            
            # استفسارات المالية
            "إجمالي المتأخرات على العملاء",
            "كم فاتورة متأخرة لدينا؟",
            "ملخص المدفوعات المعلقة",
            "إجمالي الإيرادات هذا الشهر",
            
            # استفسارات المخالفات
            "كم مخالفة مرورية غير مدفوعة؟",
            "إجمالي الغرامات المرورية",
            
            # استفسارات العقود
            "كم عقد نشط حالياً؟",
            "العقود المنتهية هذا الشهر",
            
            # استفسارات الصيانة
            "كم عملية صيانة مجدولة؟",
            "تكلفة الصيانة هذا الشهر"
        ]
        
        # فلترة الاقتراحات بناءً على النص الجزئي
        if partial_query:
            filtered_suggestions = [
                suggestion for suggestion in suggestions
                if any(word in suggestion for word in partial_query.split())
            ]
            return filtered_suggestions[:5]  # أول 5 اقتراحات
        
        return suggestions[:10]  # أول 10 اقتراحات
    
    async def validate_query(self, query_text: str) -> Dict[str, Any]:
        """التحقق من صحة الاستفسار"""
        parsed_query = self.query_processor.process_query(query_text)
        
        return {
            'is_valid': parsed_query.confidence >= 0.3,
            'confidence': parsed_query.confidence,
            'query_type': parsed_query.query_type.value,
            'action': parsed_query.action.value,
            'entities': parsed_query.entities,
            'suggestions': await self.get_suggestions(query_text) if parsed_query.confidence < 0.3 else []
        }

# مثال على الاستخدام
if __name__ == "__main__":
    import os
    
    # إعدادات قاعدة البيانات
    config = DatabaseConfig(
        supabase_url=os.getenv('SUPABASE_URL', ''),
        supabase_key=os.getenv('SUPABASE_ANON_KEY', '')
    )
    
    # إنشاء محرك الاستعلامات
    engine = SmartQueryEngine(config)
    engine.set_user_context('company-123', 'user-456')
    
    # اختبار الاستفسارات
    async def test_engine():
        test_queries = [
            "كم عدد العملاء المسجلين؟",
            "كم مركبة في الصيانة؟",
            "إجمالي المتأخرات على الزبائن",
            "ما هي السيارات المتاحة؟",
            "كم مخالفة مرورية غير مدفوعة؟"
        ]
        
        print("=== اختبار محرك الاستعلامات الذكي ===\n")
        
        for query in test_queries:
            print(f"الاستفسار: {query}")
            response = await engine.process_query(query)
            print(f"الاستجابة: {response.response_text}")
            print(f"نجح: {response.success}")
            print(f"مفهوم: {response.query_understood}")
            print(f"الثقة: {response.confidence:.2f}")
            print(f"وقت التنفيذ: {response.execution_time:.3f}s")
            print("-" * 50)
    
    # تشغيل الاختبار
    if config.supabase_url and config.supabase_key:
        asyncio.run(test_engine())
    else:
        print("يرجى تحديد SUPABASE_URL و SUPABASE_ANON_KEY في متغيرات البيئة")


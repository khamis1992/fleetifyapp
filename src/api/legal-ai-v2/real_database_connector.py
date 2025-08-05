#!/usr/bin/env python3
"""
موصل قاعدة البيانات الحقيقية للمستشار القانوني الذكي
يتصل بقاعدة بيانات Supabase الفعلية ويوفر وصولاً آمناً للبيانات
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
import json

try:
    from supabase import create_client, Client
    import pandas as pd
    from sqlalchemy import create_engine, text
    import redis
except ImportError as e:
    print(f"تحذير: بعض المكتبات غير مثبتة: {e}")
    print("يرجى تثبيت المكتبات المطلوبة:")
    print("pip install supabase pandas sqlalchemy redis")

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DatabaseConfig:
    """إعدادات قاعدة البيانات"""
    supabase_url: str
    supabase_key: str
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    cache_ttl: int = 3600  # ساعة واحدة

@dataclass
class QueryResult:
    """نتيجة الاستعلام"""
    success: bool
    data: Any
    count: int
    execution_time: float
    cached: bool = False
    error_message: str = None

class RealDatabaseConnector:
    """موصل قاعدة البيانات الحقيقية"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.supabase: Optional[Client] = None
        self.redis_client = None
        self.company_id = None
        self.user_id = None
        
        # تهيئة الاتصالات
        self._initialize_connections()
    
    def _initialize_connections(self):
        """تهيئة الاتصالات مع قواعد البيانات"""
        try:
            # اتصال Supabase
            if self.config.supabase_url and self.config.supabase_key:
                self.supabase = create_client(
                    self.config.supabase_url, 
                    self.config.supabase_key
                )
                logger.info("تم الاتصال بـ Supabase بنجاح")
            
            # اتصال Redis للتخزين المؤقت
            try:
                self.redis_client = redis.Redis(
                    host=self.config.redis_host,
                    port=self.config.redis_port,
                    db=self.config.redis_db,
                    decode_responses=True
                )
                # اختبار الاتصال
                self.redis_client.ping()
                logger.info("تم الاتصال بـ Redis بنجاح")
            except Exception as e:
                logger.warning(f"فشل الاتصال بـ Redis: {e}")
                self.redis_client = None
                
        except Exception as e:
            logger.error(f"خطأ في تهيئة الاتصالات: {e}")
            raise
    
    def set_user_context(self, company_id: str, user_id: str):
        """تحديد سياق المستخدم والشركة"""
        self.company_id = company_id
        self.user_id = user_id
        logger.info(f"تم تحديد السياق: شركة {company_id}, مستخدم {user_id}")
    
    def _get_cache_key(self, query_type: str, params: Dict) -> str:
        """إنشاء مفتاح التخزين المؤقت"""
        key_data = {
            'company_id': self.company_id,
            'query_type': query_type,
            'params': params
        }
        return f"legal_ai_cache:{hash(str(key_data))}"
    
    def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """الحصول على البيانات من التخزين المؤقت"""
        if not self.redis_client:
            return None
        
        try:
            cached_data = self.redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"خطأ في قراءة التخزين المؤقت: {e}")
        
        return None
    
    def _save_to_cache(self, cache_key: str, data: Dict):
        """حفظ البيانات في التخزين المؤقت"""
        if not self.redis_client:
            return
        
        try:
            self.redis_client.setex(
                cache_key,
                self.config.cache_ttl,
                json.dumps(data, default=str)
            )
        except Exception as e:
            logger.warning(f"خطأ في حفظ التخزين المؤقت: {e}")
    
    async def get_customers_count(self, filters: Dict = None) -> QueryResult:
        """الحصول على عدد العملاء"""
        start_time = datetime.now()
        
        # التحقق من التخزين المؤقت
        cache_key = self._get_cache_key('customers_count', filters or {})
        cached_result = self._get_from_cache(cache_key)
        
        if cached_result:
            execution_time = (datetime.now() - start_time).total_seconds()
            return QueryResult(
                success=True,
                data=cached_result['count'],
                count=cached_result['count'],
                execution_time=execution_time,
                cached=True
            )
        
        try:
            # بناء الاستعلام
            query = self.supabase.table('customers').select('id', count='exact')
            
            # إضافة فلتر الشركة
            if self.company_id:
                query = query.eq('company_id', self.company_id)
            
            # إضافة الفلاتر الإضافية
            if filters:
                if filters.get('is_active'):
                    query = query.eq('is_active', True)
                if filters.get('customer_type'):
                    query = query.eq('customer_type', filters['customer_type'])
                if filters.get('is_blacklisted') is not None:
                    query = query.eq('is_blacklisted', filters['is_blacklisted'])
            
            # تنفيذ الاستعلام
            result = query.execute()
            count = result.count if hasattr(result, 'count') else len(result.data)
            
            # حفظ في التخزين المؤقت
            cache_data = {'count': count}
            self._save_to_cache(cache_key, cache_data)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return QueryResult(
                success=True,
                data=count,
                count=count,
                execution_time=execution_time,
                cached=False
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"خطأ في الحصول على عدد العملاء: {e}")
            
            return QueryResult(
                success=False,
                data=None,
                count=0,
                execution_time=execution_time,
                error_message=str(e)
            )
    
    async def get_vehicles_by_status(self, status: str = None) -> QueryResult:
        """الحصول على المركبات حسب الحالة"""
        start_time = datetime.now()
        
        # التحقق من التخزين المؤقت
        cache_key = self._get_cache_key('vehicles_by_status', {'status': status})
        cached_result = self._get_from_cache(cache_key)
        
        if cached_result:
            execution_time = (datetime.now() - start_time).total_seconds()
            return QueryResult(
                success=True,
                data=cached_result['data'],
                count=len(cached_result['data']),
                execution_time=execution_time,
                cached=True
            )
        
        try:
            # بناء الاستعلام
            query = self.supabase.table('vehicles').select('*')
            
            # إضافة فلتر الشركة
            if self.company_id:
                query = query.eq('company_id', self.company_id)
            
            # إضافة فلتر الحالة
            if status:
                query = query.eq('status', status)
            
            # فلتر المركبات النشطة فقط
            query = query.eq('is_active', True)
            
            # تنفيذ الاستعلام
            result = query.execute()
            vehicles_data = result.data
            
            # حفظ في التخزين المؤقت
            cache_data = {'data': vehicles_data}
            self._save_to_cache(cache_key, cache_data)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return QueryResult(
                success=True,
                data=vehicles_data,
                count=len(vehicles_data),
                execution_time=execution_time,
                cached=False
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"خطأ في الحصول على المركبات: {e}")
            
            return QueryResult(
                success=False,
                data=None,
                count=0,
                execution_time=execution_time,
                error_message=str(e)
            )
    
    async def get_overdue_invoices_summary(self) -> QueryResult:
        """الحصول على ملخص الفواتير المتأخرة"""
        start_time = datetime.now()
        
        # التحقق من التخزين المؤقت
        cache_key = self._get_cache_key('overdue_invoices', {})
        cached_result = self._get_from_cache(cache_key)
        
        if cached_result:
            execution_time = (datetime.now() - start_time).total_seconds()
            return QueryResult(
                success=True,
                data=cached_result,
                count=cached_result.get('count', 0),
                execution_time=execution_time,
                cached=True
            )
        
        try:
            # الحصول على الفواتير المتأخرة
            query = self.supabase.table('invoices').select('*')
            
            # إضافة فلتر الشركة
            if self.company_id:
                query = query.eq('company_id', self.company_id)
            
            # فلتر الفواتير المتأخرة
            query = query.eq('status', 'overdue')
            
            # تنفيذ الاستعلام
            result = query.execute()
            overdue_invoices = result.data
            
            # حساب الإحصائيات
            total_overdue_amount = sum(invoice.get('balance_due', 0) for invoice in overdue_invoices)
            overdue_count = len(overdue_invoices)
            
            # تجميع البيانات حسب العميل
            customers_overdue = {}
            for invoice in overdue_invoices:
                customer_id = invoice.get('customer_id')
                if customer_id:
                    if customer_id not in customers_overdue:
                        customers_overdue[customer_id] = {
                            'customer_id': customer_id,
                            'total_overdue': 0,
                            'invoices_count': 0
                        }
                    customers_overdue[customer_id]['total_overdue'] += invoice.get('balance_due', 0)
                    customers_overdue[customer_id]['invoices_count'] += 1
            
            summary = {
                'total_overdue_amount': total_overdue_amount,
                'overdue_invoices_count': overdue_count,
                'customers_with_overdue': len(customers_overdue),
                'customers_overdue_details': list(customers_overdue.values()),
                'count': overdue_count
            }
            
            # حفظ في التخزين المؤقت
            self._save_to_cache(cache_key, summary)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return QueryResult(
                success=True,
                data=summary,
                count=overdue_count,
                execution_time=execution_time,
                cached=False
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"خطأ في الحصول على الفواتير المتأخرة: {e}")
            
            return QueryResult(
                success=False,
                data=None,
                count=0,
                execution_time=execution_time,
                error_message=str(e)
            )
    
    async def get_payments_summary(self, status: str = None) -> QueryResult:
        """الحصول على ملخص المدفوعات"""
        start_time = datetime.now()
        
        # التحقق من التخزين المؤقت
        cache_key = self._get_cache_key('payments_summary', {'status': status})
        cached_result = self._get_from_cache(cache_key)
        
        if cached_result:
            execution_time = (datetime.now() - start_time).total_seconds()
            return QueryResult(
                success=True,
                data=cached_result,
                count=cached_result.get('count', 0),
                execution_time=execution_time,
                cached=True
            )
        
        try:
            # بناء الاستعلام
            query = self.supabase.table('payments').select('*')
            
            # إضافة فلتر الشركة
            if self.company_id:
                query = query.eq('company_id', self.company_id)
            
            # إضافة فلتر الحالة
            if status:
                query = query.eq('status', status)
            
            # تنفيذ الاستعلام
            result = query.execute()
            payments_data = result.data
            
            # حساب الإحصائيات
            total_amount = sum(payment.get('amount', 0) for payment in payments_data)
            payments_count = len(payments_data)
            
            # تجميع حسب نوع الدفع
            payment_types = {}
            for payment in payments_data:
                payment_type = payment.get('payment_type', 'unknown')
                if payment_type not in payment_types:
                    payment_types[payment_type] = {'count': 0, 'amount': 0}
                payment_types[payment_type]['count'] += 1
                payment_types[payment_type]['amount'] += payment.get('amount', 0)
            
            summary = {
                'total_amount': total_amount,
                'payments_count': payments_count,
                'payment_types_breakdown': payment_types,
                'count': payments_count
            }
            
            # حفظ في التخزين المؤقت
            self._save_to_cache(cache_key, summary)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return QueryResult(
                success=True,
                data=summary,
                count=payments_count,
                execution_time=execution_time,
                cached=False
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"خطأ في الحصول على ملخص المدفوعات: {e}")
            
            return QueryResult(
                success=False,
                data=None,
                count=0,
                execution_time=execution_time,
                error_message=str(e)
            )
    
    async def execute_custom_query(self, table: str, select_fields: str = '*', 
                                 filters: Dict = None, limit: int = None) -> QueryResult:
        """تنفيذ استعلام مخصص"""
        start_time = datetime.now()
        
        try:
            # بناء الاستعلام
            query = self.supabase.table(table).select(select_fields)
            
            # إضافة فلتر الشركة إذا كان الجدول يحتوي على company_id
            company_tables = ['customers', 'vehicles', 'invoices', 'payments', 
                            'contracts', 'traffic_violations', 'maintenance_records']
            if table in company_tables and self.company_id:
                query = query.eq('company_id', self.company_id)
            
            # إضافة الفلاتر
            if filters:
                for key, value in filters.items():
                    if isinstance(value, list):
                        query = query.in_(key, value)
                    else:
                        query = query.eq(key, value)
            
            # إضافة الحد الأقصى للنتائج
            if limit:
                query = query.limit(limit)
            
            # تنفيذ الاستعلام
            result = query.execute()
            data = result.data
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return QueryResult(
                success=True,
                data=data,
                count=len(data),
                execution_time=execution_time,
                cached=False
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"خطأ في تنفيذ الاستعلام المخصص: {e}")
            
            return QueryResult(
                success=False,
                data=None,
                count=0,
                execution_time=execution_time,
                error_message=str(e)
            )
    
    def get_connection_status(self) -> Dict[str, bool]:
        """فحص حالة الاتصالات"""
        status = {
            'supabase': False,
            'redis': False
        }
        
        # فحص Supabase
        try:
            if self.supabase:
                # محاولة استعلام بسيط
                result = self.supabase.table('companies').select('id').limit(1).execute()
                status['supabase'] = True
        except Exception as e:
            logger.error(f"خطأ في اتصال Supabase: {e}")
        
        # فحص Redis
        try:
            if self.redis_client:
                self.redis_client.ping()
                status['redis'] = True
        except Exception as e:
            logger.error(f"خطأ في اتصال Redis: {e}")
        
        return status

# مثال على الاستخدام
if __name__ == "__main__":
    # إعدادات قاعدة البيانات (يجب الحصول عليها من متغيرات البيئة)
    config = DatabaseConfig(
        supabase_url=os.getenv('SUPABASE_URL', ''),
        supabase_key=os.getenv('SUPABASE_ANON_KEY', ''),
        redis_host=os.getenv('REDIS_HOST', 'localhost'),
        redis_port=int(os.getenv('REDIS_PORT', 6379))
    )
    
    # إنشاء الموصل
    connector = RealDatabaseConnector(config)
    
    # تحديد سياق المستخدم (مثال)
    connector.set_user_context('company-123', 'user-456')
    
    # فحص حالة الاتصال
    status = connector.get_connection_status()
    print(f"حالة الاتصالات: {status}")
    
    # مثال على الاستعلامات
    async def test_queries():
        # عدد العملاء
        customers_result = await connector.get_customers_count()
        print(f"عدد العملاء: {customers_result.data}")
        
        # المركبات في الصيانة
        maintenance_vehicles = await connector.get_vehicles_by_status('maintenance')
        print(f"المركبات في الصيانة: {maintenance_vehicles.count}")
        
        # الفواتير المتأخرة
        overdue_summary = await connector.get_overdue_invoices_summary()
        print(f"إجمالي المتأخرات: {overdue_summary.data.get('total_overdue_amount', 0) if overdue_summary.success else 'خطأ'}")
    
    # تشغيل الاختبارات
    if config.supabase_url and config.supabase_key:
        asyncio.run(test_queries())
    else:
        print("يرجى تحديد SUPABASE_URL و SUPABASE_ANON_KEY في متغيرات البيئة")


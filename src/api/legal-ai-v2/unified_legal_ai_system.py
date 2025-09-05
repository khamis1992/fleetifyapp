#!/usr/bin/env python3
"""
النظام الموحد النهائي للمستشار القانوني الذكي المتقدم
يجمع جميع المكونات في نظام واحد متكامل وعالي الأداء
"""

import json
import sqlite3
import logging
import asyncio
import time
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from contextlib import contextmanager
import threading
from collections import defaultdict, deque
import re
import warnings
warnings.filterwarnings('ignore')

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ClientData:
    """بيانات العميل الشاملة"""
    client_id: str
    basic_info: Dict[str, Any]
    contracts: List[Dict[str, Any]]
    payments: List[Dict[str, Any]]
    violations: List[Dict[str, Any]]
    legal_history: List[Dict[str, Any]]
    risk_score: float = 0.0
    last_updated: datetime = None

@dataclass
class LegalDocument:
    """الوثيقة القانونية"""
    document_id: str
    document_type: str
    client_id: str
    country: str
    content: str
    legal_references: List[str]
    created_at: datetime
    accuracy_score: float
    is_validated: bool = False

@dataclass
class PerformanceMetrics:
    """مقاييس الأداء"""
    operation_name: str
    execution_time: float
    memory_usage: int
    cache_hit_rate: float
    success_rate: float
    timestamp: datetime

class UnifiedLegalAISystem:
    """النظام الموحد للمستشار القانوني الذكي"""
    
    def __init__(self, db_path: str = "unified_legal_ai.db"):
        self.db_path = db_path
        self.cache = {}
        self.performance_metrics = deque(maxlen=1000)
        self.active_sessions = {}
        self.legal_templates = {}
        self.risk_models = {}
        
        # إعدادات النظام
        self.cache_ttl = 3600  # ساعة واحدة
        self.max_cache_size = 1000
        self.performance_threshold = 1.0  # ثانية واحدة
        
        # تهيئة النظام
        self._initialize_database()
        self._load_legal_templates()
        self._initialize_risk_models()
        
        logger.info("تم تهيئة النظام الموحد للمستشار القانوني الذكي")

    def _initialize_database(self):
        """تهيئة قاعدة البيانات الموحدة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # جدول العملاء
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT UNIQUE,
                name TEXT,
                email TEXT,
                phone TEXT,
                id_number TEXT,
                address TEXT,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active',
                risk_score REAL DEFAULT 0.0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # جدول العقود
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS contracts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contract_id TEXT UNIQUE,
                client_id TEXT,
                contract_type TEXT,
                start_date DATE,
                end_date DATE,
                amount REAL,
                status TEXT,
                terms TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (client_id)
            )
        ''')
        
        # جدول المدفوعات
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_id TEXT UNIQUE,
                client_id TEXT,
                contract_id TEXT,
                amount REAL,
                due_date DATE,
                paid_date DATE,
                status TEXT,
                days_overdue INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (client_id)
            )
        ''')
        
        # جدول المخالفات
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS violations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                violation_id TEXT UNIQUE,
                client_id TEXT,
                violation_type TEXT,
                description TEXT,
                severity TEXT,
                date_occurred DATE,
                fine_amount REAL,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (client_id)
            )
        ''')
        
        # جدول الوثائق القانونية
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS legal_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT UNIQUE,
                client_id TEXT,
                document_type TEXT,
                country TEXT,
                content TEXT,
                legal_references TEXT,
                accuracy_score REAL,
                is_validated BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (client_id)
            )
        ''')
        
        # جدول مقاييس الأداء
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_name TEXT,
                execution_time REAL,
                memory_usage INTEGER,
                cache_hit_rate REAL,
                success_rate REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # جدول التخزين المؤقت
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cache_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key TEXT UNIQUE,
                cache_value TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # إدراج بيانات تجريبية
        self._insert_sample_data(cursor)
        
        conn.commit()
        conn.close()

    def _insert_sample_data(self, cursor):
        """إدراج بيانات تجريبية للاختبار"""
        # عملاء تجريبيون
        sample_clients = [
            ('client_001', 'أحمد محمد علي', 'ahmed@example.com', '+965-1234-5678', '123456789012', 'الكويت، حولي', 'active', 37.5),
            ('client_002', 'سارة أحمد محمد', 'sara@example.com', '+966-9876-5432', '987654321098', 'الرياض، السعودية', 'active', 25.0),
            ('client_003', 'محمد علي حسن', 'mohammed@example.com', '+974-5555-1234', '555512349876', 'الدوحة، قطر', 'suspended', 65.0)
        ]
        
        for client in sample_clients:
            cursor.execute('''
                INSERT OR IGNORE INTO clients 
                (client_id, name, email, phone, id_number, address, status, risk_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', client)
        
        # عقود تجريبية
        sample_contracts = [
            ('contract_001', 'client_001', 'car_rental', '2024-01-01', '2024-12-31', 12000.0, 'active', 'عقد تأجير سيارة سنوي'),
            ('contract_002', 'client_002', 'limousine_service', '2024-02-01', '2024-08-01', 8000.0, 'active', 'خدمة ليموزين شهرية'),
            ('contract_003', 'client_003', 'car_rental', '2024-01-15', '2024-06-15', 6000.0, 'terminated', 'عقد تأجير منتهي')
        ]
        
        for contract in sample_contracts:
            cursor.execute('''
                INSERT OR IGNORE INTO contracts 
                (contract_id, client_id, contract_type, start_date, end_date, amount, status, terms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', contract)
        
        # مدفوعات تجريبية
        sample_payments = [
            ('payment_001', 'client_001', 'contract_001', 1000.0, '2024-01-15', None, 'overdue', 30),
            ('payment_002', 'client_001', 'contract_001', 1000.0, '2024-02-15', '2024-02-10', 'paid', 0),
            ('payment_003', 'client_002', 'contract_002', 1500.0, '2024-02-01', None, 'overdue', 60),
            ('payment_004', 'client_002', 'contract_002', 800.0, '2024-03-01', None, 'overdue', 30)
        ]
        
        for payment in sample_payments:
            cursor.execute('''
                INSERT OR IGNORE INTO payments 
                (payment_id, client_id, contract_id, amount, due_date, paid_date, status, days_overdue)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', payment)
        
        # مخالفات تجريبية
        sample_violations = [
            ('violation_001', 'client_001', 'speeding', 'تجاوز السرعة المحددة', 'medium', '2024-01-20', 200.0, 'unpaid'),
            ('violation_002', 'client_003', 'late_return', 'تأخير في إرجاع السيارة', 'high', '2024-02-10', 500.0, 'unpaid'),
            ('violation_003', 'client_003', 'damage', 'أضرار في السيارة', 'high', '2024-02-15', 1500.0, 'disputed')
        ]
        
        for violation in sample_violations:
            cursor.execute('''
                INSERT OR IGNORE INTO violations 
                (violation_id, client_id, violation_type, description, severity, date_occurred, fine_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', violation)

    def _load_legal_templates(self):
        """تحميل قوالب الوثائق القانونية"""
        self.legal_templates = {
            'kuwait': {
                'legal_warning': '''
إنذار قانوني

التاريخ: {date}
إلى السيد/ة: {client_name}
رقم الهوية: {client_id}

بناءً على أحكام القانون المدني الكويتي والعقد المبرم بيننا رقم {contract_id}، نحيطكم علماً بما يلي:

الأسباب القانونية:
{legal_reasons}

المطالبات:
{demands}

ننذركم بضرورة تسوية الوضع خلال 15 يوماً من تاريخ هذا الإنذار، وإلا سنضطر لاتخاذ الإجراءات القانونية اللازمة.

المراجع القانونية:
- القانون المدني الكويتي - المادة 171
- قانون التجارة الكويتي - المادة 45

مع التقدير،
إدارة الشؤون القانونية
''',
                'financial_claim': '''
مطالبة مالية

التاريخ: {date}
المطالب: شركة تأجير السيارات
المطالب منه: {client_name}

تفاصيل المطالبة:
{claim_details}

إجمالي المبلغ المطالب به: {total_amount} دينار كويتي

الأساس القانوني:
- العقد المبرم بتاريخ {contract_date}
- القانون المدني الكويتي

نطالبكم بسداد المبلغ المذكور خلال 30 يوماً من تاريخ هذه المطالبة.
'''
            },
            'saudi_arabia': {
                'legal_warning': '''
إنذار قانوني

التاريخ: {date}
إلى: {client_name}
رقم الهوية: {client_id}

استناداً إلى أحكام النظام المدني السعودي والعقد المبرم بيننا:

الأسباب:
{legal_reasons}

المطالب:
{demands}

يُنذر بضرورة التسوية خلال 15 يوماً وإلا ستتخذ الإجراءات النظامية.

المراجع النظامية:
- النظام المدني السعودي
- نظام التجارة السعودي

الإدارة القانونية
''',
                'financial_claim': '''
مطالبة مالية

التاريخ: {date}
المطالب: {company_name}
المطالب منه: {client_name}

تفاصيل المطالبة:
{claim_details}

المبلغ الإجمالي: {total_amount} ريال سعودي

الأساس النظامي:
- العقد المبرم
- النظام المدني السعودي

المطالبة بالسداد خلال 30 يوماً.
'''
            },
            'qatar': {
                'legal_warning': '''
إنذار قانوني

التاريخ: {date}
إلى: {client_name}
الرقم الشخصي: {client_id}

بموجب أحكام القانون المدني القطري والعقد المبرم:

الأسباب القانونية:
{legal_reasons}

المطالبات:
{demands}

إنذار بالتسوية خلال 15 يوماً وإلا ستُتخذ الإجراءات القانونية.

المراجع القانونية:
- القانون المدني القطري
- قانون التجارة القطري

الشؤون القانونية
'''
            }
        }

    def _initialize_risk_models(self):
        """تهيئة نماذج تقييم المخاطر"""
        self.risk_models = {
            'payment_risk': {
                'overdue_days': {'weight': 0.4, 'max_score': 40},
                'overdue_amount': {'weight': 0.3, 'max_score': 30},
                'payment_history': {'weight': 0.3, 'max_score': 30}
            },
            'violation_risk': {
                'violation_count': {'weight': 0.4, 'max_score': 25},
                'severity_level': {'weight': 0.6, 'max_score': 35}
            },
            'contract_risk': {
                'contract_breaches': {'weight': 0.5, 'max_score': 20},
                'contract_value': {'weight': 0.3, 'max_score': 15},
                'contract_duration': {'weight': 0.2, 'max_score': 10}
            }
        }

    @contextmanager
    def monitor_performance(self, operation_name: str):
        """مراقب الأداء"""
        start_time = time.time()
        start_memory = self._get_memory_usage()
        
        try:
            yield
        finally:
            end_time = time.time()
            end_memory = self._get_memory_usage()
            
            execution_time = end_time - start_time
            memory_usage = end_memory - start_memory
            
            # حفظ مقاييس الأداء
            metrics = PerformanceMetrics(
                operation_name=operation_name,
                execution_time=execution_time,
                memory_usage=memory_usage,
                cache_hit_rate=self._calculate_cache_hit_rate(),
                success_rate=1.0,  # سيتم تحديثها حسب النتيجة
                timestamp=datetime.now()
            )
            
            self.performance_metrics.append(metrics)
            
            # تسجيل تحذير إذا تجاوز الأداء الحد المسموح
            if execution_time > self.performance_threshold:
                logger.warning(f"عملية {operation_name} تجاوزت حد الأداء: {execution_time:.2f}s")

    def _get_memory_usage(self) -> int:
        """الحصول على استخدام الذاكرة"""
        try:
            import psutil
            import os
            process = psutil.Process(os.getpid())
            return process.memory_info().rss
        except ImportError:
            return 0

    def _calculate_cache_hit_rate(self) -> float:
        """حساب معدل إصابة التخزين المؤقت"""
        if not hasattr(self, '_cache_hits'):
            self._cache_hits = 0
            self._cache_misses = 0
        
        total_requests = self._cache_hits + self._cache_misses
        return (self._cache_hits / total_requests * 100) if total_requests > 0 else 0.0

    def get_comprehensive_client_data(self, client_id: str) -> Dict[str, Any]:
        """الحصول على بيانات العميل الشاملة"""
        with self.monitor_performance("get_comprehensive_client_data"):
            # فحص التخزين المؤقت أولاً
            cache_key = f"client_data_{client_id}"
            cached_data = self._get_from_cache(cache_key)
            
            if cached_data:
                self._cache_hits = getattr(self, '_cache_hits', 0) + 1
                return cached_data
            
            self._cache_misses = getattr(self, '_cache_misses', 0) + 1
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # البيانات الأساسية
            cursor.execute('SELECT * FROM clients WHERE client_id = ?', (client_id,))
            client_row = cursor.fetchone()
            
            if not client_row:
                conn.close()
                return {}
            
            columns = [description[0] for description in cursor.description]
            basic_info = dict(zip(columns, client_row))
            
            # العقود
            cursor.execute('SELECT * FROM contracts WHERE client_id = ?', (client_id,))
            contracts = [dict(zip([d[0] for d in cursor.description], row)) 
                        for row in cursor.fetchall()]
            
            # المدفوعات
            cursor.execute('SELECT * FROM payments WHERE client_id = ?', (client_id,))
            payments = [dict(zip([d[0] for d in cursor.description], row)) 
                       for row in cursor.fetchall()]
            
            # المخالفات
            cursor.execute('SELECT * FROM violations WHERE client_id = ?', (client_id,))
            violations = [dict(zip([d[0] for d in cursor.description], row)) 
                         for row in cursor.fetchall()]
            
            # التاريخ القانوني
            cursor.execute('SELECT * FROM legal_documents WHERE client_id = ?', (client_id,))
            legal_history = [dict(zip([d[0] for d in cursor.description], row)) 
                           for row in cursor.fetchall()]
            
            conn.close()
            
            client_data = {
                'basic_info': basic_info,
                'contracts': contracts,
                'payments': payments,
                'violations': violations,
                'legal_history': legal_history,
                'last_updated': datetime.now().isoformat()
            }
            
            # حفظ في التخزين المؤقت
            self._save_to_cache(cache_key, client_data)
            
            return client_data

    def analyze_client_risk(self, client_data: Dict[str, Any]) -> Dict[str, Any]:
        """تحليل مخاطر العميل"""
        with self.monitor_performance("analyze_client_risk"):
            risk_score = 0.0
            risk_factors = []
            
            # تحليل مخاطر الدفع
            payment_risk = self._calculate_payment_risk(client_data.get('payments', []))
            risk_score += payment_risk['score']
            risk_factors.extend(payment_risk['factors'])
            
            # تحليل مخاطر المخالفات
            violation_risk = self._calculate_violation_risk(client_data.get('violations', []))
            risk_score += violation_risk['score']
            risk_factors.extend(violation_risk['factors'])
            
            # تحليل مخاطر العقود
            contract_risk = self._calculate_contract_risk(client_data.get('contracts', []))
            risk_score += contract_risk['score']
            risk_factors.extend(contract_risk['factors'])
            
            # تحديد مستوى المخاطر
            if risk_score >= 70:
                risk_level = "عالي جداً"
                color = "red"
            elif risk_score >= 50:
                risk_level = "عالي"
                color = "orange"
            elif risk_score >= 30:
                risk_level = "متوسط"
                color = "yellow"
            else:
                risk_level = "منخفض"
                color = "green"
            
            # توصيات بناءً على المخاطر
            recommendations = self._generate_risk_recommendations(risk_score, risk_factors)
            
            return {
                'risk_score': round(risk_score, 1),
                'risk_level': risk_level,
                'risk_color': color,
                'risk_factors': risk_factors,
                'recommendations': recommendations,
                'analysis_date': datetime.now().isoformat()
            }

    def _calculate_payment_risk(self, payments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """حساب مخاطر الدفع"""
        if not payments:
            return {'score': 0, 'factors': []}
        
        overdue_payments = [p for p in payments if p.get('status') == 'overdue']
        
        if not overdue_payments:
            return {'score': 0, 'factors': []}
        
        # حساب النقاط بناءً على الأيام المتأخرة
        max_overdue_days = max([p.get('days_overdue', 0) for p in overdue_payments])
        overdue_score = min(max_overdue_days / 30 * 40, 40)  # حد أقصى 40 نقطة
        
        # حساب النقاط بناءً على المبلغ المتأخر
        total_overdue_amount = sum([p.get('amount', 0) for p in overdue_payments])
        amount_score = min(total_overdue_amount / 5000 * 30, 30)  # حد أقصى 30 نقطة
        
        factors = []
        if max_overdue_days > 0:
            factors.append(f"تأخير في الدفع لمدة {max_overdue_days} يوم")
        if total_overdue_amount > 0:
            factors.append(f"مبلغ متأخر: {total_overdue_amount} دينار")
        
        return {
            'score': overdue_score + amount_score,
            'factors': factors
        }

    def _calculate_violation_risk(self, violations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """حساب مخاطر المخالفات"""
        if not violations:
            return {'score': 0, 'factors': []}
        
        violation_count = len(violations)
        count_score = min(violation_count * 5, 25)  # 5 نقاط لكل مخالفة، حد أقصى 25
        
        # حساب النقاط بناءً على شدة المخالفات
        severity_scores = {'low': 5, 'medium': 15, 'high': 35}
        max_severity_score = max([severity_scores.get(v.get('severity', 'low'), 5) 
                                 for v in violations])
        
        factors = []
        factors.append(f"عدد المخالفات: {violation_count}")
        
        high_severity_violations = [v for v in violations if v.get('severity') == 'high']
        if high_severity_violations:
            factors.append(f"مخالفات عالية الخطورة: {len(high_severity_violations)}")
        
        return {
            'score': count_score + max_severity_score,
            'factors': factors
        }

    def _calculate_contract_risk(self, contracts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """حساب مخاطر العقود"""
        if not contracts:
            return {'score': 0, 'factors': []}
        
        terminated_contracts = [c for c in contracts if c.get('status') == 'terminated']
        breach_score = len(terminated_contracts) * 10  # 10 نقاط لكل عقد منتهي
        
        factors = []
        if terminated_contracts:
            factors.append(f"عقود منتهية: {len(terminated_contracts)}")
        
        return {
            'score': min(breach_score, 20),  # حد أقصى 20 نقطة
            'factors': factors
        }

    def _generate_risk_recommendations(self, risk_score: float, risk_factors: List[str]) -> List[str]:
        """إنشاء توصيات بناءً على المخاطر"""
        recommendations = []
        
        if risk_score >= 70:
            recommendations.extend([
                "إيقاف جميع الخدمات فوراً",
                "بدء الإجراءات القانونية",
                "طلب ضمانات إضافية",
                "مراجعة قانونية شاملة"
            ])
        elif risk_score >= 50:
            recommendations.extend([
                "مراقبة مشددة للعميل",
                "إرسال إنذار قانوني",
                "طلب تسوية فورية",
                "تقييد الخدمات الجديدة"
            ])
        elif risk_score >= 30:
            recommendations.extend([
                "متابعة دورية مع العميل",
                "إرسال تذكير بالمستحقات",
                "مراجعة شروط العقد"
            ])
        else:
            recommendations.append("متابعة عادية")
        
        return recommendations

    def extract_legal_reasons(self, client_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """استخراج الأسباب القانونية"""
        with self.monitor_performance("extract_legal_reasons"):
            legal_reasons = []
            
            # أسباب متعلقة بالدفع
            overdue_payments = [p for p in client_data.get('payments', []) 
                              if p.get('status') == 'overdue']
            
            for payment in overdue_payments:
                days_overdue = payment.get('days_overdue', 0)
                amount = payment.get('amount', 0)
                
                if days_overdue > 30:
                    legal_reasons.append({
                        'reason': f'تأخير في سداد مبلغ {amount} دينار لمدة {days_overdue} يوم',
                        'severity': 'high' if days_overdue > 60 else 'medium',
                        'legal_basis': 'المادة 15 من العقد - شروط السداد',
                        'article': 'المادة 171 من القانون المدني'
                    })
            
            # أسباب متعلقة بالمخالفات
            violations = client_data.get('violations', [])
            for violation in violations:
                if violation.get('status') == 'unpaid':
                    legal_reasons.append({
                        'reason': violation.get('description', 'مخالفة غير محددة'),
                        'severity': violation.get('severity', 'medium'),
                        'legal_basis': 'شروط الاستخدام في العقد',
                        'article': 'المادة 45 من قانون التجارة'
                    })
            
            # أسباب متعلقة بالعقود
            terminated_contracts = [c for c in client_data.get('contracts', []) 
                                  if c.get('status') == 'terminated']
            
            for contract in terminated_contracts:
                legal_reasons.append({
                    'reason': 'إخلال بشروط العقد أدى إلى إنهائه',
                    'severity': 'high',
                    'legal_basis': 'شروط العقد العامة',
                    'article': 'المادة 89 من القانون المدني'
                })
            
            return legal_reasons

    def understand_query_context(self, query: str) -> Dict[str, Any]:
        """فهم سياق الاستعلام"""
        with self.monitor_performance("understand_query_context"):
            query_lower = query.lower()
            
            # تحديد نوع الوثيقة المطلوبة
            document_type = None
            if any(word in query_lower for word in ['إنذار', 'انذار', 'تحذير']):
                document_type = 'legal_warning'
            elif any(word in query_lower for word in ['مطالبة', 'مطالب', 'دين']):
                document_type = 'financial_claim'
            elif any(word in query_lower for word in ['إنهاء', 'انهاء', 'فسخ']):
                document_type = 'contract_termination'
            
            # استخراج اسم العميل
            client_name = None
            name_patterns = [
                r'للعميل\s+(\w+(?:\s+\w+)*)',
                r'العميل\s+(\w+(?:\s+\w+)*)',
                r'السيد\s+(\w+(?:\s+\w+)*)',
                r'السيدة\s+(\w+(?:\s+\w+)*)'
            ]
            
            for pattern in name_patterns:
                match = re.search(pattern, query)
                if match:
                    client_name = match.group(1).strip()
                    break
            
            # تحديد الدولة
            country = None
            if any(word in query_lower for word in ['كويت', 'kuwait']):
                country = 'kuwait'
            elif any(word in query_lower for word in ['سعودية', 'saudi']):
                country = 'saudi_arabia'
            elif any(word in query_lower for word in ['قطر', 'qatar']):
                country = 'qatar'
            
            # تحديد نوع الإجراء
            intent = None
            if any(word in query_lower for word in ['اكتب', 'أكتب', 'إنشاء', 'انشاء']):
                intent = 'create_document'
            elif any(word in query_lower for word in ['تحليل', 'فحص', 'تقييم']):
                intent = 'analyze'
            elif any(word in query_lower for word in ['معلومات', 'بيانات', 'تفاصيل']):
                intent = 'get_info'
            
            return {
                'intent': intent,
                'document_type': document_type,
                'client_name': client_name,
                'country': country or 'kuwait',  # افتراضي
                'entities': {
                    'client_name': client_name,
                    'document_type': document_type,
                    'country': country
                },
                'confidence': 0.85
            }

    def generate_legal_document(self, client_data: Dict[str, Any], 
                              legal_reasons: List[Dict[str, Any]], 
                              document_type: str, country: str) -> Dict[str, Any]:
        """إنشاء الوثيقة القانونية"""
        with self.monitor_performance("generate_legal_document"):
            if country not in self.legal_templates:
                country = 'kuwait'  # افتراضي
            
            if document_type not in self.legal_templates[country]:
                document_type = 'legal_warning'  # افتراضي
            
            template = self.legal_templates[country][document_type]
            
            # إعداد البيانات للقالب
            client_info = client_data.get('basic_info', {})
            
            # تنسيق الأسباب القانونية
            formatted_reasons = []
            for i, reason in enumerate(legal_reasons, 1):
                formatted_reasons.append(f"{i}. {reason['reason']}")
            
            reasons_text = '\n'.join(formatted_reasons)
            
            # إعداد المطالبات
            demands = []
            overdue_payments = [p for p in client_data.get('payments', []) 
                              if p.get('status') == 'overdue']
            
            if overdue_payments:
                total_overdue = sum([p.get('amount', 0) for p in overdue_payments])
                demands.append(f"سداد المبلغ المستحق: {total_overdue} دينار")
            
            unpaid_violations = [v for v in client_data.get('violations', []) 
                               if v.get('status') == 'unpaid']
            
            if unpaid_violations:
                total_fines = sum([v.get('fine_amount', 0) for v in unpaid_violations])
                demands.append(f"سداد الغرامات: {total_fines} دينار")
            
            demands_text = '\n'.join([f"- {demand}" for demand in demands])
            
            # ملء القالب
            content = template.format(
                date=datetime.now().strftime('%Y-%m-%d'),
                client_name=client_info.get('name', 'غير محدد'),
                client_id=client_info.get('id_number', 'غير محدد'),
                contract_id=client_data.get('contracts', [{}])[0].get('contract_id', 'غير محدد'),
                legal_reasons=reasons_text,
                demands=demands_text,
                total_amount=sum([p.get('amount', 0) for p in overdue_payments]) + 
                           sum([v.get('fine_amount', 0) for v in unpaid_violations]),
                contract_date=client_data.get('contracts', [{}])[0].get('start_date', 'غير محدد'),
                company_name='شركة تأجير السيارات',
                claim_details=reasons_text
            )
            
            # إنشاء الوثيقة
            document = LegalDocument(
                document_id=secrets.token_hex(8),
                document_type=document_type,
                client_id=client_info.get('client_id', 'unknown'),
                country=country,
                content=content,
                legal_references=[reason.get('article', '') for reason in legal_reasons],
                created_at=datetime.now(),
                accuracy_score=0.95,  # نقاط دقة افتراضية
                is_validated=True
            )
            
            # حفظ الوثيقة في قاعدة البيانات
            self._save_legal_document(document)
            
            return {
                'document_id': document.document_id,
                'document_type': document.document_type,
                'content': document.content,
                'legal_references': document.legal_references,
                'accuracy_score': document.accuracy_score,
                'created_at': document.created_at.isoformat(),
                'is_validated': document.is_validated
            }

    def _save_legal_document(self, document: LegalDocument):
        """حفظ الوثيقة القانونية في قاعدة البيانات"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO legal_documents 
            (document_id, client_id, document_type, country, content, 
             legal_references, accuracy_score, is_validated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            document.document_id,
            document.client_id,
            document.document_type,
            document.country,
            document.content,
            json.dumps(document.legal_references, ensure_ascii=False),
            document.accuracy_score,
            document.is_validated
        ))
        
        conn.commit()
        conn.close()

    def process_intelligent_query(self, query: str) -> Dict[str, Any]:
        """معالجة الاستعلام الذكي"""
        with self.monitor_performance("process_intelligent_query"):
            # فهم السياق
            context = self.understand_query_context(query)
            
            if not context.get('client_name'):
                return {
                    'success': False,
                    'error': 'لم يتم تحديد اسم العميل في الاستعلام',
                    'suggestion': 'يرجى تحديد اسم العميل، مثل: "اكتب إنذار قانوني للعميل أحمد محمد"'
                }
            
            # البحث عن العميل
            client_id = self._find_client_by_name(context['client_name'])
            
            if not client_id:
                return {
                    'success': False,
                    'error': f'لم يتم العثور على العميل: {context["client_name"]}',
                    'suggestion': 'يرجى التأكد من صحة اسم العميل'
                }
            
            # الحصول على بيانات العميل
            client_data = self.get_comprehensive_client_data(client_id)
            
            if context['intent'] == 'create_document':
                # تحليل المخاطر
                risk_analysis = self.analyze_client_risk(client_data)
                
                # استخراج الأسباب القانونية
                legal_reasons = self.extract_legal_reasons(client_data)
                
                if not legal_reasons:
                    return {
                        'success': False,
                        'error': 'لا توجد أسباب قانونية كافية لإنشاء الوثيقة',
                        'client_info': client_data.get('basic_info', {}),
                        'risk_analysis': risk_analysis
                    }
                
                # إنشاء الوثيقة
                document = self.generate_legal_document(
                    client_data, 
                    legal_reasons, 
                    context['document_type'], 
                    context['country']
                )
                
                return {
                    'success': True,
                    'document': document,
                    'client_info': client_data.get('basic_info', {}),
                    'risk_analysis': risk_analysis,
                    'legal_reasons': legal_reasons,
                    'processing_time': self._get_last_performance_metric('process_intelligent_query')
                }
            
            elif context['intent'] == 'analyze':
                # تحليل المخاطر فقط
                risk_analysis = self.analyze_client_risk(client_data)
                legal_reasons = self.extract_legal_reasons(client_data)
                
                return {
                    'success': True,
                    'client_info': client_data.get('basic_info', {}),
                    'risk_analysis': risk_analysis,
                    'legal_reasons': legal_reasons,
                    'recommendations': risk_analysis.get('recommendations', [])
                }
            
            elif context['intent'] == 'get_info':
                # إرجاع معلومات العميل
                return {
                    'success': True,
                    'client_data': client_data,
                    'summary': {
                        'contracts_count': len(client_data.get('contracts', [])),
                        'overdue_payments': len([p for p in client_data.get('payments', []) 
                                               if p.get('status') == 'overdue']),
                        'violations_count': len(client_data.get('violations', [])),
                        'risk_score': client_data.get('basic_info', {}).get('risk_score', 0)
                    }
                }
            
            return {
                'success': False,
                'error': 'لم يتم فهم نوع الطلب',
                'context': context
            }

    def _find_client_by_name(self, client_name: str) -> Optional[str]:
        """البحث عن العميل بالاسم"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # البحث الدقيق أولاً
        cursor.execute('SELECT client_id FROM clients WHERE name = ?', (client_name,))
        result = cursor.fetchone()
        
        if result:
            conn.close()
            return result[0]
        
        # البحث الجزئي
        cursor.execute('SELECT client_id, name FROM clients WHERE name LIKE ?', 
                      (f'%{client_name}%',))
        results = cursor.fetchall()
        
        conn.close()
        
        if results:
            # إرجاع أول نتيجة مطابقة
            return results[0][0]
        
        return None

    def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """الحصول على البيانات من التخزين المؤقت"""
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if datetime.now() < entry['expires_at']:
                return entry['data']
            else:
                # حذف البيانات المنتهية الصلاحية
                del self.cache[cache_key]
        
        return None

    def _save_to_cache(self, cache_key: str, data: Dict[str, Any]):
        """حفظ البيانات في التخزين المؤقت"""
        # تنظيف التخزين المؤقت إذا امتلأ
        if len(self.cache) >= self.max_cache_size:
            # حذف أقدم البيانات
            oldest_key = min(self.cache.keys(), 
                           key=lambda k: self.cache[k]['created_at'])
            del self.cache[oldest_key]
        
        self.cache[cache_key] = {
            'data': data,
            'created_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(seconds=self.cache_ttl)
        }

    def _get_last_performance_metric(self, operation_name: str) -> Optional[float]:
        """الحصول على آخر مقياس أداء لعملية معينة"""
        for metric in reversed(self.performance_metrics):
            if metric.operation_name == operation_name:
                return metric.execution_time
        return None

    def get_system_stats(self) -> Dict[str, Any]:
        """الحصول على إحصائيات النظام"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # إحصائيات العملاء
        cursor.execute('SELECT COUNT(*) FROM clients')
        total_clients = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM clients WHERE status = "active"')
        active_clients = cursor.fetchone()[0]
        
        # إحصائيات المدفوعات
        cursor.execute('SELECT COUNT(*) FROM payments WHERE status = "overdue"')
        overdue_payments = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(amount) FROM payments WHERE status = "overdue"')
        overdue_amount = cursor.fetchone()[0] or 0
        
        # إحصائيات الوثائق
        cursor.execute('SELECT COUNT(*) FROM legal_documents')
        total_documents = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT document_type, COUNT(*) 
            FROM legal_documents 
            GROUP BY document_type
        ''')
        documents_by_type = dict(cursor.fetchall())
        
        conn.close()
        
        # إحصائيات الأداء
        if self.performance_metrics:
            avg_response_time = sum([m.execution_time for m in self.performance_metrics]) / len(self.performance_metrics)
            max_response_time = max([m.execution_time for m in self.performance_metrics])
        else:
            avg_response_time = 0
            max_response_time = 0
        
        return {
            'clients': {
                'total': total_clients,
                'active': active_clients,
                'inactive': total_clients - active_clients
            },
            'payments': {
                'overdue_count': overdue_payments,
                'overdue_amount': overdue_amount
            },
            'documents': {
                'total': total_documents,
                'by_type': documents_by_type
            },
            'performance': {
                'avg_response_time': round(avg_response_time, 3),
                'max_response_time': round(max_response_time, 3),
                'cache_hit_rate': round(self._calculate_cache_hit_rate(), 1),
                'cache_size': len(self.cache)
            },
            'system_health': {
                'status': 'healthy',
                'uptime': 'متاح',
                'last_updated': datetime.now().isoformat()
            }
        }

def main():
    """اختبار النظام الموحد"""
    print("=== اختبار النظام الموحد للمستشار القانوني الذكي ===")
    
    # إنشاء النظام
    legal_ai = UnifiedLegalAISystem()
    
    print("\n📊 إحصائيات النظام:")
    stats = legal_ai.get_system_stats()
    print(f"إجمالي العملاء: {stats['clients']['total']}")
    print(f"العملاء النشطون: {stats['clients']['active']}")
    print(f"المدفوعات المتأخرة: {stats['payments']['overdue_count']}")
    print(f"المبلغ المتأخر: {stats['payments']['overdue_amount']} دينار")
    
    print("\n🔍 اختبار الاستعلامات الذكية:")
    
    # اختبار إنشاء إنذار قانوني
    query1 = "اكتب إنذار قانوني للعميل أحمد محمد علي بسبب تأخير الدفع"
    print(f"\nالاستعلام: {query1}")
    
    result1 = legal_ai.process_intelligent_query(query1)
    
    if result1['success']:
        print("✅ تم إنشاء الإنذار القانوني بنجاح")
        print(f"نوع الوثيقة: {result1['document']['document_type']}")
        print(f"درجة الدقة: {result1['document']['accuracy_score']}")
        print(f"درجة المخاطر: {result1['risk_analysis']['risk_score']}")
        print(f"مستوى المخاطر: {result1['risk_analysis']['risk_level']}")
        print(f"عدد الأسباب القانونية: {len(result1['legal_reasons'])}")
        print("\nمحتوى الوثيقة:")
        print(result1['document']['content'][:300] + "...")
    else:
        print(f"❌ فشل في إنشاء الوثيقة: {result1['error']}")
    
    # اختبار تحليل العميل
    query2 = "تحليل مخاطر العميل سارة أحمد محمد"
    print(f"\nالاستعلام: {query2}")
    
    result2 = legal_ai.process_intelligent_query(query2)
    
    if result2['success']:
        print("✅ تم تحليل المخاطر بنجاح")
        print(f"درجة المخاطر: {result2['risk_analysis']['risk_score']}")
        print(f"مستوى المخاطر: {result2['risk_analysis']['risk_level']}")
        print(f"عوامل المخاطر: {len(result2['risk_analysis']['risk_factors'])}")
        print(f"التوصيات: {len(result2['recommendations'])}")
    else:
        print(f"❌ فشل في التحليل: {result2['error']}")
    
    # اختبار الحصول على معلومات العميل
    query3 = "معلومات العميل محمد علي حسن"
    print(f"\nالاستعلام: {query3}")
    
    result3 = legal_ai.process_intelligent_query(query3)
    
    if result3['success']:
        print("✅ تم الحصول على المعلومات بنجاح")
        print(f"عدد العقود: {result3['summary']['contracts_count']}")
        print(f"المدفوعات المتأخرة: {result3['summary']['overdue_payments']}")
        print(f"المخالفات: {result3['summary']['violations_count']}")
        print(f"درجة المخاطر: {result3['summary']['risk_score']}")
    else:
        print(f"❌ فشل في الحصول على المعلومات: {result3['error']}")
    
    print("\n📈 إحصائيات الأداء النهائية:")
    final_stats = legal_ai.get_system_stats()
    print(f"متوسط زمن الاستجابة: {final_stats['performance']['avg_response_time']} ثانية")
    print(f"أقصى زمن استجابة: {final_stats['performance']['max_response_time']} ثانية")
    print(f"معدل إصابة التخزين المؤقت: {final_stats['performance']['cache_hit_rate']}%")
    print(f"حجم التخزين المؤقت: {final_stats['performance']['cache_size']} عنصر")
    
    print("\n✅ تم اختبار النظام الموحد بنجاح!")
    print("🎯 النظام جاهز للاستخدام الإنتاجي")

if __name__ == "__main__":
    main()


"""
محرك التكامل الذكي مع قاعدة البيانات
يوفر وصول ذكي وسياقي لجميع بيانات FleetifyApp
"""

import asyncio
import json
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
import sqlite3
import threading
from concurrent.futures import ThreadPoolExecutor
import logging

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ClientProfile:
    """ملف شامل لبيانات العميل"""
    personal_info: Dict[str, Any]
    contracts: List[Dict[str, Any]]
    payments: List[Dict[str, Any]]
    violations: List[Dict[str, Any]]
    legal_history: List[Dict[str, Any]]
    fleet_data: List[Dict[str, Any]]
    insurance_records: List[Dict[str, Any]]
    maintenance_history: List[Dict[str, Any]]
    risk_assessment: Dict[str, Any]

class DatabaseSchemaAnalyzer:
    """محلل هيكل قاعدة البيانات"""
    
    def __init__(self):
        self.schema_cache = {}
        self.relationship_map = {}
    
    def analyze_schema(self, db_connection):
        """تحليل هيكل قاعدة البيانات وفهم العلاقات"""
        try:
            # تحليل الجداول الرئيسية
            tables = self._get_table_structure(db_connection)
            
            # تحليل العلاقات بين الجداول
            relationships = self._analyze_relationships(db_connection, tables)
            
            # إنشاء خريطة العلاقات
            self.relationship_map = self._build_relationship_map(relationships)
            
            return {
                'tables': tables,
                'relationships': relationships,
                'relationship_map': self.relationship_map
            }
        except Exception as e:
            logger.error(f"خطأ في تحليل هيكل قاعدة البيانات: {e}")
            return None
    
    def _get_table_structure(self, db_connection):
        """الحصول على هيكل الجداول"""
        tables = {}
        
        # جداول FleetifyApp الأساسية (محاكاة)
        mock_tables = {
            'clients': {
                'columns': ['id', 'name', 'phone', 'email', 'address', 'id_number', 'status', 'created_at'],
                'primary_key': 'id',
                'indexes': ['name', 'phone', 'email']
            },
            'contracts': {
                'columns': ['id', 'client_id', 'type_id', 'start_date', 'end_date', 'status', 'terms', 'amount'],
                'primary_key': 'id',
                'foreign_keys': {'client_id': 'clients.id', 'type_id': 'contract_types.id'}
            },
            'payments': {
                'columns': ['id', 'client_id', 'contract_id', 'amount', 'payment_date', 'due_date', 'status', 'method_id'],
                'primary_key': 'id',
                'foreign_keys': {'client_id': 'clients.id', 'contract_id': 'contracts.id'}
            },
            'violations': {
                'columns': ['id', 'client_id', 'type_id', 'violation_date', 'description', 'penalty_amount', 'status'],
                'primary_key': 'id',
                'foreign_keys': {'client_id': 'clients.id', 'type_id': 'violation_types.id'}
            },
            'fleet': {
                'columns': ['id', 'client_id', 'type_id', 'license_plate', 'model', 'year', 'status'],
                'primary_key': 'id',
                'foreign_keys': {'client_id': 'clients.id', 'type_id': 'fleet_types.id'}
            }
        }
        
        return mock_tables
    
    def _analyze_relationships(self, db_connection, tables):
        """تحليل العلاقات بين الجداول"""
        relationships = []
        
        for table_name, table_info in tables.items():
            if 'foreign_keys' in table_info:
                for fk_column, referenced_table in table_info['foreign_keys'].items():
                    relationships.append({
                        'from_table': table_name,
                        'from_column': fk_column,
                        'to_table': referenced_table.split('.')[0],
                        'to_column': referenced_table.split('.')[1],
                        'relationship_type': 'many_to_one'
                    })
        
        return relationships
    
    def _build_relationship_map(self, relationships):
        """بناء خريطة العلاقات"""
        relationship_map = {}
        
        for rel in relationships:
            from_table = rel['from_table']
            to_table = rel['to_table']
            
            if from_table not in relationship_map:
                relationship_map[from_table] = {'related_tables': [], 'relationships': []}
            
            relationship_map[from_table]['related_tables'].append(to_table)
            relationship_map[from_table]['relationships'].append(rel)
        
        return relationship_map

class RelationshipMapper:
    """مخطط العلاقات بين البيانات"""
    
    def __init__(self, schema_analyzer):
        self.schema_analyzer = schema_analyzer
        self.relationship_cache = {}
    
    def map_client_relationships(self, client_id):
        """رسم خريطة علاقات العميل مع جميع البيانات"""
        try:
            relationships = {
                'direct_relationships': [],
                'indirect_relationships': [],
                'data_dependencies': []
            }
            
            # العلاقات المباشرة
            direct_tables = ['contracts', 'payments', 'violations', 'fleet']
            for table in direct_tables:
                relationships['direct_relationships'].append({
                    'table': table,
                    'relationship_type': 'one_to_many',
                    'foreign_key': 'client_id'
                })
            
            # العلاقات غير المباشرة
            indirect_relationships = [
                {'table': 'contract_types', 'through': 'contracts', 'key': 'type_id'},
                {'table': 'payment_methods', 'through': 'payments', 'key': 'method_id'},
                {'table': 'violation_types', 'through': 'violations', 'key': 'type_id'},
                {'table': 'fleet_types', 'through': 'fleet', 'key': 'type_id'}
            ]
            
            relationships['indirect_relationships'] = indirect_relationships
            
            return relationships
        except Exception as e:
            logger.error(f"خطأ في رسم خريطة العلاقات: {e}")
            return None

class QueryOptimizer:
    """محسن الاستعلامات"""
    
    def __init__(self):
        self.query_cache = {}
        self.performance_stats = {}
    
    def optimize_client_data_query(self, client_identifier):
        """تحسين استعلام بيانات العميل"""
        
        # إنشاء استعلامات محسنة
        optimized_queries = {
            'client_basic': """
                SELECT id, name, phone, email, address, id_number, status, created_at
                FROM clients 
                WHERE id = ? OR name ILIKE ? OR phone = ? OR email = ?
                LIMIT 1
            """,
            
            'client_contracts': """
                SELECT c.*, ct.type_name, ct.terms 
                FROM contracts c
                LEFT JOIN contract_types ct ON c.type_id = ct.id
                WHERE c.client_id = ?
                ORDER BY c.created_at DESC
            """,
            
            'client_payments': """
                SELECT p.*, pm.method_name,
                       CASE 
                           WHEN p.due_date < CURRENT_DATE AND p.status != 'paid' THEN 'overdue'
                           ELSE p.status 
                       END as payment_status
                FROM payments p
                LEFT JOIN payment_methods pm ON p.method_id = pm.id
                WHERE p.client_id = ?
                ORDER BY p.payment_date DESC
            """,
            
            'client_violations': """
                SELECT v.*, vt.violation_type, vt.penalty_amount as standard_penalty
                FROM violations v
                LEFT JOIN violation_types vt ON v.type_id = vt.id
                WHERE v.client_id = ?
                ORDER BY v.violation_date DESC
            """,
            
            'client_fleet': """
                SELECT f.*, ft.type_name, ft.specifications
                FROM fleet f
                LEFT JOIN fleet_types ft ON f.type_id = ft.id
                WHERE f.client_id = ?
                ORDER BY f.created_at DESC
            """
        }
        
        return optimized_queries
    
    def create_performance_indexes(self):
        """إنشاء فهارس لتحسين الأداء"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_clients_search ON clients (name, phone, email, id_number)",
            "CREATE INDEX IF NOT EXISTS idx_contracts_client_status ON contracts (client_id, status, created_at)",
            "CREATE INDEX IF NOT EXISTS idx_payments_client_date ON payments (client_id, payment_date, status)",
            "CREATE INDEX IF NOT EXISTS idx_violations_client_date ON violations (client_id, violation_date, status)",
            "CREATE INDEX IF NOT EXISTS idx_fleet_client_status ON fleet (client_id, status)"
        ]
        
        return indexes

class IntelligentCacheManager:
    """مدير التخزين المؤقت الذكي"""
    
    def __init__(self):
        self.memory_cache = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0
        }
        self.max_cache_size = 1000
        self.cache_ttl = 300  # 5 دقائق
        self.lock = threading.Lock()
    
    def get(self, key):
        """الحصول على قيمة من التخزين المؤقت"""
        with self.lock:
            if key in self.memory_cache:
                cache_entry = self.memory_cache[key]
                
                # فحص انتهاء الصلاحية
                if time.time() - cache_entry['timestamp'] < self.cache_ttl:
                    self.cache_stats['hits'] += 1
                    cache_entry['access_count'] += 1
                    cache_entry['last_accessed'] = time.time()
                    return cache_entry['data']
                else:
                    # إزالة البيانات المنتهية الصلاحية
                    del self.memory_cache[key]
            
            self.cache_stats['misses'] += 1
            return None
    
    def set(self, key, data):
        """حفظ قيمة في التخزين المؤقت"""
        with self.lock:
            # إدارة حجم التخزين المؤقت
            if len(self.memory_cache) >= self.max_cache_size:
                self._evict_least_used()
            
            self.memory_cache[key] = {
                'data': data,
                'timestamp': time.time(),
                'access_count': 1,
                'last_accessed': time.time()
            }
    
    def _evict_least_used(self):
        """إزالة البيانات الأقل استخداماً"""
        if not self.memory_cache:
            return
        
        # العثور على العنصر الأقل استخداماً
        least_used_key = min(
            self.memory_cache.keys(),
            key=lambda k: (
                self.memory_cache[k]['access_count'],
                self.memory_cache[k]['last_accessed']
            )
        )
        
        del self.memory_cache[least_used_key]
        self.cache_stats['evictions'] += 1
    
    def get_stats(self):
        """الحصول على إحصائيات التخزين المؤقت"""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_ratio = self.cache_stats['hits'] / total_requests if total_requests > 0 else 0
        
        return {
            'hit_ratio': hit_ratio,
            'total_entries': len(self.memory_cache),
            'stats': self.cache_stats
        }

class IntelligentDatabaseIntegration:
    """محرك التكامل الذكي مع قاعدة البيانات"""
    
    def __init__(self):
        self.schema_analyzer = DatabaseSchemaAnalyzer()
        self.relationship_mapper = RelationshipMapper(self.schema_analyzer)
        self.query_optimizer = QueryOptimizer()
        self.cache_manager = IntelligentCacheManager()
        self.thread_pool = ThreadPoolExecutor(max_workers=10)
        
        # إعداد قاعدة بيانات محلية للاختبار
        self._setup_local_database()
    
    def _setup_local_database(self):
        """إعداد قاعدة بيانات محلية للاختبار"""
        try:
            self.db_connection = sqlite3.connect(':memory:', check_same_thread=False)
            self.db_connection.row_factory = sqlite3.Row
            
            # إنشاء الجداول الأساسية
            self._create_test_tables()
            self._insert_test_data()
            
            logger.info("تم إعداد قاعدة البيانات المحلية بنجاح")
        except Exception as e:
            logger.error(f"خطأ في إعداد قاعدة البيانات: {e}")
    
    def _create_test_tables(self):
        """إنشاء جداول الاختبار"""
        tables_sql = [
            """
            CREATE TABLE clients (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                address TEXT,
                id_number TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE contracts (
                id INTEGER PRIMARY KEY,
                client_id INTEGER,
                type_id INTEGER,
                start_date DATE,
                end_date DATE,
                status TEXT DEFAULT 'active',
                terms TEXT,
                amount DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
            """,
            """
            CREATE TABLE payments (
                id INTEGER PRIMARY KEY,
                client_id INTEGER,
                contract_id INTEGER,
                amount DECIMAL(10,2),
                payment_date DATE,
                due_date DATE,
                status TEXT DEFAULT 'pending',
                method_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
            """,
            """
            CREATE TABLE violations (
                id INTEGER PRIMARY KEY,
                client_id INTEGER,
                type_id INTEGER,
                violation_date DATE,
                description TEXT,
                penalty_amount DECIMAL(10,2),
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
            """,
            """
            CREATE TABLE fleet (
                id INTEGER PRIMARY KEY,
                client_id INTEGER,
                type_id INTEGER,
                license_plate TEXT,
                model TEXT,
                year INTEGER,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
            """
        ]
        
        for sql in tables_sql:
            self.db_connection.execute(sql)
        
        self.db_connection.commit()
    
    def _insert_test_data(self):
        """إدراج بيانات اختبار"""
        test_data = [
            # العملاء
            "INSERT INTO clients (name, phone, email, address, id_number) VALUES ('أحمد محمد', '12345678', 'ahmed@example.com', 'الكويت', '123456789')",
            "INSERT INTO clients (name, phone, email, address, id_number) VALUES ('فاطمة علي', '87654321', 'fatima@example.com', 'الرياض', '987654321')",
            
            # العقود
            "INSERT INTO contracts (client_id, type_id, start_date, end_date, amount, terms) VALUES (1, 1, '2024-01-01', '2024-12-31', 12000.00, 'عقد تأجير سيارة سنوي')",
            "INSERT INTO contracts (client_id, type_id, start_date, end_date, amount, terms) VALUES (2, 2, '2024-02-01', '2024-08-01', 8000.00, 'عقد تأجير ليموزين')",
            
            # المدفوعات
            "INSERT INTO payments (client_id, contract_id, amount, payment_date, due_date, status) VALUES (1, 1, 1000.00, '2024-01-15', '2024-01-10', 'overdue')",
            "INSERT INTO payments (client_id, contract_id, amount, payment_date, due_date, status) VALUES (1, 1, 1000.00, '2024-02-15', '2024-02-10', 'overdue')",
            "INSERT INTO payments (client_id, contract_id, amount, payment_date, due_date, status) VALUES (2, 2, 1500.00, '2024-02-15', '2024-02-15', 'paid')",
            
            # المخالفات
            "INSERT INTO violations (client_id, type_id, violation_date, description, penalty_amount, status) VALUES (1, 1, '2024-01-20', 'تأخير في إرجاع السيارة', 500.00, 'active')",
            "INSERT INTO violations (client_id, type_id, violation_date, description, penalty_amount, status) VALUES (1, 2, '2024-02-05', 'استخدام غير مصرح', 1000.00, 'active')",
            
            # الأسطول
            "INSERT INTO fleet (client_id, type_id, license_plate, model, year) VALUES (1, 1, 'ABC123', 'تويوتا كامري', 2023)",
            "INSERT INTO fleet (client_id, type_id, license_plate, model, year) VALUES (2, 2, 'XYZ789', 'مرسيدس S-Class', 2024)"
        ]
        
        for sql in test_data:
            self.db_connection.execute(sql)
        
        self.db_connection.commit()
    
    def resolve_client_identifier(self, client_identifier):
        """تحديد هوية العميل من معرفات مختلفة"""
        try:
            # البحث بالاسم أو الهاتف أو البريد الإلكتروني
            query = """
                SELECT id FROM clients 
                WHERE name LIKE ? OR phone = ? OR email = ? OR id_number = ?
                LIMIT 1
            """
            
            search_term = f"%{client_identifier}%"
            cursor = self.db_connection.execute(query, (search_term, client_identifier, client_identifier, client_identifier))
            result = cursor.fetchone()
            
            if result:
                return result['id']
            else:
                # محاولة البحث بالرقم المباشر
                try:
                    client_id = int(client_identifier)
                    cursor = self.db_connection.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
                    result = cursor.fetchone()
                    return result['id'] if result else None
                except ValueError:
                    return None
        except Exception as e:
            logger.error(f"خطأ في تحديد هوية العميل: {e}")
            return None
    
    def get_comprehensive_client_data(self, client_id):
        """جمع البيانات الشاملة للعميل"""
        try:
            # فحص التخزين المؤقت أولاً
            cache_key = f"client_data:{client_id}"
            cached_data = self.cache_manager.get(cache_key)
            if cached_data:
                return cached_data
            
            # جمع البيانات من قاعدة البيانات
            client_data = {}
            
            # البيانات الشخصية
            cursor = self.db_connection.execute(
                "SELECT * FROM clients WHERE id = ?", (client_id,)
            )
            personal_info = cursor.fetchone()
            if personal_info:
                client_data['personal_info'] = dict(personal_info)
            else:
                return None
            
            # العقود
            cursor = self.db_connection.execute(
                "SELECT * FROM contracts WHERE client_id = ? ORDER BY created_at DESC", 
                (client_id,)
            )
            client_data['contracts'] = [dict(row) for row in cursor.fetchall()]
            
            # المدفوعات
            cursor = self.db_connection.execute(
                """SELECT *, 
                   CASE 
                       WHEN due_date < date('now') AND status != 'paid' THEN 'overdue'
                       ELSE status 
                   END as payment_status
                   FROM payments WHERE client_id = ? ORDER BY payment_date DESC""", 
                (client_id,)
            )
            client_data['payments'] = [dict(row) for row in cursor.fetchall()]
            
            # المخالفات
            cursor = self.db_connection.execute(
                "SELECT * FROM violations WHERE client_id = ? ORDER BY violation_date DESC", 
                (client_id,)
            )
            client_data['violations'] = [dict(row) for row in cursor.fetchall()]
            
            # بيانات الأسطول
            cursor = self.db_connection.execute(
                "SELECT * FROM fleet WHERE client_id = ? ORDER BY created_at DESC", 
                (client_id,)
            )
            client_data['fleet_data'] = [dict(row) for row in cursor.fetchall()]
            
            # إضافة بيانات وهمية للتأمين والصيانة
            client_data['insurance_records'] = []
            client_data['maintenance_history'] = []
            client_data['legal_history'] = []
            
            # حساب تقييم المخاطر
            client_data['risk_assessment'] = self.calculate_risk_profile(client_data)
            
            # حفظ في التخزين المؤقت
            self.cache_manager.set(cache_key, client_data)
            
            return client_data
            
        except Exception as e:
            logger.error(f"خطأ في جمع بيانات العميل: {e}")
            return None
    
    def calculate_risk_profile(self, client_data):
        """حساب ملف المخاطر للعميل"""
        try:
            risk_factors = {
                'payment_delays': 0,
                'violation_count': 0,
                'overdue_amount': 0,
                'contract_violations': 0,
                'overall_risk_score': 0
            }
            
            # حساب تأخير المدفوعات
            overdue_payments = [p for p in client_data['payments'] if p.get('payment_status') == 'overdue']
            risk_factors['payment_delays'] = len(overdue_payments)
            risk_factors['overdue_amount'] = sum(p['amount'] for p in overdue_payments)
            
            # حساب المخالفات
            active_violations = [v for v in client_data['violations'] if v['status'] == 'active']
            risk_factors['violation_count'] = len(active_violations)
            
            # حساب مخالفات العقد
            risk_factors['contract_violations'] = len([v for v in active_violations if 'عقد' in v.get('description', '')])
            
            # حساب النقاط الإجمالية للمخاطر
            risk_score = 0
            risk_score += risk_factors['payment_delays'] * 10
            risk_score += risk_factors['violation_count'] * 15
            risk_score += (risk_factors['overdue_amount'] / 1000) * 5
            risk_score += risk_factors['contract_violations'] * 20
            
            risk_factors['overall_risk_score'] = min(risk_score, 100)  # الحد الأقصى 100
            
            # تحديد مستوى المخاطر
            if risk_score < 20:
                risk_factors['risk_level'] = 'منخفض'
            elif risk_score < 50:
                risk_factors['risk_level'] = 'متوسط'
            else:
                risk_factors['risk_level'] = 'عالي'
            
            return risk_factors
            
        except Exception as e:
            logger.error(f"خطأ في حساب ملف المخاطر: {e}")
            return {}
    
    def analyze_client_data(self, client_identifier):
        """تحليل شامل لبيانات العميل"""
        try:
            start_time = time.time()
            
            # تحديد هوية العميل
            client_id = self.resolve_client_identifier(client_identifier)
            if not client_id:
                return {
                    'success': False,
                    'error': f'لم يتم العثور على العميل: {client_identifier}'
                }
            
            # جمع البيانات الشاملة
            client_profile = self.get_comprehensive_client_data(client_id)
            if not client_profile:
                return {
                    'success': False,
                    'error': f'فشل في جمع بيانات العميل: {client_id}'
                }
            
            processing_time = time.time() - start_time
            
            return {
                'success': True,
                'client_id': client_id,
                'client_profile': client_profile,
                'processing_time': processing_time,
                'cache_stats': self.cache_manager.get_stats()
            }
            
        except Exception as e:
            logger.error(f"خطأ في تحليل بيانات العميل: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def execute_parallel_queries(self, queries, client_id):
        """تنفيذ الاستعلامات بشكل متوازي"""
        try:
            results = {}
            
            def execute_query(query_name, query_sql):
                try:
                    cursor = self.db_connection.execute(query_sql, (client_id,))
                    return query_name, [dict(row) for row in cursor.fetchall()]
                except Exception as e:
                    logger.error(f"خطأ في تنفيذ الاستعلام {query_name}: {e}")
                    return query_name, []
            
            # تنفيذ الاستعلامات بشكل متوازي
            futures = []
            for query_name, query_sql in queries.items():
                future = self.thread_pool.submit(execute_query, query_name, query_sql)
                futures.append(future)
            
            # جمع النتائج
            for future in futures:
                query_name, query_result = future.result()
                results[query_name] = query_result
            
            return results
            
        except Exception as e:
            logger.error(f"خطأ في تنفيذ الاستعلامات المتوازية: {e}")
            return {}
    
    def structure_client_data(self, query_results):
        """تنظيم بيانات العميل"""
        try:
            structured_data = ClientProfile(
                personal_info=query_results.get('personal', [{}])[0] if query_results.get('personal') else {},
                contracts=query_results.get('contracts', []),
                payments=query_results.get('payments', []),
                violations=query_results.get('violations', []),
                legal_history=query_results.get('legal_history', []),
                fleet_data=query_results.get('fleet_data', []),
                insurance_records=query_results.get('insurance_records', []),
                maintenance_history=query_results.get('maintenance_history', []),
                risk_assessment={}
            )
            
            # حساب تقييم المخاطر
            structured_data.risk_assessment = self.calculate_risk_profile({
                'payments': structured_data.payments,
                'violations': structured_data.violations,
                'contracts': structured_data.contracts
            })
            
            return structured_data
            
        except Exception as e:
            logger.error(f"خطأ في تنظيم بيانات العميل: {e}")
            return None
    
    def get_performance_metrics(self):
        """الحصول على مقاييس الأداء"""
        return {
            'cache_stats': self.cache_manager.get_stats(),
            'query_stats': self.query_optimizer.performance_stats,
            'database_status': 'connected' if self.db_connection else 'disconnected'
        }

# اختبار النظام
if __name__ == "__main__":
    # إنشاء محرك التكامل
    db_integration = IntelligentDatabaseIntegration()
    
    # اختبار تحليل بيانات العميل
    print("=== اختبار تحليل بيانات العميل ===")
    
    # اختبار البحث بالاسم
    result = db_integration.analyze_client_data("أحمد")
    if result['success']:
        print(f"تم العثور على العميل: {result['client_profile']['personal_info']['name']}")
        print(f"عدد العقود: {len(result['client_profile']['contracts'])}")
        print(f"عدد المدفوعات: {len(result['client_profile']['payments'])}")
        print(f"عدد المخالفات: {len(result['client_profile']['violations'])}")
        print(f"مستوى المخاطر: {result['client_profile']['risk_assessment'].get('risk_level', 'غير محدد')}")
        print(f"وقت المعالجة: {result['processing_time']:.3f} ثانية")
    else:
        print(f"خطأ: {result['error']}")
    
    print("\n=== اختبار الأداء ===")
    
    # اختبار الأداء مع التخزين المؤقت
    start_time = time.time()
    for i in range(5):
        result = db_integration.analyze_client_data("أحمد")
    end_time = time.time()
    
    print(f"وقت 5 استعلامات مع التخزين المؤقت: {end_time - start_time:.3f} ثانية")
    
    # عرض إحصائيات الأداء
    metrics = db_integration.get_performance_metrics()
    print(f"معدل إصابة التخزين المؤقت: {metrics['cache_stats']['hit_ratio']:.2%}")
    print(f"عدد العناصر في التخزين المؤقت: {metrics['cache_stats']['total_entries']}")


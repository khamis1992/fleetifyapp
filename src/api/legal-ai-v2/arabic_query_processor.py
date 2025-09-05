#!/usr/bin/env python3
"""
معالج الاستفسارات باللغة العربية للمستشار القانوني الذكي
يفهم الاستفسارات المختلفة ويحولها إلى استعلامات قاعدة بيانات
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QueryType(Enum):
    """أنواع الاستفسارات"""
    CUSTOMERS = "customers"
    VEHICLES = "vehicles"
    PAYMENTS = "payments"
    INVOICES = "invoices"
    VIOLATIONS = "violations"
    CONTRACTS = "contracts"
    MAINTENANCE = "maintenance"
    LEGAL_ADVICE = "legal_advice"
    STATISTICS = "statistics"
    UNKNOWN = "unknown"

class QueryAction(Enum):
    """أنواع العمليات"""
    COUNT = "count"
    LIST = "list"
    SUMMARY = "summary"
    SEARCH = "search"
    CALCULATE = "calculate"
    ANALYZE = "analyze"

@dataclass
class ParsedQuery:
    """الاستفسار المُحلل"""
    original_text: str
    query_type: QueryType
    action: QueryAction
    entities: List[str]
    filters: Dict[str, Any]
    confidence: float
    sql_params: Dict[str, Any]

class ArabicQueryProcessor:
    """معالج الاستفسارات العربية"""
    
    def __init__(self):
        self.synonyms_dict = self._build_synonyms_dictionary()
        self.patterns = self._build_query_patterns()
        self.stop_words = self._get_arabic_stop_words()
        
    def _build_synonyms_dictionary(self) -> Dict[str, List[str]]:
        """بناء قاموس المرادفات العربية"""
        return {
            # المركبات والسيارات
            'vehicles': [
                'سيارة', 'سيارات', 'مركبة', 'مركبات', 'عربة', 'عربات',
                'آلية', 'آليات', 'وسيلة نقل', 'وسائل نقل', 'عربية', 'عربيات',
                'موتر', 'موترات', 'كار', 'كارات'
            ],
            
            # العملاء والزبائن
            'customers': [
                'عميل', 'عملاء', 'زبون', 'زبائن', 'مستأجر', 'مستأجرين',
                'عضو', 'أعضاء', 'مشترك', 'مشتركين', 'مستخدم', 'مستخدمين',
                'شخص', 'أشخاص', 'فرد', 'أفراد'
            ],
            
            # المدفوعات والمالية
            'payments': [
                'دفعة', 'دفعات', 'سداد', 'تسديد', 'مبلغ', 'مبالغ',
                'قسط', 'أقساط', 'مدفوعات', 'مستحقات', 'التزامات',
                'فلوس', 'أموال', 'نقود', 'مصاريف'
            ],
            
            # المتأخرات والديون
            'overdue': [
                'متأخرات', 'متأخر', 'ديون', 'دين', 'مستحقات',
                'التزامات', 'مطلوبات', 'باقي', 'بقايا', 'عليه'
            ],
            
            # الفواتير
            'invoices': [
                'فاتورة', 'فواتير', 'حساب', 'حسابات', 'كشف حساب',
                'بيان', 'بيانات', 'إيصال', 'إيصالات'
            ],
            
            # المخالفات
            'violations': [
                'مخالفة', 'مخالفات', 'غرامة', 'غرامات', 'مخالفة مرورية',
                'مخالفات مرورية', 'تجاوز', 'تجاوزات', 'انتهاك', 'انتهاكات'
            ],
            
            # العقود
            'contracts': [
                'عقد', 'عقود', 'اتفاقية', 'اتفاقيات', 'تعاقد', 'تعاقدات',
                'إيجار', 'تأجير', 'استئجار'
            ],
            
            # الصيانة
            'maintenance': [
                'صيانة', 'إصلاح', 'إصلاحات', 'تصليح', 'ورشة',
                'خدمة', 'خدمات', 'فحص', 'فحوصات'
            ],
            
            # الحالات
            'status': {
                'available': ['متاح', 'متاحة', 'متوفر', 'متوفرة', 'فاضي', 'فاضية'],
                'rented': ['مؤجر', 'مؤجرة', 'محجوز', 'محجوزة', 'مستأجر', 'مستأجرة'],
                'maintenance': ['صيانة', 'تصليح', 'إصلاح', 'ورشة'],
                'out_of_service': ['خارج الخدمة', 'معطل', 'معطلة', 'لا يعمل'],
                'active': ['نشط', 'نشطة', 'فعال', 'فعالة'],
                'inactive': ['غير نشط', 'غير فعال', 'معطل', 'موقف']
            },
            
            # أرقام وكميات
            'numbers': [
                'كم', 'كام', 'أد إيش', 'شقد', 'وش عدد', 'إيش عدد',
                'عدد', 'كمية', 'مقدار', 'حجم', 'إجمالي', 'مجموع'
            ],
            
            # أفعال الاستفسار
            'query_verbs': [
                'أريد', 'أبغى', 'أبي', 'عطني', 'وريني', 'اعرض',
                'اطلع', 'شوف', 'ابحث', 'دور', 'لقي'
            ]
        }
    
    def _build_query_patterns(self) -> Dict[str, List[Dict]]:
        """بناء أنماط الاستفسارات"""
        return {
            # أنماط العد والإحصاء
            'count_patterns': [
                {
                    'pattern': r'كم\s+(عدد\s+)?(?P<entity>\w+)',
                    'type': QueryType.STATISTICS,
                    'action': QueryAction.COUNT
                },
                {
                    'pattern': r'(?P<entity>\w+)\s+كم',
                    'type': QueryType.STATISTICS,
                    'action': QueryAction.COUNT
                },
                {
                    'pattern': r'وش\s+عدد\s+(?P<entity>\w+)',
                    'type': QueryType.STATISTICS,
                    'action': QueryAction.COUNT
                },
                {
                    'pattern': r'شقد\s+(?P<entity>\w+)',
                    'type': QueryType.STATISTICS,
                    'action': QueryAction.COUNT
                }
            ],
            
            # أنماط البحث والعرض
            'list_patterns': [
                {
                    'pattern': r'(اعرض|وريني|اطلع)\s+(?P<entity>\w+)',
                    'type': QueryType.CUSTOMERS,
                    'action': QueryAction.LIST
                },
                {
                    'pattern': r'ما\s+هي\s+(?P<entity>\w+)',
                    'type': QueryType.VEHICLES,
                    'action': QueryAction.LIST
                },
                {
                    'pattern': r'من\s+هم\s+(?P<entity>\w+)',
                    'type': QueryType.CUSTOMERS,
                    'action': QueryAction.LIST
                }
            ],
            
            # أنماط الملخص والتحليل
            'summary_patterns': [
                {
                    'pattern': r'(ملخص|تقرير|إحصائيات)\s+(?P<entity>\w+)',
                    'type': QueryType.STATISTICS,
                    'action': QueryAction.SUMMARY
                },
                {
                    'pattern': r'إجمالي\s+(?P<entity>\w+)',
                    'type': QueryType.STATISTICS,
                    'action': QueryAction.CALCULATE
                }
            ],
            
            # أنماط الحالة والفلترة
            'status_patterns': [
                {
                    'pattern': r'(?P<entity>\w+)\s+(في|التي في|اللي في)\s+(?P<status>\w+)',
                    'type': QueryType.VEHICLES,
                    'action': QueryAction.LIST
                },
                {
                    'pattern': r'(?P<entity>\w+)\s+(?P<status>المتأخرين|المتأخرة)',
                    'type': QueryType.CUSTOMERS,
                    'action': QueryAction.LIST
                }
            ]
        }
    
    def _get_arabic_stop_words(self) -> List[str]:
        """الحصول على كلمات الوقف العربية"""
        return [
            'في', 'من', 'إلى', 'على', 'عن', 'مع', 'بعد', 'قبل',
            'تحت', 'فوق', 'أمام', 'خلف', 'بين', 'حول', 'ضد',
            'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي', 'اللي',
            'كان', 'كانت', 'يكون', 'تكون', 'هو', 'هي', 'هم', 'هن',
            'أن', 'إن', 'كي', 'لكي', 'حتى', 'لو', 'إذا', 'عندما'
        ]
    
    def normalize_text(self, text: str) -> str:
        """تطبيع النص العربي"""
        # إزالة التشكيل
        text = re.sub(r'[ًٌٍَُِّْ]', '', text)
        
        # توحيد الألف
        text = re.sub(r'[آأإ]', 'ا', text)
        
        # توحيد التاء المربوطة
        text = re.sub(r'ة', 'ه', text)
        
        # توحيد الياء
        text = re.sub(r'ى', 'ي', text)
        
        # إزالة علامات الترقيم
        text = re.sub(r'[؟،؛:.!]', '', text)
        
        # إزالة المسافات الزائدة
        text = re.sub(r'\s+', ' ', text.strip())
        
        return text
    
    def extract_entities(self, text: str) -> List[Tuple[str, str]]:
        """استخراج الكيانات من النص"""
        entities = []
        normalized_text = self.normalize_text(text.lower())
        
        for category, synonyms in self.synonyms_dict.items():
            if category == 'status':
                # معالجة خاصة للحالات
                for status, status_synonyms in synonyms.items():
                    for synonym in status_synonyms:
                        if synonym in normalized_text:
                            entities.append((category, status))
                            break
            else:
                for synonym in synonyms:
                    if synonym in normalized_text:
                        entities.append((category, synonym))
                        break
        
        return entities
    
    def classify_query_type(self, text: str, entities: List[Tuple[str, str]]) -> QueryType:
        """تصنيف نوع الاستفسار"""
        entity_types = [entity[0] for entity in entities]
        
        # تحديد النوع بناءً على الكيانات المستخرجة
        if 'vehicles' in entity_types:
            return QueryType.VEHICLES
        elif 'customers' in entity_types:
            return QueryType.CUSTOMERS
        elif 'payments' in entity_types or 'overdue' in entity_types:
            return QueryType.PAYMENTS
        elif 'invoices' in entity_types:
            return QueryType.INVOICES
        elif 'violations' in entity_types:
            return QueryType.VIOLATIONS
        elif 'contracts' in entity_types:
            return QueryType.CONTRACTS
        elif 'maintenance' in entity_types:
            return QueryType.MAINTENANCE
        elif 'numbers' in entity_types:
            return QueryType.STATISTICS
        else:
            # فحص إضافي للكلمات المفتاحية
            if any(word in text for word in ['قانوني', 'قانونية', 'إنذار', 'مطالبة']):
                return QueryType.LEGAL_ADVICE
            return QueryType.UNKNOWN
    
    def determine_action(self, text: str) -> QueryAction:
        """تحديد نوع العملية المطلوبة"""
        normalized_text = self.normalize_text(text.lower())
        
        # أنماط العد
        count_keywords = ['كم', 'عدد', 'كام', 'شقد', 'وش عدد']
        if any(keyword in normalized_text for keyword in count_keywords):
            return QueryAction.COUNT
        
        # أنماط القائمة والعرض
        list_keywords = ['اعرض', 'وريني', 'اطلع', 'ما هي', 'من هم', 'أريد']
        if any(keyword in normalized_text for keyword in list_keywords):
            return QueryAction.LIST
        
        # أنماط الملخص
        summary_keywords = ['ملخص', 'تقرير', 'إحصائيات', 'تحليل']
        if any(keyword in normalized_text for keyword in summary_keywords):
            return QueryAction.SUMMARY
        
        # أنماط الحساب
        calc_keywords = ['إجمالي', 'مجموع', 'مقدار', 'حجم']
        if any(keyword in normalized_text for keyword in calc_keywords):
            return QueryAction.CALCULATE
        
        # افتراضي
        return QueryAction.LIST
    
    def extract_filters(self, text: str, entities: List[Tuple[str, str]]) -> Dict[str, Any]:
        """استخراج الفلاتر من النص"""
        filters = {}
        
        # البحث عن حالات المركبات
        status_entities = [entity for entity in entities if entity[0] == 'status']
        if status_entities:
            filters['status'] = status_entities[0][1]
        
        # البحث عن كلمات تدل على المتأخرات
        if any(word in text for word in ['متأخر', 'متأخرين', 'متأخرات']):
            filters['overdue'] = True
        
        # البحث عن كلمات تدل على النشاط
        if any(word in text for word in ['نشط', 'نشطة', 'فعال', 'فعالة']):
            filters['is_active'] = True
        elif any(word in text for word in ['غير نشط', 'معطل', 'موقف']):
            filters['is_active'] = False
        
        # البحث عن فترات زمنية
        time_patterns = {
            'اليوم': 'today',
            'أمس': 'yesterday',
            'هذا الأسبوع': 'this_week',
            'هذا الشهر': 'this_month',
            'هذه السنة': 'this_year'
        }
        
        for arabic_time, english_time in time_patterns.items():
            if arabic_time in text:
                filters['time_period'] = english_time
                break
        
        return filters
    
    def calculate_confidence(self, text: str, entities: List[Tuple[str, str]], 
                           query_type: QueryType, action: QueryAction) -> float:
        """حساب درجة الثقة في التحليل"""
        confidence = 0.0
        
        # نقاط للكيانات المستخرجة
        confidence += len(entities) * 0.2
        
        # نقاط لوضوح نوع الاستفسار
        if query_type != QueryType.UNKNOWN:
            confidence += 0.3
        
        # نقاط لوضوح العملية
        if action != QueryAction.LIST:  # LIST هو الافتراضي
            confidence += 0.2
        
        # نقاط للكلمات المفتاحية الواضحة
        clear_keywords = ['كم', 'عدد', 'اعرض', 'إجمالي', 'ملخص']
        if any(keyword in text for keyword in clear_keywords):
            confidence += 0.3
        
        # تحديد الحد الأقصى
        return min(confidence, 1.0)
    
    def build_sql_params(self, query_type: QueryType, action: QueryAction, 
                        filters: Dict[str, Any]) -> Dict[str, Any]:
        """بناء معاملات الاستعلام SQL"""
        params = {
            'table': self._get_table_name(query_type),
            'action': action.value,
            'filters': filters
        }
        
        # تحديد الحقول المطلوبة
        if action == QueryAction.COUNT:
            params['select'] = 'id'
            params['count_only'] = True
        elif action == QueryAction.SUMMARY:
            params['select'] = '*'
            params['aggregate'] = True
        else:
            params['select'] = '*'
        
        return params
    
    def _get_table_name(self, query_type: QueryType) -> str:
        """الحصول على اسم الجدول المناسب"""
        table_mapping = {
            QueryType.CUSTOMERS: 'customers',
            QueryType.VEHICLES: 'vehicles',
            QueryType.PAYMENTS: 'payments',
            QueryType.INVOICES: 'invoices',
            QueryType.VIOLATIONS: 'traffic_violations',
            QueryType.CONTRACTS: 'rental_contracts',
            QueryType.MAINTENANCE: 'maintenance_records'
        }
        return table_mapping.get(query_type, 'customers')
    
    def process_query(self, text: str) -> ParsedQuery:
        """معالجة الاستفسار الرئيسية"""
        try:
            # استخراج الكيانات
            entities = self.extract_entities(text)
            
            # تصنيف نوع الاستفسار
            query_type = self.classify_query_type(text, entities)
            
            # تحديد نوع العملية
            action = self.determine_action(text)
            
            # استخراج الفلاتر
            filters = self.extract_filters(text, entities)
            
            # حساب درجة الثقة
            confidence = self.calculate_confidence(text, entities, query_type, action)
            
            # بناء معاملات SQL
            sql_params = self.build_sql_params(query_type, action, filters)
            
            return ParsedQuery(
                original_text=text,
                query_type=query_type,
                action=action,
                entities=entities,
                filters=filters,
                confidence=confidence,
                sql_params=sql_params
            )
            
        except Exception as e:
            logger.error(f"خطأ في معالجة الاستفسار: {e}")
            return ParsedQuery(
                original_text=text,
                query_type=QueryType.UNKNOWN,
                action=QueryAction.LIST,
                entities=[],
                filters={},
                confidence=0.0,
                sql_params={}
            )

# مثال على الاستخدام
if __name__ == "__main__":
    processor = ArabicQueryProcessor()
    
    # أمثلة على الاستفسارات
    test_queries = [
        "كم عدد العملاء المسجلين؟",
        "كم مركبة في الصيانة؟",
        "ما هي السيارات المتاحة؟",
        "من هم العملاء المتأخرين في الدفع؟",
        "إجمالي المتأخرات على الزبائن",
        "كم مخالفة مرورية هذا الشهر؟",
        "اعرض المركبات المحجوزة",
        "وش عدد الآليات اللي تحتاج صيانة؟"
    ]
    
    print("=== اختبار معالج الاستفسارات العربية ===\n")
    
    for query in test_queries:
        result = processor.process_query(query)
        print(f"الاستفسار: {query}")
        print(f"النوع: {result.query_type.value}")
        print(f"العملية: {result.action.value}")
        print(f"الكيانات: {result.entities}")
        print(f"الفلاتر: {result.filters}")
        print(f"درجة الثقة: {result.confidence:.2f}")
        print(f"معاملات SQL: {result.sql_params}")
        print("-" * 50)


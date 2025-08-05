#!/usr/bin/env python3
"""
اختبارات معالج الاستفسارات العربية
"""

import pytest
import sys
import os

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from arabic_query_processor import ArabicQueryProcessor, QueryType, QueryAction

class TestArabicQueryProcessor:
    """اختبارات معالج الاستفسارات العربية"""
    
    @pytest.fixture
    def processor(self):
        """إنشاء معالج للاختبارات"""
        return ArabicQueryProcessor()
    
    def test_normalize_text(self, processor):
        """اختبار تطبيع النص العربي"""
        # اختبار إزالة التشكيل
        assert processor.normalize_text('مَرْحَبًا') == 'مرحبا'
        
        # اختبار توحيد الألف
        assert processor.normalize_text('أهلاً وسهلاً') == 'اهلا وسهلا'
        
        # اختبار توحيد التاء المربوطة
        assert processor.normalize_text('سيارة جميلة') == 'سياره جميله'
        
        # اختبار إزالة علامات الترقيم
        assert processor.normalize_text('كم عدد السيارات؟') == 'كم عدد السيارات'
    
    def test_extract_entities(self, processor):
        """اختبار استخراج الكيانات"""
        # اختبار استخراج كيانات المركبات
        entities = processor.extract_entities('كم عدد السيارات المتاحة؟')
        vehicle_entities = [e for e in entities if e[0] == 'vehicles']
        assert len(vehicle_entities) > 0
        
        # اختبار استخراج كيانات العملاء
        entities = processor.extract_entities('من هم العملاء المتأخرين؟')
        customer_entities = [e for e in entities if e[0] == 'customers']
        assert len(customer_entities) > 0
        
        # اختبار استخراج كيانات الحالة
        entities = processor.extract_entities('المركبات في الصيانة')
        status_entities = [e for e in entities if e[0] == 'status']
        assert len(status_entities) > 0
    
    def test_classify_query_type(self, processor):
        """اختبار تصنيف نوع الاستفسار"""
        # اختبار استفسارات المركبات
        entities = processor.extract_entities('كم سيارة متاحة؟')
        query_type = processor.classify_query_type('كم سيارة متاحة؟', entities)
        assert query_type == QueryType.VEHICLES
        
        # اختبار استفسارات العملاء
        entities = processor.extract_entities('عدد العملاء النشطين')
        query_type = processor.classify_query_type('عدد العملاء النشطين', entities)
        assert query_type == QueryType.CUSTOMERS
        
        # اختبار استفسارات المدفوعات
        entities = processor.extract_entities('إجمالي المتأخرات')
        query_type = processor.classify_query_type('إجمالي المتأخرات', entities)
        assert query_type == QueryType.PAYMENTS
    
    def test_determine_action(self, processor):
        """اختبار تحديد نوع العملية"""
        # اختبار عمليات العد
        action = processor.determine_action('كم عدد السيارات؟')
        assert action == QueryAction.COUNT
        
        # اختبار عمليات العرض
        action = processor.determine_action('اعرض العملاء المتأخرين')
        assert action == QueryAction.LIST
        
        # اختبار عمليات الحساب
        action = processor.determine_action('إجمالي المبلغ المستحق')
        assert action == QueryAction.CALCULATE
        
        # اختبار عمليات الملخص
        action = processor.determine_action('ملخص المدفوعات')
        assert action == QueryAction.SUMMARY
    
    def test_extract_filters(self, processor):
        """اختبار استخراج الفلاتر"""
        # اختبار فلتر الحالة
        entities = processor.extract_entities('السيارات في الصيانة')
        filters = processor.extract_filters('السيارات في الصيانة', entities)
        assert 'status' in filters
        assert filters['status'] == 'maintenance'
        
        # اختبار فلتر المتأخرات
        entities = processor.extract_entities('العملاء المتأخرين')
        filters = processor.extract_filters('العملاء المتأخرين', entities)
        assert filters.get('overdue') == True
        
        # اختبار فلتر النشاط
        entities = processor.extract_entities('العملاء النشطين')
        filters = processor.extract_filters('العملاء النشطين', entities)
        assert filters.get('is_active') == True
    
    def test_process_query_comprehensive(self, processor):
        """اختبار شامل لمعالجة الاستفسارات"""
        test_cases = [
            {
                'query': 'كم عدد العملاء المسجلين؟',
                'expected_type': QueryType.CUSTOMERS,
                'expected_action': QueryAction.COUNT,
                'min_confidence': 0.5
            },
            {
                'query': 'كم مركبة في الصيانة؟',
                'expected_type': QueryType.VEHICLES,
                'expected_action': QueryAction.COUNT,
                'min_confidence': 0.5
            },
            {
                'query': 'إجمالي المتأخرات على الزبائن',
                'expected_type': QueryType.PAYMENTS,
                'expected_action': QueryAction.CALCULATE,
                'min_confidence': 0.4
            },
            {
                'query': 'اعرض المركبات المتاحة',
                'expected_type': QueryType.VEHICLES,
                'expected_action': QueryAction.LIST,
                'min_confidence': 0.5
            },
            {
                'query': 'من هم العملاء المتأخرين؟',
                'expected_type': QueryType.CUSTOMERS,
                'expected_action': QueryAction.LIST,
                'min_confidence': 0.4
            }
        ]
        
        for case in test_cases:
            result = processor.process_query(case['query'])
            
            assert result.query_type == case['expected_type'], \
                f"نوع الاستفسار خاطئ لـ '{case['query']}': متوقع {case['expected_type']}, حصلت على {result.query_type}"
            
            assert result.action == case['expected_action'], \
                f"نوع العملية خاطئ لـ '{case['query']}': متوقع {case['expected_action']}, حصلت على {result.action}"
            
            assert result.confidence >= case['min_confidence'], \
                f"درجة الثقة منخفضة لـ '{case['query']}': متوقع >= {case['min_confidence']}, حصلت على {result.confidence}"
    
    def test_synonyms_recognition(self, processor):
        """اختبار التعرف على المرادفات"""
        # اختبار مرادفات المركبات
        queries = [
            'كم سيارة لدينا؟',
            'كم مركبة متوفرة؟',
            'عدد العربات المتاحة',
            'كم آلية في النظام؟'
        ]
        
        for query in queries:
            result = processor.process_query(query)
            assert result.query_type == QueryType.VEHICLES, \
                f"فشل في التعرف على مرادفات المركبات في: {query}"
        
        # اختبار مرادفات العملاء
        queries = [
            'كم عميل مسجل؟',
            'عدد الزبائن النشطين',
            'كم مستأجر لدينا؟',
            'عدد المشتركين'
        ]
        
        for query in queries:
            result = processor.process_query(query)
            assert result.query_type == QueryType.CUSTOMERS, \
                f"فشل في التعرف على مرادفات العملاء في: {query}"
    
    def test_dialect_support(self, processor):
        """اختبار دعم اللهجات المختلفة"""
        # اختبار اللهجة الكويتية
        result = processor.process_query('كم عربة عندنا؟')
        assert result.query_type == QueryType.VEHICLES
        
        # اختبار اللهجة السعودية
        result = processor.process_query('وش عدد السيارات؟')
        assert result.query_type == QueryType.VEHICLES
        
        # اختبار اللهجة العراقية
        result = processor.process_query('شقد مركبة موجودة؟')
        assert result.query_type == QueryType.VEHICLES
    
    def test_edge_cases(self, processor):
        """اختبار الحالات الحدية"""
        # اختبار نص فارغ
        result = processor.process_query('')
        assert result.query_type == QueryType.UNKNOWN
        assert result.confidence == 0.0
        
        # اختبار نص قصير جداً
        result = processor.process_query('كم؟')
        assert result.confidence < 0.5
        
        # اختبار نص غير مفهوم
        result = processor.process_query('xyz abc 123')
        assert result.query_type == QueryType.UNKNOWN
        assert result.confidence < 0.3
        
        # اختبار نص طويل ومعقد
        long_query = 'أريد أن أعرف كم عدد السيارات المتاحة للتأجير في هذا الوقت من اليوم'
        result = processor.process_query(long_query)
        assert result.query_type == QueryType.VEHICLES
        assert result.action == QueryAction.COUNT

if __name__ == '__main__':
    pytest.main([__file__, '-v'])


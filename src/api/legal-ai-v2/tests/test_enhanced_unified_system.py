#!/usr/bin/env python3
"""
اختبارات النظام الموحد المحسن للمستشار القانوني
"""

import pytest
import asyncio
import sys
import os
from unittest.mock import Mock, AsyncMock, patch

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from enhanced_unified_legal_ai_system import EnhancedUnifiedLegalAISystem, LegalAIResponse
from real_database_connector import DatabaseConfig

class TestEnhancedUnifiedLegalAISystem:
    """اختبارات النظام الموحد المحسن"""
    
    @pytest.fixture
    def mock_db_config(self):
        """إعدادات قاعدة بيانات وهمية للاختبار"""
        return DatabaseConfig(
            supabase_url='https://test.supabase.co',
            supabase_key='test-key',
            redis_host='localhost',
            redis_port=6379
        )
    
    @pytest.fixture
    def system_without_db(self):
        """نظام بدون قاعدة بيانات للاختبار"""
        return EnhancedUnifiedLegalAISystem(None)
    
    @pytest.fixture
    def system_with_mock_db(self, mock_db_config):
        """نظام مع قاعدة بيانات وهمية"""
        with patch('enhanced_unified_legal_ai_system.SmartQueryEngine'):
            system = EnhancedUnifiedLegalAISystem(mock_db_config)
            system.smart_engine = Mock()
            return system
    
    def test_classify_query_intent(self, system_without_db):
        """اختبار تصنيف نية الاستفسار"""
        # اختبار الاستشارات القانونية
        legal_queries = [
            'كيف أتعامل مع عميل متأخر في الدفع؟',
            'ما هي حقوقي القانونية؟',
            'إجراءات إنهاء العقد',
            'كيفية تحصيل الديون قانونياً'
        ]
        
        for query in legal_queries:
            intent = system_without_db._classify_query_intent(query)
            assert intent == 'legal_advice', f"فشل في تصنيف الاستشارة القانونية: {query}"
        
        # اختبار استعلامات البيانات
        data_queries = [
            'كم عدد العملاء؟',
            'إجمالي المتأخرات',
            'اعرض المركبات المتاحة',
            'ما هي الإحصائيات؟'
        ]
        
        for query in data_queries:
            intent = system_without_db._classify_query_intent(query)
            assert intent == 'data_query', f"فشل في تصنيف استعلام البيانات: {query}"
        
        # اختبار الاستفسارات المختلطة
        mixed_queries = [
            'ما هي المتأخرات وكيف أحصلها قانونياً؟',
            'كم عدد المخالفات وما الإجراءات القانونية؟'
        ]
        
        for query in mixed_queries:
            intent = system_without_db._classify_query_intent(query)
            assert intent in ['mixed', 'legal_advice', 'data_query'], f"فشل في تصنيف الاستفسار المختلط: {query}"
    
    @pytest.mark.asyncio
    async def test_handle_legal_advice(self, system_without_db):
        """اختبار معالجة الاستشارات القانونية"""
        # اختبار استشارة نزاعات الإيجار
        query = 'كيف أتعامل مع عميل متأخر في الدفع؟'
        response = await system_without_db._handle_legal_advice(query, asyncio.get_event_loop().time())
        
        assert response.success == True
        assert response.response_type == 'legal_advice'
        assert 'نزاعات الإيجار' in response.response_text
        assert response.confidence > 0
        assert response.legal_references is not None
        
        # اختبار استشارة المخالفات المرورية
        query = 'التعامل مع المخالفات المرورية'
        response = await system_without_db._handle_legal_advice(query, asyncio.get_event_loop().time())
        
        assert response.success == True
        assert 'المخالفات المرورية' in response.response_text
        
        # اختبار استشارة عامة
        query = 'أحتاج مساعدة قانونية'
        response = await system_without_db._handle_legal_advice(query, asyncio.get_event_loop().time())
        
        assert response.success == True
        assert response.suggestions is not None
        assert len(response.suggestions) > 0
    
    @pytest.mark.asyncio
    async def test_handle_data_query_without_engine(self, system_without_db):
        """اختبار معالجة استعلامات البيانات بدون محرك"""
        query = 'كم عدد العملاء؟'
        response = await system_without_db._handle_data_query(query, asyncio.get_event_loop().time())
        
        assert response.success == False
        assert response.response_type == 'data_query'
        assert 'غير متاحة' in response.response_text
        assert response.error_message == 'Smart engine not available'
    
    @pytest.mark.asyncio
    async def test_handle_data_query_with_engine(self, system_with_mock_db):
        """اختبار معالجة استعلامات البيانات مع المحرك"""
        # إعداد الاستجابة الوهمية
        mock_response = Mock()
        mock_response.success = True
        mock_response.response_text = 'عدد العملاء: 150 عميل'
        mock_response.data = {'count': 150}
        mock_response.confidence = 0.9
        mock_response.suggestions = None
        mock_response.query_understood = True
        mock_response.cached = False
        mock_response.error_message = None
        
        system_with_mock_db.smart_engine.process_query = AsyncMock(return_value=mock_response)
        
        query = 'كم عدد العملاء؟'
        response = await system_with_mock_db._handle_data_query(query, asyncio.get_event_loop().time())
        
        assert response.success == True
        assert response.response_type == 'data_query'
        assert response.response_text == 'عدد العملاء: 150 عميل'
        assert response.data == {'count': 150}
        assert response.confidence == 0.9
    
    @pytest.mark.asyncio
    async def test_handle_mixed_query(self, system_with_mock_db):
        """اختبار معالجة الاستفسارات المختلطة"""
        # إعداد الاستجابة الوهمية للبيانات
        mock_data_response = Mock()
        mock_data_response.success = True
        mock_data_response.response_text = 'إجمالي المتأخرات: 5000 دينار'
        mock_data_response.data = {'total': 5000}
        mock_data_response.confidence = 0.8
        mock_data_response.suggestions = None
        mock_data_response.query_understood = True
        mock_data_response.cached = False
        mock_data_response.error_message = None
        
        system_with_mock_db.smart_engine.process_query = AsyncMock(return_value=mock_data_response)
        
        query = 'ما هي المتأخرات وكيف أحصلها قانونياً؟'
        response = await system_with_mock_db._handle_mixed_query(query, asyncio.get_event_loop().time())
        
        assert response.success == True
        assert response.response_type == 'mixed'
        assert 'الاستشارة القانونية' in response.response_text
        assert 'البيانات ذات الصلة' in response.response_text
        assert response.data == {'total': 5000}
    
    @pytest.mark.asyncio
    async def test_process_query_comprehensive(self, system_with_mock_db):
        """اختبار شامل لمعالجة الاستفسارات"""
        # إعداد الاستجابة الوهمية
        mock_response = Mock()
        mock_response.success = True
        mock_response.response_text = 'تم العثور على 25 مركبة'
        mock_response.data = {'count': 25}
        mock_response.confidence = 0.9
        mock_response.suggestions = ['كم مركبة متاحة؟', 'حالة المركبات']
        mock_response.query_understood = True
        mock_response.cached = False
        mock_response.error_message = None
        
        system_with_mock_db.smart_engine.process_query = AsyncMock(return_value=mock_response)
        
        test_cases = [
            {
                'query': 'كم مركبة في الصيانة؟',
                'expected_type': 'data_query'
            },
            {
                'query': 'كيف أتعامل مع المخالفات؟',
                'expected_type': 'legal_advice'
            }
        ]
        
        for case in test_cases:
            response = await system_with_mock_db.process_query(case['query'])
            
            assert response.success == True
            assert response.response_type == case['expected_type']
            assert response.execution_time >= 0
            assert response.query_understood == True
    
    @pytest.mark.asyncio
    async def test_get_system_status(self, system_with_mock_db):
        """اختبار فحص حالة النظام"""
        # إعداد حالة وهمية
        system_with_mock_db.smart_engine.db_connector.get_connection_status = Mock(
            return_value={'supabase': True, 'redis': True}
        )
        
        status = await system_with_mock_db.get_system_status()
        
        assert 'legal_ai' in status
        assert 'smart_engine' in status
        assert status['legal_ai'] == True
        assert status['smart_engine'] == True
    
    @pytest.mark.asyncio
    async def test_get_suggestions(self, system_with_mock_db):
        """اختبار الحصول على الاقتراحات"""
        # إعداد اقتراحات وهمية من المحرك الذكي
        system_with_mock_db.smart_engine.get_suggestions = AsyncMock(
            return_value=['كم عدد العملاء؟', 'المركبات المتاحة']
        )
        
        suggestions = await system_with_mock_db.get_suggestions('عملاء')
        
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0
        
        # التحقق من وجود اقتراحات قانونية
        legal_suggestions = [s for s in suggestions if 'قانون' in s or 'حق' in s or 'كيف' in s]
        assert len(legal_suggestions) > 0
    
    def test_user_context_setting(self, system_with_mock_db):
        """اختبار تحديد سياق المستخدم"""
        company_id = 'test-company-123'
        user_id = 'test-user-456'
        
        system_with_mock_db.set_user_context(company_id, user_id)
        
        assert system_with_mock_db.company_id == company_id
        assert system_with_mock_db.user_id == user_id
        
        # التحقق من تمرير السياق للمحرك الذكي
        system_with_mock_db.smart_engine.set_user_context.assert_called_once_with(company_id, user_id)
    
    @pytest.mark.asyncio
    async def test_error_handling(self, system_with_mock_db):
        """اختبار معالجة الأخطاء"""
        # محاكاة خطأ في المحرك الذكي
        system_with_mock_db.smart_engine.process_query = AsyncMock(
            side_effect=Exception('Database connection error')
        )
        
        response = await system_with_mock_db.process_query('كم عدد العملاء؟')
        
        assert response.success == False
        assert response.response_type == 'error'
        assert 'خطأ في معالجة استفسارك' in response.response_text
        assert response.error_message is not None
        assert response.execution_time >= 0
    
    def test_legal_templates_coverage(self, system_without_db):
        """اختبار تغطية القوالب القانونية"""
        templates = system_without_db.legal_templates
        
        # التحقق من وجود القوالب الأساسية
        expected_categories = [
            'rental_disputes',
            'traffic_violations',
            'contract_termination',
            'debt_collection',
            'insurance_claims'
        ]
        
        for category in expected_categories:
            assert category in templates
            assert 'title' in templates[category]
            assert 'template' in templates[category]
            assert 'keywords' in templates[category]
            assert len(templates[category]['keywords']) > 0
    
    def test_legal_keywords_completeness(self, system_without_db):
        """اختبار اكتمال الكلمات المفتاحية القانونية"""
        keywords = system_without_db.legal_keywords
        
        # التحقق من وجود كلمات مفتاحية أساسية
        essential_keywords = [
            'قانون', 'حق', 'عقد', 'مسؤولية', 'إنذار',
            'مطالبة', 'تعويض', 'نزاع', 'مخالفة', 'دين'
        ]
        
        for keyword in essential_keywords:
            assert keyword in keywords, f"الكلمة المفتاحية '{keyword}' مفقودة"
        
        # التحقق من عدم وجود تكرار
        assert len(keywords) == len(set(keywords)), "يوجد تكرار في الكلمات المفتاحية"

if __name__ == '__main__':
    pytest.main([__file__, '-v'])


#!/usr/bin/env python3
"""
اختبارات الأداء والحمولة للمستشار القانوني الذكي
"""

import pytest
import asyncio
import time
import statistics
import sys
import os
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import Mock, AsyncMock

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from enhanced_unified_legal_ai_system import EnhancedUnifiedLegalAISystem
from arabic_query_processor import ArabicQueryProcessor

class TestPerformance:
    """اختبارات الأداء والحمولة"""
    
    @pytest.fixture
    def processor(self):
        """معالج الاستفسارات للاختبار"""
        return ArabicQueryProcessor()
    
    @pytest.fixture
    def system(self):
        """نظام بدون قاعدة بيانات للاختبار السريع"""
        return EnhancedUnifiedLegalAISystem(None)
    
    def test_query_processing_speed(self, processor):
        """اختبار سرعة معالجة الاستفسارات"""
        test_queries = [
            'كم عدد العملاء؟',
            'كم مركبة في الصيانة؟',
            'إجمالي المتأخرات',
            'اعرض المركبات المتاحة',
            'من هم العملاء المتأخرين؟'
        ]
        
        processing_times = []
        
        for query in test_queries:
            start_time = time.time()
            result = processor.process_query(query)
            end_time = time.time()
            
            processing_time = end_time - start_time
            processing_times.append(processing_time)
            
            # التحقق من أن المعالجة تتم في وقت معقول (أقل من 0.1 ثانية)
            assert processing_time < 0.1, f"معالجة بطيئة للاستفسار '{query}': {processing_time:.3f}s"
            assert result.confidence >= 0, "درجة ثقة غير صحيحة"
        
        # حساب الإحصائيات
        avg_time = statistics.mean(processing_times)
        max_time = max(processing_times)
        min_time = min(processing_times)
        
        print(f"\nإحصائيات الأداء:")
        print(f"متوسط وقت المعالجة: {avg_time:.4f}s")
        print(f"أقصى وقت معالجة: {max_time:.4f}s")
        print(f"أقل وقت معالجة: {min_time:.4f}s")
        
        # التحقق من أن متوسط الوقت مقبول
        assert avg_time < 0.05, f"متوسط وقت المعالجة مرتفع: {avg_time:.4f}s"
    
    def test_text_normalization_performance(self, processor):
        """اختبار أداء تطبيع النص"""
        test_texts = [
            'مَرْحَبًا بِكُمْ فِي النِّظَامِ',
            'أَهْلاً وَسَهْلاً بِالْعُمَلاءِ الْكِرَامِ',
            'كَمْ عَدَدُ السَّيَّارَاتِ الْمُتَاحَةِ؟',
            'إِجْمَالِي الْمُتَأَخِّرَاتِ عَلَى الزَّبَائِنِ',
            'مَا هِيَ الْمَرْكَبَاتُ الَّتِي فِي الصِّيَانَةِ؟'
        ]
        
        normalization_times = []
        
        for text in test_texts:
            start_time = time.time()
            normalized = processor.normalize_text(text)
            end_time = time.time()
            
            normalization_time = end_time - start_time
            normalization_times.append(normalization_time)
            
            # التحقق من أن التطبيع يتم بسرعة
            assert normalization_time < 0.01, f"تطبيع بطيء للنص: {normalization_time:.4f}s"
            assert len(normalized) > 0, "النص المطبع فارغ"
        
        avg_time = statistics.mean(normalization_times)
        assert avg_time < 0.005, f"متوسط وقت التطبيع مرتفع: {avg_time:.4f}s"
    
    def test_entity_extraction_performance(self, processor):
        """اختبار أداء استخراج الكيانات"""
        test_queries = [
            'كم عدد العملاء النشطين المسجلين في النظام؟',
            'اعرض جميع المركبات المتاحة للتأجير في الصيانة',
            'إجمالي المتأخرات والديون على الزبائن والعملاء',
            'ما هي المخالفات المرورية غير المدفوعة للمركبات',
            'عدد العقود النشطة والمكتملة والملغاة'
        ]
        
        extraction_times = []
        
        for query in test_queries:
            start_time = time.time()
            entities = processor.extract_entities(query)
            end_time = time.time()
            
            extraction_time = end_time - start_time
            extraction_times.append(extraction_time)
            
            # التحقق من أن الاستخراج يتم بسرعة
            assert extraction_time < 0.05, f"استخراج بطيء للكيانات: {extraction_time:.4f}s"
            assert isinstance(entities, list), "نتيجة الاستخراج ليست قائمة"
        
        avg_time = statistics.mean(extraction_times)
        assert avg_time < 0.02, f"متوسط وقت الاستخراج مرتفع: {avg_time:.4f}s"
    
    @pytest.mark.asyncio
    async def test_concurrent_processing(self, system):
        """اختبار المعالجة المتزامنة"""
        queries = [
            'كيف أتعامل مع عميل متأخر؟',
            'إجراءات إنهاء العقد',
            'التعامل مع المخالفات المرورية',
            'كيفية تحصيل الديون',
            'مطالبات التأمين'
        ] * 4  # 20 استفسار إجمالي
        
        start_time = time.time()
        
        # تنفيذ الاستفسارات بشكل متزامن
        tasks = [system.process_query(query) for query in queries]
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # التحقق من النتائج
        successful_results = [r for r in results if r.success]
        success_rate = len(successful_results) / len(results)
        
        print(f"\nاختبار المعالجة المتزامنة:")
        print(f"عدد الاستفسارات: {len(queries)}")
        print(f"الوقت الإجمالي: {total_time:.3f}s")
        print(f"متوسط الوقت لكل استفسار: {total_time/len(queries):.3f}s")
        print(f"معدل النجاح: {success_rate:.2%}")
        
        # التحقق من الأداء
        assert success_rate >= 0.95, f"معدل نجاح منخفض: {success_rate:.2%}"
        assert total_time < 10, f"وقت إجمالي مرتفع: {total_time:.3f}s"
        assert total_time/len(queries) < 0.5, f"متوسط وقت مرتفع لكل استفسار"
    
    def test_memory_usage_stability(self, processor):
        """اختبار استقرار استخدام الذاكرة"""
        import psutil
        import gc
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # معالجة عدد كبير من الاستفسارات
        queries = [
            'كم عدد العملاء؟',
            'كم مركبة متاحة؟',
            'إجمالي المتأخرات',
            'اعرض المركبات',
            'من هم المتأخرين؟'
        ]
        
        for i in range(1000):  # 1000 استفسار
            query = queries[i % len(queries)]
            result = processor.process_query(query)
            
            # تنظيف الذاكرة كل 100 استفسار
            if i % 100 == 0:
                gc.collect()
                current_memory = process.memory_info().rss / 1024 / 1024
                memory_increase = current_memory - initial_memory
                
                # التحقق من عدم زيادة الذاكرة بشكل مفرط
                assert memory_increase < 50, f"زيادة مفرطة في الذاكرة: {memory_increase:.2f}MB"
        
        final_memory = process.memory_info().rss / 1024 / 1024
        total_increase = final_memory - initial_memory
        
        print(f"\nاستخدام الذاكرة:")
        print(f"الذاكرة الأولية: {initial_memory:.2f}MB")
        print(f"الذاكرة النهائية: {final_memory:.2f}MB")
        print(f"الزيادة الإجمالية: {total_increase:.2f}MB")
        
        assert total_increase < 100, f"زيادة كبيرة في الذاكرة: {total_increase:.2f}MB"
    
    def test_large_query_handling(self, processor):
        """اختبار التعامل مع الاستفسارات الطويلة"""
        # إنشاء استفسار طويل
        long_query = """
        أريد أن أعرف كم عدد العملاء المسجلين في النظام والذين لديهم عقود نشطة
        وكم منهم متأخر في الدفع وما هو إجمالي المبلغ المتأخر عليهم وكم مركبة
        لديهم مؤجرة حالياً وما هي حالة هذه المركبات وهل هناك أي مخالفات مرورية
        عليها وكم تكلفة الصيانة المتوقعة لهذا الشهر
        """
        
        start_time = time.time()
        result = processor.process_query(long_query)
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # التحقق من أن المعالجة تتم في وقت معقول حتى للاستفسارات الطويلة
        assert processing_time < 0.2, f"معالجة بطيئة للاستفسار الطويل: {processing_time:.3f}s"
        assert result.confidence > 0, "فشل في معالجة الاستفسار الطويل"
        assert len(result.entities) > 0, "فشل في استخراج الكيانات من الاستفسار الطويل"
    
    def test_repeated_query_performance(self, processor):
        """اختبار أداء الاستفسارات المتكررة"""
        query = 'كم عدد العملاء المسجلين في النظام؟'
        
        times = []
        for i in range(100):
            start_time = time.time()
            result = processor.process_query(query)
            end_time = time.time()
            
            times.append(end_time - start_time)
            assert result.confidence > 0.5, f"انخفاض في الأداء في التكرار {i}"
        
        # التحقق من استقرار الأداء
        avg_time = statistics.mean(times)
        std_dev = statistics.stdev(times)
        
        print(f"\nأداء الاستفسارات المتكررة:")
        print(f"متوسط الوقت: {avg_time:.4f}s")
        print(f"الانحراف المعياري: {std_dev:.4f}s")
        
        # التحقق من أن الأداء مستقر
        assert std_dev < avg_time * 0.5, f"تذبذب كبير في الأداء: {std_dev:.4f}s"
        assert avg_time < 0.05, f"متوسط وقت مرتفع: {avg_time:.4f}s"
    
    @pytest.mark.asyncio
    async def test_system_response_time_under_load(self, system):
        """اختبار وقت استجابة النظام تحت الحمولة"""
        # محاكاة حمولة عالية
        queries = [
            'كيف أتعامل مع عميل متأخر؟',
            'إجراءات إنهاء العقد',
            'التعامل مع المخالفات',
            'كيفية تحصيل الديون'
        ]
        
        # تنفيذ 50 استفسار متزامن
        tasks = []
        for i in range(50):
            query = queries[i % len(queries)]
            tasks.append(system.process_query(query))
        
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        end_time = time.time()
        
        total_time = end_time - start_time
        avg_response_time = total_time / len(tasks)
        
        # فحص أوقات الاستجابة الفردية
        individual_times = [r.execution_time for r in results if hasattr(r, 'execution_time')]
        max_individual_time = max(individual_times) if individual_times else 0
        
        print(f"\nأداء النظام تحت الحمولة:")
        print(f"عدد الاستفسارات المتزامنة: {len(tasks)}")
        print(f"الوقت الإجمالي: {total_time:.3f}s")
        print(f"متوسط وقت الاستجابة: {avg_response_time:.3f}s")
        print(f"أقصى وقت استجابة فردي: {max_individual_time:.3f}s")
        
        # التحقق من الأداء تحت الحمولة
        assert avg_response_time < 1.0, f"متوسط وقت استجابة مرتفع: {avg_response_time:.3f}s"
        assert max_individual_time < 2.0, f"وقت استجابة فردي مرتفع: {max_individual_time:.3f}s"
        
        # التحقق من معدل النجاح
        successful_results = [r for r in results if r.success]
        success_rate = len(successful_results) / len(results)
        assert success_rate >= 0.95, f"معدل نجاح منخفض تحت الحمولة: {success_rate:.2%}"

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])


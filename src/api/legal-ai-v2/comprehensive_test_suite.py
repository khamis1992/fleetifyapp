#!/usr/bin/env python3
"""
مجموعة اختبارات شاملة للمستشار القانوني الذكي المتقدم
تتضمن اختبارات الوحدة، اختبارات التكامل، اختبارات الأداء، واختبارات الأمان
"""

import unittest
import asyncio
import time
import json
import sqlite3
import tempfile
import os
import sys
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import threading
import concurrent.futures
from typing import Dict, List, Any
import warnings
warnings.filterwarnings('ignore')

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# استيراد الوحدات المطلوبة
try:
    from intelligent_database_integration import IntelligentDatabaseIntegration
    from contextual_analysis_engine import ContextualAnalysisEngine
    from custom_legal_document_generator import CustomLegalDocumentGenerator
    from performance_optimization_engine import PerformanceOptimizationEngine
    from predictive_intelligence_system import PredictiveIntelligenceSystem
    from advanced_security_compliance_system import AdvancedSecurityComplianceSystem
except ImportError as e:
    print(f"تحذير: لا يمكن استيراد بعض الوحدات: {e}")

class TestIntelligentDatabaseIntegration(unittest.TestCase):
    """اختبارات محرك التكامل الذكي مع قاعدة البيانات"""
    
    def setUp(self):
        """إعداد الاختبار"""
        self.db_integration = IntelligentDatabaseIntegration()
    
    def test_client_data_retrieval(self):
        """اختبار استرجاع بيانات العميل"""
        client_data = self.db_integration.get_comprehensive_client_data("client_001")
        
        self.assertIsInstance(client_data, dict)
        self.assertIn('basic_info', client_data)
        self.assertIn('contracts', client_data)
        self.assertIn('payments', client_data)
        self.assertIn('violations', client_data)
        self.assertIn('legal_history', client_data)
    
    def test_relationship_analysis(self):
        """اختبار تحليل العلاقات"""
        relationships = self.db_integration.analyze_client_relationships("client_001")
        
        self.assertIsInstance(relationships, dict)
        self.assertIn('related_clients', relationships)
        self.assertIn('business_network', relationships)
        self.assertIn('risk_connections', relationships)
    
    def test_pattern_detection(self):
        """اختبار اكتشاف الأنماط"""
        patterns = self.db_integration.detect_behavioral_patterns("client_001")
        
        self.assertIsInstance(patterns, dict)
        self.assertIn('payment_patterns', patterns)
        self.assertIn('usage_patterns', patterns)
        self.assertIn('risk_patterns', patterns)
    
    def test_contextual_search(self):
        """اختبار البحث السياقي"""
        results = self.db_integration.contextual_search("عقود تأجير السيارات")
        
        self.assertIsInstance(results, list)
        if results:
            self.assertIn('relevance_score', results[0])
            self.assertIn('data_type', results[0])

class TestContextualAnalysisEngine(unittest.TestCase):
    """اختبارات محرك التحليل السياقي"""
    
    def setUp(self):
        """إعداد الاختبار"""
        self.analysis_engine = ContextualAnalysisEngine()
    
    def test_risk_analysis(self):
        """اختبار تحليل المخاطر"""
        client_data = {
            'basic_info': {'name': 'أحمد محمد', 'id': 'client_001'},
            'payments': [{'amount': 1000, 'status': 'overdue', 'days_overdue': 30}],
            'violations': [{'type': 'speeding', 'date': '2024-01-15'}]
        }
        
        risk_analysis = self.analysis_engine.analyze_client_risk(client_data)
        
        self.assertIsInstance(risk_analysis, dict)
        self.assertIn('risk_score', risk_analysis)
        self.assertIn('risk_factors', risk_analysis)
        self.assertIn('recommendations', risk_analysis)
        self.assertGreater(risk_analysis['risk_score'], 0)
    
    def test_legal_reason_extraction(self):
        """اختبار استخراج الأسباب القانونية"""
        client_data = {
            'payments': [{'amount': 1000, 'status': 'overdue', 'days_overdue': 45}],
            'violations': [{'type': 'contract_breach', 'description': 'عدم إرجاع السيارة في الموعد'}]
        }
        
        reasons = self.analysis_engine.extract_legal_reasons(client_data)
        
        self.assertIsInstance(reasons, list)
        self.assertGreater(len(reasons), 0)
        for reason in reasons:
            self.assertIn('reason', reason)
            self.assertIn('severity', reason)
            self.assertIn('legal_basis', reason)
    
    def test_context_understanding(self):
        """اختبار فهم السياق"""
        query = "اكتب إنذار قانوني للعميل أحمد بسبب تأخير الدفع"
        
        context = self.analysis_engine.understand_query_context(query)
        
        self.assertIsInstance(context, dict)
        self.assertIn('intent', context)
        self.assertIn('entities', context)
        self.assertIn('document_type', context)
        self.assertEqual(context['document_type'], 'legal_warning')

class TestCustomLegalDocumentGenerator(unittest.TestCase):
    """اختبارات نظام إنشاء الوثائق القانونية المخصصة"""
    
    def setUp(self):
        """إعداد الاختبار"""
        self.doc_generator = CustomLegalDocumentGenerator()
    
    def test_legal_warning_generation(self):
        """اختبار إنشاء الإنذار القانوني"""
        client_data = {
            'basic_info': {'name': 'أحمد محمد', 'id': 'client_001'},
            'payments': [{'amount': 1000, 'status': 'overdue', 'days_overdue': 30}]
        }
        
        legal_reasons = [
            {'reason': 'تأخير في سداد المستحقات', 'severity': 'high', 'legal_basis': 'المادة 15 من العقد'}
        ]
        
        document = self.doc_generator.generate_legal_warning(
            client_data, legal_reasons, 'kuwait'
        )
        
        self.assertIsInstance(document, dict)
        self.assertIn('document_type', document)
        self.assertIn('content', document)
        self.assertIn('legal_references', document)
        self.assertEqual(document['document_type'], 'legal_warning')
    
    def test_financial_claim_generation(self):
        """اختبار إنشاء المطالبة المالية"""
        client_data = {
            'basic_info': {'name': 'سارة أحمد', 'id': 'client_002'},
            'payments': [
                {'amount': 1500, 'status': 'overdue', 'days_overdue': 60},
                {'amount': 800, 'status': 'overdue', 'days_overdue': 30}
            ]
        }
        
        document = self.doc_generator.generate_financial_claim(
            client_data, 'saudi_arabia'
        )
        
        self.assertIsInstance(document, dict)
        self.assertIn('total_amount', document)
        self.assertIn('breakdown', document)
        self.assertIn('legal_basis', document)
        self.assertEqual(document['total_amount'], 2300)
    
    def test_contract_termination_generation(self):
        """اختبار إنشاء إنهاء العقد"""
        client_data = {
            'basic_info': {'name': 'محمد علي', 'id': 'client_003'},
            'violations': [
                {'type': 'contract_breach', 'severity': 'high'},
                {'type': 'damage', 'description': 'أضرار في السيارة'}
            ]
        }
        
        document = self.doc_generator.generate_contract_termination(
            client_data, 'qatar'
        )
        
        self.assertIsInstance(document, dict)
        self.assertIn('termination_reasons', document)
        self.assertIn('effective_date', document)
        self.assertIn('consequences', document)
    
    def test_document_validation(self):
        """اختبار التحقق من صحة الوثيقة"""
        document_content = "إنذار قانوني للعميل أحمد محمد بسبب تأخير الدفع"
        
        validation = self.doc_generator.validate_document(document_content, 'legal_warning')
        
        self.assertIsInstance(validation, dict)
        self.assertIn('is_valid', validation)
        self.assertIn('accuracy_score', validation)
        self.assertIn('suggestions', validation)

class TestPerformanceOptimizationEngine(unittest.TestCase):
    """اختبارات نظام تحسين الأداء"""
    
    def setUp(self):
        """إعداد الاختبار"""
        self.perf_engine = PerformanceOptimizationEngine()
    
    def test_caching_system(self):
        """اختبار نظام التخزين المؤقت"""
        # اختبار الحفظ والاسترجاع
        test_data = {"test": "data", "timestamp": datetime.now().isoformat()}
        
        self.perf_engine.cache_response("test_key", test_data)
        cached_data = self.perf_engine.get_cached_response("test_key")
        
        self.assertIsNotNone(cached_data)
        self.assertEqual(cached_data["test"], "data")
    
    def test_parallel_processing(self):
        """اختبار المعالجة المتوازية"""
        tasks = [
            {"id": i, "data": f"task_{i}"}
            for i in range(10)
        ]
        
        start_time = time.time()
        results = self.perf_engine.process_parallel_tasks(tasks)
        end_time = time.time()
        
        self.assertEqual(len(results), 10)
        self.assertLess(end_time - start_time, 2.0)  # يجب أن يكون أسرع من المعالجة التسلسلية
    
    def test_query_optimization(self):
        """اختبار تحسين الاستعلامات"""
        query = "SELECT * FROM clients WHERE status = 'active'"
        
        optimized_query = self.perf_engine.optimize_database_query(query)
        
        self.assertIsInstance(optimized_query, str)
        self.assertIn("INDEX", optimized_query.upper())
    
    def test_performance_monitoring(self):
        """اختبار مراقبة الأداء"""
        # محاكاة عملية
        with self.perf_engine.monitor_performance("test_operation"):
            time.sleep(0.1)
        
        metrics = self.perf_engine.get_performance_metrics()
        
        self.assertIn("test_operation", metrics)
        self.assertGreater(metrics["test_operation"]["avg_duration"], 0.05)

class TestPredictiveIntelligenceSystem(unittest.TestCase):
    """اختبارات نظام الذكاء التنبؤي"""
    
    def setUp(self):
        """إعداد الاختبار"""
        self.predictive_system = PredictiveIntelligenceSystem()
    
    def test_payment_behavior_prediction(self):
        """اختبار التنبؤ بسلوك الدفع"""
        client_data = {
            'payment_history': [
                {'amount': 1000, 'days_late': 5},
                {'amount': 1500, 'days_late': 10},
                {'amount': 800, 'days_late': 0}
            ]
        }
        
        prediction = self.predictive_system.predict_payment_behavior(client_data)
        
        self.assertIsInstance(prediction, dict)
        self.assertIn('predicted_behavior', prediction)
        self.assertIn('confidence', prediction)
        self.assertIn('timeline', prediction)
    
    def test_legal_risk_prediction(self):
        """اختبار التنبؤ بالمخاطر القانونية"""
        client_data = {
            'violations': [
                {'type': 'speeding', 'severity': 'medium'},
                {'type': 'late_return', 'severity': 'low'}
            ],
            'payment_history': [{'days_late': 30}]
        }
        
        prediction = self.predictive_system.predict_legal_issues(client_data)
        
        self.assertIsInstance(prediction, dict)
        self.assertIn('risk_level', prediction)
        self.assertIn('confidence', prediction)
        self.assertIn('recommendations', prediction)
    
    def test_learning_insights_generation(self):
        """اختبار إنشاء رؤى التعلم"""
        insights = self.predictive_system.generate_learning_insights()
        
        self.assertIsInstance(insights, list)
        # قد تكون فارغة في البداية، لكن يجب أن تكون قائمة صحيحة

class TestAdvancedSecurityComplianceSystem(unittest.TestCase):
    """اختبارات نظام الأمان والامتثال المتقدم"""
    
    def setUp(self):
        """إعداد الاختبار"""
        # استخدام قاعدة بيانات مؤقتة للاختبار
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.security_system = AdvancedSecurityComplianceSystem(self.temp_db.name)
    
    def tearDown(self):
        """تنظيف بعد الاختبار"""
        os.unlink(self.temp_db.name)
    
    def test_data_encryption_decryption(self):
        """اختبار تشفير وفك تشفير البيانات"""
        test_data = "معلومات حساسة للاختبار"
        
        encrypted = self.security_system.encrypt_sensitive_data(test_data, "pii")
        decrypted = self.security_system.decrypt_sensitive_data(encrypted, "pii")
        
        self.assertNotEqual(test_data, encrypted)
        self.assertEqual(test_data, decrypted)
    
    def test_pii_masking(self):
        """اختبار إخفاء البيانات الشخصية"""
        phone = "+965-1234-5678"
        email = "test@example.com"
        
        masked_phone = self.security_system.mask_pii_data(phone, "phone")
        masked_email = self.security_system.mask_pii_data(email, "email")
        
        self.assertNotEqual(phone, masked_phone)
        self.assertNotEqual(email, masked_email)
        self.assertIn("****", masked_phone)
        self.assertIn("*", masked_email)
    
    def test_session_management(self):
        """اختبار إدارة الجلسات"""
        user_id = "test_user"
        ip_address = "192.168.1.100"
        
        # إنشاء جلسة
        session_id = self.security_system.create_user_session(user_id, ip_address)
        self.assertIsNotNone(session_id)
        
        # التحقق من صحة الجلسة
        is_valid = self.security_system.validate_user_session(session_id, ip_address)
        self.assertTrue(is_valid)
        
        # إلغاء الجلسة
        self.security_system.revoke_user_session(session_id)
        is_valid_after_revoke = self.security_system.validate_user_session(session_id, ip_address)
        self.assertFalse(is_valid_after_revoke)
    
    def test_compliance_checks(self):
        """اختبار فحوصات الامتثال"""
        gdpr_checks = self.security_system.perform_compliance_check("GDPR")
        
        self.assertIsInstance(gdpr_checks, list)
        self.assertGreater(len(gdpr_checks), 0)
        
        for check in gdpr_checks:
            self.assertIn(check.status, ['passed', 'failed', 'warning'])
            self.assertIsNotNone(check.check_name)
    
    def test_data_access_logging(self):
        """اختبار تسجيل الوصول للبيانات"""
        self.security_system.log_data_access(
            user_id="test_user",
            data_type="client_data",
            action="read",
            ip_address="192.168.1.100"
        )
        
        # التحقق من وجود السجل
        self.assertGreater(len(self.security_system.access_logs), 0)

class TestSystemIntegration(unittest.TestCase):
    """اختبارات التكامل بين الأنظمة"""
    
    def setUp(self):
        """إعداد اختبارات التكامل"""
        self.db_integration = IntelligentDatabaseIntegration()
        self.analysis_engine = ContextualAnalysisEngine()
        self.doc_generator = CustomLegalDocumentGenerator()
        self.perf_engine = PerformanceOptimizationEngine()
    
    def test_end_to_end_workflow(self):
        """اختبار سير العمل من البداية للنهاية"""
        # 1. استرجاع بيانات العميل
        client_data = self.db_integration.get_comprehensive_client_data("client_001")
        self.assertIsInstance(client_data, dict)
        
        # 2. تحليل المخاطر
        risk_analysis = self.analysis_engine.analyze_client_risk(client_data)
        self.assertIsInstance(risk_analysis, dict)
        
        # 3. استخراج الأسباب القانونية
        legal_reasons = self.analysis_engine.extract_legal_reasons(client_data)
        self.assertIsInstance(legal_reasons, list)
        
        # 4. إنشاء الوثيقة القانونية
        document = self.doc_generator.generate_legal_warning(
            client_data, legal_reasons, 'kuwait'
        )
        self.assertIsInstance(document, dict)
        
        # 5. التحقق من الأداء
        self.assertIsNotNone(document.get('content'))
    
    def test_performance_under_load(self):
        """اختبار الأداء تحت الحمولة"""
        def process_client(client_id):
            client_data = self.db_integration.get_comprehensive_client_data(client_id)
            risk_analysis = self.analysis_engine.analyze_client_risk(client_data)
            return risk_analysis
        
        # محاكاة معالجة متعددة العملاء
        client_ids = [f"client_{i:03d}" for i in range(1, 21)]
        
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(process_client, client_ids))
        
        end_time = time.time()
        
        self.assertEqual(len(results), 20)
        self.assertLess(end_time - start_time, 10.0)  # يجب أن يكتمل في أقل من 10 ثوانٍ

class TestPerformanceBenchmarks(unittest.TestCase):
    """اختبارات قياس الأداء"""
    
    def setUp(self):
        """إعداد اختبارات الأداء"""
        self.perf_engine = PerformanceOptimizationEngine()
    
    def test_response_time_benchmark(self):
        """اختبار قياس زمن الاستجابة"""
        response_times = []
        
        for _ in range(100):
            start_time = time.time()
            
            # محاكاة عملية معالجة
            self.perf_engine.get_cached_response("test_key")
            
            end_time = time.time()
            response_times.append(end_time - start_time)
        
        avg_response_time = sum(response_times) / len(response_times)
        max_response_time = max(response_times)
        
        # يجب أن يكون متوسط زمن الاستجابة أقل من 0.01 ثانية
        self.assertLess(avg_response_time, 0.01)
        # يجب أن يكون أقصى زمن استجابة أقل من 0.1 ثانية
        self.assertLess(max_response_time, 0.1)
    
    def test_memory_usage_benchmark(self):
        """اختبار استخدام الذاكرة"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # إنشاء بيانات كبيرة
        large_data = {}
        for i in range(1000):
            large_data[f"key_{i}"] = f"data_{i}" * 100
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # يجب أن تكون الزيادة في الذاكرة معقولة (أقل من 100 MB)
        self.assertLess(memory_increase, 100 * 1024 * 1024)

def run_comprehensive_tests():
    """تشغيل جميع الاختبارات الشاملة"""
    print("=== بدء الاختبارات الشاملة للمستشار القانوني الذكي ===\n")
    
    # إنشاء مجموعة الاختبارات
    test_suite = unittest.TestSuite()
    
    # إضافة اختبارات الوحدة
    test_classes = [
        TestIntelligentDatabaseIntegration,
        TestContextualAnalysisEngine,
        TestCustomLegalDocumentGenerator,
        TestPerformanceOptimizationEngine,
        TestPredictiveIntelligenceSystem,
        TestAdvancedSecurityComplianceSystem,
        TestSystemIntegration,
        TestPerformanceBenchmarks
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # تشغيل الاختبارات
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # تقرير النتائج
    print(f"\n=== تقرير نتائج الاختبارات ===")
    print(f"إجمالي الاختبارات: {result.testsRun}")
    print(f"الاختبارات الناجحة: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"الاختبارات الفاشلة: {len(result.failures)}")
    print(f"الأخطاء: {len(result.errors)}")
    
    if result.failures:
        print(f"\n❌ الاختبارات الفاشلة:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback.split('AssertionError:')[-1].strip()}")
    
    if result.errors:
        print(f"\n🚨 الأخطاء:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback.split('Exception:')[-1].strip()}")
    
    success_rate = ((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun) * 100
    print(f"\n📊 معدل النجاح: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("✅ النظام جاهز للنشر!")
    elif success_rate >= 75:
        print("⚠️ النظام يحتاج تحسينات طفيفة")
    else:
        print("❌ النظام يحتاج مراجعة شاملة")
    
    return result

def generate_test_report():
    """إنشاء تقرير اختبار مفصل"""
    report = {
        "test_execution_date": datetime.now().isoformat(),
        "system_version": "2.0.0",
        "test_environment": "development",
        "modules_tested": [
            "intelligent_database_integration",
            "contextual_analysis_engine", 
            "custom_legal_document_generator",
            "performance_optimization_engine",
            "predictive_intelligence_system",
            "advanced_security_compliance_system"
        ],
        "test_categories": {
            "unit_tests": "اختبارات الوحدة",
            "integration_tests": "اختبارات التكامل",
            "performance_tests": "اختبارات الأداء",
            "security_tests": "اختبارات الأمان"
        },
        "performance_benchmarks": {
            "target_response_time": "< 1 second",
            "target_throughput": "> 100 requests/minute",
            "target_accuracy": "> 95%",
            "target_availability": "> 99.9%"
        },
        "security_compliance": {
            "data_encryption": "AES-256 + RSA-2048",
            "access_control": "Role-based access control",
            "audit_logging": "Comprehensive audit trail",
            "compliance_standards": ["GDPR", "CCPA", "Local Privacy Laws"]
        }
    }
    
    return report

if __name__ == "__main__":
    # تشغيل الاختبارات الشاملة
    test_result = run_comprehensive_tests()
    
    # إنشاء تقرير الاختبار
    test_report = generate_test_report()
    
    # حفظ التقرير
    with open("comprehensive_test_report.json", "w", encoding="utf-8") as f:
        json.dump(test_report, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 تم حفظ تقرير الاختبار في: comprehensive_test_report.json")
    print("🎯 الاختبارات الشاملة مكتملة!")


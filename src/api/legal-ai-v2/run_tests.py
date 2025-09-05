#!/usr/bin/env python3
"""
سكريبت تشغيل جميع اختبارات المستشار القانوني الذكي
"""

import os
import sys
import subprocess
import time
from datetime import datetime
import json

def run_command(command, description):
    """تشغيل أمر وإرجاع النتيجة"""
    print(f"\n{'='*60}")
    print(f"تشغيل: {description}")
    print(f"الأمر: {command}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 دقائق timeout
        )
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        print(f"كود الإنهاء: {result.returncode}")
        print(f"وقت التنفيذ: {execution_time:.2f} ثانية")
        
        if result.stdout:
            print(f"\nالمخرجات:\n{result.stdout}")
        
        if result.stderr:
            print(f"\nالأخطاء:\n{result.stderr}")
        
        return {
            'success': result.returncode == 0,
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'execution_time': execution_time
        }
        
    except subprocess.TimeoutExpired:
        print("انتهت مهلة التنفيذ!")
        return {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': 'Timeout expired',
            'execution_time': 300
        }
    except Exception as e:
        print(f"خطأ في تنفيذ الأمر: {e}")
        return {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': str(e),
            'execution_time': 0
        }

def install_dependencies():
    """تثبيت المتطلبات"""
    print("تثبيت المتطلبات...")
    
    # تحديث pip
    result = run_command(
        "python -m pip install --upgrade pip",
        "تحديث pip"
    )
    
    if not result['success']:
        print("تحذير: فشل في تحديث pip")
    
    # تثبيت المتطلبات
    if os.path.exists('requirements.txt'):
        result = run_command(
            "pip install -r requirements.txt",
            "تثبيت المتطلبات من requirements.txt"
        )
        
        if not result['success']:
            print("خطأ: فشل في تثبيت المتطلبات")
            return False
    
    # تثبيت pytest إذا لم يكن مثبتاً
    result = run_command(
        "pip install pytest pytest-asyncio pytest-cov",
        "تثبيت أدوات الاختبار"
    )
    
    return result['success']

def run_unit_tests():
    """تشغيل اختبارات الوحدة"""
    test_files = [
        'tests/test_arabic_query_processor.py',
        'tests/test_enhanced_unified_system.py'
    ]
    
    results = {}
    
    for test_file in test_files:
        if os.path.exists(test_file):
            result = run_command(
                f"python -m pytest {test_file} -v --tb=short",
                f"اختبارات الوحدة - {test_file}"
            )
            results[test_file] = result
        else:
            print(f"تحذير: ملف الاختبار غير موجود: {test_file}")
            results[test_file] = {
                'success': False,
                'returncode': -1,
                'stdout': '',
                'stderr': 'File not found',
                'execution_time': 0
            }
    
    return results

def run_performance_tests():
    """تشغيل اختبارات الأداء"""
    test_file = 'tests/test_performance.py'
    
    if os.path.exists(test_file):
        result = run_command(
            f"python -m pytest {test_file} -v --tb=short -s",
            "اختبارات الأداء"
        )
        return {test_file: result}
    else:
        print(f"تحذير: ملف اختبار الأداء غير موجود: {test_file}")
        return {test_file: {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': 'File not found',
            'execution_time': 0
        }}

def run_integration_tests():
    """تشغيل اختبارات التكامل"""
    # اختبار تشغيل الخادم
    result = run_command(
        "python -c \"from api_endpoints import app; print('API endpoints loaded successfully')\"",
        "اختبار تحميل API endpoints"
    )
    
    return {'api_endpoints': result}

def run_code_quality_checks():
    """فحص جودة الكود"""
    results = {}
    
    # فحص بـ flake8 إذا كان متاحاً
    try:
        result = run_command(
            "flake8 --max-line-length=100 --ignore=E501,W503 *.py",
            "فحص جودة الكود بـ flake8"
        )
        results['flake8'] = result
    except:
        print("تحذير: flake8 غير متاح")
    
    # فحص بـ black إذا كان متاحاً
    try:
        result = run_command(
            "black --check --diff *.py",
            "فحص تنسيق الكود بـ black"
        )
        results['black'] = result
    except:
        print("تحذير: black غير متاح")
    
    return results

def generate_coverage_report():
    """إنشاء تقرير التغطية"""
    if os.path.exists('tests'):
        result = run_command(
            "python -m pytest tests/ --cov=. --cov-report=html --cov-report=term",
            "إنشاء تقرير التغطية"
        )
        return result
    else:
        print("تحذير: مجلد الاختبارات غير موجود")
        return {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': 'Tests directory not found',
            'execution_time': 0
        }

def generate_test_report(all_results):
    """إنشاء تقرير شامل للاختبارات"""
    report = {
        'timestamp': datetime.now().isoformat(),
        'summary': {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'total_execution_time': 0
        },
        'results': all_results
    }
    
    # حساب الإحصائيات
    for category, tests in all_results.items():
        if isinstance(tests, dict):
            for test_name, result in tests.items():
                report['summary']['total_tests'] += 1
                if result['success']:
                    report['summary']['passed_tests'] += 1
                else:
                    report['summary']['failed_tests'] += 1
                report['summary']['total_execution_time'] += result['execution_time']
    
    # حفظ التقرير
    with open('test_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    # طباعة الملخص
    print(f"\n{'='*60}")
    print("ملخص نتائج الاختبارات")
    print(f"{'='*60}")
    print(f"إجمالي الاختبارات: {report['summary']['total_tests']}")
    print(f"الاختبارات الناجحة: {report['summary']['passed_tests']}")
    print(f"الاختبارات الفاشلة: {report['summary']['failed_tests']}")
    print(f"معدل النجاح: {(report['summary']['passed_tests']/report['summary']['total_tests']*100):.1f}%")
    print(f"إجمالي وقت التنفيذ: {report['summary']['total_execution_time']:.2f} ثانية")
    print(f"تم حفظ التقرير في: test_report.json")
    
    return report

def main():
    """الدالة الرئيسية"""
    print(f"{'='*60}")
    print("تشغيل اختبارات المستشار القانوني الذكي")
    print(f"الوقت: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    # التأكد من وجود مجلد الاختبارات
    if not os.path.exists('tests'):
        os.makedirs('tests')
        print("تم إنشاء مجلد الاختبارات")
    
    all_results = {}
    
    # 1. تثبيت المتطلبات
    print("\n1. تثبيت المتطلبات...")
    if not install_dependencies():
        print("خطأ: فشل في تثبيت المتطلبات")
        return False
    
    # 2. اختبارات الوحدة
    print("\n2. تشغيل اختبارات الوحدة...")
    unit_results = run_unit_tests()
    all_results['unit_tests'] = unit_results
    
    # 3. اختبارات الأداء
    print("\n3. تشغيل اختبارات الأداء...")
    performance_results = run_performance_tests()
    all_results['performance_tests'] = performance_results
    
    # 4. اختبارات التكامل
    print("\n4. تشغيل اختبارات التكامل...")
    integration_results = run_integration_tests()
    all_results['integration_tests'] = integration_results
    
    # 5. فحص جودة الكود
    print("\n5. فحص جودة الكود...")
    quality_results = run_code_quality_checks()
    all_results['code_quality'] = quality_results
    
    # 6. تقرير التغطية
    print("\n6. إنشاء تقرير التغطية...")
    coverage_result = generate_coverage_report()
    all_results['coverage'] = {'coverage_report': coverage_result}
    
    # 7. إنشاء التقرير النهائي
    print("\n7. إنشاء التقرير النهائي...")
    final_report = generate_test_report(all_results)
    
    # تحديد حالة النجاح الإجمالية
    overall_success = final_report['summary']['failed_tests'] == 0
    
    if overall_success:
        print(f"\n✅ جميع الاختبارات نجحت!")
        return True
    else:
        print(f"\n❌ بعض الاختبارات فشلت!")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)


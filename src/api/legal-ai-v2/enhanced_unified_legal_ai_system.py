#!/usr/bin/env python3
"""
النظام الموحد المحسن للمستشار القانوني الذكي
يجمع بين الاستشارات القانونية التقليدية والاستعلامات الذكية عن البيانات
"""

import asyncio
import logging
import os
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
import json

# استيراد المكونات المطلوبة
from smart_query_engine import SmartQueryEngine, SmartQueryResponse
from real_database_connector import DatabaseConfig
from arabic_query_processor import QueryType

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class LegalAIResponse:
    """استجابة المستشار القانوني الموحد"""
    success: bool
    response_type: str  # 'legal_advice', 'data_query', 'mixed'
    response_text: str
    data: Any = None
    confidence: float = 0.0
    execution_time: float = 0.0
    suggestions: List[str] = None
    legal_references: List[str] = None
    query_understood: bool = True
    cached: bool = False
    error_message: str = None

class EnhancedUnifiedLegalAISystem:
    """النظام الموحد المحسن للمستشار القانوني"""
    
    def __init__(self, db_config: DatabaseConfig = None):
        # تهيئة محرك الاستعلامات الذكي
        if db_config:
            self.smart_engine = SmartQueryEngine(db_config)
        else:
            self.smart_engine = None
            logger.warning("لم يتم تحديد إعدادات قاعدة البيانات - سيتم تعطيل الاستعلامات الذكية")
        
        # تهيئة قوالب الاستشارات القانونية
        self.legal_templates = self._build_legal_templates()
        self.legal_keywords = self._build_legal_keywords()
        
        # إعدادات النظام
        self.company_id = None
        self.user_id = None
    
    def set_user_context(self, company_id: str, user_id: str):
        """تحديد سياق المستخدم"""
        self.company_id = company_id
        self.user_id = user_id
        
        if self.smart_engine:
            self.smart_engine.set_user_context(company_id, user_id)
    
    def _build_legal_templates(self) -> Dict[str, Dict[str, str]]:
        """بناء قوالب الاستشارات القانونية"""
        return {
            'rental_disputes': {
                'title': 'نزاعات الإيجار',
                'template': """
بناءً على قانون الإيجار الكويتي، في حالة النزاع بين المؤجر والمستأجر:

1. **الإجراءات الأولية:**
   - إرسال إنذار رسمي للمستأجر المتأخر
   - تحديد مهلة زمنية للسداد (عادة 15-30 يوم)
   - توثيق جميع المراسلات

2. **الحقوق القانونية:**
   - حق المؤجر في فسخ العقد عند التأخر المستمر
   - حق المطالبة بالأجرة المتأخرة والتعويضات
   - حق حجز المركبة كضمان

3. **الإجراءات القضائية:**
   - رفع دعوى في المحكمة المختصة
   - طلب الحجز التحفظي على أموال المدين
   - تنفيذ الحكم القضائي

**ملاحظة مهمة:** يُنصح بالتشاور مع محامٍ مختص قبل اتخاذ أي إجراء قانوني.
                """,
                'keywords': ['نزاع', 'خلاف', 'مشكلة', 'إيجار', 'تأجير', 'عقد']
            },
            'traffic_violations': {
                'title': 'المخالفات المرورية',
                'template': """
بخصوص المخالفات المرورية للمركبات المؤجرة:

1. **المسؤولية القانونية:**
   - المستأجر مسؤول عن جميع المخالفات خلال فترة الإيجار
   - يجب تحديد المسؤولية بوضوح في عقد الإيجار
   - حق المؤجر في خصم قيمة المخالفات من التأمين

2. **الإجراءات المطلوبة:**
   - إبلاغ المستأجر فوراً بالمخالفة
   - تحويل المخالفة لاسم المستأجر إن أمكن
   - الاحتفاظ بنسخ من جميع الوثائق

3. **التعامل مع المخالفات غير المدفوعة:**
   - إرسال إنذار للمستأجر
   - خصم المبلغ من التأمين
   - المطالبة القضائية إذا لزم الأمر

**تذكير:** يجب تسوية جميع المخالفات قبل تجديد رخصة المركبة.
                """,
                'keywords': ['مخالفة', 'مخالفات', 'مرورية', 'غرامة', 'غرامات', 'ساهر']
            },
            'contract_termination': {
                'title': 'إنهاء العقود',
                'template': """
إجراءات إنهاء عقد الإيجار قانونياً:

1. **الإنهاء بالاتفاق:**
   - موافقة الطرفين على الإنهاء
   - تسوية جميع المستحقات المالية
   - استلام المركبة وفحصها

2. **الإنهاء لسبب مشروع:**
   - عدم دفع الأجرة لمدة محددة
   - مخالفة شروط العقد الأساسية
   - استخدام المركبة لأغراض غير مشروعة

3. **الإجراءات القانونية:**
   - إرسال إنذار رسمي
   - منح مهلة للتصحيح
   - فسخ العقد وطلب التعويض

4. **التسوية المالية:**
   - حساب المستحقات والخصومات
   - رد التأمين بعد خصم المطلوبات
   - تحرير مخالصة نهائية

**مهم:** يجب اتباع الإجراءات القانونية بدقة لتجنب المنازعات.
                """,
                'keywords': ['إنهاء', 'فسخ', 'إلغاء', 'عقد', 'عقود']
            },
            'debt_collection': {
                'title': 'تحصيل الديون',
                'template': """
الإجراءات القانونية لتحصيل المتأخرات:

1. **المرحلة الودية:**
   - التواصل المباشر مع المدين
   - إرسال تذكيرات ودية
   - محاولة الوصول لاتفاق للسداد

2. **الإنذار الرسمي:**
   - إرسال إنذار عبر كاتب العدل
   - تحديد مهلة نهائية للسداد
   - التهديد باتخاذ الإجراءات القانونية

3. **الإجراءات القضائية:**
   - رفع دعوى مطالبة بالدين
   - طلب الحجز التحفظي
   - تنفيذ الحكم القضائي

4. **ضمانات التحصيل:**
   - الاحتفاظ بالتأمين النقدي
   - الحجز على ممتلكات المدين
   - منع السفر في الحالات الكبيرة

**نصيحة:** التوثيق الجيد للديون يسهل عملية التحصيل القانوني.
                """,
                'keywords': ['دين', 'ديون', 'متأخرات', 'تحصيل', 'مطالبة']
            },
            'insurance_claims': {
                'title': 'مطالبات التأمين',
                'template': """
التعامل مع مطالبات التأمين للمركبات المؤجرة:

1. **عند وقوع الحادث:**
   - إبلاغ شركة التأمين فوراً
   - توثيق الحادث بالصور والتقارير
   - الحصول على تقرير الشرطة

2. **الإجراءات المطلوبة:**
   - تعبئة نموذج المطالبة
   - تقديم جميع الوثائق المطلوبة
   - متابعة المطالبة مع الشركة

3. **حقوق المؤجر:**
   - المطالبة بقيمة الإصلاح
   - التعويض عن فقدان الإيراد
   - استبدال المركبة إذا كانت مستهلكة

4. **التعامل مع الرفض:**
   - مراجعة أسباب الرفض
   - تقديم مستندات إضافية
   - اللجوء للتحكيم أو القضاء

**مهم:** الالتزام بشروط وثيقة التأمين ضروري لقبول المطالبة.
                """,
                'keywords': ['تأمين', 'حادث', 'حوادث', 'مطالبة', 'تعويض']
            }
        }
    
    def _build_legal_keywords(self) -> List[str]:
        """بناء قائمة الكلمات المفتاحية القانونية"""
        keywords = []
        for category in self.legal_templates.values():
            keywords.extend(category['keywords'])
        
        # إضافة كلمات قانونية عامة
        general_legal_keywords = [
            'قانون', 'قانونية', 'قانوني', 'محكمة', 'قاضي', 'محامي',
            'دعوى', 'حكم', 'تنفيذ', 'إنذار', 'مطالبة', 'تعويض',
            'حق', 'حقوق', 'واجب', 'واجبات', 'التزام', 'التزامات',
            'عقد', 'عقود', 'اتفاقية', 'شرط', 'شروط', 'بند', 'بنود',
            'مسؤولية', 'ضمان', 'كفالة', 'رهن', 'حجز', 'تحفظي'
        ]
        
        keywords.extend(general_legal_keywords)
        return list(set(keywords))  # إزالة التكرار
    
    def _classify_query_intent(self, query_text: str) -> str:
        """تصنيف نية الاستفسار"""
        query_lower = query_text.lower()
        
        # فحص الكلمات المفتاحية القانونية
        legal_score = sum(1 for keyword in self.legal_keywords if keyword in query_lower)
        
        # فحص كلمات الاستعلام عن البيانات
        data_keywords = ['كم', 'عدد', 'إجمالي', 'مجموع', 'اعرض', 'وريني', 'ما هي', 'من هم']
        data_score = sum(1 for keyword in data_keywords if keyword in query_lower)
        
        # تحديد النية
        if legal_score > data_score and legal_score > 0:
            return 'legal_advice'
        elif data_score > legal_score and data_score > 0:
            return 'data_query'
        elif legal_score > 0 and data_score > 0:
            return 'mixed'
        else:
            # تحليل إضافي بناءً على السياق
            if any(word in query_lower for word in ['نصيحة', 'استشارة', 'رأي', 'مشورة']):
                return 'legal_advice'
            elif any(word in query_lower for word in ['بيانات', 'معلومات', 'تقرير', 'إحصائيات']):
                return 'data_query'
            else:
                return 'data_query'  # افتراضي
    
    async def process_query(self, query_text: str) -> LegalAIResponse:
        """معالجة الاستفسار الرئيسية"""
        start_time = datetime.now()
        
        try:
            # تصنيف نية الاستفسار
            intent = self._classify_query_intent(query_text)
            
            if intent == 'legal_advice':
                return await self._handle_legal_advice(query_text, start_time)
            elif intent == 'data_query':
                return await self._handle_data_query(query_text, start_time)
            elif intent == 'mixed':
                return await self._handle_mixed_query(query_text, start_time)
            else:
                return await self._handle_data_query(query_text, start_time)  # افتراضي
                
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"خطأ في معالجة الاستفسار: {e}")
            
            return LegalAIResponse(
                success=False,
                response_type='error',
                response_text=f"عذراً، حدث خطأ في معالجة استفسارك: {str(e)}",
                execution_time=execution_time,
                error_message=str(e)
            )
    
    async def _handle_legal_advice(self, query_text: str, start_time: datetime) -> LegalAIResponse:
        """معالجة الاستشارات القانونية"""
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # البحث عن القالب المناسب
        best_match = None
        best_score = 0
        
        query_lower = query_text.lower()
        
        for category_key, category_data in self.legal_templates.items():
            score = sum(1 for keyword in category_data['keywords'] if keyword in query_lower)
            if score > best_score:
                best_score = score
                best_match = category_data
        
        if best_match and best_score > 0:
            # تخصيص الاستجابة
            response_text = f"## {best_match['title']}\n\n{best_match['template']}"
            
            # إضافة بيانات ذات صلة إذا كان محرك الاستعلامات متاح
            additional_data = None
            if self.smart_engine:
                additional_data = await self._get_relevant_data(query_text)
            
            return LegalAIResponse(
                success=True,
                response_type='legal_advice',
                response_text=response_text,
                data=additional_data,
                confidence=min(best_score / 3.0, 1.0),  # تطبيع النتيجة
                execution_time=execution_time,
                legal_references=['قانون الإيجار الكويتي', 'قانون المرور الكويتي'],
                query_understood=True
            )
        else:
            # استشارة عامة
            general_advice = """
## استشارة قانونية عامة

لتقديم استشارة قانونية دقيقة، يرجى تحديد طبيعة المشكلة أو الاستفسار بوضوح أكبر.

**المجالات التي يمكنني مساعدتك فيها:**
- نزاعات الإيجار وحقوق المؤجر
- المخالفات المرورية ومسؤولية المستأجر
- إجراءات إنهاء العقود
- تحصيل الديون والمتأخرات
- مطالبات التأمين

**للحصول على استشارة مفصلة، يرجى ذكر:**
- طبيعة المشكلة تحديداً
- الظروف المحيطة بالحالة
- الإجراءات المتخذة سابقاً (إن وجدت)

**تنبيه مهم:** هذه معلومات إرشادية عامة ولا تغني عن استشارة محامٍ مختص.
            """
            
            return LegalAIResponse(
                success=True,
                response_type='legal_advice',
                response_text=general_advice,
                confidence=0.5,
                execution_time=execution_time,
                suggestions=[
                    "مشكلة في تحصيل متأخرات من مستأجر",
                    "كيفية التعامل مع مخالفة مرورية للمركبة المؤجرة",
                    "إجراءات إنهاء عقد إيجار",
                    "مطالبة تأمين بعد حادث"
                ]
            )
    
    async def _handle_data_query(self, query_text: str, start_time: datetime) -> LegalAIResponse:
        """معالجة استعلامات البيانات"""
        if not self.smart_engine:
            execution_time = (datetime.now() - start_time).total_seconds()
            return LegalAIResponse(
                success=False,
                response_type='data_query',
                response_text="عذراً، خدمة الاستعلام عن البيانات غير متاحة حالياً. يرجى التأكد من إعدادات قاعدة البيانات.",
                execution_time=execution_time,
                error_message="Smart engine not available"
            )
        
        # استخدام محرك الاستعلامات الذكي
        smart_response = await self.smart_engine.process_query(query_text)
        
        execution_time = (datetime.now() - start_time).total_seconds()
        
        return LegalAIResponse(
            success=smart_response.success,
            response_type='data_query',
            response_text=smart_response.response_text,
            data=smart_response.data,
            confidence=smart_response.confidence,
            execution_time=execution_time,
            suggestions=smart_response.suggestions,
            query_understood=smart_response.query_understood,
            cached=smart_response.cached,
            error_message=smart_response.error_message
        )
    
    async def _handle_mixed_query(self, query_text: str, start_time: datetime) -> LegalAIResponse:
        """معالجة الاستفسارات المختلطة"""
        # معالجة الجانب القانوني
        legal_response = await self._handle_legal_advice(query_text, start_time)
        
        # معالجة جانب البيانات
        data_response = await self._handle_data_query(query_text, start_time)
        
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # دمج الاستجابتين
        combined_response = f"""
## الاستشارة القانونية:
{legal_response.response_text}

---

## البيانات ذات الصلة:
{data_response.response_text if data_response.success else 'لا توجد بيانات متاحة'}
        """
        
        return LegalAIResponse(
            success=legal_response.success or data_response.success,
            response_type='mixed',
            response_text=combined_response,
            data=data_response.data if data_response.success else None,
            confidence=(legal_response.confidence + data_response.confidence) / 2,
            execution_time=execution_time,
            legal_references=legal_response.legal_references,
            suggestions=legal_response.suggestions or data_response.suggestions,
            query_understood=legal_response.query_understood and data_response.query_understood
        )
    
    async def _get_relevant_data(self, query_text: str) -> Optional[Dict]:
        """الحصول على بيانات ذات صلة بالاستشارة القانونية"""
        if not self.smart_engine:
            return None
        
        try:
            # تحديد نوع البيانات المطلوبة بناءً على السياق
            if any(word in query_text.lower() for word in ['متأخر', 'دين', 'مطالبة']):
                result = await self.smart_engine.db_connector.get_overdue_invoices_summary()
                if result.success:
                    return {
                        'type': 'overdue_summary',
                        'data': result.data
                    }
            
            elif any(word in query_text.lower() for word in ['مخالفة', 'غرامة']):
                result = await self.smart_engine.db_connector.execute_custom_query(
                    'traffic_violations', 
                    filters={'status': 'pending'}
                )
                if result.success:
                    return {
                        'type': 'violations_summary',
                        'count': result.count,
                        'data': result.data
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"خطأ في الحصول على البيانات ذات الصلة: {e}")
            return None
    
    async def get_system_status(self) -> Dict[str, Any]:
        """فحص حالة النظام"""
        status = {
            'legal_ai': True,  # النظام القانوني متاح دائماً
            'smart_engine': False,
            'database': False,
            'cache': False
        }
        
        if self.smart_engine:
            status['smart_engine'] = True
            
            # فحص حالة قاعدة البيانات
            db_status = self.smart_engine.db_connector.get_connection_status()
            status.update(db_status)
        
        return status
    
    async def get_suggestions(self, context: str = "") -> List[str]:
        """الحصول على اقتراحات للاستفسارات"""
        suggestions = []
        
        # اقتراحات قانونية
        legal_suggestions = [
            "كيف أتعامل مع عميل متأخر في الدفع؟",
            "ما هي حقوقي عند تأخر المستأجر؟",
            "إجراءات إنهاء عقد الإيجار",
            "التعامل مع المخالفات المرورية للمركبة المؤجرة",
            "كيفية تحصيل الديون المتأخرة قانونياً"
        ]
        
        suggestions.extend(legal_suggestions)
        
        # اقتراحات البيانات
        if self.smart_engine:
            data_suggestions = await self.smart_engine.get_suggestions(context)
            suggestions.extend(data_suggestions)
        
        return suggestions[:10]  # أول 10 اقتراحات

# مثال على الاستخدام
if __name__ == "__main__":
    # إعدادات قاعدة البيانات
    config = DatabaseConfig(
        supabase_url=os.getenv('SUPABASE_URL', ''),
        supabase_key=os.getenv('SUPABASE_ANON_KEY', '')
    )
    
    # إنشاء النظام الموحد
    legal_ai = EnhancedUnifiedLegalAISystem(config)
    legal_ai.set_user_context('company-123', 'user-456')
    
    # اختبار النظام
    async def test_system():
        test_queries = [
            "كيف أتعامل مع عميل متأخر في الدفع؟",  # استشارة قانونية
            "كم عدد العملاء المتأخرين؟",  # استعلام بيانات
            "ما هي المتأخرات وكيف أحصلها قانونياً؟",  # مختلط
            "كم مركبة في الصيانة؟"  # استعلام بيانات
        ]
        
        print("=== اختبار النظام الموحد المحسن ===\n")
        
        for query in test_queries:
            print(f"الاستفسار: {query}")
            response = await legal_ai.process_query(query)
            print(f"نوع الاستجابة: {response.response_type}")
            print(f"نجح: {response.success}")
            print(f"الثقة: {response.confidence:.2f}")
            print(f"الاستجابة: {response.response_text[:200]}...")
            print("-" * 50)
        
        # فحص حالة النظام
        status = await legal_ai.get_system_status()
        print(f"\nحالة النظام: {status}")
    
    # تشغيل الاختبار
    asyncio.run(test_system())


#!/usr/bin/env python3
"""
النموذج المحسن للمستشار القانوني مع نظام الذاكرة والتعلم الذكي
يجمع بين الذكاء الاصطناعي وقاعدة المعرفة المحلية والتعلم التدريجي
"""

import os
import json
import time
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import logging
from openai import OpenAI

# استيراد الأنظمة المطورة
from smart_caching_system import SmartCachingSystem
from local_knowledge_base import LocalKnowledgeBase
from adaptive_learning_system import AdaptiveLearningSystem, UserFeedback

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedLegalAIModel:
    """النموذج المحسن للذكاء الاصطناعي القانوني"""
    
    def __init__(self):
        # تهيئة العميل
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_API_BASE", "https://api.manus.im/api/llm-proxy/v1")
        )
        
        # تهيئة الأنظمة الذكية
        self.cache_system = SmartCachingSystem()
        self.knowledge_base = LocalKnowledgeBase()
        self.learning_system = AdaptiveLearningSystem()
        
        # إحصائيات الأداء
        self.performance_stats = {
            'total_queries': 0,
            'cache_hits': 0,
            'local_knowledge_hits': 0,
            'api_calls': 0,
            'total_cost_saved': 0.0,
            'average_response_time': 0.0,
            'user_satisfaction': 0.0
        }
        
        # تحميل المعرفة القانونية الأساسية
        self.legal_knowledge = self._load_legal_knowledge()
        
        logger.info("تم تهيئة النموذج المحسن بنجاح")
    
    def _load_legal_knowledge(self) -> Dict[str, Any]:
        """تحميل المعرفة القانونية الأساسية"""
        return {
            'saudi_arabia': {
                'name': 'المملكة العربية السعودية',
                'laws': [
                    'نظام المرور السعودي الجديد',
                    'لائحة تأجير السيارات ووسطاء التأجير',
                    'نظام الشركات السعودي'
                ],
                'authorities': [
                    'الهيئة العامة للنقل',
                    'وزارة التجارة',
                    'وزارة الداخلية (المرور)'
                ]
            },
            'qatar': {
                'name': 'دولة قطر',
                'laws': [
                    'مرسوم بقانون رقم (19) لسنة 2007 في شأن المرور',
                    'قرار وزير المواصلات رقم (13) لسنة 2024 بشأن الليموزين'
                ],
                'authorities': [
                    'وزارة المواصلات والاتصالات',
                    'وزارة الداخلية',
                    'وزارة التجارة والصناعة'
                ]
            },
            'kuwait': {
                'name': 'دولة الكويت',
                'laws': [
                    'مرسوم بقانون رقم 67 لسنة 1976 في شأن المرور',
                    'مرسوم بقانون رقم 5 لسنة 2025 (التعديلات الجديدة)'
                ],
                'authorities': [
                    'وزارة الداخلية (الإدارة العامة للمرور)',
                    'وزارة التجارة والصناعة',
                    'بلدية الكويت'
                ]
            }
        }
    
    def generate_legal_advice(self, query: str, country: str = 'saudi_arabia') -> Dict[str, Any]:
        """توليد استشارة قانونية مع النظام الذكي المحسن"""
        start_time = time.time()
        self.performance_stats['total_queries'] += 1
        
        try:
            # المرحلة 1: البحث في الذاكرة المؤقتة
            cached_result = self.cache_system.check_cache(query, country)
            if cached_result:
                self.performance_stats['cache_hits'] += 1
                response_time = time.time() - start_time
                
                return {
                    'advice': cached_result['response'],
                    'source': 'cache',
                    'confidence': cached_result['confidence_score'],
                    'response_time': response_time,
                    'cost_saved': True,
                    'usage_count': cached_result['usage_count']
                }
            
            # المرحلة 2: البحث في قاعدة المعرفة المحلية
            local_result = self.knowledge_base.search_knowledge(query, country)
            if local_result:
                self.performance_stats['local_knowledge_hits'] += 1
                response_time = time.time() - start_time
                
                # حفظ في الذاكرة المؤقتة للمرات القادمة
                self.cache_system.store_response(
                    query, local_result['answer'], country, 
                    confidence_score=local_result['confidence']
                )
                
                return {
                    'advice': local_result['answer'],
                    'source': 'local_knowledge',
                    'confidence': local_result['confidence'],
                    'response_time': response_time,
                    'cost_saved': True,
                    'match_score': local_result['match_score']
                }
            
            # المرحلة 3: استدعاء API مع prompt محسن
            self.performance_stats['api_calls'] += 1
            api_result = self._call_api_with_optimized_prompt(query, country)
            response_time = time.time() - start_time
            
            # حفظ النتيجة في الأنظمة الذكية
            self.cache_system.store_response(
                query, api_result['advice'], country, 
                confidence_score=api_result['confidence']
            )
            
            self.cache_system.learn_from_query(query, api_result['advice'], country)
            
            # تحديث الإحصائيات
            self._update_performance_stats(response_time, api_result.get('cost', 0.0))
            
            return {
                **api_result,
                'source': 'api',
                'response_time': response_time
            }
            
        except Exception as e:
            logger.error(f"خطأ في توليد الاستشارة القانونية: {e}")
            return {
                'advice': 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.',
                'source': 'error',
                'confidence': 0.0,
                'response_time': time.time() - start_time,
                'error': str(e)
            }
    
    def _call_api_with_optimized_prompt(self, query: str, country: str) -> Dict[str, Any]:
        """استدعاء API مع prompt محسن"""
        
        # إنشاء prompt محسن ومختصر
        system_prompt = self._create_optimized_system_prompt(country)
        
        # الحصول على السياق المناسب فقط
        relevant_context = self._get_relevant_context(query, country)
        
        user_prompt = f"""
السياق القانوني: {relevant_context}

الاستفسار: {query}

يرجى تقديم استشارة قانونية مفصلة ودقيقة.
"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1500,
                temperature=0.3
            )
            
            advice = response.choices[0].message.content
            
            # حساب التكلفة التقريبية
            input_tokens = len(system_prompt.split()) + len(user_prompt.split())
            output_tokens = len(advice.split())
            cost = self._calculate_cost(input_tokens, output_tokens)
            
            return {
                'advice': advice,
                'confidence': 0.9,  # ثقة عالية من API
                'cost': cost,
                'tokens_used': input_tokens + output_tokens
            }
            
        except Exception as e:
            logger.error(f"خطأ في استدعاء API: {e}")
            raise
    
    def _create_optimized_system_prompt(self, country: str) -> str:
        """إنشاء prompt النظام المحسن"""
        country_info = self.legal_knowledge.get(country, {})
        
        return f"""أنت محامي خبير متخصص في قوانين {country_info.get('name', country)} في مجال تأجير السيارات والليموزين.

خبرتك تشمل:
- قوانين المرور والنقل
- أنظمة تأجير السيارات
- التراخيص التجارية
- العقود والمذكرات القانونية

قدم استشارات دقيقة ومفصلة مع ذكر المراجع القانونية عند الإمكان.
اجعل إجاباتك عملية وقابلة للتطبيق."""
    
    def _get_relevant_context(self, query: str, country: str) -> str:
        """الحصول على السياق المناسب للاستفسار"""
        country_info = self.legal_knowledge.get(country, {})
        
        # تحديد نوع الاستفسار
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['شروط', 'تأسيس', 'شركة']):
            context = f"قوانين تأسيس الشركات في {country_info.get('name')}"
        elif any(word in query_lower for word in ['ترخيص', 'ليموزين']):
            context = f"أنظمة ترخيص الليموزين في {country_info.get('name')}"
        elif any(word in query_lower for word in ['عقوبات', 'مرور', 'غرامات']):
            context = f"قوانين المرور والعقوبات في {country_info.get('name')}"
        else:
            context = f"القوانين العامة لتأجير السيارات في {country_info.get('name')}"
        
        return context
    
    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """حساب تكلفة استدعاء API"""
        # أسعار GPT-4o-mini
        input_cost_per_1k = 0.00015  # $0.00015 per 1K input tokens
        output_cost_per_1k = 0.0006  # $0.0006 per 1K output tokens
        
        input_cost = (input_tokens / 1000) * input_cost_per_1k
        output_cost = (output_tokens / 1000) * output_cost_per_1k
        
        return input_cost + output_cost
    
    def _update_performance_stats(self, response_time: float, cost: float):
        """تحديث إحصائيات الأداء"""
        # تحديث متوسط وقت الاستجابة
        total_queries = self.performance_stats['total_queries']
        current_avg = self.performance_stats['average_response_time']
        new_avg = ((current_avg * (total_queries - 1)) + response_time) / total_queries
        self.performance_stats['average_response_time'] = new_avg
        
        # تحديث التكلفة المحفوظة (تقدير)
        estimated_full_cost = cost * 3  # تقدير التكلفة بدون تحسين
        cost_saved = estimated_full_cost - cost
        self.performance_stats['total_cost_saved'] += cost_saved
    
    def record_user_feedback(self, query: str, country: str, rating: int, 
                           feedback_text: str = None, user_id: str = None) -> bool:
        """تسجيل تقييم المستخدم"""
        try:
            query_hash = hashlib.md5(f"{query}_{country}".encode('utf-8')).hexdigest()
            
            feedback = UserFeedback(
                query_hash=query_hash,
                rating=rating,
                feedback_text=feedback_text,
                country=country,
                query_type=self._classify_query_type(query),
                timestamp=datetime.now(),
                user_id=user_id
            )
            
            success = self.learning_system.record_user_feedback(feedback)
            
            if success:
                # تحديث متوسط رضا المستخدمين
                self._update_user_satisfaction(rating)
                
                # تحديث قاعدة المعرفة إذا كان التقييم إيجابياً
                if rating >= 4:
                    self._update_knowledge_from_feedback(query, country, rating)
            
            return success
            
        except Exception as e:
            logger.error(f"خطأ في تسجيل تقييم المستخدم: {e}")
            return False
    
    def _classify_query_type(self, query: str) -> str:
        """تصنيف نوع الاستفسار"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['استشارة', 'سؤال', 'ما هي', 'كيف']):
            return 'consultation'
        elif any(word in query_lower for word in ['مذكرة', 'دفاع', 'مرافعة']):
            return 'memo'
        elif any(word in query_lower for word in ['عقد', 'تحليل', 'مراجعة']):
            return 'contract'
        elif any(word in query_lower for word in ['ترخيص', 'متطلبات', 'شروط']):
            return 'licensing'
        else:
            return 'general'
    
    def _update_user_satisfaction(self, rating: int):
        """تحديث متوسط رضا المستخدمين"""
        current_satisfaction = self.performance_stats['user_satisfaction']
        total_queries = self.performance_stats['total_queries']
        
        if total_queries == 1:
            self.performance_stats['user_satisfaction'] = rating / 5.0
        else:
            new_satisfaction = ((current_satisfaction * (total_queries - 1)) + (rating / 5.0)) / total_queries
            self.performance_stats['user_satisfaction'] = new_satisfaction
    
    def _update_knowledge_from_feedback(self, query: str, country: str, rating: int):
        """تحديث قاعدة المعرفة من التقييمات الإيجابية"""
        # الحصول على الاستجابة المحفوظة
        cached_result = self.cache_system.check_cache(query, country)
        
        if cached_result and rating >= 4:
            # تحديث قاعدة المعرفة المحلية
            cache_entries = [{
                'original_query': query,
                'response': cached_result['response'],
                'country': country,
                'query_type': self._classify_query_type(query),
                'usage_count': cached_result['usage_count'],
                'confidence_score': 0.9,  # ثقة عالية للتقييمات الإيجابية
                'query_hash': cached_result['query_hash']
            }]
            
            self.knowledge_base.update_from_cache(cache_entries)
    
    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """الحصول على إحصائيات شاملة للنظام"""
        # إحصائيات الذاكرة المؤقتة
        cache_stats = self.cache_system.get_cache_stats()
        
        # إحصائيات قاعدة المعرفة
        knowledge_stats = self.knowledge_base.get_knowledge_stats()
        
        # رؤى التعلم
        learning_insights = self.learning_system.get_learning_insights()
        
        # حساب معدلات الكفاءة
        total_queries = self.performance_stats['total_queries']
        if total_queries > 0:
            cache_hit_rate = (self.performance_stats['cache_hits'] / total_queries) * 100
            local_hit_rate = (self.performance_stats['local_knowledge_hits'] / total_queries) * 100
            api_usage_rate = (self.performance_stats['api_calls'] / total_queries) * 100
            cost_efficiency = (1 - (self.performance_stats['api_calls'] / total_queries)) * 100
        else:
            cache_hit_rate = local_hit_rate = api_usage_rate = cost_efficiency = 0
        
        return {
            'performance_overview': {
                'total_queries': total_queries,
                'cache_hit_rate': round(cache_hit_rate, 1),
                'local_knowledge_hit_rate': round(local_hit_rate, 1),
                'api_usage_rate': round(api_usage_rate, 1),
                'cost_efficiency': round(cost_efficiency, 1),
                'average_response_time': round(self.performance_stats['average_response_time'], 2),
                'user_satisfaction': round(self.performance_stats['user_satisfaction'] * 100, 1),
                'total_cost_saved': round(self.performance_stats['total_cost_saved'], 4)
            },
            'cache_system': cache_stats,
            'knowledge_base': knowledge_stats,
            'learning_system': learning_insights,
            'efficiency_breakdown': {
                'instant_responses': cache_stats['total_entries'],
                'local_responses': knowledge_stats['total_entries'],
                'api_calls_saved': cache_stats['total_usage'] + knowledge_stats.get('total_usage', 0),
                'estimated_monthly_savings': round(self.performance_stats['total_cost_saved'] * 30, 2)
            }
        }
    
    def optimize_system(self) -> Dict[str, Any]:
        """تحسين النظام بناءً على البيانات المتراكمة"""
        optimization_results = {
            'cache_cleanup': {},
            'knowledge_updates': {},
            'learning_improvements': {},
            'performance_gains': {}
        }
        
        try:
            # 1. تنظيف الذاكرة المؤقتة
            cleanup_result = self.cache_system.cleanup_old_entries()
            optimization_results['cache_cleanup'] = cleanup_result
            
            # 2. تحديث قاعدة المعرفة من الذاكرة المؤقتة
            # جلب الإدخالات عالية الجودة من الذاكرة المؤقتة
            high_quality_entries = []  # يمكن تطوير هذا لاحقاً
            knowledge_updates = self.knowledge_base.update_from_cache(high_quality_entries)
            optimization_results['knowledge_updates'] = {'new_entries': knowledge_updates}
            
            # 3. تطبيق تحسينات التعلم
            suggestions = self.learning_system.get_improvement_suggestions()
            optimization_results['learning_improvements'] = {
                'suggestions_count': len(suggestions),
                'high_priority_suggestions': [s for s in suggestions if s['priority'] == 'high']
            }
            
            # 4. حساب المكاسب في الأداء
            stats = self.get_comprehensive_stats()
            optimization_results['performance_gains'] = {
                'cost_efficiency': stats['performance_overview']['cost_efficiency'],
                'response_efficiency': stats['performance_overview']['cache_hit_rate'] + stats['performance_overview']['local_knowledge_hit_rate'],
                'user_satisfaction': stats['performance_overview']['user_satisfaction']
            }
            
            logger.info("تم تحسين النظام بنجاح")
            return optimization_results
            
        except Exception as e:
            logger.error(f"خطأ في تحسين النظام: {e}")
            return optimization_results
    
    def export_system_data(self, export_dir: str = "/home/ubuntu/system_export"):
        """تصدير بيانات النظام"""
        try:
            os.makedirs(export_dir, exist_ok=True)
            
            # تصدير إحصائيات شاملة
            stats = self.get_comprehensive_stats()
            with open(f"{export_dir}/comprehensive_stats.json", 'w', encoding='utf-8') as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
            
            # تصدير قاعدة المعرفة
            self.knowledge_base._save_knowledge()
            
            # تصدير بيانات التعلم
            self.learning_system.export_learning_data(f"{export_dir}/learning_data.json")
            
            # تصدير قاعدة المعرفة المتراكمة
            self.cache_system.export_knowledge_base(f"{export_dir}/accumulated_knowledge.json")
            
            logger.info(f"تم تصدير بيانات النظام إلى {export_dir}")
            return True
            
        except Exception as e:
            logger.error(f"خطأ في تصدير بيانات النظام: {e}")
            return False

# مثال على الاستخدام
if __name__ == "__main__":
    # إنشاء النموذج المحسن
    enhanced_model = EnhancedLegalAIModel()
    
    # مثال على استفسار
    query = "ما هي شروط تأسيس شركة تأجير سيارات في السعودية؟"
    country = "saudi_arabia"
    
    print("معالجة الاستفسار...")
    result = enhanced_model.generate_legal_advice(query, country)
    
    print(f"المصدر: {result['source']}")
    print(f"وقت الاستجابة: {result['response_time']:.2f} ثانية")
    print(f"الثقة: {result['confidence']:.2f}")
    print(f"الإجابة: {result['advice'][:200]}...")
    
    # تسجيل تقييم المستخدم
    enhanced_model.record_user_feedback(query, country, 4, "إجابة مفيدة وواضحة")
    
    # عرض الإحصائيات
    stats = enhanced_model.get_comprehensive_stats()
    print(f"\nإحصائيات الأداء:")
    print(f"معدل الكفاءة: {stats['performance_overview']['cost_efficiency']:.1f}%")
    print(f"رضا المستخدمين: {stats['performance_overview']['user_satisfaction']:.1f}%")
    print(f"التوفير في التكلفة: ${stats['performance_overview']['total_cost_saved']:.4f}")


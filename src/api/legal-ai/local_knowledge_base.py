#!/usr/bin/env python3
"""
قاعدة المعرفة المحلية المحسنة للمستشار القانوني
تتضمن إجابات سريعة للاستفسارات الشائعة بدون الحاجة لـ API
"""

import json
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime
import logging
from pathlib import Path

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class KnowledgeEntry:
    """عنصر في قاعدة المعرفة"""
    id: str
    question_patterns: List[str]
    answer: str
    country: str
    category: str
    keywords: List[str]
    confidence: float
    last_updated: datetime
    usage_count: int = 0

class LocalKnowledgeBase:
    """قاعدة المعرفة المحلية للإجابات السريعة"""
    
    def __init__(self, knowledge_file: str = "local_knowledge.json"):
        self.knowledge_file = knowledge_file
        self.knowledge_entries: Dict[str, KnowledgeEntry] = {}
        self.category_index: Dict[str, List[str]] = {}
        self.keyword_index: Dict[str, List[str]] = {}
        
        self._load_predefined_knowledge()
        self._build_indexes()
    
    def _load_predefined_knowledge(self):
        """تحميل المعرفة المحددة مسبقاً"""
        
        # المعرفة الأساسية للسعودية
        saudi_knowledge = [
            {
                'id': 'sa_company_establishment',
                'question_patterns': [
                    r'.*شروط.*تأسيس.*شركة.*تأجير.*سيارات.*السعودية.*',
                    r'.*كيف.*أسس.*شركة.*تأجير.*سيارات.*السعودية.*',
                    r'.*متطلبات.*إنشاء.*شركة.*تأجير.*السعودية.*'
                ],
                'answer': '''**شروط تأسيس شركة تأجير السيارات في السعودية:**

**المتطلبات الأساسية:**
1. **السجل التجاري**: الحصول على سجل تجاري من وزارة التجارة
2. **الترخيص من الهيئة العامة للنقل**: ترخيص مزاولة نشاط تأجير السيارات
3. **رأس المال**: حد أدنى 500,000 ريال سعودي
4. **المقر**: مقر ثابت ومناسب للنشاط

**الوثائق المطلوبة:**
- صورة من الهوية الوطنية للمؤسس
- عقد إيجار أو ملكية المقر
- شهادة من التأمينات الاجتماعية
- شهادة الزكاة والدخل

**الشروط التشغيلية:**
- التأمين الشامل على جميع المركبات
- الفحص الدوري للمركبات
- الالتزام بلوائح السلامة والأمان

**المدة الزمنية**: 2-4 أسابيع تقريباً
**الرسوم**: تختلف حسب حجم الأسطول ونوع الترخيص''',
                'country': 'saudi_arabia',
                'category': 'company_establishment',
                'keywords': ['شروط', 'تأسيس', 'شركة', 'تأجير', 'سيارات', 'السعودية'],
                'confidence': 0.95
            },
            {
                'id': 'sa_limousine_license',
                'question_patterns': [
                    r'.*ترخيص.*ليموزين.*السعودية.*',
                    r'.*شروط.*ليموزين.*السعودية.*',
                    r'.*متطلبات.*ليموزين.*السعودية.*'
                ],
                'answer': '''**ترخيص الليموزين في السعودية:**

**الشروط الأساسية:**
1. **الجنسية السعودية** للمالك أو شراكة مع سعودي
2. **لوحات ليموزين خاصة** من إدارة المرور
3. **عمر السيارة**: لا يزيد عن 3 سنوات عند الترخيص الأول
4. **المواصفات**: سيارات فاخرة بمواصفات محددة

**المتطلبات:**
- ترخيص من الهيئة العامة للنقل
- التأمين الشامل
- الفحص الفني الدوري
- رخصة قيادة عامة للسائق

**الرسوم السنوية:**
- رسوم الترخيص: 2,000 ريال
- رسوم اللوحات: 500 ريال
- التأمين: حسب قيمة السيارة

**ملاحظة مهمة**: يُمنع استخدام سيارات الليموزين لأغراض أخرى غير النقل المرخص''',
                'country': 'saudi_arabia',
                'category': 'limousine_license',
                'keywords': ['ترخيص', 'ليموزين', 'السعودية', 'لوحات'],
                'confidence': 0.92
            },
            {
                'id': 'sa_traffic_penalties',
                'question_patterns': [
                    r'.*عقوبات.*مرور.*السعودية.*',
                    r'.*غرامات.*مرور.*السعودية.*',
                    r'.*مخالفات.*مرور.*السعودية.*'
                ],
                'answer': '''**العقوبات المرورية الجديدة في السعودية:**

**المخالفات الكبرى:**
- **تجاوز الإشارة الحمراء**: 3,000 ريال + 12 نقطة
- **القيادة بسرعة مفرطة**: 1,500-3,000 ريال + 6-12 نقطة
- **القيادة تحت تأثير المخدرات**: 5,000 ريال + سجن + إلغاء الرخصة

**المخالفات المتوسطة:**
- **عدم ربط حزام الأمان**: 150 ريال + نقطتان
- **استخدام الهاتف أثناء القيادة**: 500 ريال + 4 نقاط
- **عدم إعطاء أولوية المرور**: 500 ريال + 3 نقاط

**نظام النقاط:**
- 12 نقطة: إيقاف الرخصة شهر
- 24 نقطة: إيقاف الرخصة 3 أشهر
- 36 نقطة: إيقاف الرخصة 6 أشهر

**للشركات**: مضاعفة الغرامة + مسؤولية تضامنية عن مخالفات السائقين''',
                'country': 'saudi_arabia',
                'category': 'traffic_penalties',
                'keywords': ['عقوبات', 'مرور', 'غرامات', 'مخالفات', 'السعودية'],
                'confidence': 0.90
            }
        ]
        
        # المعرفة الأساسية لقطر
        qatar_knowledge = [
            {
                'id': 'qa_company_establishment',
                'question_patterns': [
                    r'.*شروط.*تأسيس.*شركة.*تأجير.*سيارات.*قطر.*',
                    r'.*كيف.*أسس.*شركة.*تأجير.*سيارات.*قطر.*'
                ],
                'answer': '''**شروط تأسيس شركة تأجير السيارات في قطر:**

**المتطلبات الأساسية:**
1. **الجنسية القطرية**: المؤسس يجب أن يكون قطري الجنسية
2. **السجل التجاري**: من وزارة التجارة والصناعة
3. **ترخيص من وزارة المواصلات**: ترخيص مزاولة النشاط
4. **رأس المال**: حد أدنى 200,000 ريال قطري

**الشروط الخاصة:**
- **حظر تأجير السيارات لغير القطريين** في بعض الفئات
- **عمر السيارات**: لا يزيد عن 5 سنوات
- **التأمين الشامل** إجباري على جميع المركبات

**الوثائق المطلوبة:**
- شهادة الجنسية القطرية
- البطاقة الشخصية
- عقد إيجار المقر
- شهادة عدم محكومية

**المدة الزمنية**: 3-6 أسابيع
**الجهات المختصة**: وزارة المواصلات ووزارة التجارة''',
                'country': 'qatar',
                'category': 'company_establishment',
                'keywords': ['شروط', 'تأسيس', 'شركة', 'تأجير', 'سيارات', 'قطر'],
                'confidence': 0.88
            },
            {
                'id': 'qa_limousine_license',
                'question_patterns': [
                    r'.*ترخيص.*ليموزين.*قطر.*',
                    r'.*شروط.*ليموزين.*قطر.*'
                ],
                'answer': '''**ترخيص الليموزين في قطر:**

**الشروط الأساسية:**
1. **الجنسية القطرية** للمالك
2. **لوحات ليموزين خاصة** (أرقام مميزة)
3. **عمر السيارة**: لا يزيد عن سنتين عند الترخيص الأول
4. **حظر تأجير سيارات غير مملوكة**

**المتطلبات التقنية:**
- سيارات فاخرة بمواصفات عالية
- نظام تتبع GPS إجباري
- التأمين الشامل ضد الغير
- الفحص الفني كل 6 أشهر

**القوانين المطبقة:**
- مرسوم بقانون رقم (19) لسنة 2007 في شأن المرور
- قرار وزير المواصلات رقم (13) لسنة 2024

**الرسوم**: تختلف حسب نوع السيارة وحجم الأسطول''',
                'country': 'qatar',
                'category': 'limousine_license',
                'keywords': ['ترخيص', 'ليموزين', 'قطر', 'لوحات'],
                'confidence': 0.85
            }
        ]
        
        # المعرفة الأساسية للكويت
        kuwait_knowledge = [
            {
                'id': 'kw_company_establishment',
                'question_patterns': [
                    r'.*شروط.*تأسيس.*شركة.*تأجير.*سيارات.*الكويت.*',
                    r'.*كيف.*أسس.*شركة.*تأجير.*سيارات.*الكويت.*'
                ],
                'answer': '''**شروط تأسيس شركة تأجير السيارات في الكويت:**

**المتطلبات الأساسية:**
1. **الجنسية الكويتية** أو شراكة مع كويتي (51%)
2. **السجل التجاري**: من وزارة التجارة والصناعة
3. **ترخيص من بلدية الكويت**: ترخيص مزاولة النشاط
4. **رأس المال**: حد أدنى 10,000 دينار كويتي

**الشروط الجديدة (2025):**
- **حظر استخدام الكمبيالات** في عقود التأجير
- **تغليظ العقوبات** على المخالفات المرورية
- **التأمين الإجباري** ضد الغير

**الوثائق المطلوبة:**
- شهادة الجنسية الكويتية
- البطاقة المدنية
- عقد تأسيس الشركة
- شهادة عدم محكومية

**الجهات المختصة:**
- وزارة التجارة والصناعة
- بلدية الكويت
- الإدارة العامة للمرور''',
                'country': 'kuwait',
                'category': 'company_establishment',
                'keywords': ['شروط', 'تأسيس', 'شركة', 'تأجير', 'سيارات', 'الكويت'],
                'confidence': 0.87
            },
            {
                'id': 'kw_traffic_penalties_2025',
                'question_patterns': [
                    r'.*عقوبات.*مرور.*الكويت.*2025.*',
                    r'.*قانون.*مرور.*جديد.*الكويت.*',
                    r'.*تعديلات.*مرور.*الكويت.*'
                ],
                'answer': '''**التعديلات الجديدة لقانون المرور الكويتي (2025):**

**مرسوم بقانون رقم 5 لسنة 2025:**

**العقوبات المغلظة:**
- **تجاوز الإشارة الحمراء**: 100 دينار (بدلاً من 30)
- **السرعة الزائدة**: 50-150 دينار حسب المخالفة
- **القيادة تحت تأثير الكحول**: 500 دينار + سجن + إلغاء الرخصة

**العقوبات الجديدة:**
- **استخدام الهاتف أثناء القيادة**: 75 دينار
- **عدم ربط حزام الأمان**: 25 دينار
- **التفحيط والاستعراض**: 200 دينار + حجز السيارة

**للشركات التجارية:**
- مسؤولية تضامنية عن مخالفات السائقين
- إمكانية إيقاف الترخيص التجاري
- غرامات مضاعفة للمخالفات المتكررة

**تاريخ التطبيق**: 1 يناير 2025''',
                'country': 'kuwait',
                'category': 'traffic_penalties',
                'keywords': ['عقوبات', 'مرور', 'الكويت', '2025', 'قانون', 'جديد'],
                'confidence': 0.93
            }
        ]
        
        # دمج جميع المعرفة
        all_knowledge = saudi_knowledge + qatar_knowledge + kuwait_knowledge
        
        # تحويل إلى كائنات KnowledgeEntry
        for item in all_knowledge:
            entry = KnowledgeEntry(
                id=item['id'],
                question_patterns=item['question_patterns'],
                answer=item['answer'],
                country=item['country'],
                category=item['category'],
                keywords=item['keywords'],
                confidence=item['confidence'],
                last_updated=datetime.now()
            )
            self.knowledge_entries[item['id']] = entry
        
        logger.info(f"تم تحميل {len(all_knowledge)} عنصر معرفة أساسي")
    
    def _build_indexes(self):
        """بناء فهارس للبحث السريع"""
        self.category_index.clear()
        self.keyword_index.clear()
        
        for entry_id, entry in self.knowledge_entries.items():
            # فهرس الفئات
            if entry.category not in self.category_index:
                self.category_index[entry.category] = []
            self.category_index[entry.category].append(entry_id)
            
            # فهرس الكلمات المفتاحية
            for keyword in entry.keywords:
                if keyword not in self.keyword_index:
                    self.keyword_index[keyword] = []
                self.keyword_index[keyword].append(entry_id)
    
    def search_knowledge(self, query: str, country: str) -> Optional[Dict[str, Any]]:
        """البحث في قاعدة المعرفة المحلية"""
        query_lower = query.lower()
        best_match = None
        best_score = 0.0
        
        # البحث في الإدخالات المناسبة للدولة
        relevant_entries = [
            entry for entry in self.knowledge_entries.values()
            if entry.country == country
        ]
        
        for entry in relevant_entries:
            score = self._calculate_match_score(query_lower, entry)
            
            if score > best_score and score >= 0.7:  # عتبة الثقة
                best_score = score
                best_match = entry
        
        if best_match:
            # تحديث عداد الاستخدام
            best_match.usage_count += 1
            
            logger.info(f"تم العثور على إجابة محلية: {best_match.id} (Score: {best_score:.2f})")
            
            return {
                'id': best_match.id,
                'answer': best_match.answer,
                'confidence': best_match.confidence,
                'category': best_match.category,
                'source': 'local_knowledge',
                'match_score': best_score
            }
        
        return None
    
    def _calculate_match_score(self, query: str, entry: KnowledgeEntry) -> float:
        """حساب درجة التطابق بين الاستفسار والمعرفة"""
        total_score = 0.0
        
        # 1. التحقق من الأنماط (وزن 40%)
        pattern_score = 0.0
        for pattern in entry.question_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                pattern_score = 1.0
                break
        total_score += pattern_score * 0.4
        
        # 2. التحقق من الكلمات المفتاحية (وزن 35%)
        keyword_matches = 0
        for keyword in entry.keywords:
            if keyword.lower() in query:
                keyword_matches += 1
        
        if len(entry.keywords) > 0:
            keyword_score = keyword_matches / len(entry.keywords)
            total_score += keyword_score * 0.35
        
        # 3. التشابه النصي العام (وزن 25%)
        query_words = set(query.split())
        entry_words = set()
        for keyword in entry.keywords:
            entry_words.update(keyword.split())
        
        if len(query_words) > 0 and len(entry_words) > 0:
            intersection = len(query_words.intersection(entry_words))
            union = len(query_words.union(entry_words))
            similarity_score = intersection / union if union > 0 else 0
            total_score += similarity_score * 0.25
        
        return total_score
    
    def add_knowledge_entry(self, entry: KnowledgeEntry) -> bool:
        """إضافة عنصر معرفة جديد"""
        try:
            self.knowledge_entries[entry.id] = entry
            self._build_indexes()
            self._save_knowledge()
            logger.info(f"تم إضافة عنصر معرفة جديد: {entry.id}")
            return True
        except Exception as e:
            logger.error(f"خطأ في إضافة عنصر المعرفة: {e}")
            return False
    
    def update_from_cache(self, cache_entries: List[Dict[str, Any]]):
        """تحديث قاعدة المعرفة من الذاكرة المؤقتة"""
        new_entries_count = 0
        
        for cache_entry in cache_entries:
            # تحويل إدخال الذاكرة المؤقتة إلى عنصر معرفة
            if (cache_entry['usage_count'] >= 3 and 
                cache_entry['confidence_score'] >= 0.85):
                
                # استخراج الكلمات المفتاحية
                keywords = self._extract_keywords_from_query(cache_entry['original_query'])
                
                # إنشاء نمط بحث
                pattern = self._create_pattern_from_query(cache_entry['original_query'])
                
                entry_id = f"auto_{cache_entry['query_hash'][:8]}"
                
                if entry_id not in self.knowledge_entries:
                    knowledge_entry = KnowledgeEntry(
                        id=entry_id,
                        question_patterns=[pattern],
                        answer=cache_entry['response'],
                        country=cache_entry['country'],
                        category=cache_entry['query_type'],
                        keywords=keywords,
                        confidence=cache_entry['confidence_score'],
                        last_updated=datetime.now(),
                        usage_count=cache_entry['usage_count']
                    )
                    
                    self.knowledge_entries[entry_id] = knowledge_entry
                    new_entries_count += 1
        
        if new_entries_count > 0:
            self._build_indexes()
            self._save_knowledge()
            logger.info(f"تم إضافة {new_entries_count} عنصر معرفة جديد من الذاكرة المؤقتة")
        
        return new_entries_count
    
    def _extract_keywords_from_query(self, query: str) -> List[str]:
        """استخراج الكلمات المفتاحية من الاستفسار"""
        # كلمات الإيقاف
        stop_words = {
            'في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
            'التي', 'الذي', 'هل', 'ما', 'كيف', 'أين', 'متى', 'لماذا',
            'هو', 'هي', 'أن', 'إن', 'كان', 'كانت', 'يكون', 'تكون'
        }
        
        # تنظيف النص
        words = re.findall(r'\b\w+\b', query)
        keywords = [
            word for word in words 
            if len(word) > 2 and word.lower() not in stop_words
        ]
        
        return keywords[:6]  # أول 6 كلمات مفتاحية
    
    def _create_pattern_from_query(self, query: str) -> str:
        """إنشاء نمط بحث من الاستفسار"""
        keywords = self._extract_keywords_from_query(query)
        if len(keywords) >= 2:
            return '.*' + '.*'.join(keywords[:3]) + '.*'
        else:
            return f'.*{query[:20]}.*'
    
    def get_knowledge_stats(self) -> Dict[str, Any]:
        """الحصول على إحصائيات قاعدة المعرفة"""
        total_entries = len(self.knowledge_entries)
        
        # إحصائيات حسب الدولة
        country_stats = {}
        category_stats = {}
        
        for entry in self.knowledge_entries.values():
            # إحصائيات الدول
            if entry.country not in country_stats:
                country_stats[entry.country] = 0
            country_stats[entry.country] += 1
            
            # إحصائيات الفئات
            if entry.category not in category_stats:
                category_stats[entry.category] = 0
            category_stats[entry.category] += 1
        
        # أكثر المعرفة استخداماً
        most_used = sorted(
            self.knowledge_entries.values(),
            key=lambda x: x.usage_count,
            reverse=True
        )[:5]
        
        return {
            'total_entries': total_entries,
            'country_distribution': country_stats,
            'category_distribution': category_stats,
            'most_used_entries': [
                {
                    'id': entry.id,
                    'category': entry.category,
                    'country': entry.country,
                    'usage_count': entry.usage_count,
                    'confidence': entry.confidence
                }
                for entry in most_used
            ],
            'average_confidence': sum(e.confidence for e in self.knowledge_entries.values()) / total_entries if total_entries > 0 else 0
        }
    
    def _save_knowledge(self):
        """حفظ قاعدة المعرفة في ملف"""
        try:
            knowledge_data = {
                'last_updated': datetime.now().isoformat(),
                'total_entries': len(self.knowledge_entries),
                'entries': {}
            }
            
            for entry_id, entry in self.knowledge_entries.items():
                knowledge_data['entries'][entry_id] = {
                    'question_patterns': entry.question_patterns,
                    'answer': entry.answer,
                    'country': entry.country,
                    'category': entry.category,
                    'keywords': entry.keywords,
                    'confidence': entry.confidence,
                    'last_updated': entry.last_updated.isoformat(),
                    'usage_count': entry.usage_count
                }
            
            with open(self.knowledge_file, 'w', encoding='utf-8') as f:
                json.dump(knowledge_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"تم حفظ قاعدة المعرفة: {len(self.knowledge_entries)} عنصر")
            
        except Exception as e:
            logger.error(f"خطأ في حفظ قاعدة المعرفة: {e}")
    
    def load_knowledge(self):
        """تحميل قاعدة المعرفة من ملف"""
        try:
            if Path(self.knowledge_file).exists():
                with open(self.knowledge_file, 'r', encoding='utf-8') as f:
                    knowledge_data = json.load(f)
                
                self.knowledge_entries.clear()
                
                for entry_id, entry_data in knowledge_data.get('entries', {}).items():
                    entry = KnowledgeEntry(
                        id=entry_id,
                        question_patterns=entry_data['question_patterns'],
                        answer=entry_data['answer'],
                        country=entry_data['country'],
                        category=entry_data['category'],
                        keywords=entry_data['keywords'],
                        confidence=entry_data['confidence'],
                        last_updated=datetime.fromisoformat(entry_data['last_updated']),
                        usage_count=entry_data.get('usage_count', 0)
                    )
                    self.knowledge_entries[entry_id] = entry
                
                self._build_indexes()
                logger.info(f"تم تحميل {len(self.knowledge_entries)} عنصر معرفة من الملف")
                
        except Exception as e:
            logger.error(f"خطأ في تحميل قاعدة المعرفة: {e}")

# مثال على الاستخدام
if __name__ == "__main__":
    # إنشاء قاعدة المعرفة المحلية
    knowledge_base = LocalKnowledgeBase()
    
    # مثال على البحث
    query = "ما هي شروط تأسيس شركة تأجير سيارات في السعودية؟"
    country = "saudi_arabia"
    
    result = knowledge_base.search_knowledge(query, country)
    
    if result:
        print("تم العثور على إجابة محلية!")
        print(f"الفئة: {result['category']}")
        print(f"درجة التطابق: {result['match_score']:.2f}")
        print(f"الإجابة: {result['answer'][:200]}...")
    else:
        print("لم يتم العثور على إجابة محلية")
    
    # عرض الإحصائيات
    stats = knowledge_base.get_knowledge_stats()
    print(f"\nإحصائيات قاعدة المعرفة:")
    print(f"إجمالي الإدخالات: {stats['total_entries']}")
    print(f"توزيع الدول: {stats['country_distribution']}")
    print(f"متوسط الثقة: {stats['average_confidence']:.2f}")


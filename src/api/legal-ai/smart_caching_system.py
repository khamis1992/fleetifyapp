#!/usr/bin/env python3
"""
نظام Caching ذكي للمستشار القانوني
يوفر ذاكرة متقدمة وتعلم تدريجي لتقليل التكلفة وتحسين الأداء
"""

import hashlib
import json
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging
from dataclasses import dataclass, asdict
from pathlib import Path
import re

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CacheEntry:
    """بنية بيانات لعنصر الذاكرة المؤقتة"""
    query_hash: str
    original_query: str
    response: str
    country: str
    query_type: str
    confidence_score: float
    usage_count: int
    created_at: datetime
    last_used: datetime
    tokens_saved: int
    cost_saved: float

@dataclass
class QueryPattern:
    """نمط الاستفسار للتعلم التدريجي"""
    pattern: str
    category: str
    frequency: int
    template_response: str
    keywords: List[str]

class SmartCachingSystem:
    """نظام Caching ذكي مع تعلم تدريجي"""
    
    def __init__(self, db_path: str = "legal_cache.db"):
        self.db_path = db_path
        self.cache_hit_threshold = 0.85  # عتبة التشابه للاعتبار كـ cache hit
        self.max_cache_age_days = 30  # أقصى عمر للذاكرة المؤقتة
        self.min_confidence_score = 0.7  # أقل نتيجة ثقة للحفظ
        
        # إحصائيات الأداء
        self.stats = {
            'total_queries': 0,
            'cache_hits': 0,
            'api_calls': 0,
            'tokens_saved': 0,
            'cost_saved': 0.0
        }
        
        self._init_database()
        self._load_common_patterns()
    
    def _init_database(self):
        """تهيئة قاعدة البيانات"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # جدول الذاكرة المؤقتة
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cache_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_hash TEXT UNIQUE NOT NULL,
                original_query TEXT NOT NULL,
                response TEXT NOT NULL,
                country TEXT NOT NULL,
                query_type TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                usage_count INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tokens_saved INTEGER DEFAULT 0,
                cost_saved REAL DEFAULT 0.0
            )
        ''')
        
        # جدول أنماط الاستفسارات
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS query_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern TEXT NOT NULL,
                category TEXT NOT NULL,
                frequency INTEGER DEFAULT 1,
                template_response TEXT,
                keywords TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # جدول إحصائيات الأداء
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                total_queries INTEGER DEFAULT 0,
                cache_hits INTEGER DEFAULT 0,
                api_calls INTEGER DEFAULT 0,
                tokens_saved INTEGER DEFAULT 0,
                cost_saved REAL DEFAULT 0.0,
                UNIQUE(date)
            )
        ''')
        
        # فهارس لتحسين الأداء
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_query_hash ON cache_entries(query_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_country ON cache_entries(country)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_query_type ON cache_entries(query_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_last_used ON cache_entries(last_used)')
        
        conn.commit()
        conn.close()
        logger.info("تم تهيئة قاعدة البيانات بنجاح")
    
    def _load_common_patterns(self):
        """تحميل الأنماط الشائعة للاستفسارات"""
        self.common_patterns = [
            {
                'pattern': r'.*شروط.*تأسيس.*شركة.*تأجير.*سيارات.*',
                'category': 'company_establishment',
                'template': 'شروط تأسيس شركة تأجير السيارات',
                'keywords': ['شروط', 'تأسيس', 'شركة', 'تأجير', 'سيارات']
            },
            {
                'pattern': r'.*ترخيص.*ليموزين.*',
                'category': 'limousine_license',
                'template': 'متطلبات ترخيص الليموزين',
                'keywords': ['ترخيص', 'ليموزين', 'متطلبات']
            },
            {
                'pattern': r'.*عقوبات.*مرور.*',
                'category': 'traffic_penalties',
                'template': 'العقوبات المرورية',
                'keywords': ['عقوبات', 'مرور', 'غرامات', 'مخالفات']
            },
            {
                'pattern': r'.*تحليل.*عقد.*تأجير.*',
                'category': 'contract_analysis',
                'template': 'تحليل عقد تأجير السيارات',
                'keywords': ['تحليل', 'عقد', 'تأجير', 'مراجعة']
            }
        ]
    
    def _generate_query_hash(self, query: str, country: str) -> str:
        """توليد hash فريد للاستفسار"""
        # تنظيف النص وتوحيده
        normalized_query = self._normalize_query(query)
        combined = f"{normalized_query}_{country}"
        return hashlib.md5(combined.encode('utf-8')).hexdigest()
    
    def _normalize_query(self, query: str) -> str:
        """تنظيف وتوحيد النص للمقارنة"""
        # إزالة علامات الترقيم والمسافات الزائدة
        query = re.sub(r'[^\w\s]', '', query)
        query = re.sub(r'\s+', ' ', query)
        return query.strip().lower()
    
    def _calculate_similarity(self, query1: str, query2: str) -> float:
        """حساب التشابه بين استفسارين"""
        # تنظيف النصوص
        q1_normalized = self._normalize_query(query1)
        q2_normalized = self._normalize_query(query2)
        
        # تقسيم إلى كلمات
        words1 = set(q1_normalized.split())
        words2 = set(q2_normalized.split())
        
        # حساب Jaccard similarity
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
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
    
    def _estimate_tokens(self, text: str) -> int:
        """تقدير عدد الـ tokens في النص"""
        # تقدير تقريبي: كلمة واحدة = 1.3 token للعربية
        words = len(text.split())
        return int(words * 1.3)
    
    def _calculate_cost_saved(self, tokens: int) -> float:
        """حساب التكلفة المحفوظة"""
        # سعر OpenAI GPT-4.1-mini: $0.002 per 1K tokens
        return (tokens / 1000) * 0.002
    
    def check_cache(self, query: str, country: str) -> Optional[Dict[str, Any]]:
        """البحث في الذاكرة المؤقتة عن استفسار مشابه"""
        self.stats['total_queries'] += 1
        
        # البحث بالـ hash أولاً (مطابقة تامة)
        query_hash = self._generate_query_hash(query, country)
        exact_match = self._get_exact_match(query_hash)
        
        if exact_match:
            self._update_usage(query_hash)
            self.stats['cache_hits'] += 1
            logger.info(f"Cache hit (exact): {query[:50]}...")
            return exact_match
        
        # البحث عن مطابقة تقريبية
        similar_match = self._find_similar_query(query, country)
        
        if similar_match:
            self._update_usage(similar_match['query_hash'])
            self.stats['cache_hits'] += 1
            logger.info(f"Cache hit (similar): {query[:50]}...")
            return similar_match
        
        logger.info(f"Cache miss: {query[:50]}...")
        return None
    
    def _get_exact_match(self, query_hash: str) -> Optional[Dict[str, Any]]:
        """البحث عن مطابقة تامة في الذاكرة المؤقتة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM cache_entries 
            WHERE query_hash = ? AND last_used > datetime('now', '-{} days')
        '''.format(self.max_cache_age_days), (query_hash,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return self._row_to_dict(result)
        return None
    
    def _find_similar_query(self, query: str, country: str) -> Optional[Dict[str, Any]]:
        """البحث عن استفسار مشابه في الذاكرة المؤقتة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # جلب الاستفسارات من نفس الدولة
        cursor.execute('''
            SELECT * FROM cache_entries 
            WHERE country = ? AND last_used > datetime('now', '-{} days')
            ORDER BY usage_count DESC, confidence_score DESC
            LIMIT 50
        '''.format(self.max_cache_age_days), (country,))
        
        results = cursor.fetchall()
        conn.close()
        
        best_match = None
        best_similarity = 0.0
        
        for row in results:
            cached_query = row[2]  # original_query
            similarity = self._calculate_similarity(query, cached_query)
            
            if similarity > best_similarity and similarity >= self.cache_hit_threshold:
                best_similarity = similarity
                best_match = self._row_to_dict(row)
        
        return best_match
    
    def _row_to_dict(self, row) -> Dict[str, Any]:
        """تحويل صف قاعدة البيانات إلى قاموس"""
        return {
            'id': row[0],
            'query_hash': row[1],
            'original_query': row[2],
            'response': row[3],
            'country': row[4],
            'query_type': row[5],
            'confidence_score': row[6],
            'usage_count': row[7],
            'created_at': row[8],
            'last_used': row[9],
            'tokens_saved': row[10],
            'cost_saved': row[11]
        }
    
    def _update_usage(self, query_hash: str):
        """تحديث إحصائيات الاستخدام"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE cache_entries 
            SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
            WHERE query_hash = ?
        ''', (query_hash,))
        
        conn.commit()
        conn.close()
    
    def store_response(self, query: str, response: str, country: str, 
                      confidence_score: float = 1.0) -> bool:
        """حفظ الاستجابة في الذاكرة المؤقتة"""
        
        if confidence_score < self.min_confidence_score:
            logger.info(f"تم تجاهل الحفظ بسبب انخفاض نتيجة الثقة: {confidence_score}")
            return False
        
        query_hash = self._generate_query_hash(query, country)
        query_type = self._classify_query_type(query)
        
        # حساب الـ tokens والتكلفة المحفوظة
        tokens = self._estimate_tokens(response)
        cost_saved = self._calculate_cost_saved(tokens)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO cache_entries 
                (query_hash, original_query, response, country, query_type, 
                 confidence_score, usage_count, tokens_saved, cost_saved)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
            ''', (query_hash, query, response, country, query_type, 
                  confidence_score, tokens, cost_saved))
            
            conn.commit()
            
            # تحديث الإحصائيات
            self.stats['tokens_saved'] += tokens
            self.stats['cost_saved'] += cost_saved
            
            logger.info(f"تم حفظ الاستجابة: {query[:50]}... (Tokens: {tokens}, Cost: ${cost_saved:.4f})")
            return True
            
        except sqlite3.Error as e:
            logger.error(f"خطأ في حفظ الاستجابة: {e}")
            return False
        finally:
            conn.close()
    
    def learn_from_query(self, query: str, response: str, country: str):
        """التعلم من الاستفسار وتحديث الأنماط"""
        # تحليل نمط الاستفسار
        pattern_found = False
        
        for pattern_info in self.common_patterns:
            if re.search(pattern_info['pattern'], query, re.IGNORECASE):
                self._update_pattern_frequency(pattern_info['category'])
                pattern_found = True
                break
        
        # إذا لم يتم العثور على نمط، إنشاء نمط جديد
        if not pattern_found:
            self._create_new_pattern(query, response, country)
    
    def _update_pattern_frequency(self, category: str):
        """تحديث تكرار النمط"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE query_patterns 
            SET frequency = frequency + 1, updated_at = CURRENT_TIMESTAMP
            WHERE category = ?
        ''', (category,))
        
        if cursor.rowcount == 0:
            # إنشاء نمط جديد إذا لم يكن موجوداً
            cursor.execute('''
                INSERT INTO query_patterns (pattern, category, frequency)
                VALUES (?, ?, 1)
            ''', (f'.*{category}.*', category))
        
        conn.commit()
        conn.close()
    
    def _create_new_pattern(self, query: str, response: str, country: str):
        """إنشاء نمط جديد من الاستفسار"""
        # استخراج الكلمات المفتاحية
        keywords = self._extract_keywords(query)
        
        if len(keywords) >= 2:  # على الأقل كلمتان مفتاحيتان
            pattern = '.*' + '.*'.join(keywords) + '.*'
            category = '_'.join(keywords[:2])  # أول كلمتين كفئة
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR IGNORE INTO query_patterns 
                (pattern, category, frequency, template_response, keywords)
                VALUES (?, ?, 1, ?, ?)
            ''', (pattern, category, response[:200], json.dumps(keywords)))
            
            conn.commit()
            conn.close()
            
            logger.info(f"تم إنشاء نمط جديد: {category}")
    
    def _extract_keywords(self, query: str) -> List[str]:
        """استخراج الكلمات المفتاحية من الاستفسار"""
        # كلمات الإيقاف العربية
        stop_words = {
            'في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
            'التي', 'الذي', 'التي', 'هل', 'ما', 'كيف', 'أين', 'متى', 'لماذا',
            'هو', 'هي', 'أن', 'إن', 'كان', 'كانت', 'يكون', 'تكون', 'لا', 'لم', 'لن'
        }
        
        # تنظيف النص واستخراج الكلمات
        words = re.findall(r'\b\w+\b', query)
        keywords = [word for word in words if len(word) > 2 and word not in stop_words]
        
        return keywords[:5]  # أول 5 كلمات مفتاحية
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """الحصول على إحصائيات الذاكرة المؤقتة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # إحصائيات عامة
        cursor.execute('SELECT COUNT(*) FROM cache_entries')
        total_entries = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(usage_count) FROM cache_entries')
        total_usage = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(tokens_saved) FROM cache_entries')
        total_tokens_saved = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(cost_saved) FROM cache_entries')
        total_cost_saved = cursor.fetchone()[0] or 0.0
        
        # أكثر الاستفسارات استخداماً
        cursor.execute('''
            SELECT original_query, usage_count, country 
            FROM cache_entries 
            ORDER BY usage_count DESC 
            LIMIT 5
        ''')
        top_queries = cursor.fetchall()
        
        conn.close()
        
        # حساب معدل الإصابة
        hit_rate = (self.stats['cache_hits'] / self.stats['total_queries'] * 100) if self.stats['total_queries'] > 0 else 0
        
        return {
            'total_entries': total_entries,
            'total_usage': total_usage,
            'total_tokens_saved': total_tokens_saved,
            'total_cost_saved': total_cost_saved,
            'hit_rate': hit_rate,
            'session_stats': self.stats,
            'top_queries': [
                {
                    'query': query[:100] + '...' if len(query) > 100 else query,
                    'usage_count': usage,
                    'country': country
                }
                for query, usage, country in top_queries
            ]
        }
    
    def cleanup_old_entries(self):
        """تنظيف الإدخالات القديمة وغير المستخدمة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # حذف الإدخالات القديمة
        cursor.execute('''
            DELETE FROM cache_entries 
            WHERE last_used < datetime('now', '-{} days')
        '''.format(self.max_cache_age_days))
        
        old_entries_deleted = cursor.rowcount
        
        # حذف الإدخالات قليلة الاستخدام والثقة المنخفضة
        cursor.execute('''
            DELETE FROM cache_entries 
            WHERE usage_count = 1 AND confidence_score < 0.8 
            AND created_at < datetime('now', '-7 days')
        ''')
        
        low_quality_deleted = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        logger.info(f"تم حذف {old_entries_deleted} إدخال قديم و {low_quality_deleted} إدخال منخفض الجودة")
        
        return {
            'old_entries_deleted': old_entries_deleted,
            'low_quality_deleted': low_quality_deleted
        }
    
    def export_knowledge_base(self, file_path: str):
        """تصدير قاعدة المعرفة المتراكمة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT original_query, response, country, query_type, 
                   usage_count, confidence_score
            FROM cache_entries 
            WHERE usage_count > 1 AND confidence_score > 0.8
            ORDER BY usage_count DESC, confidence_score DESC
        ''')
        
        entries = cursor.fetchall()
        conn.close()
        
        knowledge_base = {
            'exported_at': datetime.now().isoformat(),
            'total_entries': len(entries),
            'entries': [
                {
                    'query': entry[0],
                    'response': entry[1],
                    'country': entry[2],
                    'query_type': entry[3],
                    'usage_count': entry[4],
                    'confidence_score': entry[5]
                }
                for entry in entries
            ]
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(knowledge_base, f, ensure_ascii=False, indent=2)
        
        logger.info(f"تم تصدير {len(entries)} إدخال إلى {file_path}")
        return len(entries)

# مثال على الاستخدام
if __name__ == "__main__":
    # إنشاء نظام الذاكرة الذكية
    cache_system = SmartCachingSystem()
    
    # مثال على استفسار
    query = "ما هي شروط تأسيس شركة تأجير سيارات في السعودية؟"
    country = "saudi_arabia"
    
    # البحث في الذاكرة المؤقتة
    cached_result = cache_system.check_cache(query, country)
    
    if cached_result:
        print("تم العثور على إجابة محفوظة!")
        print(cached_result['response'][:200] + "...")
    else:
        print("لم يتم العثور على إجابة محفوظة، سيتم استدعاء API")
        
        # محاكاة استجابة API
        response = "لتأسيس شركة تأجير سيارات في السعودية، يجب الحصول على..."
        
        # حفظ الاستجابة
        cache_system.store_response(query, response, country, confidence_score=0.9)
        
        # التعلم من الاستفسار
        cache_system.learn_from_query(query, response, country)
    
    # عرض الإحصائيات
    stats = cache_system.get_cache_stats()
    print(f"\nإحصائيات الذاكرة المؤقتة:")
    print(f"إجمالي الإدخالات: {stats['total_entries']}")
    print(f"معدل الإصابة: {stats['hit_rate']:.1f}%")
    print(f"التكلفة المحفوظة: ${stats['total_cost_saved']:.4f}")


#!/usr/bin/env python3
"""
نظام التعلم التدريجي للمستشار القانوني
يتعلم من تفاعلات المستخدمين ويحسن الأداء تلقائياً
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
import logging
from collections import defaultdict, Counter
import re
import numpy as np
from pathlib import Path

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class UserFeedback:
    """تقييم المستخدم للاستجابة"""
    query_hash: str
    rating: int  # 1-5
    feedback_text: Optional[str]
    country: str
    query_type: str
    timestamp: datetime
    user_id: Optional[str] = None

@dataclass
class LearningPattern:
    """نمط تعلم مكتشف"""
    pattern_id: str
    pattern_type: str  # 'query_similarity', 'response_quality', 'user_preference'
    pattern_data: Dict[str, Any]
    confidence: float
    frequency: int
    last_updated: datetime

@dataclass
class PerformanceMetric:
    """مقياس أداء"""
    metric_name: str
    value: float
    country: str
    query_type: str
    date: datetime

class AdaptiveLearningSystem:
    """نظام التعلم التدريجي والتكيفي"""
    
    def __init__(self, db_path: str = "learning_system.db"):
        self.db_path = db_path
        self.learning_rate = 0.1
        self.min_feedback_count = 5  # الحد الأدنى للتقييمات قبل التعلم
        self.confidence_threshold = 0.7
        
        # إحصائيات التعلم
        self.learning_stats = {
            'patterns_discovered': 0,
            'improvements_made': 0,
            'user_satisfaction': 0.0,
            'response_quality_trend': []
        }
        
        self._init_database()
        self._load_learning_patterns()
    
    def _init_database(self):
        """تهيئة قاعدة بيانات التعلم"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # جدول تقييمات المستخدمين
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_hash TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                feedback_text TEXT,
                country TEXT NOT NULL,
                query_type TEXT NOT NULL,
                user_id TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # جدول أنماط التعلم
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_id TEXT UNIQUE NOT NULL,
                pattern_type TEXT NOT NULL,
                pattern_data TEXT NOT NULL,
                confidence REAL NOT NULL,
                frequency INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # جدول مقاييس الأداء
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT NOT NULL,
                value REAL NOT NULL,
                country TEXT NOT NULL,
                query_type TEXT NOT NULL,
                date DATE NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # جدول تحسينات النظام
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_improvements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                improvement_type TEXT NOT NULL,
                description TEXT NOT NULL,
                impact_score REAL NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metrics_before TEXT,
                metrics_after TEXT
            )
        ''')
        
        # فهارس للأداء
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_feedback_query_hash ON user_feedback(query_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_feedback_country ON user_feedback(country)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_feedback_rating ON user_feedback(rating)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_patterns_type ON learning_patterns(pattern_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_date ON performance_metrics(date)')
        
        conn.commit()
        conn.close()
        logger.info("تم تهيئة قاعدة بيانات التعلم بنجاح")
    
    def _load_learning_patterns(self):
        """تحميل أنماط التعلم المحفوظة"""
        self.patterns = {}
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM learning_patterns')
        rows = cursor.fetchall()
        
        for row in rows:
            pattern = LearningPattern(
                pattern_id=row[1],
                pattern_type=row[2],
                pattern_data=json.loads(row[3]),
                confidence=row[4],
                frequency=row[5],
                last_updated=datetime.fromisoformat(row[7])
            )
            self.patterns[pattern.pattern_id] = pattern
        
        conn.close()
        logger.info(f"تم تحميل {len(self.patterns)} نمط تعلم")
    
    def record_user_feedback(self, feedback: UserFeedback) -> bool:
        """تسجيل تقييم المستخدم"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO user_feedback 
                (query_hash, rating, feedback_text, country, query_type, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                feedback.query_hash,
                feedback.rating,
                feedback.feedback_text,
                feedback.country,
                feedback.query_type,
                feedback.user_id
            ))
            
            conn.commit()
            conn.close()
            
            # تحليل التقييم والتعلم منه
            self._analyze_feedback(feedback)
            
            logger.info(f"تم تسجيل تقييم المستخدم: {feedback.rating}/5 للاستفسار {feedback.query_hash[:8]}")
            return True
            
        except Exception as e:
            logger.error(f"خطأ في تسجيل تقييم المستخدم: {e}")
            return False
    
    def _analyze_feedback(self, feedback: UserFeedback):
        """تحليل التقييم واستخراج أنماط التعلم"""
        
        # 1. تحليل جودة الاستجابة
        self._analyze_response_quality(feedback)
        
        # 2. تحليل تفضيلات المستخدم
        self._analyze_user_preferences(feedback)
        
        # 3. تحليل الأنماط الجغرافية
        self._analyze_geographical_patterns(feedback)
        
        # 4. تحديث مقاييس الأداء
        self._update_performance_metrics(feedback)
    
    def _analyze_response_quality(self, feedback: UserFeedback):
        """تحليل جودة الاستجابة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # جلب التقييمات السابقة لنفس نوع الاستفسار
        cursor.execute('''
            SELECT rating FROM user_feedback 
            WHERE query_type = ? AND country = ?
            AND timestamp > datetime('now', '-30 days')
        ''', (feedback.query_type, feedback.country))
        
        ratings = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        if len(ratings) >= self.min_feedback_count:
            avg_rating = sum(ratings) / len(ratings)
            
            # إنشاء نمط جودة الاستجابة
            pattern_id = f"quality_{feedback.query_type}_{feedback.country}"
            
            pattern_data = {
                'average_rating': avg_rating,
                'total_ratings': len(ratings),
                'rating_distribution': dict(Counter(ratings)),
                'trend': self._calculate_trend(ratings[-10:]) if len(ratings) >= 10 else 0
            }
            
            confidence = min(len(ratings) / 20, 1.0)  # الثقة تزيد مع عدد التقييمات
            
            self._save_learning_pattern(
                pattern_id=pattern_id,
                pattern_type='response_quality',
                pattern_data=pattern_data,
                confidence=confidence
            )
    
    def _analyze_user_preferences(self, feedback: UserFeedback):
        """تحليل تفضيلات المستخدم"""
        if feedback.feedback_text and len(feedback.feedback_text) > 10:
            # استخراج الكلمات المفتاحية من التقييم النصي
            keywords = self._extract_feedback_keywords(feedback.feedback_text)
            
            if keywords:
                pattern_id = f"preferences_{feedback.country}_{feedback.query_type}"
                
                # جلب التفضيلات السابقة
                existing_pattern = self.patterns.get(pattern_id)
                
                if existing_pattern:
                    # تحديث التفضيلات الموجودة
                    existing_keywords = existing_pattern.pattern_data.get('keywords', {})
                    for keyword in keywords:
                        existing_keywords[keyword] = existing_keywords.get(keyword, 0) + 1
                    
                    pattern_data = existing_pattern.pattern_data
                    pattern_data['keywords'] = existing_keywords
                    pattern_data['total_feedback'] = pattern_data.get('total_feedback', 0) + 1
                else:
                    # إنشاء تفضيلات جديدة
                    pattern_data = {
                        'keywords': {keyword: 1 for keyword in keywords},
                        'total_feedback': 1,
                        'positive_indicators': [],
                        'negative_indicators': []
                    }
                
                # تصنيف التقييم
                if feedback.rating >= 4:
                    pattern_data['positive_indicators'].extend(keywords)
                elif feedback.rating <= 2:
                    pattern_data['negative_indicators'].extend(keywords)
                
                confidence = min(pattern_data['total_feedback'] / 10, 1.0)
                
                self._save_learning_pattern(
                    pattern_id=pattern_id,
                    pattern_type='user_preferences',
                    pattern_data=pattern_data,
                    confidence=confidence
                )
    
    def _analyze_geographical_patterns(self, feedback: UserFeedback):
        """تحليل الأنماط الجغرافية"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # مقارنة الأداء بين الدول
        cursor.execute('''
            SELECT country, AVG(rating) as avg_rating, COUNT(*) as count
            FROM user_feedback 
            WHERE query_type = ?
            AND timestamp > datetime('now', '-30 days')
            GROUP BY country
        ''', (feedback.query_type,))
        
        country_performance = cursor.fetchall()
        conn.close()
        
        if len(country_performance) >= 2:  # على الأقل دولتان للمقارنة
            pattern_id = f"geographical_{feedback.query_type}"
            
            pattern_data = {
                'country_performance': {
                    country: {'avg_rating': avg_rating, 'count': count}
                    for country, avg_rating, count in country_performance
                },
                'best_performing_country': max(country_performance, key=lambda x: x[1])[0],
                'needs_improvement': [
                    country for country, avg_rating, count in country_performance
                    if avg_rating < 3.5 and count >= 5
                ]
            }
            
            confidence = min(sum(count for _, _, count in country_performance) / 50, 1.0)
            
            self._save_learning_pattern(
                pattern_id=pattern_id,
                pattern_type='geographical_patterns',
                pattern_data=pattern_data,
                confidence=confidence
            )
    
    def _extract_feedback_keywords(self, feedback_text: str) -> List[str]:
        """استخراج الكلمات المفتاحية من تقييم المستخدم"""
        # كلمات إيجابية
        positive_words = [
            'ممتاز', 'رائع', 'مفيد', 'واضح', 'شامل', 'دقيق', 'مفصل',
            'سريع', 'مناسب', 'جيد', 'مساعد', 'مفهوم'
        ]
        
        # كلمات سلبية
        negative_words = [
            'سيء', 'غير واضح', 'ناقص', 'خطأ', 'بطيء', 'معقد',
            'غير مفيد', 'غير دقيق', 'مربك', 'صعب'
        ]
        
        keywords = []
        text_lower = feedback_text.lower()
        
        # البحث عن الكلمات الإيجابية والسلبية
        for word in positive_words + negative_words:
            if word in text_lower:
                keywords.append(word)
        
        # استخراج كلمات إضافية
        words = re.findall(r'\b\w+\b', feedback_text)
        important_words = [
            word for word in words
            if len(word) > 3 and word not in ['هذا', 'هذه', 'ذلك', 'تلك']
        ]
        
        keywords.extend(important_words[:3])  # أول 3 كلمات مهمة
        
        return list(set(keywords))  # إزالة التكرار
    
    def _calculate_trend(self, ratings: List[int]) -> float:
        """حساب اتجاه التقييمات (تحسن أم تراجع)"""
        if len(ratings) < 3:
            return 0.0
        
        # حساب الانحدار الخطي البسيط
        x = list(range(len(ratings)))
        y = ratings
        
        n = len(ratings)
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(x[i] * y[i] for i in range(n))
        sum_x2 = sum(x[i] ** 2 for i in range(n))
        
        # معادلة الانحدار: y = mx + b
        if n * sum_x2 - sum_x ** 2 != 0:
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
            return slope
        
        return 0.0
    
    def _save_learning_pattern(self, pattern_id: str, pattern_type: str, 
                              pattern_data: Dict[str, Any], confidence: float):
        """حفظ نمط التعلم"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO learning_patterns 
                (pattern_id, pattern_type, pattern_data, confidence, frequency, last_updated)
                VALUES (?, ?, ?, ?, 
                    COALESCE((SELECT frequency + 1 FROM learning_patterns WHERE pattern_id = ?), 1),
                    CURRENT_TIMESTAMP)
            ''', (pattern_id, pattern_type, json.dumps(pattern_data), confidence, pattern_id))
            
            conn.commit()
            conn.close()
            
            # تحديث الذاكرة المحلية
            pattern = LearningPattern(
                pattern_id=pattern_id,
                pattern_type=pattern_type,
                pattern_data=pattern_data,
                confidence=confidence,
                frequency=1,
                last_updated=datetime.now()
            )
            self.patterns[pattern_id] = pattern
            
            logger.info(f"تم حفظ نمط التعلم: {pattern_id}")
            
        except Exception as e:
            logger.error(f"خطأ في حفظ نمط التعلم: {e}")
    
    def _update_performance_metrics(self, feedback: UserFeedback):
        """تحديث مقاييس الأداء"""
        today = datetime.now().date()
        
        metrics = [
            PerformanceMetric(
                metric_name='user_satisfaction',
                value=feedback.rating / 5.0,
                country=feedback.country,
                query_type=feedback.query_type,
                date=today
            ),
            PerformanceMetric(
                metric_name='response_quality',
                value=1.0 if feedback.rating >= 4 else 0.0,
                country=feedback.country,
                query_type=feedback.query_type,
                date=today
            )
        ]
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for metric in metrics:
            cursor.execute('''
                INSERT INTO performance_metrics 
                (metric_name, value, country, query_type, date)
                VALUES (?, ?, ?, ?, ?)
            ''', (metric.metric_name, metric.value, metric.country, metric.query_type, metric.date))
        
        conn.commit()
        conn.close()
    
    def get_improvement_suggestions(self) -> List[Dict[str, Any]]:
        """الحصول على اقتراحات التحسين"""
        suggestions = []
        
        # 1. تحليل الأنماط منخفضة الأداء
        low_performance_patterns = [
            pattern for pattern in self.patterns.values()
            if (pattern.pattern_type == 'response_quality' and 
                pattern.pattern_data.get('average_rating', 5) < 3.5 and
                pattern.confidence > 0.5)
        ]
        
        for pattern in low_performance_patterns:
            suggestions.append({
                'type': 'quality_improvement',
                'priority': 'high',
                'description': f"تحسين جودة الاستجابات لفئة {pattern.pattern_id}",
                'current_rating': pattern.pattern_data.get('average_rating'),
                'target_rating': 4.0,
                'affected_area': pattern.pattern_id
            })
        
        # 2. تحليل التفضيلات الإيجابية
        preference_patterns = [
            pattern for pattern in self.patterns.values()
            if pattern.pattern_type == 'user_preferences' and pattern.confidence > 0.3
        ]
        
        for pattern in preference_patterns:
            positive_keywords = pattern.pattern_data.get('positive_indicators', [])
            if positive_keywords:
                most_common = Counter(positive_keywords).most_common(3)
                suggestions.append({
                    'type': 'content_enhancement',
                    'priority': 'medium',
                    'description': f"تعزيز المحتوى بالكلمات المفضلة: {', '.join([word for word, _ in most_common])}",
                    'affected_area': pattern.pattern_id,
                    'keywords': most_common
                })
        
        # 3. تحليل الفجوات الجغرافية
        geographical_patterns = [
            pattern for pattern in self.patterns.values()
            if pattern.pattern_type == 'geographical_patterns' and pattern.confidence > 0.4
        ]
        
        for pattern in geographical_patterns:
            needs_improvement = pattern.pattern_data.get('needs_improvement', [])
            if needs_improvement:
                suggestions.append({
                    'type': 'geographical_improvement',
                    'priority': 'medium',
                    'description': f"تحسين المحتوى للدول: {', '.join(needs_improvement)}",
                    'affected_countries': needs_improvement,
                    'best_practice_country': pattern.pattern_data.get('best_performing_country')
                })
        
        # ترتيب الاقتراحات حسب الأولوية
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        suggestions.sort(key=lambda x: priority_order.get(x['priority'], 0), reverse=True)
        
        return suggestions
    
    def apply_improvement(self, improvement_type: str, description: str, 
                         impact_data: Dict[str, Any]) -> bool:
        """تطبيق تحسين على النظام"""
        try:
            # حفظ التحسين في قاعدة البيانات
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO system_improvements 
                (improvement_type, description, impact_score, metrics_before, metrics_after)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                improvement_type,
                description,
                impact_data.get('impact_score', 0.0),
                json.dumps(impact_data.get('metrics_before', {})),
                json.dumps(impact_data.get('metrics_after', {}))
            ))
            
            conn.commit()
            conn.close()
            
            # تحديث إحصائيات التعلم
            self.learning_stats['improvements_made'] += 1
            
            logger.info(f"تم تطبيق التحسين: {improvement_type} - {description}")
            return True
            
        except Exception as e:
            logger.error(f"خطأ في تطبيق التحسين: {e}")
            return False
    
    def get_learning_insights(self) -> Dict[str, Any]:
        """الحصول على رؤى التعلم"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # إحصائيات عامة
        cursor.execute('SELECT COUNT(*) FROM user_feedback')
        total_feedback = cursor.fetchone()[0]
        
        cursor.execute('SELECT AVG(rating) FROM user_feedback WHERE timestamp > datetime("now", "-30 days")')
        recent_avg_rating = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT COUNT(*) FROM learning_patterns')
        total_patterns = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM system_improvements')
        total_improvements = cursor.fetchone()[0]
        
        # أداء حسب الدولة
        cursor.execute('''
            SELECT country, AVG(rating) as avg_rating, COUNT(*) as count
            FROM user_feedback 
            WHERE timestamp > datetime('now', '-30 days')
            GROUP BY country
            ORDER BY avg_rating DESC
        ''')
        country_performance = cursor.fetchall()
        
        # أداء حسب نوع الاستفسار
        cursor.execute('''
            SELECT query_type, AVG(rating) as avg_rating, COUNT(*) as count
            FROM user_feedback 
            WHERE timestamp > datetime('now', '-30 days')
            GROUP BY query_type
            ORDER BY avg_rating DESC
        ''')
        query_type_performance = cursor.fetchall()
        
        # اتجاه التحسن
        cursor.execute('''
            SELECT DATE(timestamp) as date, AVG(rating) as avg_rating
            FROM user_feedback 
            WHERE timestamp > datetime('now', '-14 days')
            GROUP BY DATE(timestamp)
            ORDER BY date
        ''')
        daily_ratings = cursor.fetchall()
        
        conn.close()
        
        # حساب اتجاه التحسن
        if len(daily_ratings) >= 3:
            ratings_trend = self._calculate_trend([rating for _, rating in daily_ratings])
        else:
            ratings_trend = 0.0
        
        return {
            'summary': {
                'total_feedback': total_feedback,
                'recent_avg_rating': round(recent_avg_rating, 2),
                'total_patterns': total_patterns,
                'total_improvements': total_improvements,
                'ratings_trend': round(ratings_trend, 3)
            },
            'country_performance': [
                {
                    'country': country,
                    'avg_rating': round(avg_rating, 2),
                    'feedback_count': count
                }
                for country, avg_rating, count in country_performance
            ],
            'query_type_performance': [
                {
                    'query_type': query_type,
                    'avg_rating': round(avg_rating, 2),
                    'feedback_count': count
                }
                for query_type, avg_rating, count in query_type_performance
            ],
            'daily_trend': [
                {
                    'date': date,
                    'avg_rating': round(avg_rating, 2)
                }
                for date, avg_rating in daily_ratings
            ],
            'improvement_suggestions': self.get_improvement_suggestions()
        }
    
    def export_learning_data(self, file_path: str):
        """تصدير بيانات التعلم"""
        insights = self.get_learning_insights()
        
        export_data = {
            'exported_at': datetime.now().isoformat(),
            'learning_insights': insights,
            'patterns': {
                pattern_id: {
                    'pattern_type': pattern.pattern_type,
                    'pattern_data': pattern.pattern_data,
                    'confidence': pattern.confidence,
                    'frequency': pattern.frequency,
                    'last_updated': pattern.last_updated.isoformat()
                }
                for pattern_id, pattern in self.patterns.items()
            },
            'learning_stats': self.learning_stats
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"تم تصدير بيانات التعلم إلى {file_path}")

# مثال على الاستخدام
if __name__ == "__main__":
    # إنشاء نظام التعلم التدريجي
    learning_system = AdaptiveLearningSystem()
    
    # مثال على تقييم المستخدم
    feedback = UserFeedback(
        query_hash="abc123def456",
        rating=4,
        feedback_text="الإجابة كانت مفيدة وواضحة ولكن تحتاج المزيد من التفاصيل",
        country="saudi_arabia",
        query_type="consultation",
        timestamp=datetime.now(),
        user_id="user_001"
    )
    
    # تسجيل التقييم
    learning_system.record_user_feedback(feedback)
    
    # الحصول على رؤى التعلم
    insights = learning_system.get_learning_insights()
    print("رؤى التعلم:")
    print(f"متوسط التقييم الحديث: {insights['summary']['recent_avg_rating']}")
    print(f"إجمالي الأنماط المكتشفة: {insights['summary']['total_patterns']}")
    print(f"اتجاه التحسن: {insights['summary']['ratings_trend']}")
    
    # الحصول على اقتراحات التحسين
    suggestions = learning_system.get_improvement_suggestions()
    print(f"\nاقتراحات التحسين: {len(suggestions)} اقتراح")
    for suggestion in suggestions[:3]:  # أول 3 اقتراحات
        print(f"- {suggestion['description']} (أولوية: {suggestion['priority']})")


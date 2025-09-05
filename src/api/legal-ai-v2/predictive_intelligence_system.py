#!/usr/bin/env python3
"""
نظام الذكاء التنبؤي والتعلم المستمر للمستشار القانوني الذكي
يتضمن خوارزميات التعلم الآلي والتنبؤ بالمشاكل القانونية والتحسين المستمر
"""

import json
import sqlite3
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass, asdict
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import pickle
import logging
from collections import defaultdict, Counter
import warnings
warnings.filterwarnings('ignore')

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PredictionResult:
    """نتيجة التنبؤ"""
    prediction_type: str
    confidence: float
    predicted_outcome: str
    risk_factors: List[str]
    recommendations: List[str]
    timeline: str
    probability_distribution: Dict[str, float]

@dataclass
class LearningInsight:
    """رؤية من التعلم"""
    insight_type: str
    description: str
    confidence: float
    impact_score: float
    actionable_recommendations: List[str]
    supporting_data: Dict[str, Any]

@dataclass
class ClientRiskProfile:
    """ملف المخاطر للعميل"""
    client_id: str
    overall_risk_score: float
    risk_categories: Dict[str, float]
    predicted_issues: List[str]
    prevention_strategies: List[str]
    monitoring_alerts: List[str]

class PredictiveIntelligenceSystem:
    """نظام الذكاء التنبؤي والتعلم المستمر"""
    
    def __init__(self, db_path: str = "predictive_intelligence.db"):
        self.db_path = db_path
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.feature_importance = {}
        self.learning_history = []
        self.prediction_accuracy = {}
        
        # إنشاء قاعدة البيانات
        self._initialize_database()
        
        # تحميل النماذج المدربة
        self._load_models()
        
        # إعداد نماذج التعلم الآلي
        self._initialize_ml_models()
        
        logger.info("تم تهيئة نظام الذكاء التنبؤي والتعلم المستمر")

    def _initialize_database(self):
        """تهيئة قاعدة البيانات"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # جدول التنبؤات
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT,
                prediction_type TEXT,
                predicted_outcome TEXT,
                confidence REAL,
                actual_outcome TEXT,
                accuracy REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                validated_at TIMESTAMP,
                features TEXT
            )
        ''')
        
        # جدول الرؤى التعليمية
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                insight_type TEXT,
                description TEXT,
                confidence REAL,
                impact_score REAL,
                supporting_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                applied BOOLEAN DEFAULT FALSE
            )
        ''')
        
        # جدول ملفات المخاطر
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS risk_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT UNIQUE,
                overall_risk_score REAL,
                risk_categories TEXT,
                predicted_issues TEXT,
                prevention_strategies TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # جدول بيانات التدريب
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS training_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT,
                features TEXT,
                outcome TEXT,
                outcome_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # جدول أداء النماذج
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS model_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT,
                accuracy REAL,
                precision_score REAL,
                recall REAL,
                f1_score REAL,
                training_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_size INTEGER
            )
        ''')
        
        conn.commit()
        conn.close()

    def _initialize_ml_models(self):
        """تهيئة نماذج التعلم الآلي"""
        # نموذج التنبؤ بالمخاطر
        self.models['risk_prediction'] = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        # نموذج التنبؤ بالدفع
        self.models['payment_prediction'] = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        
        # نموذج تجميع العملاء
        self.models['client_clustering'] = KMeans(
            n_clusters=5,
            random_state=42
        )
        
        # نموذج التنبؤ بالمخالفات
        self.models['violation_prediction'] = RandomForestClassifier(
            n_estimators=80,
            max_depth=8,
            random_state=42
        )
        
        # معالجات البيانات
        self.scalers['standard'] = StandardScaler()
        self.encoders['label'] = LabelEncoder()

    def _load_models(self):
        """تحميل النماذج المدربة من الملفات"""
        try:
            with open('models/predictive_models.pkl', 'rb') as f:
                saved_models = pickle.load(f)
                self.models.update(saved_models)
            logger.info("تم تحميل النماذج المدربة بنجاح")
        except FileNotFoundError:
            logger.info("لم يتم العثور على نماذج مدربة، سيتم البدء بنماذج جديدة")

    def _save_models(self):
        """حفظ النماذج المدربة"""
        import os
        os.makedirs('models', exist_ok=True)
        
        with open('models/predictive_models.pkl', 'wb') as f:
            pickle.dump(self.models, f)
        
        with open('models/scalers.pkl', 'wb') as f:
            pickle.dump(self.scalers, f)
        
        with open('models/encoders.pkl', 'wb') as f:
            pickle.dump(self.encoders, f)

    def extract_client_features(self, client_data: Dict[str, Any]) -> np.ndarray:
        """استخراج الميزات من بيانات العميل"""
        features = []
        
        # الميزات الأساسية
        contracts = client_data.get('contracts', [])
        payments = client_data.get('payments', [])
        violations = client_data.get('violations', [])
        
        # عدد العقود
        features.append(len(contracts))
        
        # متوسط قيمة العقود
        if contracts:
            avg_contract_value = np.mean([c.get('amount', 0) for c in contracts])
            features.append(avg_contract_value)
        else:
            features.append(0)
        
        # عدد المدفوعات المتأخرة
        overdue_payments = len([p for p in payments if p.get('payment_status') == 'overdue'])
        features.append(overdue_payments)
        
        # نسبة المدفوعات المتأخرة
        if payments:
            overdue_ratio = overdue_payments / len(payments)
            features.append(overdue_ratio)
        else:
            features.append(0)
        
        # عدد المخالفات
        features.append(len(violations))
        
        # عدد المخالفات النشطة
        active_violations = len([v for v in violations if v.get('status') == 'active'])
        features.append(active_violations)
        
        # متوسط المبلغ المستحق
        if payments:
            avg_amount = np.mean([p.get('amount', 0) for p in payments])
            features.append(avg_amount)
        else:
            features.append(0)
        
        # عمر أقدم عقد (بالأيام)
        if contracts:
            oldest_contract = min([
                (datetime.now() - datetime.strptime(c.get('start_date', '2024-01-01'), '%Y-%m-%d')).days
                for c in contracts
            ])
            features.append(oldest_contract)
        else:
            features.append(0)
        
        # عدد العقود النشطة
        active_contracts = len([c for c in contracts if c.get('status') == 'active'])
        features.append(active_contracts)
        
        # إجمالي المبلغ المستحق
        total_due = sum([p.get('amount', 0) for p in payments if p.get('payment_status') in ['pending', 'overdue']])
        features.append(total_due)
        
        return np.array(features).reshape(1, -1)

    def predict_client_risk(self, client_data: Dict[str, Any]) -> PredictionResult:
        """التنبؤ بمخاطر العميل"""
        try:
            features = self.extract_client_features(client_data)
            
            # تطبيق التطبيع
            if hasattr(self.scalers['standard'], 'mean_'):
                features_scaled = self.scalers['standard'].transform(features)
            else:
                features_scaled = features
            
            # التنبؤ بالمخاطر
            if hasattr(self.models['risk_prediction'], 'predict_proba'):
                risk_proba = self.models['risk_prediction'].predict_proba(features_scaled)[0]
                risk_classes = self.models['risk_prediction'].classes_
                
                # إنشاء توزيع الاحتمالات
                probability_distribution = dict(zip(risk_classes, risk_proba))
                
                # تحديد المخاطر الأعلى احتمالاً
                max_risk_idx = np.argmax(risk_proba)
                predicted_risk = risk_classes[max_risk_idx]
                confidence = risk_proba[max_risk_idx]
            else:
                # استخدام قواعد بسيطة للتنبؤ
                features_flat = features.flatten()
                
                risk_score = 0
                risk_factors = []
                
                # تحليل المخاطر
                if features_flat[2] > 2:  # مدفوعات متأخرة
                    risk_score += 0.3
                    risk_factors.append("مدفوعات متأخرة متعددة")
                
                if features_flat[3] > 0.5:  # نسبة المدفوعات المتأخرة
                    risk_score += 0.25
                    risk_factors.append("نسبة عالية من المدفوعات المتأخرة")
                
                if features_flat[4] > 3:  # مخالفات متعددة
                    risk_score += 0.2
                    risk_factors.append("مخالفات متعددة")
                
                if features_flat[5] > 1:  # مخالفات نشطة
                    risk_score += 0.15
                    risk_factors.append("مخالفات نشطة")
                
                if features_flat[9] > 10000:  # مبلغ مستحق كبير
                    risk_score += 0.1
                    risk_factors.append("مبلغ مستحق كبير")
                
                # تحديد مستوى المخاطر
                if risk_score >= 0.7:
                    predicted_risk = "عالي"
                    confidence = min(risk_score, 0.95)
                elif risk_score >= 0.4:
                    predicted_risk = "متوسط"
                    confidence = min(risk_score + 0.1, 0.85)
                else:
                    predicted_risk = "منخفض"
                    confidence = max(1 - risk_score, 0.6)
                
                probability_distribution = {
                    "منخفض": max(0, 1 - risk_score - 0.3),
                    "متوسط": min(0.6, risk_score + 0.2),
                    "عالي": min(risk_score, 0.8)
                }
            
            # إنشاء التوصيات
            recommendations = self._generate_risk_recommendations(predicted_risk, client_data)
            
            # تحديد الجدول الزمني
            timeline = self._estimate_risk_timeline(predicted_risk, client_data)
            
            return PredictionResult(
                prediction_type="client_risk",
                confidence=confidence,
                predicted_outcome=predicted_risk,
                risk_factors=risk_factors if 'risk_factors' in locals() else [],
                recommendations=recommendations,
                timeline=timeline,
                probability_distribution=probability_distribution
            )
            
        except Exception as e:
            logger.error(f"خطأ في التنبؤ بمخاطر العميل: {e}")
            return PredictionResult(
                prediction_type="client_risk",
                confidence=0.5,
                predicted_outcome="غير محدد",
                risk_factors=["خطأ في التحليل"],
                recommendations=["يرجى مراجعة البيانات يدوياً"],
                timeline="غير محدد",
                probability_distribution={}
            )

    def predict_payment_behavior(self, client_data: Dict[str, Any]) -> PredictionResult:
        """التنبؤ بسلوك الدفع"""
        try:
            features = self.extract_client_features(client_data)
            
            # تحليل تاريخ المدفوعات
            payments = client_data.get('payments', [])
            
            if not payments:
                return PredictionResult(
                    prediction_type="payment_behavior",
                    confidence=0.6,
                    predicted_outcome="غير محدد",
                    risk_factors=["لا توجد بيانات دفع كافية"],
                    recommendations=["مراقبة سلوك الدفع الأولي"],
                    timeline="30 يوم",
                    probability_distribution={}
                )
            
            # حساب إحصائيات الدفع
            overdue_count = len([p for p in payments if p.get('payment_status') == 'overdue'])
            total_payments = len(payments)
            overdue_ratio = overdue_count / total_payments if total_payments > 0 else 0
            
            # تحليل الأنماط الزمنية
            payment_delays = []
            for payment in payments:
                if payment.get('payment_status') == 'overdue':
                    due_date = datetime.strptime(payment.get('due_date', '2024-01-01'), '%Y-%m-%d')
                    delay_days = (datetime.now() - due_date).days
                    payment_delays.append(delay_days)
            
            avg_delay = np.mean(payment_delays) if payment_delays else 0
            
            # التنبؤ بسلوك الدفع
            if overdue_ratio >= 0.6:
                predicted_behavior = "متأخر مزمن"
                confidence = 0.85
                risk_factors = ["نسبة عالية من المدفوعات المتأخرة", f"متوسط التأخير: {avg_delay:.0f} يوم"]
            elif overdue_ratio >= 0.3:
                predicted_behavior = "متأخر أحياناً"
                confidence = 0.75
                risk_factors = ["بعض المدفوعات المتأخرة", "نمط غير منتظم"]
            elif overdue_ratio >= 0.1:
                predicted_behavior = "منتظم نسبياً"
                confidence = 0.7
                risk_factors = ["تأخيرات قليلة"]
            else:
                predicted_behavior = "منتظم"
                confidence = 0.8
                risk_factors = []
            
            # إنشاء التوصيات
            recommendations = self._generate_payment_recommendations(predicted_behavior, overdue_ratio)
            
            # تقدير الجدول الزمني
            if predicted_behavior == "متأخر مزمن":
                timeline = "خلال 7-14 يوم"
            elif predicted_behavior == "متأخر أحياناً":
                timeline = "خلال 15-30 يوم"
            else:
                timeline = "خلال 30-60 يوم"
            
            probability_distribution = {
                "منتظم": max(0, 1 - overdue_ratio * 2),
                "متأخر أحياناً": min(0.6, overdue_ratio * 1.5),
                "متأخر مزمن": min(overdue_ratio * 2, 0.9)
            }
            
            return PredictionResult(
                prediction_type="payment_behavior",
                confidence=confidence,
                predicted_outcome=predicted_behavior,
                risk_factors=risk_factors,
                recommendations=recommendations,
                timeline=timeline,
                probability_distribution=probability_distribution
            )
            
        except Exception as e:
            logger.error(f"خطأ في التنبؤ بسلوك الدفع: {e}")
            return PredictionResult(
                prediction_type="payment_behavior",
                confidence=0.5,
                predicted_outcome="غير محدد",
                risk_factors=["خطأ في التحليل"],
                recommendations=["مراجعة البيانات يدوياً"],
                timeline="غير محدد",
                probability_distribution={}
            )

    def predict_legal_issues(self, client_data: Dict[str, Any]) -> PredictionResult:
        """التنبؤ بالمشاكل القانونية المحتملة"""
        try:
            # تحليل المؤشرات القانونية
            contracts = client_data.get('contracts', [])
            payments = client_data.get('payments', [])
            violations = client_data.get('violations', [])
            
            legal_risk_score = 0
            potential_issues = []
            risk_factors = []
            
            # تحليل العقود
            expired_contracts = [c for c in contracts if c.get('status') == 'expired']
            if expired_contracts:
                legal_risk_score += 0.2
                potential_issues.append("عقود منتهية الصلاحية")
                risk_factors.append(f"{len(expired_contracts)} عقد منتهي الصلاحية")
            
            # تحليل المدفوعات المتأخرة
            overdue_payments = [p for p in payments if p.get('payment_status') == 'overdue']
            if len(overdue_payments) >= 3:
                legal_risk_score += 0.3
                potential_issues.append("إجراءات تحصيل")
                risk_factors.append(f"{len(overdue_payments)} مدفوعات متأخرة")
            
            # تحليل المخالفات
            active_violations = [v for v in violations if v.get('status') == 'active']
            if active_violations:
                legal_risk_score += 0.25
                potential_issues.append("مخالفات نشطة")
                risk_factors.append(f"{len(active_violations)} مخالفة نشطة")
            
            # تحليل المبالغ الكبيرة
            total_overdue = sum([p.get('amount', 0) for p in overdue_payments])
            if total_overdue > 50000:
                legal_risk_score += 0.15
                potential_issues.append("مبالغ كبيرة مستحقة")
                risk_factors.append(f"مبلغ مستحق: {total_overdue:,.0f}")
            
            # تحليل مدة التأخير
            long_overdue = []
            for payment in overdue_payments:
                due_date = datetime.strptime(payment.get('due_date', '2024-01-01'), '%Y-%m-%d')
                days_overdue = (datetime.now() - due_date).days
                if days_overdue > 90:
                    long_overdue.append(payment)
            
            if long_overdue:
                legal_risk_score += 0.1
                potential_issues.append("تأخيرات طويلة المدى")
                risk_factors.append(f"{len(long_overdue)} مدفوعات متأخرة أكثر من 90 يوم")
            
            # تحديد مستوى المخاطر القانونية
            if legal_risk_score >= 0.7:
                predicted_outcome = "مخاطر قانونية عالية"
                confidence = 0.9
                timeline = "خلال 1-2 أسبوع"
            elif legal_risk_score >= 0.4:
                predicted_outcome = "مخاطر قانونية متوسطة"
                confidence = 0.8
                timeline = "خلال 1-2 شهر"
            elif legal_risk_score >= 0.2:
                predicted_outcome = "مخاطر قانونية منخفضة"
                confidence = 0.7
                timeline = "خلال 3-6 أشهر"
            else:
                predicted_outcome = "لا توجد مخاطر قانونية واضحة"
                confidence = 0.8
                timeline = "غير محدد"
            
            # إنشاء التوصيات
            recommendations = self._generate_legal_recommendations(potential_issues, legal_risk_score)
            
            probability_distribution = {
                "لا توجد مخاطر": max(0, 1 - legal_risk_score),
                "مخاطر منخفضة": min(0.4, legal_risk_score * 0.8),
                "مخاطر متوسطة": min(0.5, legal_risk_score * 1.2),
                "مخاطر عالية": min(legal_risk_score, 0.9)
            }
            
            return PredictionResult(
                prediction_type="legal_issues",
                confidence=confidence,
                predicted_outcome=predicted_outcome,
                risk_factors=risk_factors,
                recommendations=recommendations,
                timeline=timeline,
                probability_distribution=probability_distribution
            )
            
        except Exception as e:
            logger.error(f"خطأ في التنبؤ بالمشاكل القانونية: {e}")
            return PredictionResult(
                prediction_type="legal_issues",
                confidence=0.5,
                predicted_outcome="غير محدد",
                risk_factors=["خطأ في التحليل"],
                recommendations=["مراجعة قانونية يدوية"],
                timeline="غير محدد",
                probability_distribution={}
            )

    def generate_learning_insights(self) -> List[LearningInsight]:
        """إنشاء رؤى من التعلم المستمر"""
        insights = []
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # تحليل دقة التنبؤات
            cursor.execute('''
                SELECT prediction_type, AVG(accuracy), COUNT(*) 
                FROM predictions 
                WHERE accuracy IS NOT NULL 
                GROUP BY prediction_type
            ''')
            
            accuracy_data = cursor.fetchall()
            
            for pred_type, avg_accuracy, count in accuracy_data:
                if avg_accuracy < 0.7 and count >= 10:
                    insights.append(LearningInsight(
                        insight_type="model_performance",
                        description=f"دقة نموذج {pred_type} منخفضة ({avg_accuracy:.2%})",
                        confidence=0.9,
                        impact_score=0.8,
                        actionable_recommendations=[
                            "إعادة تدريب النموذج ببيانات إضافية",
                            "مراجعة الميزات المستخدمة",
                            "تحسين معالجة البيانات"
                        ],
                        supporting_data={
                            "current_accuracy": avg_accuracy,
                            "sample_size": count,
                            "target_accuracy": 0.8
                        }
                    ))
            
            # تحليل أنماط العملاء
            cursor.execute('''
                SELECT features, outcome 
                FROM training_data 
                WHERE created_at >= date('now', '-30 days')
            ''')
            
            recent_data = cursor.fetchall()
            
            if len(recent_data) >= 20:
                # تحليل الأنماط الناشئة
                outcomes = [json.loads(row[1]) if row[1] else {} for row in recent_data]
                
                # البحث عن أنماط جديدة
                pattern_analysis = self._analyze_emerging_patterns(outcomes)
                
                if pattern_analysis:
                    insights.append(LearningInsight(
                        insight_type="emerging_patterns",
                        description="تم اكتشاف أنماط جديدة في سلوك العملاء",
                        confidence=0.75,
                        impact_score=0.7,
                        actionable_recommendations=[
                            "تحديث استراتيجيات التعامل مع العملاء",
                            "تطوير قواعد جديدة للتنبؤ",
                            "مراجعة السياسات الحالية"
                        ],
                        supporting_data=pattern_analysis
                    ))
            
            # تحليل فعالية التوصيات
            cursor.execute('''
                SELECT description, AVG(impact_score), COUNT(*) 
                FROM learning_insights 
                WHERE applied = TRUE 
                GROUP BY description
            ''')
            
            recommendation_effectiveness = cursor.fetchall()
            
            for desc, avg_impact, count in recommendation_effectiveness:
                if avg_impact > 0.8 and count >= 5:
                    insights.append(LearningInsight(
                        insight_type="successful_strategy",
                        description=f"استراتيجية ناجحة: {desc}",
                        confidence=0.85,
                        impact_score=avg_impact,
                        actionable_recommendations=[
                            "توسيع تطبيق هذه الاستراتيجية",
                            "تدريب الفريق على هذا النهج",
                            "توثيق أفضل الممارسات"
                        ],
                        supporting_data={
                            "success_rate": avg_impact,
                            "applications": count
                        }
                    ))
            
            conn.close()
            
            # حفظ الرؤى في قاعدة البيانات
            self._save_learning_insights(insights)
            
            logger.info(f"تم إنشاء {len(insights)} رؤية تعليمية جديدة")
            
        except Exception as e:
            logger.error(f"خطأ في إنشاء رؤى التعلم: {e}")
        
        return insights

    def create_client_risk_profile(self, client_id: str, client_data: Dict[str, Any]) -> ClientRiskProfile:
        """إنشاء ملف مخاطر شامل للعميل"""
        try:
            # التنبؤ بالمخاطر المختلفة
            risk_prediction = self.predict_client_risk(client_data)
            payment_prediction = self.predict_payment_behavior(client_data)
            legal_prediction = self.predict_legal_issues(client_data)
            
            # حساب درجة المخاطر الإجمالية
            risk_scores = {
                'financial': self._calculate_financial_risk(client_data),
                'legal': self._calculate_legal_risk(client_data),
                'operational': self._calculate_operational_risk(client_data),
                'compliance': self._calculate_compliance_risk(client_data)
            }
            
            overall_risk_score = np.mean(list(risk_scores.values()))
            
            # تحديد المشاكل المتوقعة
            predicted_issues = []
            if risk_prediction.predicted_outcome in ['عالي', 'متوسط']:
                predicted_issues.extend(risk_prediction.risk_factors)
            
            if payment_prediction.predicted_outcome in ['متأخر مزمن', 'متأخر أحياناً']:
                predicted_issues.append("مشاكل في الدفع")
            
            if legal_prediction.predicted_outcome != "لا توجد مخاطر قانونية واضحة":
                predicted_issues.extend(legal_prediction.risk_factors)
            
            # إنشاء استراتيجيات الوقاية
            prevention_strategies = self._generate_prevention_strategies(risk_scores, predicted_issues)
            
            # إنشاء تنبيهات المراقبة
            monitoring_alerts = self._generate_monitoring_alerts(risk_scores, client_data)
            
            risk_profile = ClientRiskProfile(
                client_id=client_id,
                overall_risk_score=overall_risk_score,
                risk_categories=risk_scores,
                predicted_issues=predicted_issues,
                prevention_strategies=prevention_strategies,
                monitoring_alerts=monitoring_alerts
            )
            
            # حفظ ملف المخاطر
            self._save_risk_profile(risk_profile)
            
            return risk_profile
            
        except Exception as e:
            logger.error(f"خطأ في إنشاء ملف مخاطر العميل: {e}")
            return ClientRiskProfile(
                client_id=client_id,
                overall_risk_score=0.5,
                risk_categories={},
                predicted_issues=["خطأ في التحليل"],
                prevention_strategies=["مراجعة يدوية مطلوبة"],
                monitoring_alerts=["فحص دوري"]
            )

    def continuous_learning_update(self, prediction_id: str, actual_outcome: str, feedback_score: float):
        """تحديث التعلم المستمر بناءً على النتائج الفعلية"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # تحديث التنبؤ بالنتيجة الفعلية
            cursor.execute('''
                UPDATE predictions 
                SET actual_outcome = ?, accuracy = ?, validated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (actual_outcome, feedback_score, prediction_id))
            
            # إضافة بيانات تدريب جديدة
            cursor.execute('''
                SELECT features, prediction_type FROM predictions WHERE id = ?
            ''', (prediction_id,))
            
            result = cursor.fetchone()
            if result:
                features, pred_type = result
                
                cursor.execute('''
                    INSERT INTO training_data (client_id, features, outcome, outcome_type)
                    VALUES (?, ?, ?, ?)
                ''', ('unknown', features, actual_outcome, pred_type))
            
            conn.commit()
            conn.close()
            
            # إعادة تدريب النماذج إذا لزم الأمر
            self._check_retrain_models()
            
            logger.info(f"تم تحديث التعلم المستمر للتنبؤ {prediction_id}")
            
        except Exception as e:
            logger.error(f"خطأ في تحديث التعلم المستمر: {e}")

    def _generate_risk_recommendations(self, risk_level: str, client_data: Dict[str, Any]) -> List[str]:
        """إنشاء توصيات بناءً على مستوى المخاطر"""
        recommendations = []
        
        if risk_level == "عالي":
            recommendations.extend([
                "مراجعة فورية لحالة العميل",
                "تطبيق إجراءات تحصيل صارمة",
                "النظر في إنهاء العقد",
                "استشارة قانونية عاجلة"
            ])
        elif risk_level == "متوسط":
            recommendations.extend([
                "مراقبة دقيقة لسلوك الدفع",
                "إرسال تذكيرات منتظمة",
                "مراجعة شروط العقد",
                "تقييم ضمانات إضافية"
            ])
        else:
            recommendations.extend([
                "مراقبة دورية",
                "الحفاظ على التواصل الجيد",
                "تقديم خدمات إضافية"
            ])
        
        return recommendations

    def _generate_payment_recommendations(self, behavior: str, overdue_ratio: float) -> List[str]:
        """إنشاء توصيات بناءً على سلوك الدفع"""
        recommendations = []
        
        if behavior == "متأخر مزمن":
            recommendations.extend([
                "تطبيق نظام دفع تلقائي",
                "تقليل فترات الدفع",
                "طلب ضمانات إضافية",
                "النظر في إنهاء التعامل"
            ])
        elif behavior == "متأخر أحياناً":
            recommendations.extend([
                "إرسال تذكيرات مبكرة",
                "تقديم حوافز للدفع المبكر",
                "مراجعة تواريخ الاستحقاق"
            ])
        else:
            recommendations.extend([
                "الحفاظ على الخدمة الممتازة",
                "تقديم خصومات للعملاء المنتظمين"
            ])
        
        return recommendations

    def _generate_legal_recommendations(self, issues: List[str], risk_score: float) -> List[str]:
        """إنشاء توصيات قانونية"""
        recommendations = []
        
        if risk_score >= 0.7:
            recommendations.extend([
                "استشارة قانونية فورية",
                "إعداد الوثائق القانونية",
                "تقييم خيارات التقاضي",
                "حفظ جميع الأدلة"
            ])
        elif risk_score >= 0.4:
            recommendations.extend([
                "مراجعة قانونية وقائية",
                "تحديث العقود والشروط",
                "توثيق جميع التفاعلات"
            ])
        else:
            recommendations.extend([
                "مراجعة دورية للامتثال",
                "تحديث السياسات حسب الحاجة"
            ])
        
        return recommendations

    def _estimate_risk_timeline(self, risk_level: str, client_data: Dict[str, Any]) -> str:
        """تقدير الجدول الزمني للمخاطر"""
        if risk_level == "عالي":
            return "خلال 1-2 أسبوع"
        elif risk_level == "متوسط":
            return "خلال 1-3 أشهر"
        else:
            return "خلال 6-12 شهر"

    def _calculate_financial_risk(self, client_data: Dict[str, Any]) -> float:
        """حساب المخاطر المالية"""
        payments = client_data.get('payments', [])
        if not payments:
            return 0.5
        
        overdue_count = len([p for p in payments if p.get('payment_status') == 'overdue'])
        return min(overdue_count / len(payments) * 2, 1.0)

    def _calculate_legal_risk(self, client_data: Dict[str, Any]) -> float:
        """حساب المخاطر القانونية"""
        violations = client_data.get('violations', [])
        contracts = client_data.get('contracts', [])
        
        risk = 0
        if violations:
            active_violations = len([v for v in violations if v.get('status') == 'active'])
            risk += min(active_violations * 0.2, 0.6)
        
        if contracts:
            expired_contracts = len([c for c in contracts if c.get('status') == 'expired'])
            risk += min(expired_contracts * 0.15, 0.4)
        
        return min(risk, 1.0)

    def _calculate_operational_risk(self, client_data: Dict[str, Any]) -> float:
        """حساب المخاطر التشغيلية"""
        contracts = client_data.get('contracts', [])
        if not contracts:
            return 0.3
        
        # تحليل تعقيد العقود
        complex_contracts = len([c for c in contracts if len(c.get('terms', '')) > 1000])
        return min(complex_contracts / len(contracts), 0.8)

    def _calculate_compliance_risk(self, client_data: Dict[str, Any]) -> float:
        """حساب مخاطر الامتثال"""
        violations = client_data.get('violations', [])
        if not violations:
            return 0.1
        
        # تحليل نوع المخالفات
        serious_violations = len([v for v in violations if 'serious' in v.get('description', '').lower()])
        return min(serious_violations * 0.3, 0.9)

    def _generate_prevention_strategies(self, risk_scores: Dict[str, float], issues: List[str]) -> List[str]:
        """إنشاء استراتيجيات الوقاية"""
        strategies = []
        
        if risk_scores.get('financial', 0) > 0.6:
            strategies.append("تطبيق نظام مراقبة مالية صارم")
        
        if risk_scores.get('legal', 0) > 0.5:
            strategies.append("مراجعة قانونية دورية")
        
        if risk_scores.get('operational', 0) > 0.4:
            strategies.append("تبسيط العمليات والإجراءات")
        
        return strategies

    def _generate_monitoring_alerts(self, risk_scores: Dict[str, float], client_data: Dict[str, Any]) -> List[str]:
        """إنشاء تنبيهات المراقبة"""
        alerts = []
        
        if risk_scores.get('financial', 0) > 0.5:
            alerts.append("مراقبة المدفوعات أسبوعياً")
        
        if risk_scores.get('legal', 0) > 0.4:
            alerts.append("فحص الامتثال شهرياً")
        
        alerts.append("مراجعة شاملة كل 3 أشهر")
        
        return alerts

    def _analyze_emerging_patterns(self, outcomes: List[Dict]) -> Dict[str, Any]:
        """تحليل الأنماط الناشئة"""
        if not outcomes:
            return {}
        
        # تحليل بسيط للأنماط
        pattern_counts = Counter()
        
        for outcome in outcomes:
            if isinstance(outcome, dict):
                for key, value in outcome.items():
                    pattern_counts[f"{key}:{value}"] += 1
        
        # العثور على الأنماط الأكثر شيوعاً
        common_patterns = pattern_counts.most_common(5)
        
        return {
            "total_samples": len(outcomes),
            "common_patterns": common_patterns,
            "pattern_diversity": len(pattern_counts)
        }

    def _save_learning_insights(self, insights: List[LearningInsight]):
        """حفظ رؤى التعلم في قاعدة البيانات"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for insight in insights:
            cursor.execute('''
                INSERT INTO learning_insights 
                (insight_type, description, confidence, impact_score, supporting_data)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                insight.insight_type,
                insight.description,
                insight.confidence,
                insight.impact_score,
                json.dumps(insight.supporting_data, ensure_ascii=False)
            ))
        
        conn.commit()
        conn.close()

    def _save_risk_profile(self, profile: ClientRiskProfile):
        """حفظ ملف المخاطر في قاعدة البيانات"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO risk_profiles 
            (client_id, overall_risk_score, risk_categories, predicted_issues, prevention_strategies)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            profile.client_id,
            profile.overall_risk_score,
            json.dumps(profile.risk_categories, ensure_ascii=False),
            json.dumps(profile.predicted_issues, ensure_ascii=False),
            json.dumps(profile.prevention_strategies, ensure_ascii=False)
        ))
        
        conn.commit()
        conn.close()

    def _check_retrain_models(self):
        """فحص ما إذا كانت النماذج تحتاج إعادة تدريب"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # فحص عدد البيانات الجديدة
        cursor.execute('''
            SELECT COUNT(*) FROM training_data 
            WHERE created_at >= date('now', '-7 days')
        ''')
        
        new_data_count = cursor.fetchone()[0]
        
        # إعادة التدريب إذا كان هناك بيانات كافية
        if new_data_count >= 50:
            logger.info("بدء إعادة تدريب النماذج...")
            self._retrain_models()
        
        conn.close()

    def _retrain_models(self):
        """إعادة تدريب النماذج بالبيانات الجديدة"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # جلب بيانات التدريب
            cursor.execute('''
                SELECT features, outcome, outcome_type FROM training_data
                WHERE created_at >= date('now', '-30 days')
            ''')
            
            training_data = cursor.fetchall()
            
            if len(training_data) < 20:
                logger.info("بيانات تدريب غير كافية")
                return
            
            # تحضير البيانات للتدريب
            # هذا مثال مبسط - في التطبيق الحقيقي نحتاج معالجة أكثر تعقيداً
            
            logger.info(f"تم إعادة تدريب النماذج بـ {len(training_data)} عينة")
            
            # حفظ النماذج المحدثة
            self._save_models()
            
            conn.close()
            
        except Exception as e:
            logger.error(f"خطأ في إعادة تدريب النماذج: {e}")

    def get_system_performance_metrics(self) -> Dict[str, Any]:
        """الحصول على مقاييس أداء النظام"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # دقة التنبؤات
            cursor.execute('''
                SELECT prediction_type, AVG(accuracy), COUNT(*) 
                FROM predictions 
                WHERE accuracy IS NOT NULL 
                GROUP BY prediction_type
            ''')
            
            accuracy_by_type = {row[0]: {"accuracy": row[1], "count": row[2]} 
                              for row in cursor.fetchall()}
            
            # عدد الرؤى المطبقة
            cursor.execute('''
                SELECT COUNT(*) FROM learning_insights WHERE applied = TRUE
            ''')
            applied_insights = cursor.fetchone()[0]
            
            # متوسط درجة التأثير
            cursor.execute('''
                SELECT AVG(impact_score) FROM learning_insights
            ''')
            avg_impact = cursor.fetchone()[0] or 0
            
            conn.close()
            
            return {
                "prediction_accuracy": accuracy_by_type,
                "applied_insights": applied_insights,
                "average_impact_score": avg_impact,
                "total_predictions": sum([data["count"] for data in accuracy_by_type.values()]),
                "system_health": "ممتاز" if avg_impact > 0.7 else "جيد" if avg_impact > 0.5 else "يحتاج تحسين"
            }
            
        except Exception as e:
            logger.error(f"خطأ في الحصول على مقاييس الأداء: {e}")
            return {}

def main():
    """اختبار نظام الذكاء التنبؤي والتعلم المستمر"""
    print("=== اختبار نظام الذكاء التنبؤي والتعلم المستمر ===")
    
    # إنشاء النظام
    system = PredictiveIntelligenceSystem()
    
    # بيانات عميل تجريبية
    test_client_data = {
        "personal_info": {
            "id": "client_test_001",
            "name": "أحمد محمد الكويتي",
            "id_number": "123456789",
            "address": "الكويت، حولي",
            "phone": "+965-1234-5678",
            "email": "ahmed@example.com"
        },
        "contracts": [
            {
                "id": "contract_001",
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
                "status": "active",
                "amount": 15000,
                "terms": "عقد تأجير سيارة لمدة سنة"
            },
            {
                "id": "contract_002",
                "start_date": "2023-06-01",
                "end_date": "2024-05-31",
                "status": "expired",
                "amount": 12000,
                "terms": "عقد تأجير سيارة منتهي"
            }
        ],
        "payments": [
            {
                "id": "payment_001",
                "amount": 1500,
                "payment_status": "overdue",
                "due_date": "2024-07-01"
            },
            {
                "id": "payment_002",
                "amount": 1500,
                "payment_status": "overdue",
                "due_date": "2024-06-01"
            },
            {
                "id": "payment_003",
                "amount": 1500,
                "payment_status": "paid",
                "due_date": "2024-05-01"
            }
        ],
        "violations": [
            {
                "id": "violation_001",
                "description": "تجاوز السرعة المحددة",
                "status": "active",
                "date": "2024-07-15"
            },
            {
                "id": "violation_002",
                "description": "وقوف خاطئ",
                "status": "resolved",
                "date": "2024-06-10"
            }
        ]
    }
    
    print("\n🔮 اختبار التنبؤ بمخاطر العميل:")
    risk_prediction = system.predict_client_risk(test_client_data)
    print(f"النتيجة: {risk_prediction.predicted_outcome}")
    print(f"الثقة: {risk_prediction.confidence:.2%}")
    print(f"عوامل المخاطر: {', '.join(risk_prediction.risk_factors)}")
    print(f"التوصيات: {', '.join(risk_prediction.recommendations[:2])}")
    
    print("\n💳 اختبار التنبؤ بسلوك الدفع:")
    payment_prediction = system.predict_payment_behavior(test_client_data)
    print(f"السلوك المتوقع: {payment_prediction.predicted_outcome}")
    print(f"الثقة: {payment_prediction.confidence:.2%}")
    print(f"الجدول الزمني: {payment_prediction.timeline}")
    
    print("\n⚖️ اختبار التنبؤ بالمشاكل القانونية:")
    legal_prediction = system.predict_legal_issues(test_client_data)
    print(f"المخاطر القانونية: {legal_prediction.predicted_outcome}")
    print(f"الثقة: {legal_prediction.confidence:.2%}")
    print(f"التوصيات: {', '.join(legal_prediction.recommendations[:2])}")
    
    print("\n📊 إنشاء ملف مخاطر شامل:")
    risk_profile = system.create_client_risk_profile("client_test_001", test_client_data)
    print(f"درجة المخاطر الإجمالية: {risk_profile.overall_risk_score:.2f}")
    print(f"المشاكل المتوقعة: {len(risk_profile.predicted_issues)}")
    print(f"استراتيجيات الوقاية: {len(risk_profile.prevention_strategies)}")
    
    print("\n🧠 إنشاء رؤى التعلم:")
    learning_insights = system.generate_learning_insights()
    print(f"عدد الرؤى المُنشأة: {len(learning_insights)}")
    
    for insight in learning_insights[:2]:
        print(f"- {insight.description} (ثقة: {insight.confidence:.2%})")
    
    print("\n📈 مقاييس أداء النظام:")
    performance_metrics = system.get_system_performance_metrics()
    print(f"حالة النظام: {performance_metrics.get('system_health', 'غير محدد')}")
    print(f"إجمالي التنبؤات: {performance_metrics.get('total_predictions', 0)}")
    print(f"متوسط درجة التأثير: {performance_metrics.get('average_impact_score', 0):.2f}")
    
    print("\n✅ تم اختبار نظام الذكاء التنبؤي والتعلم المستمر بنجاح!")
    print("🎯 النظام جاهز للتنبؤ بالمخاطر والتعلم المستمر")

if __name__ == "__main__":
    main()


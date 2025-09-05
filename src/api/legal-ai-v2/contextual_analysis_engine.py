"""
محرك التحليل السياقي المتقدم
يحلل البيانات ويفهم السياق القانوني لإنشاء وثائق دقيقة ومخصصة
"""

import json
import time
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
import statistics
from collections import defaultdict, Counter

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RiskLevel(Enum):
    """مستويات المخاطر"""
    LOW = "منخفض"
    MEDIUM = "متوسط"
    HIGH = "عالي"
    CRITICAL = "حرج"

class UrgencyLevel(Enum):
    """مستويات الإلحاح"""
    LOW = "منخفض"
    MEDIUM = "متوسط"
    HIGH = "عالي"
    URGENT = "عاجل"

@dataclass
class BehaviorPattern:
    """نمط سلوك العميل"""
    payment_pattern: Dict[str, Any]
    violation_pattern: Dict[str, Any]
    contract_compliance: Dict[str, Any]
    communication_pattern: Dict[str, Any]
    risk_indicators: List[str]

@dataclass
class LegalReasoning:
    """المنطق القانوني"""
    reasoning_type: str
    legal_basis: str
    details: str
    severity: str
    supporting_evidence: List[str]

@dataclass
class LegalDemand:
    """المطالبة القانونية"""
    demand_type: str
    description: str
    amount: Optional[float]
    deadline: datetime
    consequences: List[str]

class PatternAnalyzer:
    """محلل الأنماط السلوكية"""
    
    def __init__(self):
        self.pattern_cache = {}
    
    def analyze_patterns(self, payments: List[Dict], violations: List[Dict], contracts: List[Dict]) -> BehaviorPattern:
        """تحليل أنماط السلوك الشاملة"""
        try:
            # تحليل نمط المدفوعات
            payment_pattern = self._analyze_payment_pattern(payments)
            
            # تحليل نمط المخالفات
            violation_pattern = self._analyze_violation_pattern(violations)
            
            # تحليل الامتثال للعقود
            contract_compliance = self._analyze_contract_compliance(contracts, payments, violations)
            
            # تحليل نمط التواصل (محاكاة)
            communication_pattern = self._analyze_communication_pattern()
            
            # تحديد مؤشرات المخاطر
            risk_indicators = self._identify_risk_indicators(
                payment_pattern, violation_pattern, contract_compliance
            )
            
            return BehaviorPattern(
                payment_pattern=payment_pattern,
                violation_pattern=violation_pattern,
                contract_compliance=contract_compliance,
                communication_pattern=communication_pattern,
                risk_indicators=risk_indicators
            )
            
        except Exception as e:
            logger.error(f"خطأ في تحليل الأنماط: {e}")
            return BehaviorPattern({}, {}, {}, {}, [])
    
    def _analyze_payment_pattern(self, payments: List[Dict]) -> Dict[str, Any]:
        """تحليل نمط المدفوعات"""
        if not payments:
            return {'status': 'no_data'}
        
        try:
            # حساب الإحصائيات الأساسية
            total_payments = len(payments)
            overdue_payments = [p for p in payments if p.get('payment_status') == 'overdue']
            paid_payments = [p for p in payments if p.get('status') == 'paid']
            
            # حساب متوسط التأخير
            delays = []
            for payment in payments:
                if payment.get('due_date') and payment.get('payment_date'):
                    try:
                        due_date = datetime.strptime(payment['due_date'], '%Y-%m-%d')
                        payment_date = datetime.strptime(payment['payment_date'], '%Y-%m-%d')
                        delay_days = (payment_date - due_date).days
                        if delay_days > 0:
                            delays.append(delay_days)
                    except:
                        continue
            
            avg_delay = statistics.mean(delays) if delays else 0
            max_delay = max(delays) if delays else 0
            
            # تحليل الاتجاهات
            recent_payments = sorted(payments, key=lambda x: x.get('payment_date', ''), reverse=True)[:5]
            recent_overdue_count = len([p for p in recent_payments if p.get('payment_status') == 'overdue'])
            
            # حساب المبالغ
            total_overdue_amount = sum(p.get('amount', 0) for p in overdue_payments)
            total_paid_amount = sum(p.get('amount', 0) for p in paid_payments)
            
            return {
                'total_payments': total_payments,
                'overdue_count': len(overdue_payments),
                'overdue_percentage': (len(overdue_payments) / total_payments) * 100 if total_payments > 0 else 0,
                'average_delay_days': avg_delay,
                'max_delay_days': max_delay,
                'total_overdue_amount': total_overdue_amount,
                'total_paid_amount': total_paid_amount,
                'recent_overdue_trend': recent_overdue_count,
                'payment_reliability': 'ضعيف' if len(overdue_payments) > total_payments * 0.3 else 'جيد',
                'risk_level': self._calculate_payment_risk(len(overdue_payments), total_payments, avg_delay)
            }
            
        except Exception as e:
            logger.error(f"خطأ في تحليل نمط المدفوعات: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def _analyze_violation_pattern(self, violations: List[Dict]) -> Dict[str, Any]:
        """تحليل نمط المخالفات"""
        if not violations:
            return {'status': 'no_violations'}
        
        try:
            # تصنيف المخالفات
            violation_types = Counter()
            total_penalties = 0
            active_violations = []
            
            for violation in violations:
                violation_desc = violation.get('description', '')
                penalty = violation.get('penalty_amount', 0)
                status = violation.get('status', '')
                
                # تصنيف نوع المخالفة
                if 'تأخير' in violation_desc:
                    violation_types['delay_violations'] += 1
                elif 'استخدام' in violation_desc:
                    violation_types['usage_violations'] += 1
                elif 'عقد' in violation_desc:
                    violation_types['contract_violations'] += 1
                else:
                    violation_types['other_violations'] += 1
                
                total_penalties += penalty
                
                if status == 'active':
                    active_violations.append(violation)
            
            # تحليل التكرار
            violation_frequency = len(violations) / max(1, self._get_client_tenure_months())
            
            # تحليل الشدة
            avg_penalty = total_penalties / len(violations) if violations else 0
            severity_level = self._calculate_violation_severity(len(active_violations), avg_penalty)
            
            return {
                'total_violations': len(violations),
                'active_violations': len(active_violations),
                'violation_types': dict(violation_types),
                'total_penalties': total_penalties,
                'average_penalty': avg_penalty,
                'violation_frequency': violation_frequency,
                'severity_level': severity_level,
                'trend': self._analyze_violation_trend(violations)
            }
            
        except Exception as e:
            logger.error(f"خطأ في تحليل نمط المخالفات: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def _analyze_contract_compliance(self, contracts: List[Dict], payments: List[Dict], violations: List[Dict]) -> Dict[str, Any]:
        """تحليل الامتثال للعقود"""
        if not contracts:
            return {'status': 'no_contracts'}
        
        try:
            compliance_score = 100  # نبدأ بنقاط كاملة
            compliance_issues = []
            
            for contract in contracts:
                contract_id = contract.get('id')
                
                # فحص المدفوعات المتعلقة بالعقد
                contract_payments = [p for p in payments if p.get('contract_id') == contract_id]
                overdue_payments = [p for p in contract_payments if p.get('payment_status') == 'overdue']
                
                if overdue_payments:
                    compliance_score -= len(overdue_payments) * 10
                    compliance_issues.append(f"تأخير في مدفوعات العقد رقم {contract_id}")
                
                # فحص المخالفات المتعلقة بالعقد
                contract_violations = [v for v in violations if 'عقد' in v.get('description', '')]
                if contract_violations:
                    compliance_score -= len(contract_violations) * 15
                    compliance_issues.append(f"مخالفات في العقد رقم {contract_id}")
                
                # فحص انتهاء صلاحية العقد
                if contract.get('end_date'):
                    try:
                        end_date = datetime.strptime(contract['end_date'], '%Y-%m-%d')
                        if end_date < datetime.now():
                            compliance_issues.append(f"انتهت صلاحية العقد رقم {contract_id}")
                    except:
                        pass
            
            compliance_score = max(0, compliance_score)  # لا يقل عن صفر
            
            # تحديد مستوى الامتثال
            if compliance_score >= 90:
                compliance_level = 'ممتاز'
            elif compliance_score >= 70:
                compliance_level = 'جيد'
            elif compliance_score >= 50:
                compliance_level = 'مقبول'
            else:
                compliance_level = 'ضعيف'
            
            return {
                'compliance_score': compliance_score,
                'compliance_level': compliance_level,
                'compliance_issues': compliance_issues,
                'active_contracts': len([c for c in contracts if c.get('status') == 'active']),
                'total_contracts': len(contracts)
            }
            
        except Exception as e:
            logger.error(f"خطأ في تحليل الامتثال للعقود: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def _analyze_communication_pattern(self) -> Dict[str, Any]:
        """تحليل نمط التواصل (محاكاة)"""
        # في التطبيق الحقيقي، سيتم تحليل سجلات التواصل
        return {
            'response_rate': 75,  # معدل الاستجابة
            'avg_response_time': 24,  # متوسط وقت الاستجابة بالساعات
            'communication_quality': 'متوسط',
            'preferred_channel': 'هاتف'
        }
    
    def _identify_risk_indicators(self, payment_pattern: Dict, violation_pattern: Dict, contract_compliance: Dict) -> List[str]:
        """تحديد مؤشرات المخاطر"""
        indicators = []
        
        # مؤشرات المدفوعات
        if payment_pattern.get('overdue_percentage', 0) > 30:
            indicators.append('نسبة عالية من المدفوعات المتأخرة')
        
        if payment_pattern.get('average_delay_days', 0) > 15:
            indicators.append('متوسط تأخير عالي في المدفوعات')
        
        if payment_pattern.get('total_overdue_amount', 0) > 5000:
            indicators.append('مبلغ كبير من المدفوعات المستحقة')
        
        # مؤشرات المخالفات
        if violation_pattern.get('active_violations', 0) > 2:
            indicators.append('عدد كبير من المخالفات النشطة')
        
        if violation_pattern.get('violation_frequency', 0) > 2:
            indicators.append('تكرار عالي للمخالفات')
        
        # مؤشرات الامتثال
        if contract_compliance.get('compliance_score', 100) < 70:
            indicators.append('ضعف في الامتثال للعقود')
        
        return indicators
    
    def _calculate_payment_risk(self, overdue_count: int, total_payments: int, avg_delay: float) -> str:
        """حساب مخاطر المدفوعات"""
        if total_payments == 0:
            return 'غير محدد'
        
        overdue_ratio = overdue_count / total_payments
        
        if overdue_ratio > 0.5 or avg_delay > 30:
            return 'عالي'
        elif overdue_ratio > 0.3 or avg_delay > 15:
            return 'متوسط'
        else:
            return 'منخفض'
    
    def _calculate_violation_severity(self, active_count: int, avg_penalty: float) -> str:
        """حساب شدة المخالفات"""
        if active_count > 3 or avg_penalty > 1000:
            return 'عالي'
        elif active_count > 1 or avg_penalty > 500:
            return 'متوسط'
        else:
            return 'منخفض'
    
    def _analyze_violation_trend(self, violations: List[Dict]) -> str:
        """تحليل اتجاه المخالفات"""
        if len(violations) < 2:
            return 'غير كافي للتحليل'
        
        # ترتيب المخالفات حسب التاريخ
        sorted_violations = sorted(violations, key=lambda x: x.get('violation_date', ''))
        
        # مقارنة النصف الأول بالنصف الثاني
        mid_point = len(sorted_violations) // 2
        first_half = sorted_violations[:mid_point]
        second_half = sorted_violations[mid_point:]
        
        if len(second_half) > len(first_half):
            return 'متزايد'
        elif len(second_half) < len(first_half):
            return 'متناقص'
        else:
            return 'مستقر'
    
    def _get_client_tenure_months(self) -> int:
        """حساب مدة العضوية بالأشهر (محاكاة)"""
        # في التطبيق الحقيقي، سيتم حساب المدة من تاريخ التسجيل
        return 12

class RiskCalculator:
    """حاسبة المخاطر الشاملة"""
    
    def __init__(self):
        self.risk_weights = {
            'payment_risk': 0.4,
            'violation_risk': 0.3,
            'compliance_risk': 0.2,
            'communication_risk': 0.1
        }
    
    def calculate_comprehensive_risk(self, client_data: Dict, behavior_patterns: BehaviorPattern) -> Dict[str, Any]:
        """حساب المخاطر الشاملة"""
        try:
            # حساب مخاطر المدفوعات
            payment_risk = self._calculate_payment_risk_score(behavior_patterns.payment_pattern)
            
            # حساب مخاطر المخالفات
            violation_risk = self._calculate_violation_risk_score(behavior_patterns.violation_pattern)
            
            # حساب مخاطر الامتثال
            compliance_risk = self._calculate_compliance_risk_score(behavior_patterns.contract_compliance)
            
            # حساب مخاطر التواصل
            communication_risk = self._calculate_communication_risk_score(behavior_patterns.communication_pattern)
            
            # حساب النقاط الإجمالية
            total_risk_score = (
                payment_risk * self.risk_weights['payment_risk'] +
                violation_risk * self.risk_weights['violation_risk'] +
                compliance_risk * self.risk_weights['compliance_risk'] +
                communication_risk * self.risk_weights['communication_risk']
            )
            
            # تحديد مستوى المخاطر الإجمالي
            overall_risk_level = self._determine_risk_level(total_risk_score)
            
            # تحديد الإجراءات الموصى بها
            recommended_actions = self._recommend_actions(total_risk_score, behavior_patterns)
            
            return {
                'payment_risk_score': payment_risk,
                'violation_risk_score': violation_risk,
                'compliance_risk_score': compliance_risk,
                'communication_risk_score': communication_risk,
                'total_risk_score': total_risk_score,
                'overall_risk_level': overall_risk_level,
                'risk_factors': behavior_patterns.risk_indicators,
                'recommended_actions': recommended_actions,
                'risk_breakdown': {
                    'payment_contribution': payment_risk * self.risk_weights['payment_risk'],
                    'violation_contribution': violation_risk * self.risk_weights['violation_risk'],
                    'compliance_contribution': compliance_risk * self.risk_weights['compliance_risk'],
                    'communication_contribution': communication_risk * self.risk_weights['communication_risk']
                }
            }
            
        except Exception as e:
            logger.error(f"خطأ في حساب المخاطر الشاملة: {e}")
            return {'error': str(e)}
    
    def _calculate_payment_risk_score(self, payment_pattern: Dict) -> float:
        """حساب نقاط مخاطر المدفوعات"""
        if payment_pattern.get('status') in ['no_data', 'error']:
            return 50  # متوسط افتراضي
        
        score = 0
        
        # نسبة المدفوعات المتأخرة
        overdue_percentage = payment_pattern.get('overdue_percentage', 0)
        score += min(overdue_percentage * 2, 40)  # حد أقصى 40 نقطة
        
        # متوسط التأخير
        avg_delay = payment_pattern.get('average_delay_days', 0)
        score += min(avg_delay, 30)  # حد أقصى 30 نقطة
        
        # المبلغ المستحق
        overdue_amount = payment_pattern.get('total_overdue_amount', 0)
        score += min(overdue_amount / 1000 * 5, 30)  # حد أقصى 30 نقطة
        
        return min(score, 100)
    
    def _calculate_violation_risk_score(self, violation_pattern: Dict) -> float:
        """حساب نقاط مخاطر المخالفات"""
        if violation_pattern.get('status') in ['no_violations', 'error']:
            return 0 if violation_pattern.get('status') == 'no_violations' else 50
        
        score = 0
        
        # عدد المخالفات النشطة
        active_violations = violation_pattern.get('active_violations', 0)
        score += min(active_violations * 15, 45)  # حد أقصى 45 نقطة
        
        # تكرار المخالفات
        frequency = violation_pattern.get('violation_frequency', 0)
        score += min(frequency * 10, 30)  # حد أقصى 30 نقطة
        
        # متوسط الغرامات
        avg_penalty = violation_pattern.get('average_penalty', 0)
        score += min(avg_penalty / 100, 25)  # حد أقصى 25 نقطة
        
        return min(score, 100)
    
    def _calculate_compliance_risk_score(self, compliance_pattern: Dict) -> float:
        """حساب نقاط مخاطر الامتثال"""
        if compliance_pattern.get('status') in ['no_contracts', 'error']:
            return 0 if compliance_pattern.get('status') == 'no_contracts' else 50
        
        compliance_score = compliance_pattern.get('compliance_score', 100)
        
        # تحويل نقاط الامتثال إلى نقاط مخاطر (عكسي)
        risk_score = 100 - compliance_score
        
        return max(0, risk_score)
    
    def _calculate_communication_risk_score(self, communication_pattern: Dict) -> float:
        """حساب نقاط مخاطر التواصل"""
        score = 0
        
        # معدل الاستجابة
        response_rate = communication_pattern.get('response_rate', 100)
        score += (100 - response_rate) * 0.5  # حد أقصى 50 نقطة
        
        # وقت الاستجابة
        response_time = communication_pattern.get('avg_response_time', 0)
        score += min(response_time / 24 * 25, 50)  # حد أقصى 50 نقطة
        
        return min(score, 100)
    
    def _determine_risk_level(self, risk_score: float) -> str:
        """تحديد مستوى المخاطر"""
        if risk_score >= 80:
            return RiskLevel.CRITICAL.value
        elif risk_score >= 60:
            return RiskLevel.HIGH.value
        elif risk_score >= 40:
            return RiskLevel.MEDIUM.value
        else:
            return RiskLevel.LOW.value
    
    def _recommend_actions(self, risk_score: float, behavior_patterns: BehaviorPattern) -> List[str]:
        """توصية الإجراءات بناءً على المخاطر"""
        actions = []
        
        if risk_score >= 80:
            actions.extend([
                'إرسال إنذار قانوني فوري',
                'تجميد الخدمات',
                'مراجعة قانونية شاملة',
                'تقييم إمكانية إنهاء العقد'
            ])
        elif risk_score >= 60:
            actions.extend([
                'إرسال تنبيه رسمي',
                'جدولة اجتماع عاجل',
                'مراجعة شروط العقد',
                'وضع خطة سداد'
            ])
        elif risk_score >= 40:
            actions.extend([
                'إرسال تذكير بالمدفوعات',
                'متابعة دورية',
                'تقييم الوضع المالي'
            ])
        else:
            actions.extend([
                'متابعة روتينية',
                'تقدير إيجابي للعميل'
            ])
        
        # إضافة إجراءات محددة بناءً على الأنماط
        if 'نسبة عالية من المدفوعات المتأخرة' in behavior_patterns.risk_indicators:
            actions.append('وضع نظام تذكير تلقائي للمدفوعات')
        
        if 'عدد كبير من المخالفات النشطة' in behavior_patterns.risk_indicators:
            actions.append('مراجعة شروط الاستخدام مع العميل')
        
        return actions

class LegalPrecedentFinder:
    """باحث السوابق القانونية"""
    
    def __init__(self):
        # قاعدة بيانات السوابق القانونية (محاكاة)
        self.precedents_db = self._initialize_precedents_db()
    
    def _initialize_precedents_db(self) -> List[Dict]:
        """تهيئة قاعدة بيانات السوابق القانونية"""
        return [
            {
                'case_id': 'KW-2023-001',
                'case_type': 'payment_delay',
                'client_profile': {
                    'risk_level': 'high',
                    'overdue_amount': 5000,
                    'delay_days': 45
                },
                'legal_action': 'legal_notice',
                'outcome': 'successful_payment',
                'success_rate': 85,
                'jurisdiction': 'kuwait'
            },
            {
                'case_id': 'SA-2023-002',
                'case_type': 'contract_violation',
                'client_profile': {
                    'risk_level': 'high',
                    'violation_count': 3,
                    'compliance_score': 45
                },
                'legal_action': 'contract_termination',
                'outcome': 'contract_terminated',
                'success_rate': 92,
                'jurisdiction': 'saudi_arabia'
            },
            {
                'case_id': 'QA-2023-003',
                'case_type': 'payment_delay',
                'client_profile': {
                    'risk_level': 'medium',
                    'overdue_amount': 2000,
                    'delay_days': 20
                },
                'legal_action': 'payment_reminder',
                'outcome': 'successful_payment',
                'success_rate': 78,
                'jurisdiction': 'qatar'
            }
        ]
    
    def find_similar_cases(self, client_data: Dict, request_type: str) -> List[Dict]:
        """البحث عن الحالات المشابهة"""
        try:
            similar_cases = []
            
            # استخراج خصائص العميل الحالي
            current_profile = self._extract_client_profile(client_data)
            
            # البحث في قاعدة البيانات
            for precedent in self.precedents_db:
                similarity_score = self._calculate_similarity(
                    current_profile, precedent['client_profile']
                )
                
                if similarity_score > 0.6:  # حد أدنى للتشابه
                    precedent_copy = precedent.copy()
                    precedent_copy['similarity_score'] = similarity_score
                    similar_cases.append(precedent_copy)
            
            # ترتيب حسب التشابه
            similar_cases.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            return similar_cases[:5]  # أفضل 5 حالات مشابهة
            
        except Exception as e:
            logger.error(f"خطأ في البحث عن السوابق القانونية: {e}")
            return []
    
    def _extract_client_profile(self, client_data: Dict) -> Dict:
        """استخراج ملف العميل للمقارنة"""
        risk_assessment = client_data.get('risk_assessment', {})
        
        return {
            'risk_level': risk_assessment.get('risk_level', 'medium'),
            'overdue_amount': risk_assessment.get('overdue_amount', 0),
            'delay_days': risk_assessment.get('payment_delays', 0),
            'violation_count': risk_assessment.get('violation_count', 0),
            'compliance_score': 100 - risk_assessment.get('overall_risk_score', 50)
        }
    
    def _calculate_similarity(self, profile1: Dict, profile2: Dict) -> float:
        """حساب درجة التشابه بين ملفين"""
        similarity_factors = []
        
        # مقارنة مستوى المخاطر
        risk_levels = ['low', 'medium', 'high', 'critical']
        risk1_idx = risk_levels.index(profile1.get('risk_level', 'medium').lower())
        risk2_idx = risk_levels.index(profile2.get('risk_level', 'medium').lower())
        risk_similarity = 1 - abs(risk1_idx - risk2_idx) / len(risk_levels)
        similarity_factors.append(risk_similarity)
        
        # مقارنة المبلغ المستحق
        amount1 = profile1.get('overdue_amount', 0)
        amount2 = profile2.get('overdue_amount', 0)
        if amount1 > 0 and amount2 > 0:
            amount_similarity = 1 - abs(amount1 - amount2) / max(amount1, amount2)
            similarity_factors.append(amount_similarity)
        
        # مقارنة أيام التأخير
        delay1 = profile1.get('delay_days', 0)
        delay2 = profile2.get('delay_days', 0)
        if delay1 > 0 and delay2 > 0:
            delay_similarity = 1 - abs(delay1 - delay2) / max(delay1, delay2)
            similarity_factors.append(delay_similarity)
        
        # حساب المتوسط
        return sum(similarity_factors) / len(similarity_factors) if similarity_factors else 0

class ContextualAnalysisEngine:
    """محرك التحليل السياقي الرئيسي"""
    
    def __init__(self):
        self.pattern_analyzer = PatternAnalyzer()
        self.risk_calculator = RiskCalculator()
        self.legal_precedent_finder = LegalPrecedentFinder()
        self.analysis_cache = {}
    
    def analyze_legal_context(self, client_data: Dict, request_type: str) -> Dict[str, Any]:
        """تحليل السياق القانوني الشامل"""
        try:
            start_time = time.time()
            
            # فحص التخزين المؤقت
            cache_key = f"legal_context:{client_data.get('personal_info', {}).get('id', 'unknown')}:{request_type}"
            cached_analysis = self.analysis_cache.get(cache_key)
            if cached_analysis and time.time() - cached_analysis['timestamp'] < 300:  # 5 دقائق
                return cached_analysis['data']
            
            # تحليل أنماط السلوك
            behavior_patterns = self.pattern_analyzer.analyze_patterns(
                client_data.get('payments', []),
                client_data.get('violations', []),
                client_data.get('contracts', [])
            )
            
            # حساب مستوى المخاطر الشامل
            risk_assessment = self.risk_calculator.calculate_comprehensive_risk(
                client_data, behavior_patterns
            )
            
            # البحث عن السوابق القانونية المشابهة
            similar_cases = self.legal_precedent_finder.find_similar_cases(
                client_data, request_type
            )
            
            # تحديد الإجراءات القانونية المناسبة
            recommended_actions = self._determine_legal_actions(
                client_data, risk_assessment, similar_cases, request_type
            )
            
            # حساب مستوى الإلحاح
            urgency_level = self._calculate_urgency(risk_assessment, client_data)
            
            # توليد المنطق القانوني
            legal_reasoning = self._generate_legal_reasoning(
                client_data, risk_assessment, request_type
            )
            
            # صياغة المطالبات القانونية
            legal_demands = self._formulate_legal_demands(
                legal_reasoning, risk_assessment, request_type
            )
            
            analysis_result = {
                'behavior_analysis': {
                    'payment_pattern': behavior_patterns.payment_pattern,
                    'violation_pattern': behavior_patterns.violation_pattern,
                    'contract_compliance': behavior_patterns.contract_compliance,
                    'communication_pattern': behavior_patterns.communication_pattern,
                    'risk_indicators': behavior_patterns.risk_indicators
                },
                'risk_assessment': risk_assessment,
                'legal_precedents': similar_cases,
                'recommended_actions': recommended_actions,
                'urgency_level': urgency_level,
                'legal_reasoning': legal_reasoning,
                'legal_demands': legal_demands,
                'analysis_metadata': {
                    'processing_time': time.time() - start_time,
                    'analysis_date': datetime.now().isoformat(),
                    'request_type': request_type,
                    'client_id': client_data.get('personal_info', {}).get('id', 'unknown')
                }
            }
            
            # حفظ في التخزين المؤقت
            self.analysis_cache[cache_key] = {
                'data': analysis_result,
                'timestamp': time.time()
            }
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"خطأ في تحليل السياق القانوني: {e}")
            return {'error': str(e)}
    
    def _determine_legal_actions(self, client_data: Dict, risk_assessment: Dict, similar_cases: List[Dict], request_type: str) -> List[str]:
        """تحديد الإجراءات القانونية المناسبة"""
        actions = []
        
        risk_level = risk_assessment.get('overall_risk_level', 'متوسط')
        
        # إجراءات بناءً على مستوى المخاطر
        if risk_level == 'حرج':
            actions.extend([
                'إرسال إنذار قانوني نهائي',
                'تجميد جميع الخدمات',
                'بدء إجراءات قانونية',
                'تقييم إمكانية إنهاء العقد'
            ])
        elif risk_level == 'عالي':
            actions.extend([
                'إرسال إنذار قانوني',
                'جدولة اجتماع عاجل',
                'وضع خطة سداد إلزامية',
                'مراجعة شروط العقد'
            ])
        elif risk_level == 'متوسط':
            actions.extend([
                'إرسال تنبيه رسمي',
                'متابعة دورية مكثفة',
                'تقييم الوضع المالي'
            ])
        else:
            actions.extend([
                'متابعة روتينية',
                'إرسال تذكير ودي'
            ])
        
        # إجراءات بناءً على نوع الطلب
        if request_type == 'legal_notice':
            actions.append('صياغة إنذار قانوني مفصل')
        elif request_type == 'payment_demand':
            actions.append('إعداد مطالبة مالية رسمية')
        elif request_type == 'contract_termination':
            actions.append('تحضير وثائق إنهاء العقد')
        
        # إجراءات بناءً على السوابق القانونية
        if similar_cases:
            most_similar = similar_cases[0]
            if most_similar['success_rate'] > 80:
                actions.append(f"تطبيق استراتيجية مشابهة للحالة {most_similar['case_id']}")
        
        return list(set(actions))  # إزالة التكرار
    
    def _calculate_urgency(self, risk_assessment: Dict, client_data: Dict) -> str:
        """حساب مستوى الإلحاح"""
        urgency_score = 0
        
        # عوامل الإلحاح
        risk_score = risk_assessment.get('total_risk_score', 0)
        urgency_score += risk_score * 0.4
        
        # المبلغ المستحق
        overdue_amount = risk_assessment.get('payment_risk_score', 0)
        urgency_score += min(overdue_amount / 1000 * 10, 30)
        
        # عدد المخالفات النشطة
        active_violations = len([v for v in client_data.get('violations', []) if v.get('status') == 'active'])
        urgency_score += active_violations * 10
        
        # تحديد مستوى الإلحاح
        if urgency_score >= 80:
            return UrgencyLevel.URGENT.value
        elif urgency_score >= 60:
            return UrgencyLevel.HIGH.value
        elif urgency_score >= 40:
            return UrgencyLevel.MEDIUM.value
        else:
            return UrgencyLevel.LOW.value
    
    def _generate_legal_reasoning(self, client_data: Dict, risk_assessment: Dict, request_type: str) -> List[LegalReasoning]:
        """توليد المنطق القانوني"""
        reasoning_elements = []
        
        # أسباب متعلقة بالمدفوعات
        payment_delays = risk_assessment.get('payment_risk_score', 0)
        if payment_delays > 30:
            reasoning_elements.append(LegalReasoning(
                reasoning_type='payment_violation',
                legal_basis='المادة 15 من قانون تأجير المركبات',
                details=f'تأخير في السداد بمعدل مخاطر {payment_delays:.1f}%',
                severity='عالي' if payment_delays > 60 else 'متوسط',
                supporting_evidence=[
                    'سجلات المدفوعات المتأخرة',
                    'إشعارات التذكير السابقة',
                    'بنود العقد المتعلقة بمواعيد السداد'
                ]
            ))
        
        # أسباب متعلقة بالمخالفات
        violations = client_data.get('violations', [])
        active_violations = [v for v in violations if v.get('status') == 'active']
        if active_violations:
            reasoning_elements.append(LegalReasoning(
                reasoning_type='contract_breach',
                legal_basis='البنود التعاقدية المتفق عليها',
                details=f'مخالفة {len(active_violations)} من بنود العقد',
                severity='عالي',
                supporting_evidence=[
                    'تقارير المخالفات الموثقة',
                    'شهادات الشهود',
                    'الأدلة الفوتوغرافية'
                ]
            ))
        
        # أسباب متعلقة بالامتثال
        compliance_score = risk_assessment.get('compliance_risk_score', 0)
        if compliance_score > 40:
            reasoning_elements.append(LegalReasoning(
                reasoning_type='compliance_failure',
                legal_basis='شروط وأحكام الخدمة',
                details=f'ضعف في الامتثال بنسبة {compliance_score:.1f}%',
                severity='متوسط' if compliance_score < 70 else 'عالي',
                supporting_evidence=[
                    'تقييمات الامتثال الدورية',
                    'مراسلات التنبيه السابقة',
                    'سجلات عدم الالتزام'
                ]
            ))
        
        return reasoning_elements
    
    def _formulate_legal_demands(self, legal_reasoning: List[LegalReasoning], risk_assessment: Dict, request_type: str) -> List[LegalDemand]:
        """صياغة المطالبات القانونية"""
        demands = []
        
        # مطالبات مالية
        overdue_amount = 0
        for reasoning in legal_reasoning:
            if reasoning.reasoning_type == 'payment_violation':
                # حساب المبلغ المستحق (محاكاة)
                overdue_amount = risk_assessment.get('payment_risk_score', 0) * 100
                
                demands.append(LegalDemand(
                    demand_type='payment_demand',
                    description=f'سداد المبلغ المستحق والبالغ {overdue_amount:.2f} دينار',
                    amount=overdue_amount,
                    deadline=datetime.now() + timedelta(days=15),
                    consequences=[
                        'تطبيق غرامات التأخير',
                        'تجميد الخدمات',
                        'اتخاذ إجراءات قانونية'
                    ]
                ))
        
        # مطالبات سلوكية
        for reasoning in legal_reasoning:
            if reasoning.reasoning_type == 'contract_breach':
                demands.append(LegalDemand(
                    demand_type='behavioral_correction',
                    description='الالتزام بجميع بنود العقد وتجنب المخالفات',
                    amount=None,
                    deadline=datetime.now() + timedelta(days=7),
                    consequences=[
                        'إنهاء العقد',
                        'المطالبة بالتعويضات',
                        'المنع من الخدمات المستقبلية'
                    ]
                ))
        
        # مطالبات امتثال
        for reasoning in legal_reasoning:
            if reasoning.reasoning_type == 'compliance_failure':
                demands.append(LegalDemand(
                    demand_type='compliance_improvement',
                    description='تحسين مستوى الامتثال لشروط وأحكام الخدمة',
                    amount=None,
                    deadline=datetime.now() + timedelta(days=30),
                    consequences=[
                        'مراجعة شاملة للعقد',
                        'فرض شروط إضافية',
                        'زيادة الضمانات المطلوبة'
                    ]
                ))
        
        return demands

# اختبار النظام
if __name__ == "__main__":
    # إنشاء محرك التحليل السياقي
    analysis_engine = ContextualAnalysisEngine()
    
    # بيانات عميل تجريبية
    test_client_data = {
        'personal_info': {'id': 1, 'name': 'أحمد محمد'},
        'payments': [
            {'id': 1, 'amount': 1000, 'payment_status': 'overdue', 'due_date': '2024-01-10', 'payment_date': '2024-01-15'},
            {'id': 2, 'amount': 1000, 'payment_status': 'overdue', 'due_date': '2024-02-10', 'payment_date': '2024-02-15'}
        ],
        'violations': [
            {'id': 1, 'description': 'تأخير في إرجاع السيارة', 'penalty_amount': 500, 'status': 'active'},
            {'id': 2, 'description': 'استخدام غير مصرح', 'penalty_amount': 1000, 'status': 'active'}
        ],
        'contracts': [
            {'id': 1, 'status': 'active', 'amount': 12000, 'terms': 'عقد تأجير سنوي'}
        ]
    }
    
    print("=== اختبار محرك التحليل السياقي ===")
    
    # تحليل السياق القانوني
    analysis_result = analysis_engine.analyze_legal_context(test_client_data, 'legal_notice')
    
    if 'error' not in analysis_result:
        print(f"مستوى المخاطر الإجمالي: {analysis_result['risk_assessment']['overall_risk_level']}")
        print(f"نقاط المخاطر: {analysis_result['risk_assessment']['total_risk_score']:.1f}")
        print(f"مستوى الإلحاح: {analysis_result['urgency_level']}")
        print(f"عدد الإجراءات الموصى بها: {len(analysis_result['recommended_actions'])}")
        print(f"عدد الأسباب القانونية: {len(analysis_result['legal_reasoning'])}")
        print(f"عدد المطالبات القانونية: {len(analysis_result['legal_demands'])}")
        print(f"وقت المعالجة: {analysis_result['analysis_metadata']['processing_time']:.3f} ثانية")
        
        print("\n=== الأسباب القانونية ===")
        for reasoning in analysis_result['legal_reasoning']:
            print(f"- {reasoning.reasoning_type}: {reasoning.details}")
            print(f"  الأساس القانوني: {reasoning.legal_basis}")
            print(f"  الشدة: {reasoning.severity}")
        
        print("\n=== المطالبات القانونية ===")
        for demand in analysis_result['legal_demands']:
            print(f"- {demand.demand_type}: {demand.description}")
            if demand.amount:
                print(f"  المبلغ: {demand.amount:.2f} دينار")
            print(f"  الموعد النهائي: {demand.deadline.strftime('%Y-%m-%d')}")
        
        print("\n=== مؤشرات المخاطر ===")
        for indicator in analysis_result['behavior_analysis']['risk_indicators']:
            print(f"- {indicator}")
    else:
        print(f"خطأ في التحليل: {analysis_result['error']}")
    
    print("\n=== اختبار الأداء مع التخزين المؤقت ===")
    
    # اختبار الأداء
    start_time = time.time()
    for i in range(3):
        analysis_engine.analyze_legal_context(test_client_data, 'legal_notice')
    end_time = time.time()
    
    print(f"وقت 3 تحليلات مع التخزين المؤقت: {end_time - start_time:.3f} ثانية")


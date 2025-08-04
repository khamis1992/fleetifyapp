"""
نظام إنشاء الوثائق القانونية المخصصة
يولد وثائق قانونية دقيقة ومخصصة بناءً على بيانات العميل والتحليل السياقي
"""

import json
import time
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
from jinja2 import Template, Environment, BaseLoader
import uuid

# إعداد نظام السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentType(Enum):
    """أنواع الوثائق القانونية"""
    LEGAL_NOTICE = "إنذار قانوني"
    PAYMENT_DEMAND = "مطالبة مالية"
    CONTRACT_TERMINATION = "إنهاء عقد"
    VIOLATION_WARNING = "تحذير من مخالفة"
    COMPLIANCE_NOTICE = "إشعار امتثال"

class Jurisdiction(Enum):
    """الولايات القضائية"""
    KUWAIT = "الكويت"
    SAUDI_ARABIA = "السعودية"
    QATAR = "قطر"

@dataclass
class DocumentMetadata:
    """بيانات وصفية للوثيقة"""
    document_id: str
    document_type: str
    client_id: str
    generated_at: datetime
    reference_number: str
    urgency_level: str
    legal_basis: List[str]
    jurisdiction: str

@dataclass
class ValidationResult:
    """نتيجة التحقق من صحة الوثيقة"""
    is_valid: bool
    issues: List[str]
    suggestions: List[str]
    completeness_score: float

class AdvancedTemplateEngine:
    """محرك القوالب المتقدم"""
    
    def __init__(self):
        self.templates = self._initialize_templates()
        self.jinja_env = Environment(loader=BaseLoader())
        
    def _initialize_templates(self) -> Dict[str, Dict]:
        """تهيئة قوالب الوثائق القانونية"""
        return {
            'legal_notice': {
                'kuwait': {
                    'template': """
بسم الله الرحمن الرحيم

إنذار قانوني نهائي

التاريخ: {{ date }}
الرقم المرجعي: {{ reference_number }}

إلى السيد/السيدة: {{ client_info.name }}
رقم الهوية: {{ client_info.id_number }}
العنوان: {{ client_info.address }}
الهاتف: {{ client_info.phone }}

الموضوع: إنذار قانوني نهائي بشأن {{ subject }}

تحية طيبة وبعد،

بناءً على العقد المبرم بيننا بتاريخ {{ contract_details.start_date }} والمسجل برقم {{ contract_details.id }}، وبموجب الأحكام والشروط المتفق عليها، نتشرف بإحاطتكم علماً بما يلي:

أولاً: الوقائع والأسباب
{% for reasoning in violation_details %}
{{ loop.index }}. {{ reasoning.details }}
   الأساس القانوني: {{ reasoning.legal_basis }}
   {% if reasoning.supporting_evidence %}
   الأدلة المؤيدة:
   {% for evidence in reasoning.supporting_evidence %}
   - {{ evidence }}
   {% endfor %}
   {% endif %}

{% endfor %}

ثانياً: المطالبات
{% for demand in legal_demands %}
{{ loop.index }}. {{ demand.description }}
   {% if demand.amount %}المبلغ المطلوب: {{ demand.amount }} دينار كويتي{% endif %}
   الموعد النهائي: {{ demand.deadline.strftime('%Y/%m/%d') }}

{% endfor %}

ثالثاً: العواقب القانونية
في حالة عدم الاستجابة لهذا الإنذار خلال المهلة المحددة، فإننا سنضطر إلى:
{% for consequence in consequences %}
- {{ consequence }}
{% endfor %}

رابعاً: الأساس القانوني
يستند هذا الإنذار إلى:
{% for basis in legal_basis %}
- {{ basis }}
{% endfor %}

وعليه، نطالبكم بضرورة الاستجابة لهذا الإنذار خلال مدة أقصاها {{ deadline.strftime('%Y/%m/%d') }}، وإلا فإننا سنتخذ كافة الإجراءات القانونية اللازمة لحفظ حقوقنا.

مع فائق الاحترام والتقدير،

{{ company_info.name }}
{{ company_info.address }}
{{ company_info.phone }}
{{ company_info.email }}

التوقيع: _______________
الاسم: {{ company_info.legal_representative }}
الصفة: {{ company_info.representative_title }}
""",
                    'required_fields': [
                        'client_info', 'contract_details', 'violation_details',
                        'legal_demands', 'consequences', 'legal_basis', 'deadline'
                    ]
                },
                'saudi_arabia': {
                    'template': """
بسم الله الرحمن الرحيم

إنذار على يد محضر

التاريخ: {{ date }}
الرقم: {{ reference_number }}

المنذر: {{ company_info.name }}
العنوان: {{ company_info.address }}
ممثلاً بـ: {{ company_info.legal_representative }}

المنذر إليه: {{ client_info.name }}
رقم الهوية: {{ client_info.id_number }}
العنوان: {{ client_info.address }}

الموضوع: إنذار قانوني

السلام عليكم ورحمة الله وبركاته، وبعد:

بموجب العقد المؤرخ في {{ contract_details.start_date }} والخاص بـ {{ contract_details.terms }}، نحيطكم علماً بما يلي:

البيانات والوقائع:
{% for reasoning in violation_details %}
{{ loop.index }}- {{ reasoning.details }}
{% endfor %}

المطالبة:
{% for demand in legal_demands %}
{{ loop.index }}- {{ demand.description }}
{% if demand.amount %}بمبلغ وقدره: {{ demand.amount }} ريال سعودي{% endif %}
{% endfor %}

لذا نطالبكم بسرعة تسوية الأمر خلال {{ (deadline - date).days }} يوماً من تاريخ هذا الإنذار، وإلا اضطررنا لاتخاذ الإجراءات النظامية.

والله الموفق،

{{ company_info.name }}
التوقيع: _______________
""",
                    'required_fields': [
                        'client_info', 'contract_details', 'violation_details',
                        'legal_demands', 'deadline'
                    ]
                },
                'qatar': {
                    'template': """
دولة قطر

إنذار قانوني

التاريخ: {{ date }}
المرجع: {{ reference_number }}

من: {{ company_info.name }}
إلى: {{ client_info.name }}

الموضوع: إنذار قانوني نهائي

تحية طيبة وبعد،

استناداً إلى العقد المبرم بيننا والمؤرخ في {{ contract_details.start_date }}، نحيطكم علماً بالآتي:

الأسباب:
{% for reasoning in violation_details %}
- {{ reasoning.details }} ({{ reasoning.legal_basis }})
{% endfor %}

المطلوب:
{% for demand in legal_demands %}
- {{ demand.description }}
{% if demand.amount %}المبلغ: {{ demand.amount }} ريال قطري{% endif %}
{% endfor %}

المهلة النهائية: {{ deadline.strftime('%Y/%m/%d') }}

في حالة عدم الاستجابة، سنتخذ الإجراءات القانونية المناسبة.

مع التحية،
{{ company_info.name }}
""",
                    'required_fields': [
                        'client_info', 'contract_details', 'violation_details',
                        'legal_demands', 'deadline'
                    ]
                }
            },
            'payment_demand': {
                'kuwait': {
                    'template': """
مطالبة مالية

التاريخ: {{ date }}
الرقم المرجعي: {{ reference_number }}

إلى: {{ client_info.name }}
الموضوع: مطالبة بسداد مبلغ مستحق

تحية طيبة وبعد،

نتشرف بإحاطتكم علماً بأن لدينا مبلغاً مستحقاً في ذمتكم وقدره {{ total_amount }} دينار كويتي، وذلك تفصيله كالآتي:

تفاصيل المبالغ المستحقة:
{% for payment in overdue_payments %}
- فاتورة رقم {{ payment.id }} بتاريخ {{ payment.due_date }}: {{ payment.amount }} دينار
{% endfor %}

إجمالي المبلغ المستحق: {{ total_amount }} دينار كويتي
غرامة التأخير: {{ late_fees }} دينار كويتي
المجموع الكلي: {{ total_with_fees }} دينار كويتي

نرجو منكم سرعة تسوية هذا المبلغ خلال {{ grace_period }} يوماً من تاريخ هذه المطالبة.

مع الشكر والتقدير،
{{ company_info.name }}
""",
                    'required_fields': [
                        'client_info', 'overdue_payments', 'total_amount',
                        'late_fees', 'total_with_fees', 'grace_period'
                    ]
                }
            },
            'contract_termination': {
                'kuwait': {
                    'template': """
إشعار إنهاء عقد

التاريخ: {{ date }}
الرقم المرجعي: {{ reference_number }}

إلى: {{ client_info.name }}
الموضوع: إشعار بإنهاء العقد رقم {{ contract_details.id }}

تحية طيبة وبعد،

نحيطكم علماً بأننا قررنا إنهاء العقد المبرم بيننا والمؤرخ في {{ contract_details.start_date }} وذلك للأسباب التالية:

أسباب الإنهاء:
{% for reason in termination_reasons %}
- {{ reason }}
{% endfor %}

تاريخ سريان الإنهاء: {{ termination_date.strftime('%Y/%m/%d') }}

الالتزامات المترتبة:
{% for obligation in obligations %}
- {{ obligation }}
{% endfor %}

نرجو منكم الالتزام بما ورد أعلاه.

مع التحية،
{{ company_info.name }}
""",
                    'required_fields': [
                        'client_info', 'contract_details', 'termination_reasons',
                        'termination_date', 'obligations'
                    ]
                }
            }
        }
    
    def select_template(self, document_type: str, jurisdiction: str, notice_type: str = None, severity: str = None) -> Dict:
        """اختيار القالب المناسب"""
        try:
            # تحويل أسماء الولايات القضائية
            jurisdiction_map = {
                'kuwait': 'kuwait',
                'الكويت': 'kuwait',
                'saudi_arabia': 'saudi_arabia',
                'السعودية': 'saudi_arabia',
                'qatar': 'qatar',
                'قطر': 'qatar'
            }
            
            jurisdiction_key = jurisdiction_map.get(jurisdiction.lower(), 'kuwait')
            
            # البحث عن القالب
            if document_type in self.templates:
                if jurisdiction_key in self.templates[document_type]:
                    return self.templates[document_type][jurisdiction_key]
                else:
                    # استخدام القالب الافتراضي (الكويت)
                    return self.templates[document_type]['kuwait']
            else:
                # استخدام قالب الإنذار القانوني كافتراضي
                return self.templates['legal_notice'][jurisdiction_key]
                
        except Exception as e:
            logger.error(f"خطأ في اختيار القالب: {e}")
            return self.templates['legal_notice']['kuwait']
    
    def render_template(self, template_config: Dict, template_data: Dict) -> str:
        """تطبيق البيانات على القالب"""
        try:
            template_str = template_config['template']
            template = self.jinja_env.from_string(template_str)
            
            # تطبيق البيانات
            rendered_document = template.render(**template_data)
            
            # تنظيف النص
            rendered_document = self._clean_document_text(rendered_document)
            
            return rendered_document
            
        except Exception as e:
            logger.error(f"خطأ في تطبيق القالب: {e}")
            return f"خطأ في إنشاء الوثيقة: {str(e)}"
    
    def _clean_document_text(self, text: str) -> str:
        """تنظيف نص الوثيقة"""
        # إزالة الأسطر الفارغة الزائدة
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        
        # إزالة المسافات الزائدة
        text = re.sub(r' +', ' ', text)
        
        # تنظيف بداية ونهاية النص
        text = text.strip()
        
        return text

class LegalDocumentFormatter:
    """منسق الوثائق القانونية"""
    
    def __init__(self):
        self.formatting_rules = self._initialize_formatting_rules()
    
    def _initialize_formatting_rules(self) -> Dict:
        """تهيئة قواعد التنسيق"""
        return {
            'arabic': {
                'font_family': 'Traditional Arabic',
                'font_size': 12,
                'line_spacing': 1.5,
                'paragraph_spacing': 6,
                'margins': {'top': 2.5, 'bottom': 2.5, 'left': 2.5, 'right': 2.5}
            },
            'legal_structure': {
                'header_style': 'bold',
                'section_numbering': 'arabic',
                'bullet_style': 'dash',
                'signature_spacing': 3
            }
        }
    
    def format_document(self, document_text: str, document_type: str = None) -> str:
        """تنسيق الوثيقة القانونية"""
        try:
            # تطبيق التنسيق الأساسي
            formatted_text = self._apply_basic_formatting(document_text)
            
            # تطبيق التنسيق القانوني
            formatted_text = self._apply_legal_formatting(formatted_text, document_type)
            
            # تطبيق التنسيق العربي
            formatted_text = self._apply_arabic_formatting(formatted_text)
            
            return formatted_text
            
        except Exception as e:
            logger.error(f"خطأ في تنسيق الوثيقة: {e}")
            return document_text
    
    def _apply_basic_formatting(self, text: str) -> str:
        """تطبيق التنسيق الأساسي"""
        # تنسيق العناوين
        text = re.sub(r'^(.*إنذار.*|.*مطالبة.*|.*إشعار.*)$', r'**\1**', text, flags=re.MULTILINE)
        
        # تنسيق التواريخ والأرقام المرجعية
        text = re.sub(r'(التاريخ:|الرقم المرجعي:|المرجع:)', r'**\1**', text)
        
        # تنسيق الأقسام الرئيسية
        text = re.sub(r'^(أولاً:|ثانياً:|ثالثاً:|رابعاً:|الموضوع:|الأسباب:|المطلوب:|المهلة النهائية:)', r'**\1**', text, flags=re.MULTILINE)
        
        return text
    
    def _apply_legal_formatting(self, text: str, document_type: str) -> str:
        """تطبيق التنسيق القانوني"""
        # تنسيق المبالغ المالية
        text = re.sub(r'(\d+(?:\.\d+)?)\s*(دينار|ريال)', r'**\1 \2**', text)
        
        # تنسيق التواريخ
        text = re.sub(r'(\d{4}/\d{2}/\d{2})', r'**\1**', text)
        
        # تنسيق أرقام العقود والمراجع
        text = re.sub(r'(رقم\s+\d+)', r'**\1**', text)
        
        return text
    
    def _apply_arabic_formatting(self, text: str) -> str:
        """تطبيق التنسيق العربي"""
        # تصحيح اتجاه النص للأرقام والتواريخ
        text = re.sub(r'(\d{4})/(\d{2})/(\d{2})', r'\1/\2/\3', text)
        
        # تنسيق علامات الترقيم العربية
        text = re.sub(r'،\s*', '، ', text)
        text = re.sub(r'؛\s*', '؛ ', text)
        
        return text

class DocumentValidationEngine:
    """محرك التحقق من صحة الوثائق"""
    
    def __init__(self):
        self.validation_rules = self._initialize_validation_rules()
    
    def _initialize_validation_rules(self) -> Dict:
        """تهيئة قواعد التحقق"""
        return {
            'required_elements': {
                'legal_notice': [
                    'client_name', 'client_id', 'date', 'reference_number',
                    'legal_basis', 'demands', 'deadline', 'company_signature'
                ],
                'payment_demand': [
                    'client_name', 'amount', 'due_date', 'payment_details'
                ],
                'contract_termination': [
                    'client_name', 'contract_id', 'termination_date', 'reasons'
                ]
            },
            'format_checks': [
                'proper_arabic_text',
                'correct_date_format',
                'valid_amounts',
                'complete_addresses',
                'proper_signatures'
            ],
            'legal_compliance': [
                'jurisdiction_requirements',
                'mandatory_clauses',
                'proper_legal_language',
                'adequate_notice_period'
            ]
        }
    
    def validate_document(self, document_text: str, document_type: str) -> ValidationResult:
        """التحقق من صحة الوثيقة"""
        try:
            issues = []
            suggestions = []
            completeness_score = 100.0
            
            # فحص العناصر المطلوبة
            required_elements = self.validation_rules['required_elements'].get(document_type, [])
            missing_elements = self._check_required_elements(document_text, required_elements)
            
            if missing_elements:
                issues.extend([f"عنصر مفقود: {element}" for element in missing_elements])
                completeness_score -= len(missing_elements) * 10
            
            # فحص التنسيق
            format_issues = self._check_format(document_text)
            if format_issues:
                issues.extend(format_issues)
                completeness_score -= len(format_issues) * 5
            
            # فحص الامتثال القانوني
            compliance_issues = self._check_legal_compliance(document_text, document_type)
            if compliance_issues:
                issues.extend(compliance_issues)
                completeness_score -= len(compliance_issues) * 15
            
            # توليد الاقتراحات
            suggestions = self._generate_suggestions(issues, document_type)
            
            # تحديد صحة الوثيقة
            is_valid = len(issues) == 0 and completeness_score >= 80
            
            return ValidationResult(
                is_valid=is_valid,
                issues=issues,
                suggestions=suggestions,
                completeness_score=max(0, completeness_score)
            )
            
        except Exception as e:
            logger.error(f"خطأ في التحقق من صحة الوثيقة: {e}")
            return ValidationResult(
                is_valid=False,
                issues=[f"خطأ في التحقق: {str(e)}"],
                suggestions=[],
                completeness_score=0
            )
    
    def _check_required_elements(self, document_text: str, required_elements: List[str]) -> List[str]:
        """فحص العناصر المطلوبة"""
        missing_elements = []
        
        element_patterns = {
            'client_name': r'(إلى|المنذر إليه):\s*(.+)',
            'client_id': r'رقم الهوية:\s*(\d+)',
            'date': r'التاريخ:\s*(\d{4}/\d{2}/\d{2})',
            'reference_number': r'(الرقم المرجعي|المرجع|الرقم):\s*(.+)',
            'legal_basis': r'(الأساس القانوني|استناداً إلى)',
            'demands': r'(المطالبة|المطلوب|نطالبكم)',
            'deadline': r'(المهلة النهائية|خلال.*يوم)',
            'company_signature': r'(التوقيع|الاسم.*الصفة)',
            'amount': r'\d+(?:\.\d+)?\s*(دينار|ريال)',
            'due_date': r'تاريخ الاستحقاق',
            'payment_details': r'(فاتورة|مبلغ)',
            'contract_id': r'العقد.*رقم\s*(\d+)',
            'termination_date': r'تاريخ.*الإنهاء',
            'reasons': r'(الأسباب|أسباب الإنهاء)'
        }
        
        for element in required_elements:
            if element in element_patterns:
                pattern = element_patterns[element]
                if not re.search(pattern, document_text, re.IGNORECASE):
                    missing_elements.append(element)
        
        return missing_elements
    
    def _check_format(self, document_text: str) -> List[str]:
        """فحص التنسيق"""
        format_issues = []
        
        # فحص التواريخ
        date_pattern = r'\d{4}/\d{2}/\d{2}'
        dates = re.findall(date_pattern, document_text)
        for date_str in dates:
            try:
                datetime.strptime(date_str, '%Y/%m/%d')
            except ValueError:
                format_issues.append(f"تنسيق تاريخ غير صحيح: {date_str}")
        
        # فحص المبالغ المالية
        amount_pattern = r'\d+(?:\.\d+)?\s*(دينار|ريال)'
        amounts = re.findall(amount_pattern, document_text)
        if not amounts and 'مبلغ' in document_text:
            format_issues.append("مبالغ مالية غير منسقة بشكل صحيح")
        
        # فحص طول الوثيقة
        if len(document_text.split()) < 50:
            format_issues.append("الوثيقة قصيرة جداً")
        
        return format_issues
    
    def _check_legal_compliance(self, document_text: str, document_type: str) -> List[str]:
        """فحص الامتثال القانوني"""
        compliance_issues = []
        
        # فحص وجود الأساس القانوني
        if document_type == 'legal_notice':
            if not re.search(r'(المادة|القانون|النظام|اللائحة)', document_text):
                compliance_issues.append("لا يوجد أساس قانوني واضح")
        
        # فحص مهلة الإنذار
        if 'إنذار' in document_text:
            if not re.search(r'(\d+)\s*(يوم|أسبوع|شهر)', document_text):
                compliance_issues.append("لا توجد مهلة زمنية محددة")
        
        # فحص اللغة القانونية المناسبة
        legal_phrases = ['بموجب', 'استناداً إلى', 'وعليه', 'لذا نطالبكم']
        found_phrases = sum(1 for phrase in legal_phrases if phrase in document_text)
        if found_phrases < 2:
            compliance_issues.append("اللغة القانونية غير كافية")
        
        return compliance_issues
    
    def _generate_suggestions(self, issues: List[str], document_type: str) -> List[str]:
        """توليد اقتراحات التحسين"""
        suggestions = []
        
        for issue in issues:
            if "عنصر مفقود" in issue:
                suggestions.append(f"يرجى إضافة {issue.split(':')[1].strip()}")
            elif "تنسيق تاريخ" in issue:
                suggestions.append("استخدم تنسيق التاريخ: YYYY/MM/DD")
            elif "مبالغ مالية" in issue:
                suggestions.append("تأكد من كتابة المبالغ بالأرقام والعملة")
            elif "أساس قانوني" in issue:
                suggestions.append("أضف المرجع القانوني المناسب (مادة، قانون، لائحة)")
            elif "مهلة زمنية" in issue:
                suggestions.append("حدد مهلة زمنية واضحة للاستجابة")
            elif "اللغة القانونية" in issue:
                suggestions.append("استخدم عبارات قانونية أكثر رسمية")
        
        # اقتراحات عامة حسب نوع الوثيقة
        if document_type == 'legal_notice':
            suggestions.append("تأكد من وضوح الأسباب والمطالبات والعواقب")
        elif document_type == 'payment_demand':
            suggestions.append("فصل المبالغ الأساسية عن الغرامات والرسوم")
        elif document_type == 'contract_termination':
            suggestions.append("اذكر الالتزامات المترتبة على الطرفين بعد الإنهاء")
        
        return suggestions

class CustomLegalDocumentGenerator:
    """مولد الوثائق القانونية المخصصة الرئيسي"""
    
    def __init__(self):
        self.template_engine = AdvancedTemplateEngine()
        self.legal_formatter = LegalDocumentFormatter()
        self.validation_engine = DocumentValidationEngine()
        self.generation_cache = {}
    
    def generate_legal_notice(self, client_data: Dict, context_analysis: Dict, notice_type: str = 'general') -> Dict[str, Any]:
        """إنشاء إنذار قانوني مخصص"""
        try:
            start_time = time.time()
            
            # تحديد الولاية القضائية
            jurisdiction = self._determine_jurisdiction(client_data)
            
            # اختيار القالب المناسب
            template = self.template_engine.select_template(
                document_type='legal_notice',
                jurisdiction=jurisdiction,
                notice_type=notice_type,
                severity=context_analysis.get('urgency_level', 'متوسط')
            )
            
            # تجميع البيانات للقالب
            template_data = self._prepare_legal_notice_data(client_data, context_analysis)
            
            # إنشاء الوثيقة
            document = self.template_engine.render_template(template, template_data)
            
            # التحقق من صحة الوثيقة
            validation_result = self.validation_engine.validate_document(document, 'legal_notice')
            
            # إصلاح المشاكل إذا وجدت
            if not validation_result.is_valid:
                document = self._fix_document_issues(document, validation_result.issues, template_data)
                # إعادة التحقق
                validation_result = self.validation_engine.validate_document(document, 'legal_notice')
            
            # تنسيق نهائي
            formatted_document = self.legal_formatter.format_document(document, 'legal_notice')
            
            # إنشاء البيانات الوصفية
            metadata = self._create_document_metadata(
                document_type='legal_notice',
                client_data=client_data,
                context_analysis=context_analysis,
                jurisdiction=jurisdiction
            )
            
            # إنشاء المرفقات الداعمة
            attachments = self._generate_supporting_documents(client_data, context_analysis)
            
            processing_time = time.time() - start_time
            
            return {
                'success': True,
                'document': formatted_document,
                'metadata': metadata,
                'validation_result': {
                    'is_valid': validation_result.is_valid,
                    'completeness_score': validation_result.completeness_score,
                    'issues': validation_result.issues,
                    'suggestions': validation_result.suggestions
                },
                'attachments': attachments,
                'processing_time': processing_time,
                'generation_stats': {
                    'template_used': f"{jurisdiction}_legal_notice",
                    'data_sources': len(template_data),
                    'document_length': len(formatted_document.split()),
                    'legal_reasoning_count': len(context_analysis.get('legal_reasoning', [])),
                    'demands_count': len(context_analysis.get('legal_demands', []))
                }
            }
            
        except Exception as e:
            logger.error(f"خطأ في إنشاء الإنذار القانوني: {e}")
            return {
                'success': False,
                'error': str(e),
                'document': None
            }
    
    def generate_payment_demand(self, client_data: Dict, context_analysis: Dict) -> Dict[str, Any]:
        """إنشاء مطالبة مالية مخصصة"""
        try:
            jurisdiction = self._determine_jurisdiction(client_data)
            template = self.template_engine.select_template('payment_demand', jurisdiction)
            
            # تحضير بيانات المطالبة المالية
            template_data = self._prepare_payment_demand_data(client_data, context_analysis)
            
            document = self.template_engine.render_template(template, template_data)
            validation_result = self.validation_engine.validate_document(document, 'payment_demand')
            
            if not validation_result.is_valid:
                document = self._fix_document_issues(document, validation_result.issues, template_data)
            
            formatted_document = self.legal_formatter.format_document(document, 'payment_demand')
            
            metadata = self._create_document_metadata(
                document_type='payment_demand',
                client_data=client_data,
                context_analysis=context_analysis,
                jurisdiction=jurisdiction
            )
            
            return {
                'success': True,
                'document': formatted_document,
                'metadata': metadata,
                'validation_result': validation_result.__dict__
            }
            
        except Exception as e:
            logger.error(f"خطأ في إنشاء المطالبة المالية: {e}")
            return {'success': False, 'error': str(e)}
    
    def generate_contract_termination(self, client_data: Dict, context_analysis: Dict) -> Dict[str, Any]:
        """إنشاء وثيقة إنهاء عقد"""
        try:
            jurisdiction = self._determine_jurisdiction(client_data)
            template = self.template_engine.select_template('contract_termination', jurisdiction)
            
            template_data = self._prepare_contract_termination_data(client_data, context_analysis)
            
            document = self.template_engine.render_template(template, template_data)
            validation_result = self.validation_engine.validate_document(document, 'contract_termination')
            
            if not validation_result.is_valid:
                document = self._fix_document_issues(document, validation_result.issues, template_data)
            
            formatted_document = self.legal_formatter.format_document(document, 'contract_termination')
            
            metadata = self._create_document_metadata(
                document_type='contract_termination',
                client_data=client_data,
                context_analysis=context_analysis,
                jurisdiction=jurisdiction
            )
            
            return {
                'success': True,
                'document': formatted_document,
                'metadata': metadata,
                'validation_result': validation_result.__dict__
            }
            
        except Exception as e:
            logger.error(f"خطأ في إنشاء وثيقة إنهاء العقد: {e}")
            return {'success': False, 'error': str(e)}
    
    def _determine_jurisdiction(self, client_data: Dict) -> str:
        """تحديد الولاية القضائية"""
        address = client_data.get('personal_info', {}).get('address', '').lower()
        
        if 'كويت' in address or 'kuwait' in address:
            return 'kuwait'
        elif 'سعود' in address or 'رياض' in address or 'saudi' in address:
            return 'saudi_arabia'
        elif 'قطر' in address or 'qatar' in address or 'doha' in address:
            return 'qatar'
        else:
            return 'kuwait'  # افتراضي
    
    def _prepare_legal_notice_data(self, client_data: Dict, context_analysis: Dict) -> Dict:
        """تحضير بيانات الإنذار القانوني"""
        personal_info = client_data.get('personal_info', {})
        contracts = client_data.get('contracts', [])
        
        # معلومات العميل
        client_info = {
            'name': personal_info.get('name', 'غير محدد'),
            'id_number': personal_info.get('id_number', 'غير محدد'),
            'address': personal_info.get('address', 'غير محدد'),
            'phone': personal_info.get('phone', 'غير محدد'),
            'email': personal_info.get('email', 'غير محدد')
        }
        
        # تفاصيل العقد
        main_contract = contracts[0] if contracts else {}
        contract_details = {
            'id': main_contract.get('id', 'غير محدد'),
            'start_date': main_contract.get('start_date', 'غير محدد'),
            'end_date': main_contract.get('end_date', 'غير محدد'),
            'terms': main_contract.get('terms', 'غير محدد'),
            'amount': main_contract.get('amount', 0)
        }
        
        # تفاصيل المخالفات
        violation_details = context_analysis.get('legal_reasoning', [])
        
        # المطالبات القانونية
        legal_demands = context_analysis.get('legal_demands', [])
        
        # العواقب
        consequences = []
        for demand in legal_demands:
            consequences.extend(demand.consequences if hasattr(demand, 'consequences') else [])
        
        # الأساس القانوني
        legal_basis = []
        for reasoning in violation_details:
            if hasattr(reasoning, 'legal_basis'):
                legal_basis.append(reasoning.legal_basis)
        
        # معلومات الشركة
        company_info = {
            'name': 'شركة فليتيفاي لتأجير السيارات',
            'address': 'الكويت، منطقة الشرق',
            'phone': '+965 1234 5678',
            'email': 'legal@fleetifyapp.com',
            'legal_representative': 'المدير القانوني',
            'representative_title': 'المدير القانوني'
        }
        
        return {
            'date': datetime.now(),
            'reference_number': self._generate_reference_number(),
            'subject': self._determine_subject(context_analysis),
            'client_info': client_info,
            'contract_details': contract_details,
            'violation_details': violation_details,
            'legal_demands': legal_demands,
            'consequences': consequences,
            'legal_basis': legal_basis,
            'deadline': datetime.now() + timedelta(days=15),
            'company_info': company_info
        }
    
    def _prepare_payment_demand_data(self, client_data: Dict, context_analysis: Dict) -> Dict:
        """تحضير بيانات المطالبة المالية"""
        payments = client_data.get('payments', [])
        overdue_payments = [p for p in payments if p.get('payment_status') == 'overdue']
        
        total_amount = sum(p.get('amount', 0) for p in overdue_payments)
        late_fees = total_amount * 0.05  # 5% رسوم تأخير
        total_with_fees = total_amount + late_fees
        
        return {
            'date': datetime.now(),
            'reference_number': self._generate_reference_number(),
            'client_info': client_data.get('personal_info', {}),
            'overdue_payments': overdue_payments,
            'total_amount': total_amount,
            'late_fees': late_fees,
            'total_with_fees': total_with_fees,
            'grace_period': 10,
            'company_info': {
                'name': 'شركة فليتيفاي لتأجير السيارات',
                'address': 'الكويت، منطقة الشرق',
                'phone': '+965 1234 5678'
            }
        }
    
    def _prepare_contract_termination_data(self, client_data: Dict, context_analysis: Dict) -> Dict:
        """تحضير بيانات إنهاء العقد"""
        contracts = client_data.get('contracts', [])
        main_contract = contracts[0] if contracts else {}
        
        # أسباب الإنهاء
        termination_reasons = []
        for reasoning in context_analysis.get('legal_reasoning', []):
            if hasattr(reasoning, 'details'):
                termination_reasons.append(reasoning.details)
        
        # الالتزامات
        obligations = [
            'إرجاع جميع المركبات المؤجرة',
            'سداد جميع المبالغ المستحقة',
            'تسليم جميع الوثائق والمفاتيح',
            'إزالة أي تعديلات على المركبات'
        ]
        
        return {
            'date': datetime.now(),
            'reference_number': self._generate_reference_number(),
            'client_info': client_data.get('personal_info', {}),
            'contract_details': main_contract,
            'termination_reasons': termination_reasons,
            'termination_date': datetime.now() + timedelta(days=30),
            'obligations': obligations,
            'company_info': {
                'name': 'شركة فليتيفاي لتأجير السيارات'
            }
        }
    
    def _generate_reference_number(self) -> str:
        """توليد رقم مرجعي"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M')
        random_suffix = str(uuid.uuid4())[:8].upper()
        return f"FL-{timestamp}-{random_suffix}"
    
    def _determine_subject(self, context_analysis: Dict) -> str:
        """تحديد موضوع الإنذار"""
        risk_level = context_analysis.get('risk_assessment', {}).get('overall_risk_level', 'متوسط')
        
        if risk_level == 'حرج':
            return 'مخالفات جسيمة وتأخير في السداد'
        elif risk_level == 'عالي':
            return 'تأخير في السداد ومخالفات عقدية'
        elif risk_level == 'متوسط':
            return 'تأخير في السداد'
        else:
            return 'تذكير بالالتزامات التعاقدية'
    
    def _create_document_metadata(self, document_type: str, client_data: Dict, context_analysis: Dict, jurisdiction: str) -> DocumentMetadata:
        """إنشاء البيانات الوصفية للوثيقة"""
        legal_basis = []
        for reasoning in context_analysis.get('legal_reasoning', []):
            if hasattr(reasoning, 'legal_basis'):
                legal_basis.append(reasoning.legal_basis)
        
        return DocumentMetadata(
            document_id=str(uuid.uuid4()),
            document_type=document_type,
            client_id=str(client_data.get('personal_info', {}).get('id', 'unknown')),
            generated_at=datetime.now(),
            reference_number=self._generate_reference_number(),
            urgency_level=context_analysis.get('urgency_level', 'متوسط'),
            legal_basis=legal_basis,
            jurisdiction=jurisdiction
        )
    
    def _generate_supporting_documents(self, client_data: Dict, context_analysis: Dict) -> List[Dict]:
        """إنشاء الوثائق الداعمة"""
        attachments = []
        
        # ملخص بيانات العميل
        client_summary = {
            'type': 'client_summary',
            'title': 'ملخص بيانات العميل',
            'content': self._create_client_summary(client_data)
        }
        attachments.append(client_summary)
        
        # تقرير تحليل المخاطر
        risk_report = {
            'type': 'risk_analysis',
            'title': 'تقرير تحليل المخاطر',
            'content': self._create_risk_analysis_report(context_analysis)
        }
        attachments.append(risk_report)
        
        return attachments
    
    def _create_client_summary(self, client_data: Dict) -> str:
        """إنشاء ملخص بيانات العميل"""
        personal_info = client_data.get('personal_info', {})
        contracts = client_data.get('contracts', [])
        payments = client_data.get('payments', [])
        violations = client_data.get('violations', [])
        
        summary = f"""
ملخص بيانات العميل

الاسم: {personal_info.get('name', 'غير محدد')}
رقم الهوية: {personal_info.get('id_number', 'غير محدد')}
الهاتف: {personal_info.get('phone', 'غير محدد')}
العنوان: {personal_info.get('address', 'غير محدد')}

إحصائيات العقود:
- عدد العقود: {len(contracts)}
- العقود النشطة: {len([c for c in contracts if c.get('status') == 'active'])}

إحصائيات المدفوعات:
- إجمالي المدفوعات: {len(payments)}
- المدفوعات المتأخرة: {len([p for p in payments if p.get('payment_status') == 'overdue'])}
- إجمالي المبلغ المستحق: {sum(p.get('amount', 0) for p in payments if p.get('payment_status') == 'overdue')} دينار

إحصائيات المخالفات:
- إجمالي المخالفات: {len(violations)}
- المخالفات النشطة: {len([v for v in violations if v.get('status') == 'active'])}
"""
        return summary.strip()
    
    def _create_risk_analysis_report(self, context_analysis: Dict) -> str:
        """إنشاء تقرير تحليل المخاطر"""
        risk_assessment = context_analysis.get('risk_assessment', {})
        
        report = f"""
تقرير تحليل المخاطر

مستوى المخاطر الإجمالي: {risk_assessment.get('overall_risk_level', 'غير محدد')}
نقاط المخاطر: {risk_assessment.get('total_risk_score', 0):.1f}/100

تفصيل المخاطر:
- مخاطر المدفوعات: {risk_assessment.get('payment_risk_score', 0):.1f}
- مخاطر المخالفات: {risk_assessment.get('violation_risk_score', 0):.1f}
- مخاطر الامتثال: {risk_assessment.get('compliance_risk_score', 0):.1f}
- مخاطر التواصل: {risk_assessment.get('communication_risk_score', 0):.1f}

الإجراءات الموصى بها:
"""
        
        for action in risk_assessment.get('recommended_actions', []):
            report += f"- {action}\n"
        
        return report.strip()
    
    def _fix_document_issues(self, document: str, issues: List[str], template_data: Dict) -> str:
        """إصلاح مشاكل الوثيقة"""
        fixed_document = document
        
        for issue in issues:
            if "عنصر مفقود: client_name" in issue:
                client_name = template_data.get('client_info', {}).get('name', 'غير محدد')
                if 'إلى:' not in fixed_document:
                    fixed_document = f"إلى: {client_name}\n\n" + fixed_document
            
            elif "عنصر مفقود: date" in issue:
                if 'التاريخ:' not in fixed_document:
                    date_str = datetime.now().strftime('%Y/%m/%d')
                    fixed_document = f"التاريخ: {date_str}\n" + fixed_document
            
            elif "عنصر مفقود: reference_number" in issue:
                if 'الرقم المرجعي:' not in fixed_document:
                    ref_num = self._generate_reference_number()
                    fixed_document = f"الرقم المرجعي: {ref_num}\n" + fixed_document
        
        return fixed_document

# اختبار النظام
if __name__ == "__main__":
    # إنشاء مولد الوثائق
    document_generator = CustomLegalDocumentGenerator()
    
    # بيانات عميل تجريبية
    test_client_data = {
        'personal_info': {
            'id': 1,
            'name': 'أحمد محمد الكويتي',
            'id_number': '123456789',
            'address': 'الكويت، منطقة الشرق',
            'phone': '+965 1234 5678',
            'email': 'ahmed@example.com'
        },
        'contracts': [{
            'id': 'C001',
            'start_date': '2024-01-01',
            'end_date': '2024-12-31',
            'terms': 'عقد تأجير سيارة سنوي',
            'amount': 12000,
            'status': 'active'
        }],
        'payments': [
            {'id': 1, 'amount': 1000, 'payment_status': 'overdue', 'due_date': '2024-01-10'},
            {'id': 2, 'amount': 1000, 'payment_status': 'overdue', 'due_date': '2024-02-10'}
        ],
        'violations': [
            {'id': 1, 'description': 'تأخير في إرجاع السيارة', 'status': 'active'},
            {'id': 2, 'description': 'استخدام غير مصرح', 'status': 'active'}
        ]
    }
    
    # تحليل سياقي تجريبي
    test_context_analysis = {
        'risk_assessment': {
            'overall_risk_level': 'عالي',
            'total_risk_score': 75.5,
            'payment_risk_score': 60,
            'violation_risk_score': 80,
            'recommended_actions': ['إرسال إنذار قانوني', 'جدولة اجتماع عاجل']
        },
        'urgency_level': 'عالي',
        'legal_reasoning': [
            type('LegalReasoning', (), {
                'reasoning_type': 'payment_violation',
                'legal_basis': 'المادة 15 من قانون تأجير المركبات',
                'details': 'تأخير في السداد لمدة 45 يوماً',
                'severity': 'عالي',
                'supporting_evidence': ['سجلات المدفوعات', 'إشعارات التذكير']
            })(),
            type('LegalReasoning', (), {
                'reasoning_type': 'contract_breach',
                'legal_basis': 'البنود التعاقدية المتفق عليها',
                'details': 'مخالفة 2 من بنود العقد',
                'severity': 'عالي',
                'supporting_evidence': ['تقارير المخالفات']
            })()
        ],
        'legal_demands': [
            type('LegalDemand', (), {
                'demand_type': 'payment_demand',
                'description': 'سداد المبلغ المستحق والبالغ 2000 دينار',
                'amount': 2000,
                'deadline': datetime.now() + timedelta(days=15),
                'consequences': ['تطبيق غرامات التأخير', 'تجميد الخدمات']
            })()
        ]
    }
    
    print("=== اختبار مولد الوثائق القانونية المخصصة ===")
    
    # إنشاء إنذار قانوني
    result = document_generator.generate_legal_notice(test_client_data, test_context_analysis)
    
    if result['success']:
        print("✅ تم إنشاء الإنذار القانوني بنجاح")
        print(f"طول الوثيقة: {len(result['document'].split())} كلمة")
        print(f"درجة الاكتمال: {result['validation_result']['completeness_score']:.1f}%")
        print(f"صحة الوثيقة: {'صحيحة' if result['validation_result']['is_valid'] else 'تحتاج تحسين'}")
        print(f"وقت المعالجة: {result['processing_time']:.3f} ثانية")
        print(f"عدد المرفقات: {len(result['attachments'])}")
        
        print("\n=== نموذج من الوثيقة ===")
        print(result['document'][:500] + "...")
        
        if result['validation_result']['issues']:
            print("\n=== المشاكل المكتشفة ===")
            for issue in result['validation_result']['issues']:
                print(f"- {issue}")
        
        if result['validation_result']['suggestions']:
            print("\n=== اقتراحات التحسين ===")
            for suggestion in result['validation_result']['suggestions']:
                print(f"- {suggestion}")
    else:
        print(f"❌ فشل في إنشاء الوثيقة: {result['error']}")
    
    print("\n=== اختبار مطالبة مالية ===")
    
    # إنشاء مطالبة مالية
    payment_result = document_generator.generate_payment_demand(test_client_data, test_context_analysis)
    
    if payment_result['success']:
        print("✅ تم إنشاء المطالبة المالية بنجاح")
        print(f"درجة الاكتمال: {payment_result['validation_result']['completeness_score']:.1f}%")
        print("\n=== نموذج من المطالبة ===")
        print(payment_result['document'][:300] + "...")
    else:
        print(f"❌ فشل في إنشاء المطالبة: {payment_result['error']}")
    
    print("\n=== اختبار إنهاء عقد ===")
    
    # إنشاء وثيقة إنهاء عقد
    termination_result = document_generator.generate_contract_termination(test_client_data, test_context_analysis)
    
    if termination_result['success']:
        print("✅ تم إنشاء وثيقة إنهاء العقد بنجاح")
        print(f"درجة الاكتمال: {termination_result['validation_result']['completeness_score']:.1f}%")
        print("\n=== نموذج من الوثيقة ===")
        print(termination_result['document'][:300] + "...")
    else:
        print(f"❌ فشل في إنشاء وثيقة الإنهاء: {termination_result['error']}")


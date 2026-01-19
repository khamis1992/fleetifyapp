-- ============================================================================
-- Legal Case Templates for Customer Page
-- ============================================================================
-- Purpose: Add templates for traffic violation transfer and theft report
-- Created: 2025-01-19
-- ============================================================================

-- Insert traffic violation transfer template
INSERT INTO legal_document_templates (
  template_key,
  name_ar,
  name_en,
  category,
  description_ar,
  description_en,
  subject_template,
  body_template,
  variables,
  requires_approval
) VALUES (
  'traffic_violation_transfer_request',
  'طلب تحويل المخالفات المرورية',
  'Traffic Violation Transfer Request',
  'traffic',
  'طلب تحويل المخالفات المرورية على اسم العميل',
  'Request to transfer traffic violations to customer name',
  'طلب تحويل المخالفات المرورية - العميل: {{customer_name}}',
  'التاريخ: {{letter_date}}

السيد / رئيس نيابة المرور                المحترم
الدوحة – قطر

تحية طيبة وبعد ،،،

الموضوع
طلب ( تحويل المخالفات المرورية على الرقم الشخصي )

ضد المدعو / {{customer_name}}
الجنسية: {{nationality}}

بطاقة شخصية رقم: {{id_number}}

جوال رقم: {{phone_number}}


نحن شركة العراف لتأجير السيارات
السجل التجاري: 179973

العنوان:
أم صلال محمد – الشارع التجاري – مبنى 79 – الطابق الأول – مكتب (2)

رقم التواصل: 31411919


نتقدم إلى سعادتكم بطلب تحويل المخالفات المرورية ضد الشخص المذكور أعلاه،
والذي قام باستئجار مركبة من شركة العراف لتأجير السيارات بموجب العقد المبرم بين الطرفين بتاريخ {{contract_date}}،
علماً بأنه تم إرجاع المركبة بتاريخ {{return_date}}،
ولم يلتزم بسداد المخالفات المرورية،
وقد حاولنا التواصل معه عدة مرات دون استجابة.

لذا نرجو من سيادتكم التكرم بالموافقة على تحويل المخالفات المرورية إلى رقمه الشخصي.


بيانات المركبة كالتالي:

نوع المركبة: {{vehicle_type}}
رقم اللوحة: {{plate_number}}
نوع اللوحة: {{plate_type}}
سنة الصنع: {{manufacture_year}}


مرفق لسيادتكم:

- صورة من عقد الإيجار
- صورة من البطاقة الشخصية للمستأجر


نرجو من سيادتكم التكرم باتخاذ الإجراءات القانونية اللازمة ضده.

وتفضلوا بقبول فائق الاحترام والتقدير ،،،

عن / شركة العراف لتأجير السيارات',
  '[{"name":"customer_name","label":"اسم العميل","type":"text","required":true,"source":"customer"},{"name":"nationality","label":"الجنسية","type":"text","required":true,"source":"customer"},{"name":"id_number","label":"رقم الهوية","type":"text","required":true,"source":"customer"},{"name":"phone_number","label":"رقم الجوال","type":"text","required":true,"source":"customer"},{"name":"contract_date","label":"تاريخ العقد","type":"date","required":true,"source":"contract"},{"name":"return_date","label":"تاريخ الإرجاع","type":"date","required":true,"source":"contract"},{"name":"vehicle_type","label":"نوع المركبة","type":"text","required":true,"source":"vehicle"},{"name":"plate_number","label":"رقم اللوحة","type":"text","required":true,"source":"vehicle"},{"name":"plate_type","label":"نوع اللوحة","type":"text","required":true,"source":"vehicle"},{"name":"manufacture_year","label":"سنة الصنع","type":"number","required":true,"source":"vehicle"},{"name":"letter_date","label":"التاريخ","type":"date","required":false,"default":"today"}]'::jsonb,
  false
) ON CONFLICT (template_key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  body_template = EXCLUDED.body_template,
  variables = EXCLUDED.variables;

-- Insert theft report template
INSERT INTO legal_document_templates (
  template_key,
  name_ar,
  name_en,
  category,
  description_ar,
  description_en,
  subject_template,
  body_template,
  variables,
  requires_approval
) VALUES (
  'theft_report',
  'بلاغ سرقة مركبة',
  'Vehicle Theft Report',
  'general',
  'بلاغ سرقة مركبة لجهة الشرطة',
  'Theft report for police authorities',
  'بلاغ سرقة - اللوحة: {{plate_number}}',
  '{{company_name}}
السجل التجاري: {{commercial_register}}
العنوان: {{company_address}}
رقم التواصل: {{company_phone}}
التاريخ: {{letter_date}}

السيد / رئيس مركز شرطة مدينة خليفة المحترم
تحية طيبة وبعد ،،،

الموضوع: بلاغ سرقة مركبة

نفيدكم نحن {{company_name}} بأننا نتقدم إلى سعادتكم بهذا البلاغ بخصوص سرقة مركبة مملوكة للشركة، حيث تبين لنا فقدان المركبة وعدم إرجاعها حتى تاريخه، وعدم إمكانية التواصل مع الشخص الذي كانت بحوزته، الأمر الذي يُعد واقعة سرقة تستوجب اتخاذ الإجراءات القانونية اللازمة.

بيانات المركبة:
- نوع المركبة: {{vehicle_type}}
- رقم اللوحة: {{plate_number}}
- نوع اللوحة: {{plate_type}}
- سنة الصنع: {{manufacture_year}}
- رقم الشاصي: {{chassis_number}}
- لون المركبة: {{vehicle_color}}

بيانات الشخص (إن وُجد):
- الاسم: {{person_name}}
- الجنسية: {{nationality}}
- الرقم الشخصي: {{id_number}}
- رقم الجوال: {{phone_number}}

وقد حاولت الشركة التواصل معه عدة مرات دون استجابة، ولم يتم إرجاع المركبة حتى تاريخ هذا البلاغ، وعليه نلتمس من سعادتكم التكرم بتسجيل البلاغ واتخاذ الإجراءات القانونية اللازمة، والتحري عن المركبة.

ونبدي استعدادنا التام للتعاون وتزويدكم بأي مستندات أو معلومات إضافية تطلبونها.

وتفضلوا بقبول فائق الاحترام والتقدير ،،،

عن / {{company_name}}
الاسم: {{signatory_name}}
الصفة: {{signatory_title}}
التوقيع:
الختم الرسمي',
  '[{"name":"company_name","label":"اسم الشركة","type":"text","required":true,"source":"company","default":"شركة العراف لتأجير السيارات"},{"name":"commercial_register","label":"السجل التجاري","type":"text","required":true,"source":"company","default":"179973"},{"name":"company_address","label":"عنوان الشركة","type":"textarea","required":true,"source":"company","default":"أم صلال محمد – الشارع التجاري – مبنى 79 – الطابق الأول – مكتب (2)"},{"name":"company_phone","label":"رقم التواصل","type":"text","required":true,"source":"company","default":"31411919"},{"name":"letter_date","label":"التاريخ","type":"date","required":false,"default":"today"},{"name":"vehicle_type","label":"نوع المركبة","type":"text","required":true,"source":"vehicle"},{"name":"plate_number","label":"رقم اللوحة","type":"text","required":true,"source":"vehicle"},{"name":"plate_type","label":"نوع اللوحة","type":"text","required":true,"source":"vehicle"},{"name":"manufacture_year","label":"سنة الصنع","type":"number","required":true,"source":"vehicle"},{"name":"chassis_number","label":"رقم الشاصي","type":"text","required":true,"source":"vehicle"},{"name":"vehicle_color","label":"لون المركبة","type":"text","required":true,"source":"vehicle"},{"name":"person_name","label":"اسم الشخص","type":"text","required":true,"source":"customer"},{"name":"nationality","label":"الجنسية","type":"text","required":true,"source":"customer"},{"name":"id_number","label":"الرقم الشخصي","type":"text","required":true,"source":"customer"},{"name":"phone_number","label":"رقم الجوال","type":"text","required":true,"source":"customer"},{"name":"signatory_name","label":"اسم الموقع","type":"text","required":true,"source":"user"},{"name":"signatory_title","label":"الصفة","type":"text","required":true,"source":"user"}]'::jsonb,
  false
) ON CONFLICT (template_key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  body_template = EXCLUDED.body_template,
  variables = EXCLUDED.variables;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify templates were created
SELECT
  template_key,
  name_ar,
  category,
  requires_approval
FROM legal_document_templates
WHERE template_key IN ('traffic_violation_transfer_request', 'theft_report')
ORDER BY template_key;

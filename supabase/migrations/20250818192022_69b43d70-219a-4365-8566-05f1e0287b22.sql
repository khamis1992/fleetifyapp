-- إدراج جميع الحسابات الأساسية والخاصة بقطاع تأجير السيارات في جدول default_chart_of_accounts

-- مسح البيانات الموجودة أولاً للتأكد من عدم التضارب
DELETE FROM public.default_chart_of_accounts;

-- الحسابات الأساسية (Essential Accounts)
-- المستوى الأول - الحسابات الرئيسية
INSERT INTO public.default_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_subtype, balance_type, account_level, is_header, is_system, description, sort_order, parent_account_code) VALUES
('1000', 'Assets', 'الأصول', 'assets', NULL, 'debit', 1, true, true, 'إجمالي الأصول', 1000, NULL),
('2000', 'Liabilities', 'الخصوم', 'liabilities', NULL, 'credit', 1, true, true, 'إجمالي الخصوم', 2000, NULL),
('3000', 'Equity', 'حقوق الملكية', 'equity', NULL, 'credit', 1, true, true, 'إجمالي حقوق الملكية', 3000, NULL),
('4000', 'Revenue', 'الإيرادات', 'revenue', NULL, 'credit', 1, true, true, 'إجمالي الإيرادات', 4000, NULL),
('5000', 'Expenses', 'المصروفات', 'expenses', NULL, 'debit', 1, true, true, 'إجمالي المصروفات', 5000, NULL),

-- المستوى الثاني - المجموعات الرئيسية
('1100', 'Current Assets', 'الأصول المتداولة', 'assets', NULL, 'debit', 2, true, false, 'الأصول المتوقع تحويلها لنقد خلال سنة', 1100, '1000'),
('1500', 'Fixed Assets', 'الأصول الثابتة', 'assets', NULL, 'debit', 2, true, false, 'الأصول طويلة الأجل', 1500, '1000'),
('2100', 'Current Liabilities', 'الخصوم المتداولة', 'liabilities', NULL, 'credit', 2, true, false, 'الالتزامات المستحقة خلال سنة', 2100, '2000'),
('3100', 'Owner Equity', 'حقوق أصحاب المال', 'equity', NULL, 'credit', 2, true, false, 'حقوق المالكين في الشركة', 3100, '3000'),
('4100', 'Operating Revenue', 'الإيرادات التشغيلية', 'revenue', NULL, 'credit', 2, true, false, 'الإيرادات من النشاط الأساسي', 4100, '4000'),
('5100', 'Operating Expenses', 'المصروفات التشغيلية', 'expenses', NULL, 'debit', 2, true, false, 'المصروفات اللازمة للتشغيل', 5100, '5000'),
('5200', 'Administrative Expenses', 'المصروفات الإدارية', 'expenses', NULL, 'debit', 2, true, false, 'المصروفات الإدارية والعامة', 5200, '5000'),

-- المستوى الثالث - المجموعات الفرعية
('1110', 'Cash and Banks', 'النقدية والبنوك', 'assets', NULL, 'debit', 3, true, false, 'النقد في الصندوق والحسابات البنكية', 1110, '1100'),
('1120', 'Accounts Receivable', 'العملاء والمدينون', 'assets', NULL, 'debit', 3, true, false, 'المبالغ المستحقة من العملاء', 1120, '1100'),
('2110', 'Accounts Payable', 'الموردون والدائنون', 'liabilities', NULL, 'credit', 3, true, false, 'المبالغ المستحقة للموردين', 2110, '2100'),
('2120', 'Accrued Expenses', 'المصاريف المستحقة', 'liabilities', NULL, 'credit', 3, true, false, 'المصاريف المستحقة وغير المدفوعة', 2120, '2100'),
('3110', 'Capital', 'رأس المال', 'equity', NULL, 'credit', 3, true, false, 'رأس مال الشركة', 3110, '3100'),
('4110', 'Main Revenue', 'الإيرادات الأساسية', 'revenue', NULL, 'credit', 3, true, false, 'إيرادات النشاط الأساسي للشركة', 4110, '4100'),
('5210', 'Salaries and Benefits', 'الرواتب والمزايا', 'expenses', NULL, 'debit', 3, true, false, 'رواتب ومزايا الموظفين', 5210, '5200'),

-- المستوى الرابع - فئات الحسابات
('1111', 'Cash Accounts', 'حسابات النقدية', 'assets', NULL, 'debit', 4, false, false, 'حسابات النقد في الصناديق', 1111, '1110'),
('1112', 'Bank Accounts', 'الحسابات البنكية', 'assets', NULL, 'debit', 4, false, false, 'الحسابات في البنوك المحلية والأجنبية', 1112, '1110'),
('1121', 'Trade Receivables', 'العملاء التجاريون', 'assets', NULL, 'debit', 4, false, false, 'المستحقات من العملاء التجاريين', 1121, '1120'),
('2111', 'Trade Payables', 'الموردون التجاريون', 'liabilities', NULL, 'credit', 4, false, false, 'المستحقات للموردين التجاريين', 2111, '2110'),
('2121', 'Salary Payables', 'رواتب مستحقة', 'liabilities', NULL, 'credit', 4, false, false, 'الرواتب المستحقة وغير المدفوعة', 2121, '2120'),
('3111', 'Paid Capital', 'رأس المال المدفوع', 'equity', NULL, 'credit', 4, false, false, 'رأس المال المدفوع من قبل المالكين', 3111, '3110'),
('4111', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات من بيع السلع والخدمات', 4111, '4110'),
('5211', 'Basic Salaries', 'الرواتب الأساسية', 'expenses', NULL, 'debit', 4, false, false, 'الرواتب الأساسية للموظفين', 5211, '5210'),

-- المستوى الخامس - حسابات الإدخال
('11111', 'Main Cash Box', 'صندوق الفرع الرئيسي', 'assets', NULL, 'debit', 5, false, false, 'النقد في صندوق الفرع الرئيسي', 11111, '1111'),
('11112', 'Petty Cash', 'صندوق المصروفات النثرية', 'assets', NULL, 'debit', 5, false, false, 'النقد للمصروفات النثرية', 11112, '1111'),
('11121', 'Main Bank Account', 'الحساب البنكي الرئيسي', 'assets', NULL, 'debit', 5, false, false, 'الحساب البنكي الرئيسي للشركة', 11121, '1112'),
('11211', 'General Customers', 'عملاء عامون', 'assets', NULL, 'debit', 5, false, false, 'العملاء العامون للشركة', 11211, '1121'),
('21111', 'General Suppliers', 'موردون عامون', 'liabilities', NULL, 'credit', 5, false, false, 'الموردون العامون للشركة', 21111, '2111'),
('21211', 'Monthly Salaries Payable', 'رواتب شهرية مستحقة', 'liabilities', NULL, 'credit', 5, false, false, 'الرواتب الشهرية المستحقة للموظفين', 21211, '2121'),
('31111', 'Owner Capital', 'رأس مال المالك', 'equity', NULL, 'credit', 5, false, false, 'رأس مال المالك الأساسي', 31111, '3111'),
('41111', 'Main Sales Revenue', 'إيرادات المبيعات الرئيسية', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات المبيعات من النشاط الأساسي', 41111, '4111'),
('52111', 'Employee Basic Salaries', 'رواتب الموظفين الأساسية', 'expenses', NULL, 'debit', 5, false, false, 'الرواتب الأساسية لجميع الموظفين', 52111, '5211'),

-- حسابات خاصة بقطاع تأجير السيارات
-- الأصول
-- المستوى الثالث - مجموعة أصول المركبات
('1150', 'Vehicle Assets', 'أصول المركبات', 'assets', NULL, 'debit', 3, true, false, 'مجموعة أصول المركبات والمعدات', 1150, '1500'),
('1160', 'Inventory Assets', 'أصول المخزون', 'assets', NULL, 'debit', 3, true, false, 'مخزون السلع والمواد', 1160, '1100'),
('1130', 'Prepaid Assets', 'الأصول المدفوعة مقدماً', 'assets', NULL, 'debit', 3, true, false, 'المصاريف المدفوعة مقدماً', 1130, '1100'),
('1140', 'Other Receivables', 'مدينون أخرون', 'assets', NULL, 'debit', 3, true, false, 'المستحقات الأخرى', 1140, '1100'),
('1125', 'Customer Receivables Detail', 'تفاصيل العملاء المدينين', 'assets', NULL, 'debit', 3, true, false, 'تصنيف تفصيلي للعملاء المدينين', 1125, '1120'),

-- المستوى الرابع - فئات المركبات
('1151', 'Vehicle Fleet', 'أسطول المركبات', 'assets', NULL, 'debit', 4, false, false, 'المركبات المملوكة للشركة', 1151, '1150'),
('1152', 'Vehicle Equipment', 'معدات المركبات', 'assets', NULL, 'debit', 4, false, false, 'المعدات والتجهيزات الإضافية للمركبات', 1152, '1150'),
('1153', 'Spare Parts Inventory', 'مخزون قطع الغيار', 'assets', NULL, 'debit', 4, false, false, 'مخزون قطع الغيار والإطارات', 1153, '1150'),
('1159', 'Accumulated Depreciation - Vehicles', 'مجمع إهلاك المركبات', 'assets', NULL, 'credit', 4, false, false, 'مجمع إهلاك أسطول المركبات', 1159, '1150'),
('1161', 'Fuel Inventory', 'مخزون الوقود', 'assets', NULL, 'debit', 4, false, false, 'مخزون الوقود والبترول', 1161, '1160'),
('1162', 'Office Supplies', 'مواد مكتبية', 'assets', NULL, 'debit', 4, false, false, 'المواد والأدوات المكتبية', 1162, '1160'),
('1131', 'Prepaid Insurance', 'التأمين المدفوع مقدماً', 'assets', NULL, 'debit', 4, false, false, 'أقساط التأمين المدفوعة مقدماً', 1131, '1130'),
('1132', 'Prepaid Licenses', 'الرخص المدفوعة مقدماً', 'assets', NULL, 'debit', 4, false, false, 'رسوم التراخيص المدفوعة مقدماً', 1132, '1130'),
('1133', 'Prepaid Rent', 'الإيجار المدفوع مقدماً', 'assets', NULL, 'debit', 4, false, false, 'إيجار المباني والمواقف المدفوع مقدماً', 1133, '1130'),
('1141', 'Driver Advances', 'عهد السائقين', 'assets', NULL, 'debit', 4, false, false, 'العهد والسلف المقدمة للسائقين', 1141, '1140'),
('1142', 'Rental Deposits Receivable', 'ودائع تأجير مستحقة', 'assets', NULL, 'debit', 4, false, false, 'الودائع المستحقة من العملاء', 1142, '1140'),
('1143', 'Insurance Claims Receivable', 'مطالبات تأمين مستحقة', 'assets', NULL, 'debit', 4, false, false, 'المطالبات المستحقة من شركات التأمين', 1143, '1140'),
('1126', 'Individual Customers', 'عملاء أفراد', 'assets', NULL, 'debit', 4, false, false, 'العملاء الأفراد', 1126, '1125'),
('1127', 'Corporate Customers', 'عملاء شركات', 'assets', NULL, 'debit', 4, false, false, 'العملاء من الشركات', 1127, '1125'),
('1128', 'Government Customers', 'عملاء حكوميون', 'assets', NULL, 'debit', 4, false, false, 'العملاء من الجهات الحكومية', 1128, '1125');

-- المستوى الخامس - حسابات الإدخال للأصول
INSERT INTO public.default_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_subtype, balance_type, account_level, is_header, is_system, description, sort_order, parent_account_code) VALUES
('11511', 'Sedan Fleet', 'أسطول السيارات الصالون', 'assets', NULL, 'debit', 5, false, false, 'السيارات الصالون في الأسطول', 11511, '1151'),
('11512', 'SUV Fleet', 'أسطول السيارات الرياضية', 'assets', NULL, 'debit', 5, false, false, 'السيارات الرياضية في الأسطول', 11512, '1151'),
('11513', 'Van Fleet', 'أسطول الحافلات الصغيرة', 'assets', NULL, 'debit', 5, false, false, 'الحافلات الصغيرة في الأسطول', 11513, '1151'),
('11514', 'Luxury Fleet', 'أسطول السيارات الفاخرة', 'assets', NULL, 'debit', 5, false, false, 'السيارات الفاخرة في الأسطول', 11514, '1151'),
('11521', 'GPS Tracking Devices', 'أجهزة التتبع', 'assets', NULL, 'debit', 5, false, false, 'أجهزة التتبع والملاحة', 11521, '1152'),
('11522', 'Safety Equipment', 'معدات السلامة', 'assets', NULL, 'debit', 5, false, false, 'معدات الأمان والسلامة', 11522, '1152'),
('11523', 'Communication Devices', 'أجهزة الاتصال', 'assets', NULL, 'debit', 5, false, false, 'أجهزة الاتصال والراديو', 11523, '1152'),
('11531', 'Engine Parts', 'قطع غيار المحرك', 'assets', NULL, 'debit', 5, false, false, 'قطع غيار المحركات', 11531, '1153'),
('11532', 'Tire Inventory', 'مخزون الإطارات', 'assets', NULL, 'debit', 5, false, false, 'مخزون الإطارات والعجلات', 11532, '1153'),
('11533', 'Brake Parts', 'قطع غيار الفرامل', 'assets', NULL, 'debit', 5, false, false, 'قطع غيار نظام الفرامل', 11533, '1153'),
('11591', 'Vehicle Depreciation', 'إهلاك المركبات', 'assets', NULL, 'credit', 5, false, false, 'مجمع إهلاك المركبات', 11591, '1159'),
('11611', 'Gasoline Inventory', 'مخزون البنزين', 'assets', NULL, 'debit', 5, false, false, 'مخزون البنزين والوقود', 11611, '1161'),
('11311', 'Vehicle Insurance Prepaid', 'تأمين المركبات المدفوع مقدماً', 'assets', NULL, 'debit', 5, false, false, 'أقساط تأمين المركبات المدفوعة مقدماً', 11311, '1131'),
('11312', 'Comprehensive Insurance Prepaid', 'التأمين الشامل المدفوع مقدماً', 'assets', NULL, 'debit', 5, false, false, 'أقساط التأمين الشامل المدفوعة مقدماً', 11312, '1131'),
('11321', 'Vehicle Registration Prepaid', 'رسوم ترخيص المركبات مقدماً', 'assets', NULL, 'debit', 5, false, false, 'رسوم ترخيص المركبات المدفوعة مقدماً', 11321, '1132'),
('11322', 'Business License Prepaid', 'الرخصة التجارية مقدماً', 'assets', NULL, 'debit', 5, false, false, 'رسوم الرخصة التجارية المدفوعة مقدماً', 11322, '1132'),
('11331', 'Office Rent Prepaid', 'إيجار المكتب مقدماً', 'assets', NULL, 'debit', 5, false, false, 'إيجار المكتب المدفوع مقدماً', 11331, '1133'),
('11332', 'Parking Rent Prepaid', 'إيجار المواقف مقدماً', 'assets', NULL, 'debit', 5, false, false, 'إيجار مواقف السيارات المدفوع مقدماً', 11332, '1133'),
('11411', 'Driver Cash Advances', 'عهد نقدية للسائقين', 'assets', NULL, 'debit', 5, false, false, 'العهد النقدية المقدمة للسائقين', 11411, '1141'),
('11412', 'Driver Fuel Advances', 'عهد وقود للسائقين', 'assets', NULL, 'debit', 5, false, false, 'عهد الوقود المقدمة للسائقين', 11412, '1141'),
('11421', 'Customer Security Deposits', 'ودائع ضمان العملاء', 'assets', NULL, 'debit', 5, false, false, 'ودائع الضمان المقبوضة من العملاء', 11421, '1142'),
('11422', 'Damage Deposits Receivable', 'ودائع الأضرار المستحقة', 'assets', NULL, 'debit', 5, false, false, 'ودائع تغطية الأضرار المستحقة', 11422, '1142'),
('11431', 'Accident Claims Receivable', 'مطالبات حوادث مستحقة', 'assets', NULL, 'debit', 5, false, false, 'مطالبات الحوادث المستحقة من التأمين', 11431, '1143'),
('11261', 'Cash Customers', 'عملاء نقدي', 'assets', NULL, 'debit', 5, false, false, 'العملاء الأفراد النقدي', 11261, '1126'),
('11262', 'Credit Customers', 'عملاء آجل', 'assets', NULL, 'debit', 5, false, false, 'العملاء الأفراد الآجل', 11262, '1126'),
('11271', 'Private Companies', 'شركات خاصة', 'assets', NULL, 'debit', 5, false, false, 'عملاء الشركات الخاصة', 11271, '1127'),
('11272', 'Public Companies', 'شركات مساهمة', 'assets', NULL, 'debit', 5, false, false, 'عملاء الشركات المساهمة', 11272, '1127'),
('11281', 'Government Entities', 'جهات حكومية', 'assets', NULL, 'debit', 5, false, false, 'العملاء من الجهات الحكومية', 11281, '1128');

-- حسابات الخصوم الخاصة بقطاع تأجير السيارات
-- المستوى الثاني - الخصوم طويلة الأجل
INSERT INTO public.default_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_subtype, balance_type, account_level, is_header, is_system, description, sort_order, parent_account_code) VALUES
('2500', 'Long-term Liabilities', 'الخصوم طويلة الأجل', 'liabilities', NULL, 'credit', 2, true, false, 'الالتزامات طويلة الأجل', 2500, '2000'),

-- المستوى الثالث - مجموعات الخصوم المتخصصة
('2510', 'Vehicle Financing', 'تمويل المركبات', 'liabilities', NULL, 'credit', 3, true, false, 'قروض وتمويل شراء المركبات', 2510, '2500'),
('2130', 'Customer Deposits', 'ودائع العملاء', 'liabilities', NULL, 'credit', 3, true, false, 'الودائع المقبوضة من العملاء', 2130, '2100'),
('2140', 'Maintenance Payables', 'مستحقات الصيانة', 'liabilities', NULL, 'credit', 3, true, false, 'المبالغ المستحقة للصيانة', 2140, '2100'),
('2150', 'Insurance & Legal Payables', 'مستحقات التأمين والقانونية', 'liabilities', NULL, 'credit', 3, true, false, 'المستحقات للتأمين والأمور القانونية', 2150, '2100'),
('2160', 'Taxes & Fees Payable', 'ضرائب ورسوم مستحقة', 'liabilities', NULL, 'credit', 3, true, false, 'الضرائب والرسوم الحكومية المستحقة', 2160, '2100'),
('2115', 'Supplier Payables Detail', 'تفاصيل الموردين الدائنين', 'liabilities', NULL, 'credit', 3, true, false, 'تصنيف تفصيلي للموردين الدائنين', 2115, '2110'),

-- المستوى الرابع - فئات الخصوم
('2511', 'Vehicle Loans', 'قروض المركبات', 'liabilities', NULL, 'credit', 4, false, false, 'قروض شراء المركبات', 2511, '2510'),
('2512', 'Lease Obligations', 'التزامات الإيجار التمويلي', 'liabilities', NULL, 'credit', 4, false, false, 'التزامات عقود الإيجار التمويلي', 2512, '2510'),
('2131', 'Rental Deposits', 'ودائع التأجير', 'liabilities', NULL, 'credit', 4, false, false, 'ودائع العملاء للتأجير', 2131, '2130'),
('2132', 'Damage Deposits', 'ودائع الأضرار', 'liabilities', NULL, 'credit', 4, false, false, 'ودائع تغطية الأضرار', 2132, '2130'),
('2141', 'Vehicle Maintenance Payable', 'صيانة المركبات المستحقة', 'liabilities', NULL, 'credit', 4, false, false, 'مبالغ صيانة المركبات المستحقة', 2141, '2140'),
('2142', 'Spare Parts Payable', 'قطع الغيار المستحقة', 'liabilities', NULL, 'credit', 4, false, false, 'مبالغ قطع الغيار المستحقة', 2142, '2140'),
('2151', 'Insurance Premiums Payable', 'أقساط التأمين المستحقة', 'liabilities', NULL, 'credit', 4, false, false, 'أقساط التأمين المستحقة الدفع', 2151, '2150'),
('2152', 'Legal Fees Payable', 'أتعاب قانونية مستحقة', 'liabilities', NULL, 'credit', 4, false, false, 'الأتعاب القانونية المستحقة', 2152, '2150'),
('2161', 'VAT Payable', 'ضريبة القيمة المضافة المستحقة', 'liabilities', NULL, 'credit', 4, false, false, 'ضريبة القيمة المضافة المستحقة للدولة', 2161, '2160'),
('2162', 'License Fees Payable', 'رسوم التراخيص المستحقة', 'liabilities', NULL, 'credit', 4, false, false, 'رسوم التراخيص الحكومية المستحقة', 2162, '2160'),
('2116', 'Maintenance Suppliers', 'موردو الصيانة', 'liabilities', NULL, 'credit', 4, false, false, 'موردو خدمات الصيانة', 2116, '2115'),
('2117', 'Parts Suppliers', 'موردو قطع الغيار', 'liabilities', NULL, 'credit', 4, false, false, 'موردو قطع الغيار والإطارات', 2117, '2115'),
('2118', 'Fuel Suppliers', 'موردو الوقود', 'liabilities', NULL, 'credit', 4, false, false, 'موردو الوقود والزيوت', 2118, '2115');

-- المستوى الخامس - حسابات الإدخال للخصوم
INSERT INTO public.default_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_subtype, balance_type, account_level, is_header, is_system, description, sort_order, parent_account_code) VALUES
('25111', 'Bank Vehicle Loan', 'قرض بنكي لشراء المركبات', 'liabilities', NULL, 'credit', 5, false, false, 'قرض بنكي لشراء المركبات', 25111, '2511'),
('25112', 'Financing Company Loan', 'قرض شركة تمويل', 'liabilities', NULL, 'credit', 5, false, false, 'قرض من شركة التمويل', 25112, '2511'),
('25121', 'Vehicle Lease Obligation', 'التزام إيجار تمويلي للمركبات', 'liabilities', NULL, 'credit', 5, false, false, 'التزامات الإيجار التمويلي للمركبات', 25121, '2512'),
('21311', 'Rental Security Deposits', 'ودائع ضمان التأجير', 'liabilities', NULL, 'credit', 5, false, false, 'ودائع الضمان للتأجير', 21311, '2131'),
('21312', 'Monthly Rental Deposits', 'ودائع التأجير الشهري', 'liabilities', NULL, 'credit', 5, false, false, 'ودائع التأجير الشهري', 21312, '2131'),
('21321', 'Vehicle Damage Deposits', 'ودائع أضرار المركبات', 'liabilities', NULL, 'credit', 5, false, false, 'ودائع تغطية أضرار المركبات', 21321, '2132'),
('21411', 'Workshop Maintenance Payable', 'صيانة الورش المستحقة', 'liabilities', NULL, 'credit', 5, false, false, 'مبالغ صيانة الورش المستحقة', 21411, '2141'),
('21412', 'Periodic Maintenance Payable', 'الصيانة الدورية المستحقة', 'liabilities', NULL, 'credit', 5, false, false, 'مبالغ الصيانة الدورية المستحقة', 21412, '2141'),
('21421', 'Engine Parts Payable', 'قطع غيار المحرك المستحقة', 'liabilities', NULL, 'credit', 5, false, false, 'مبالغ قطع غيار المحرك المستحقة', 21421, '2142'),
('21422', 'Tire Replacement Payable', 'إطارات بديلة مستحقة', 'liabilities', NULL, 'credit', 5, false, false, 'مبالغ الإطارات البديلة المستحقة', 21422, '2142'),
('21511', 'Comprehensive Insurance Payable', 'التأمين الشامل المستحق', 'liabilities', NULL, 'credit', 5, false, false, 'أقساط التأمين الشامل المستحقة', 21511, '2151'),
('21512', 'Third Party Insurance Payable', 'تأمين الغير المستحق', 'liabilities', NULL, 'credit', 5, false, false, 'أقساط تأمين الغير المستحقة', 21512, '2151'),
('21621', 'Traffic Violations Payable', 'مخالفات مرورية مستحقة', 'liabilities', NULL, 'credit', 5, false, false, 'غرامات المخالفات المرورية المستحقة', 21621, '2162'),
('21622', 'Registration Fees Payable', 'رسوم ترخيص مستحقة', 'liabilities', NULL, 'credit', 5, false, false, 'رسوم ترخيص المركبات المستحقة', 21622, '2162'),
('21161', 'Authorized Workshops', 'ورش معتمدة', 'liabilities', NULL, 'credit', 5, false, false, 'مستحقات الورش المعتمدة', 21161, '2116'),
('21162', 'Independent Mechanics', 'ميكانيكيون مستقلون', 'liabilities', NULL, 'credit', 5, false, false, 'مستحقات الميكانيكيين المستقلين', 21162, '2116'),
('21171', 'Original Parts Suppliers', 'موردو قطع أصلية', 'liabilities', NULL, 'credit', 5, false, false, 'موردو قطع الغيار الأصلية', 21171, '2117'),
('21172', 'Aftermarket Parts Suppliers', 'موردو قطع تجارية', 'liabilities', NULL, 'credit', 5, false, false, 'موردو قطع الغيار التجارية', 21172, '2117'),
('21181', 'Gas Stations', 'محطات الوقود', 'liabilities', NULL, 'credit', 5, false, false, 'مستحقات محطات الوقود', 21181, '2118'),
('21182', 'Oil Suppliers', 'موردو الزيوت', 'liabilities', NULL, 'credit', 5, false, false, 'موردو الزيوت والسوائل', 21182, '2118');

-- حسابات الإيرادات الخاصة بقطاع تأجير السيارات
-- المستوى الثالث - مجموعات الإيرادات
INSERT INTO public.default_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_subtype, balance_type, account_level, is_header, is_system, description, sort_order, parent_account_code) VALUES
('4120', 'Rental Revenue', 'إيرادات التأجير', 'revenue', NULL, 'credit', 3, true, false, 'إيرادات تأجير المركبات', 4120, '4100'),
('4130', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', NULL, 'credit', 3, true, false, 'إيرادات من مبيعات المركبات والأصول', 4130, '4100'),
('4140', 'Service Revenue', 'إيرادات الخدمات', 'revenue', NULL, 'credit', 3, true, false, 'إيرادات من الخدمات المختلفة', 4140, '4100'),
('4180', 'Other Revenue', 'إيرادات أخرى', 'revenue', NULL, 'credit', 3, true, false, 'الإيرادات الأخرى', 4180, '4100'),

-- المستوى الرابع - فئات الإيرادات
('4121', 'Vehicle Rental Revenue', 'إيرادات تأجير المركبات', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات تأجير المركبات الأساسية', 4121, '4120'),
('4122', 'Additional Fees Revenue', 'إيرادات الرسوم الإضافية', 'revenue', NULL, 'credit', 4, false, false, 'رسوم إضافية (وقود، تنظيف، إلخ)', 4122, '4120'),
('4123', 'Driver Service Revenue', 'إيرادات خدمة السائق', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات من خدمة توفير السائق', 4123, '4120'),
('4124', 'Delivery Service Revenue', 'إيرادات خدمة التوصيل', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات من خدمات التوصيل والنقل', 4124, '4120'),
('4131', 'Used Vehicle Sales', 'مبيعات المركبات المستعملة', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات من بيع المركبات المستعملة', 4131, '4130'),
('4132', 'Parts Sales', 'مبيعات قطع الغيار', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات من بيع قطع الغيار الفائضة', 4132, '4130'),
('4141', 'Maintenance Service Revenue', 'إيرادات خدمة الصيانة', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات من تقديم خدمات الصيانة للغير', 4141, '4140'),
('4142', 'Consultation Revenue', 'إيرادات الاستشارات', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات من الاستشارات الفنية', 4142, '4140'),
('4181', 'Insurance Revenue', 'إيرادات التأمين', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات من خدمات التأمين', 4181, '4180'),
('4182', 'Late Fees', 'رسوم التأخير', 'revenue', NULL, 'credit', 4, false, false, 'رسوم التأخير في الإرجاع', 4182, '4180'),
('4183', 'Damage Fees', 'رسوم الأضرار', 'revenue', NULL, 'credit', 4, false, false, 'رسوم الأضرار والتلفيات', 4183, '4180'),
('4184', 'Advertising Revenue', 'إيرادات الإعلان', 'revenue', NULL, 'credit', 4, false, false, 'إيرادات من الإعلانات على المركبات', 4184, '4180');

-- المستوى الخامس - حسابات الإدخال للإيرادات
INSERT INTO public.default_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_subtype, balance_type, account_level, is_header, is_system, description, sort_order, parent_account_code) VALUES
('41211', 'Daily Rental Revenue', 'إيرادات التأجير اليومي', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات التأجير اليومي للمركبات', 41211, '4121'),
('41212', 'Weekly Rental Revenue', 'إيرادات التأجير الأسبوعي', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات التأجير الأسبوعي للمركبات', 41212, '4121'),
('41213', 'Monthly Rental Revenue', 'إيرادات التأجير الشهري', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات التأجير الشهري للمركبات', 41213, '4121'),
('41214', 'Corporate Rental Revenue', 'إيرادات التأجير للشركات', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات التأجير للشركات والجهات', 41214, '4121'),
('41221', 'Fuel Supplement Revenue', 'إيرادات رسوم الوقود', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من رسوم الوقود الإضافية', 41221, '4122'),
('41222', 'Cleaning Fees Revenue', 'إيرادات رسوم التنظيف', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من رسوم التنظيف', 41222, '4122'),
('41223', 'GPS Fees Revenue', 'إيرادات رسوم التتبع', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من رسوم خدمة التتبع', 41223, '4122'),
('41224', 'Insurance Fees Revenue', 'إيرادات رسوم التأمين الإضافي', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من رسوم التأمين الإضافي', 41224, '4122'),
('41231', 'Hourly Driver Service', 'خدمة السائق بالساعة', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات خدمة السائق بالساعة', 41231, '4123'),
('41232', 'Daily Driver Service', 'خدمة السائق اليومية', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات خدمة السائق اليومية', 41232, '4123'),
('41241', 'Airport Delivery', 'توصيل المطار', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من خدمة توصيل المطار', 41241, '4124'),
('41242', 'City Delivery', 'توصيل داخل المدينة', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من خدمة التوصيل داخل المدينة', 41242, '4124'),
('41311', 'Sedan Sales', 'مبيعات السيارات الصالون', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من بيع السيارات الصالون المستعملة', 41311, '4131'),
('41312', 'SUV Sales', 'مبيعات السيارات الرياضية', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من بيع السيارات الرياضية المستعملة', 41312, '4131'),
('41321', 'Engine Parts Sales', 'مبيعات قطع المحرك', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من بيع قطع غيار المحرك', 41321, '4132'),
('41322', 'Tire Sales', 'مبيعات الإطارات', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من بيع الإطارات', 41322, '4132'),
('41411', 'External Maintenance Revenue', 'إيرادات الصيانة الخارجية', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من تقديم خدمات الصيانة للغير', 41411, '4141'),
('41421', 'Technical Consultation', 'الاستشارات الفنية', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من الاستشارات الفنية', 41421, '4142'),
('41821', 'Late Return Fees', 'رسوم التأخير في الإرجاع', 'revenue', NULL, 'credit', 5, false, false, 'رسوم التأخير في إرجاع المركبات', 41821, '4182'),
('41831', 'Vehicle Damage Fees', 'رسوم أضرار المركبات', 'revenue', NULL, 'credit', 5, false, false, 'رسوم الأضرار التي تلحق بالمركبات', 41831, '4183'),
('41841', 'Vehicle Advertising Revenue', 'إيرادات الإعلان على المركبات', 'revenue', NULL, 'credit', 5, false, false, 'إيرادات من الإعلانات الموضوعة على المركبات', 41841, '4184');

-- حسابات المصروفات الخاصة بقطاع تأجير السيارات
-- المستوى الثالث - مجموعات المصروفات
INSERT INTO public.default_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_subtype, balance_type, account_level, is_header, is_system, description, sort_order, parent_account_code) VALUES
('5130', 'Vehicle Expenses', 'مصروفات المركبات', 'expenses', NULL, 'debit', 3, true, false, 'جميع مصروفات المركبات والصيانة', 5130, '5100'),
('5220', 'Driver Expenses', 'مصروفات السائقين', 'expenses', NULL, 'debit', 3, true, false, 'جميع مصروفات السائقين', 5220, '5200'),
('5230', 'Marketing Expenses', 'مصروفات التسويق', 'expenses', NULL, 'debit', 3, true, false, 'مصروفات التسويق والإعلان', 5230, '5200'),
('5240', 'Operational Expenses', 'المصروفات التشغيلية', 'expenses', NULL, 'debit', 3, true, false, 'المصروفات التشغيلية العامة', 5240, '5200'),
('5250', 'Financial Expenses', 'المصروفات المالية', 'expenses', NULL, 'debit', 3, true, false, 'الفوائد والرسوم المصرفية', 5250, '5200'),

-- المستوى الرابع - فئات المصروفات
('5131', 'Vehicle Maintenance', 'صيانة المركبات', 'expenses', NULL, 'debit', 4, false, false, 'تكاليف صيانة وإصلاح المركبات', 5131, '5130'),
('5132', 'Fuel Expense', 'مصاريف الوقود', 'expenses', NULL, 'debit', 4, false, false, 'تكاليف الوقود للمركبات', 5132, '5130'),
('5133', 'Vehicle Insurance Expense', 'مصاريف تأمين المركبات', 'expenses', NULL, 'debit', 4, false, false, 'أقساط تأمين المركبات', 5133, '5130'),
('5134', 'Registration Fees', 'رسوم الترخيص', 'expenses', NULL, 'debit', 4, false, false, 'رسوم تجديد رخص المركبات', 5134, '5130'),
('5135', 'Vehicle Depreciation', 'إهلاك المركبات', 'expenses', NULL, 'debit', 4, false, false, 'مصروف إهلاك المركبات', 5135, '5130'),
('5136', 'Vehicle Cleaning', 'تنظيف المركبات', 'expenses', NULL, 'debit', 4, false, false, 'تكاليف تنظيف وغسيل المركبات', 5136, '5130'),
('5137', 'Parking Fees', 'رسوم المواقف', 'expenses', NULL, 'debit', 4, false, false, 'رسوم مواقف السيارات', 5137, '5130'),
('5138', 'Traffic Violations', 'المخالفات المرورية', 'expenses', NULL, 'debit', 4, false, false, 'غرامات المخالفات المرورية', 5138, '5130'),
('5139', 'Technical Inspection', 'الفحص الفني', 'expenses', NULL, 'debit', 4, false, false, 'رسوم الفحص الفني للمركبات', 5139, '5130'),
('5221', 'Driver Salaries', 'رواتب السائقين', 'expenses', NULL, 'debit', 4, false, false, 'رواتب ومكافآت السائقين', 5221, '5220'),
('5222', 'Driver Benefits', 'مزايا السائقين', 'expenses', NULL, 'debit', 4, false, false, 'تأمينات ومزايا السائقين', 5222, '5220'),
('5223', 'Driver Training', 'تدريب السائقين', 'expenses', NULL, 'debit', 4, false, false, 'تكاليف تدريب وتأهيل السائقين', 5223, '5220'),
('5231', 'Advertising Expense', 'مصاريف الإعلان', 'expenses', NULL, 'debit', 4, false, false, 'تكاليف الإعلان والتسويق', 5231, '5230'),
('5232', 'Promotional Expense', 'مصاريف الترويج', 'expenses', NULL, 'debit', 4, false, false, 'تكاليف العروض الترويجية', 5232, '5230'),
('5233', 'Website Maintenance', 'صيانة الموقع الإلكتروني', 'expenses', NULL, 'debit', 4, false, false, 'تكاليف تطوير وصيانة الموقع', 5233, '5230'),
('5241', 'Office Rent', 'إيجار المكتب', 'expenses', NULL, 'debit', 4, false, false, 'إيجار المكاتب والمرافق', 5241, '5240'),
('5242', 'Utilities', 'المرافق العامة', 'expenses', NULL, 'debit', 4, false, false, 'فواتير الكهرباء والماء والهاتف', 5242, '5240'),
('5243', 'Office Supplies', 'المواد المكتبية', 'expenses', NULL, 'debit', 4, false, false, 'تكاليف المواد والأدوات المكتبية', 5243, '5240'),
('5244', 'Communication', 'الاتصالات', 'expenses', NULL, 'debit', 4, false, false, 'تكاليف الهاتف والإنترنت والاتصالات', 5244, '5240'),
('5245', 'Professional Fees', 'الأتعاب المهنية', 'expenses', NULL, 'debit', 4, false, false, 'أتعاب المحاسبين والمحامين والاستشاريين', 5245, '5240'),
('5251', 'Interest Expense', 'مصاريف الفوائد', 'expenses', NULL, 'debit', 4, false, false, 'فوائد القروض والتمويل', 5251, '5250'),
('5252', 'Bank Charges', 'الرسوم المصرفية', 'expenses', NULL, 'debit', 4, false, false, 'رسوم الخدمات المصرفية', 5252, '5250');

-- المستوى الخامس - حسابات الإدخال للمصروفات
INSERT INTO public.default_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_subtype, balance_type, account_level, is_header, is_system, description, sort_order, parent_account_code) VALUES
('51311', 'Routine Maintenance', 'الصيانة الدورية', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف الصيانة الدورية للمركبات', 51311, '5131'),
('51312', 'Emergency Repairs', 'الإصلاحات الطارئة', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف الإصلاحات الطارئة', 51312, '5131'),
('51313', 'Engine Maintenance', 'صيانة المحرك', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف صيانة وإصلاح المحركات', 51313, '5131'),
('51314', 'Brake Maintenance', 'صيانة الفرامل', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف صيانة نظام الفرامل', 51314, '5131'),
('51315', 'Tire Replacement', 'استبدال الإطارات', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف استبدال الإطارات', 51315, '5131'),
('51321', 'Fleet Fuel Expense', 'وقود الأسطول', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف وقود أسطول المركبات', 51321, '5132'),
('51322', 'Oil Change Expense', 'تغيير الزيت', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف تغيير الزيوت والسوائل', 51322, '5132'),
('51331', 'Comprehensive Insurance', 'التأمين الشامل', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف التأمين الشامل للمركبات', 51331, '5133'),
('51332', 'Third Party Insurance', 'تأمين الطرف الثالث', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف تأمين الطرف الثالث', 51332, '5133'),
('51341', 'Vehicle Registration', 'رسوم تسجيل المركبات', 'expenses', NULL, 'debit', 5, false, false, 'رسوم تسجيل وترخيص المركبات', 51341, '5134'),
('51342', 'License Renewal', 'تجديد الرخص', 'expenses', NULL, 'debit', 5, false, false, 'رسوم تجديد رخص القيادة والتشغيل', 51342, '5134'),
('51351', 'Sedan Depreciation', 'إهلاك السيارات الصالون', 'expenses', NULL, 'debit', 5, false, false, 'إهلاك السيارات الصالون', 51351, '5135'),
('51352', 'SUV Depreciation', 'إهلاك السيارات الرياضية', 'expenses', NULL, 'debit', 5, false, false, 'إهلاك السيارات الرياضية', 51352, '5135'),
('51353', 'Van Depreciation', 'إهلاك الحافلات الصغيرة', 'expenses', NULL, 'debit', 5, false, false, 'إهلاك الحافلات الصغيرة', 51353, '5135'),
('51361', 'Exterior Cleaning', 'التنظيف الخارجي', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف غسيل وتنظيف المركبات من الخارج', 51361, '5136'),
('51362', 'Interior Cleaning', 'التنظيف الداخلي', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف تنظيف المركبات من الداخل', 51362, '5136'),
('51371', 'Monthly Parking', 'مواقف شهرية', 'expenses', NULL, 'debit', 5, false, false, 'رسوم المواقف الشهرية', 51371, '5137'),
('51372', 'Hourly Parking', 'مواقف بالساعة', 'expenses', NULL, 'debit', 5, false, false, 'رسوم المواقف بالساعة', 51372, '5137'),
('51381', 'Speeding Violations', 'مخالفات السرعة', 'expenses', NULL, 'debit', 5, false, false, 'غرامات مخالفات تجاوز السرعة', 51381, '5138'),
('51382', 'Parking Violations', 'مخالفات المواقف', 'expenses', NULL, 'debit', 5, false, false, 'غرامات مخالفات المواقف', 51382, '5138'),
('51391', 'Annual Inspection', 'الفحص السنوي', 'expenses', NULL, 'debit', 5, false, false, 'رسوم الفحص الفني السنوي', 51391, '5139'),
('52211', 'Driver Basic Salaries', 'رواتب السائقين الأساسية', 'expenses', NULL, 'debit', 5, false, false, 'الرواتب الأساسية للسائقين', 52211, '5221'),
('52212', 'Driver Overtime', 'ساعات إضافية السائقين', 'expenses', NULL, 'debit', 5, false, false, 'مكافآت الساعات الإضافية للسائقين', 52212, '5221'),
('52213', 'Driver Commissions', 'عمولات السائقين', 'expenses', NULL, 'debit', 5, false, false, 'عمولات السائقين على المبيعات', 52213, '5221'),
('52221', 'Driver Medical Insurance', 'التأمين الطبي للسائقين', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف التأمين الطبي للسائقين', 52221, '5222'),
('52222', 'Driver Social Security', 'التأمينات الاجتماعية للسائقين', 'expenses', NULL, 'debit', 5, false, false, 'مساهمات التأمينات الاجتماعية للسائقين', 52222, '5222'),
('52231', 'Driving Course Training', 'دورات القيادة', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف دورات تدريب القيادة', 52231, '5223'),
('52232', 'Safety Training', 'تدريب السلامة', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف تدريب السلامة والأمان', 52232, '5223'),
('52311', 'Online Advertising', 'الإعلان الإلكتروني', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف الإعلان على الإنترنت', 52311, '5231'),
('52312', 'Print Advertising', 'الإعلان المطبوع', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف الإعلان في المطبوعات', 52312, '5231'),
('52321', 'Seasonal Promotions', 'العروض الموسمية', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف العروض الترويجية الموسمية', 52321, '5232'),
('52331', 'Web Hosting', 'استضافة المواقع', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف استضافة وتطوير الموقع', 52331, '5233'),
('52411', 'Main Office Rent', 'إيجار المكتب الرئيسي', 'expenses', NULL, 'debit', 5, false, false, 'إيجار المكتب الرئيسي', 52411, '5241'),
('52412', 'Showroom Rent', 'إيجار صالة العرض', 'expenses', NULL, 'debit', 5, false, false, 'إيجار صالة عرض المركبات', 52412, '5241'),
('52421', 'Electricity Bill', 'فاتورة الكهرباء', 'expenses', NULL, 'debit', 5, false, false, 'فواتير الكهرباء الشهرية', 52421, '5242'),
('52422', 'Water Bill', 'فاتورة الماء', 'expenses', NULL, 'debit', 5, false, false, 'فواتير المياه الشهرية', 52422, '5242'),
('52431', 'Stationery Supplies', 'القرطاسية', 'expenses', NULL, 'debit', 5, false, false, 'تكاليف القرطاسية والمواد المكتبية', 52431, '5243'),
('52441', 'Mobile Phone Bills', 'فواتير الهاتف المحمول', 'expenses', NULL, 'debit', 5, false, false, 'فواتير الهواتف المحمولة', 52441, '5244'),
('52442', 'Internet Bills', 'فواتير الإنترنت', 'expenses', NULL, 'debit', 5, false, false, 'فواتير خدمة الإنترنت', 52442, '5244'),
('52451', 'Accounting Fees', 'أتعاب المحاسبة', 'expenses', NULL, 'debit', 5, false, false, 'أتعاب خدمات المحاسبة والمراجعة', 52451, '5245'),
('52452', 'Legal Fees', 'الأتعاب القانونية', 'expenses', NULL, 'debit', 5, false, false, 'أتعاب الخدمات القانونية والاستشارات', 52452, '5245'),
('52511', 'Vehicle Loan Interest', 'فوائد قروض المركبات', 'expenses', NULL, 'debit', 5, false, false, 'فوائد قروض تمويل المركبات', 52511, '5251'),
('52521', 'Account Maintenance Fees', 'رسوم صيانة الحساب', 'expenses', NULL, 'debit', 5, false, false, 'رسوم صيانة الحسابات البنكية', 52521, '5252'),
('52522', 'Transfer Fees', 'رسوم التحويل', 'expenses', NULL, 'debit', 5, false, false, 'رسوم التحويلات البنكية', 52522, '5252');
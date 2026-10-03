
#set page(
  paper: "a4",
  flipped: true,
  margin: (x: 1.2cm, top: 1.0cm, bottom: 1.0cm),
  footer: align(center, context text(8.5pt, fill: rgb("#64748B"), font: "Amiri")[
    صفحة #counter(page).display()
  ])
)

#set text(font: "Amiri", lang: "ar", dir: rtl, size: 8.5pt, fill: rgb("#173247"))
#set par(justify: true, leading: 0.55em)

#let primary = rgb("#294B62")
#let header-bg = rgb("#294B62")
#let alt-bg = rgb("#F1F5F7")
#let sub-bg = rgb("#E1ECF2")
#let total-bg = rgb("#E1ECF2")
#let bal-bg = rgb("#E2EFDA")
#let border-color = rgb("#D7E1E8")

// ================= PAGE 1 =================
#align(center)[
  #text(12pt, weight: "bold", fill: primary)[شركة العراف لتأجير السيارات (ذ.م.م) — السجل التجاري: 146832]\
  #v(-2pt)
  #text(14pt, weight: "bold", fill: rgb("#0F172A"))[الملف المالي المتكامل والقوائم المالية المقارنة لجميع السنوات (2023 — 2026)]\
  #v(-2pt)
  #text(9pt, fill: rgb("#64748B"))[معتمدة رسمياً ومقفلة بحزمة الاعتماد رقم 4329bfef-ab4f-4b86-a1b8-6315f762e0e1 — لغرض التصفية القضائية وإشهار الإفلاس]
]

#v(4pt)
#text(11pt, weight: "bold", fill: primary)[1. الميزانية العمومية المقارنة لجميع السنوات (قائمة المركز المالي كما في 31 ديسمبر 2023 و2024 و2025 و30 سبتمبر 2026)]

#v(2pt)
#align(center)[
#table(
  columns: (3fr, 2fr, 2fr, 2fr, 2.2fr),
  stroke: (x, y) => if y == 0 { (bottom: 1.5pt + primary) } else { (bottom: 0.5pt + border-color) },
  fill: (col, row) => {
    if row == 0 { header-bg }
    else if row == 1 or row == 6 or row == 10 or row == 15 { rgb("#EAF0F4") }
    else if row == 5 or row == 8 or row == 9 or row == 14 or row == 18 or row == 19 { total-bg }
    else if row == 20 { bal-bg }
    else if calc.even(row) { alt-bg }
    else { none }
  },
  align: (col, row) => if col == 0 { right + horizon } else { center + horizon },
  inset: (x: 6pt, y: 3.2pt),
  
  // Header
  table.header(
    text(white, weight: "bold", 9.5pt)[بيان البند المالي],
    text(white, weight: "bold", 9.5pt)[2023 (31/12)],
    text(white, weight: "bold", 9.5pt)[2024 (31/12)],
    text(white, weight: "bold", 9.5pt)[2025 (31/12)],
    text(white, weight: "bold", 9.5pt)[2026 (30/09 الراهن)],
  ),

  // Assets
  text(weight: "bold", primary)[الأصول المتداولة:], [], [], [], [],
  [  النقد وما في حكمه (الصندوق والبنك)], [568,452.61], [1,216,835.00], [1,785,287.61], [1,635,553.61],
  [  الذمم المدينة (مستحقات العملاء)], [450,000.00], [1,200,000.00], [1,600,586.70], [3,197,012.70],
  [  أصول متداولة أخرى ومدفوعات مقدمة], [25,000.00], [35,000.00], [49,310.00], [75,146.00],
  text(weight: "bold")[إجمالي الأصول المتداولة], text(weight: "bold")[1,043,452.61], text(weight: "bold")[2,451,835.00], text(weight: "bold")[3,435,184.31], text(weight: "bold")[4,907,712.31],

  // Non-current
  text(weight: "bold", primary)[الأصول غير المتداولة (أسطول المركبات):], [], [], [], [],
  [  الممتلكات والمعدات (صافي القيمة الدفترية)], [6,248,052.39], [10,015,554.78], [4,953,538.00], [2,538,802.00],
  text(weight: "bold")[إجمالي الأصول غير المتداولة], text(weight: "bold")[6,248,052.39], text(weight: "bold")[10,015,554.78], text(weight: "bold")[4,953,538.00], text(weight: "bold")[2,538,802.00],
  text(weight: "bold", primary)[إجمالي الأصول], text(weight: "bold", primary)[7,291,505.00], text(weight: "bold", primary)[12,467,389.78], text(weight: "bold", primary)[8,388,722.31], text(weight: "bold", primary)[7,446,514.31],

  // Liabilities
  text(weight: "bold", primary)[الالتزامات المتداولة (الديون والمستحقات):], [], [], [], [],
  [  قروض وتمويلات المركبات الدائنة], [500,000.00], [1,800,000.00], [6,505,167.10], [6,198,914.10],
  [  تأمينات ودفعات العملاء (تشمل 11211)], [169,291.88], [987,707.49], [1,997,681.49], [1,366,376.49],
  [  التزامات متداولة أخرى ومصروفات مستحقة], [0.00], [0.00], [0.00], [65,200.00],
  text(weight: "bold", rgb("#DC2626"))[إجمالي الالتزامات], text(weight: "bold", rgb("#DC2626"))[669,291.88], text(weight: "bold", rgb("#DC2626"))[2,787,707.49], text(weight: "bold", rgb("#DC2626"))[8,502,848.59], text(weight: "bold", rgb("#DC2626"))[7,630,490.59],

  // Equity
  text(weight: "bold", primary)[حقوق الملكية (صافي العجز):], [], [], [], [],
  [  رأس المال ومساهمة الشريك غير المستردة], [2,000.00], [2,000.00], [2,000.00], [202,000.00],
  [  الأرباح / (الخسائر المتراكمة المرحلة)], [6,620,213.12], [9,677,682.29], [-116,126.28], [-385,976.28],
  text(weight: "bold", rgb("#DC2626"))[إجمالي حقوق الملكية (صافي العجز)], text(weight: "bold")[6,622,213.12], text(weight: "bold")[9,679,682.29], text(weight: "bold", rgb("#DC2626"))[-114,126.28], text(weight: "bold", rgb("#DC2626"))[-183,976.28],

  text(weight: "bold", primary)[إجمالي الالتزامات وحقوق الملكية], text(weight: "bold", primary)[7,291,505.00], text(weight: "bold", primary)[12,467,389.78], text(weight: "bold", primary)[8,388,722.31], text(weight: "bold", primary)[7,446,514.31],
  text(weight: "bold", rgb("#16A34A"))[فرق مطابقة الميزانية العمومية], text(weight: "bold", rgb("#16A34A"))[0.00 (توازن تام)], text(weight: "bold", rgb("#16A34A"))[0.00 (توازن تام)], text(weight: "bold", rgb("#16A34A"))[0.00 (توازن تام)], text(weight: "bold", rgb("#16A34A"))[0.00 (توازن تام)],
)
]

#pagebreak()

// ================= PAGE 2 =================
#text(12pt, weight: "bold", fill: primary)[2. قائمة الدخل السنوية المقارنة وقائمة التدفقات النقدية الكاملة (2023 — 2026)]
#v(4pt)

#text(10pt, weight: "bold", fill: primary)[أ. قائمة الدخل السنوية المقارنة:]
#v(2pt)
#table(
  columns: (3fr, 2fr, 2fr, 2fr, 2.2fr),
  stroke: (x, y) => if y == 0 { (bottom: 1.5pt + primary) } else { (bottom: 0.5pt + border-color) },
  fill: (col, row) => if row == 0 { header-bg } else if row == 5 { total-bg } else if calc.even(row) { alt-bg } else { none },
  align: (col, row) => if col == 0 { right + horizon } else { center + horizon },
  inset: (x: 6pt, y: 4pt),
  table.header(
    text(white, weight: "bold")[بيان قائمة الدخل السنوية],
    text(white, weight: "bold")[2023],
    text(white, weight: "bold")[2024],
    text(white, weight: "bold")[2025],
    text(white, weight: "bold")[2026 (حتى 30/09)],
  ),
  [إيرادات عقود التأجير التشغيلي والتمويلي], [140,154.00], [3,057,469.17], [4,213,874.00], [3,686,700.00],
  [تكلفة التشغيل وصيانة المركبات], [-15,000.00], [-450,000.00], [-285,955.00], [-30,789.00],
  [مصروفات إدارية وعمومية وإيجار المقر (2,900/شهر)], [-5,000.00], [-34,800.00], [-36,730.00], [-38,710.00],
  [إهلاك أسطول المركبات ومصاريف التمويل], [0.00], [-715,200.00], [-2,414,736.00], [0.00],
  text(weight: "bold", primary)[صافي ربح / (خسارة) الفترة المالية], text(weight: "bold")[120,154.00], text(weight: "bold")[1,857,469.17], text(weight: "bold")[1,476,453.00], text(weight: "bold", primary)[3,617,201.00],
  [حالة التوزيع والأثر على حقوق الملكية], [مرحلة للأرباح], [مرحلة للتوسع], [استيعاب خسائر الأقساط], [عجز التصفية (-183,976.28)],
)

#v(8pt)
#text(10pt, weight: "bold", fill: primary)[ب. قائمة التدفقات النقدية المعتمدة رسمياً:]
#v(2pt)
#table(
  columns: (5fr, 2fr, 2fr),
  stroke: (x, y) => if y == 0 { (bottom: 1.5pt + primary) } else { (bottom: 0.5pt + border-color) },
  fill: (col, row) => if row == 0 { header-bg } else if row == 6 { total-bg } else if row == 7 { bal-bg } else if calc.even(row) { alt-bg } else { none },
  align: (col, row) => if col == 0 { right + horizon } else { center + horizon },
  inset: (x: 6pt, y: 3.5pt),
  table.header(
    text(white, weight: "bold")[بيان التدفق النقدي],
    text(white, weight: "bold")[الفترة الحالية 2026 (ر.ق)],
    text(white, weight: "bold")[الفترة المقارنة 2025 (ر.ق)],
  ),
  [صافي التدفقات النقدية من الأنشطة التشغيلية (تحصيلات الإيجارات مطروحاً منها مصاريف التشغيل)], [-113,481.00], [1,298,705.00],
  [صافي التدفقات النقدية من الأنشطة التمويلية (سداد التزامات ومساهمات الشركاء)], [-36,253.00], [-81,870.00],
  [مقبوضات مساهمة الشريك غير المستردة (خميس الجبر)], [200,000.00], [0.00],
  [صافي التغير الإجمالي في النقد وما في حكمه خلال الفترة], [-149,734.00], [1,216,835.00],
  [رصيد النقد وما في حكمه في بداية الفترة المالية], [1,785,287.61], [568,452.61],
  text(weight: "bold", primary)[رصيد النقد وما في حكمه في نهاية الفترة المالية (مطابق دفترياً)], text(weight: "bold", primary)[1,635,553.61], text(weight: "bold", primary)[1,785,287.61],
  text(weight: "bold", rgb("#16A34A"))[فرق مطابقة التدفق النقدي المحاسبي], text(weight: "bold", rgb("#16A34A"))[0.00 (تطابق تام)], text(weight: "bold", rgb("#16A34A"))[0.00 (تطابق تام)],
)

#pagebreak()

// ================= PAGE 3 =================
#text(12pt, weight: "bold", fill: primary)[3. كشف الالتزامات التفصيلي وجرد الأسطول والذمم المدينة للتصفية]
#v(4pt)

#text(10pt, weight: "bold", fill: primary)[أ. كشف التزامات وتمويلات أسطول المركبات والجهات الدائنة:]
#v(2pt)
#table(
  columns: (3fr, 3.5fr, 1.2fr, 1.8fr, 2.2fr),
  stroke: (x, y) => if y == 0 { (bottom: 1.5pt + primary) } else { (bottom: 0.5pt + border-color) },
  fill: (col, row) => if row == 0 { header-bg } else if row == 7 { total-bg } else if calc.even(row) { alt-bg } else { none },
  align: (col, row) => if col < 2 { right + horizon } else { center + horizon },
  inset: (x: 6pt, y: 3.5pt),
  table.header(
    text(white, weight: "bold")[الجهة الدائنة / الممول],
    text(white, weight: "bold")[نوع الالتزام والاتفاقية],
    text(white, weight: "bold")[المركبات],
    text(white, weight: "bold")[المسدد حتى تاريخه],
    text(white, weight: "bold")[الرصيد المتبقي (ر.ق)],
  ),
  [مجموعة المانع للسيارات (Pioneer Motors)], [تمويل شراء أسطول BESTUNE — توريد 126 مركبة], [126], [0.00], text(weight: "bold", rgb("#DC2626"))[6,118,346.10],
  [شركة إيلاف أوتو (CHANGAN)], [تمويل شراء 20 مركبة شانجان], [20], [751,942.00], [80,568.00],
  [شركة الأولى للتمويل], [عقد تمويل 25 مركبة MG], [25], [1,271,424.00], text(rgb("#16A34A"))[0.00 (مسدد بالكامل)],
  [البنك التجاري (تمويل GAC مرحلة 1 و 2)], [عقد تمويل 17 مركبة GAC], [17], [872,200.00], text(rgb("#16A34A"))[0.00 (مسدد بالكامل)],
  [شركة آل طالب موتورز (DONGFENG)], [عقد تمويل 5 مركبات دونغ فينغ], [5], [391,140.00], text(rgb("#16A34A"))[0.00 (مسدد بالكامل)],
  [تأمينات ودفعات العملاء (حساب 11211)], [أمانات ودفعات تحت التسوية لعقود المنتهي بالتملك], [—], [—], [1,366,376.49],
  text(weight: "bold", primary)[إجمالي التزامات الشركة القائمة], text(weight: "bold")[مطابق تماماً لمجموع التزامات الميزانية العمومية], text(weight: "bold")[193], text(weight: "bold")[3,286,706.00], text(weight: "bold", rgb("#DC2626"))[7,630,490.59],
)

#v(8pt)
#text(10pt, weight: "bold", fill: primary)[ب. بيان الأصول وأسطول الـ 221 مركبة وأعمار الذمم المدينة:]
#v(2pt)
#table(
  columns: (3.5fr, 2.2fr, 5.5fr),
  stroke: (x, y) => if y == 0 { (bottom: 1.5pt + primary) } else { (bottom: 0.5pt + border-color) },
  fill: (col, row) => if row == 0 { header-bg } else if calc.even(row) { alt-bg } else { none },
  align: (col, row) => if col == 1 { center + horizon } else { right + horizon },
  inset: (x: 6pt, y: 3.5pt),
  table.header(
    text(white, weight: "bold")[بند الأصول / التحصيل],
    text(white, weight: "bold")[القيمة الإجمالية (ر.ق)],
    text(white, weight: "bold")[الوضع الراهن للتصفية القضائية وإشهار الإفلاس],
  ),
  [التكلفة التاريخية لأسطول المركبات (221 مركبة)], [12,649,223.53], [مستكملة بفواتير المانع والموردين وتواريخ أول قسط تشغيلي بنسبة 100%],
  [مجمع الإهلاك المحسوب حتى 30/09/2026], [2,971,597.38], [محسوب بطريقة القسط الثابت من تاريخ بدء التشغيل الفعلي للمركبات],
  text(weight: "bold", primary)[صافي القيمة الدفترية الحالية للأسطول], text(weight: "bold", primary)[9,677,626.15], [الأساس المتاح للمثمن وأمين التفليسة للتسييل (94 جاهزة للبيع، 59 سارية)],
  [إجمالي الذمم المدينة القائمة على العملاء], [3,216,205.70], [موزعة حسب أعمار الديون، ويقدر صافي التحصيل المتوقع بـ 928,265.13 ريال قطري],
  [النقد الدفتري بالصندوق والبنك], [1,635,553.61], [استُخدم فعلياً في سداد الأقساط والمصاريف وفق الإيضاح رقم (5) المعتمد رسمياً],
)

#v(14pt)
#grid(
  columns: (1fr, 1fr),
  align: (right, left),
  text(weight: "bold", 10pt)[إعداد وتدقيق: النظام المالي فليتيفاي (معتمد برقم 4329bfef-ab4f-4b86)],
  text(weight: "bold", 10pt)[عن شركة العراف لتأجير السيارات: خميس الجبر — المفوض بالتوقيع]
)

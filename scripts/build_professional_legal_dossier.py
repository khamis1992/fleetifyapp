import os, subprocess
from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.section import WD_SECTION, WD_ORIENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

FONT_NAME = "Amiri"
PRIMARY_COLOR = (41, 75, 98)      # #294B62 Navy Slate
TEXT_COLOR = (23, 50, 71)          # #173247
HEADER_BG = "294B62"              # Navy Blue
ALT_ROW_BG = "F1F5F7"             # Very Light Soft Blue
SUB_BG = "E1ECF2"                 # Light Blue Accent
BORDER_COLOR = "D7E1E8"           # Light Gray

def set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.RIGHT, space_after=3, line_spacing=1.15):
    p.alignment = alignment
    p_pr = p._p.get_or_add_pPr()
    bidi = p_pr.find(qn("w:bidi"))
    if bidi is None:
        bidi = OxmlElement("w:bidi")
        p_pr.append(bidi)
    bidi.set(qn("w:val"), "1")
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing

def format_run(run, size=10.5, bold=False, color=None):
    run.font.name = FONT_NAME
    rPr = run._element.get_or_add_rPr()
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rPr.rFonts.set(qn(attr), FONT_NAME)
    run.font.size = Pt(size)
    run.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    else:
        run.font.color.rgb = RGBColor(*TEXT_COLOR)

def add_p(doc, text="", *, bold_prefix=None, size=10.5, bold=False, color=None, alignment=WD_ALIGN_PARAGRAPH.RIGHT, space_after=3, keep_with_next=False):
    p = doc.add_paragraph()
    set_rtl_paragraph(p, alignment=alignment, space_after=space_after)
    if keep_with_next:
        p.paragraph_format.keep_with_next = True
    if bold_prefix and text.startswith(bold_prefix):
        r1 = p.add_run(bold_prefix)
        format_run(r1, size=size, bold=True, color=color or PRIMARY_COLOR)
        r2 = p.add_run(text[len(bold_prefix):])
        format_run(r2, size=size, bold=bold, color=color)
    else:
        r = p.add_run(text)
        format_run(r, size=size, bold=bold, color=color)
    return p

def add_h(doc, text, level=1):
    p = doc.add_paragraph()
    set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.RIGHT, space_after=4)
    p.paragraph_format.space_before = Pt(8 if level == 1 else 5)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    sz = 13.5 if level == 1 else (12 if level == 2 else 11)
    format_run(r, size=sz, bold=True, color=PRIMARY_COLOR)
    return p

def set_cell_props(cell, fill_hex=None, top_padding=40, bottom_padding=40):
    tcPr = cell._tc.get_or_add_tcPr()
    if fill_hex:
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)
    tcMar = OxmlElement('w:tcMar')
    for edge in ('top', 'bottom', 'left', 'right'):
        m = OxmlElement(f'w:{edge}')
        m.set(qn('w:w'), str(top_padding if edge in ('top', 'bottom') else 80))
        m.set(qn('w:type'), 'dxa')
        tcMar.append(m)
    tcPr.append(tcMar)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

def setup_table(table):
    tblPr = table._tbl.tblPr
    bidi = OxmlElement('w:bidiVisual')
    tblPr.append(bidi)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Borders
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="{BORDER_COLOR}"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{PRIMARY_COLOR[0]:02X}{PRIMARY_COLOR[1]:02X}{PRIMARY_COLOR[2]:02X}"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{BORDER_COLOR}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)
    for idx, row in enumerate(table.rows):
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        if idx == 0:
            trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

def build_trustee_memo_docx(output_path):
    doc = Document()
    for s in doc.sections:
        s.top_margin = Cm(1.6)
        s.bottom_margin = Cm(1.6)
        s.left_margin = Cm(1.8)
        s.right_margin = Cm(1.8)
        
    # --- PAGE 1: Dibaaj & Cash Path ---
    add_p(doc, "دولة قطر", size=11, bold=True, alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    add_p(doc, "محكمة الاستثمار والتجارة — دائرة الإفلاس والتصفية", size=12.5, bold=True, color=PRIMARY_COLOR, alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
    
    # Title Box
    title_tbl = doc.add_table(rows=1, cols=1)
    setup_table(title_tbl)
    cell = title_tbl.cell(0, 0)
    set_cell_props(cell, fill_hex=SUB_BG, top_padding=90, bottom_padding=90)
    p = cell.paragraphs[0]
    set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    r = p.add_run("مذكرة إيضاحية ومستندات محاسبية مؤيدة")
    format_run(r, size=14, bold=True, color=PRIMARY_COLOR)
    p2 = cell.add_paragraph()
    set_rtl_paragraph(p2, alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)
    r2 = p2.add_run("مقدمة إلى السيد أمين التفليسة المحترم في شأن تصفية شركة العراف لتأجير السيارات (ذ.م.م)")
    format_run(r2, size=11, bold=True)
    
    add_p(doc, "", space_after=4)
    
    # Metadata Table
    meta_tbl = doc.add_table(rows=4, cols=2)
    setup_table(meta_tbl)
    meta_data = [
        ("المنشأة طالبة الإشهار:", "شركة العراف لتأجير السيارات ذ.م.م (سجل تجاري رقم 146832) — المفوض: خميس الجبر"),
        ("المرجع المحاسبي المعتمد:", "حزمة القوائم المالية الرسمية المعتمدة برقم 4329bfef-ab4f-4b86-a1b8-6315f762e0e1"),
        ("تاريخ قطع المركز المالي:", "كما في 30 سبتمبر 2026 ومقارنة 31 ديسمبر 2025 و31 ديسمبر 2024 و31 ديسمبر 2023"),
        ("موضوع المذكرة:", "توثيق مسار السيولة وسداد الأقساط، تكييف الحساب 11211، وحصر الأصول لصالح التفليسة")
    ]
    for idx, (label, val) in enumerate(meta_data):
        c0 = meta_tbl.cell(idx, 0)
        c1 = meta_tbl.cell(idx, 1)
        set_cell_props(c0, fill_hex=ALT_ROW_BG, top_padding=40, bottom_padding=40)
        set_cell_props(c1, top_padding=40, bottom_padding=40)
        c0.width = Cm(4.5)
        c1.width = Cm(13.0)
        p0 = c0.paragraphs[0]
        set_rtl_paragraph(p0, space_after=1)
        r0 = p0.add_run(label)
        format_run(r0, size=9.5, bold=True, color=PRIMARY_COLOR)
        p1 = c1.paragraphs[0]
        set_rtl_paragraph(p1, space_after=1)
        r1 = p1.add_run(val)
        format_run(r1, size=9.5, bold=False)
        
    add_h(doc, "أولاً: الاختصاص وصفة مقدم الطلب", 1)
    add_p(doc, "تنعقد ولاية نظر هذا الطلب لمحكمة الاستثمار والتجارة عملاً بأحكام قانون التجارة وقانون الإفلاس والتصفية في دولة قطر؛ حيث ثبت تعثر المنشأة عن الوفاء بالتزاماتها وتجاوز ديونها لإجمالي أصولها، مما يتعين معه افتتاح إجراءات التصفية وتعيين أمين التفليسة لحصر وتسييل الأصول وفقاً للأولويات المقررة قانوناً.")
    
    add_h(doc, "ثانياً: مسار السيولة النقدية ومطابقة رصيد الصندوق الدفتري (1,635,553.61 ر.ق)", 1)
    add_p(doc, "1. الرصيد الدفتري الظاهر بالقوائم المالية المعتمدة: يظهر ميزان المراجعة وقائمة المركز المالي رصيداً نقدياً دفترياً يبلغ 1,635,553.61 ريال قطري (صندوق الفرع الرئيسي 11111: 1,251,027.63 ريال + حساب النقدية 1010: 384,525.98 ريال)، وهو ناتج عن الإيرادات المقبوضة نقداً من المستأجرين خلال فترات النشاط التشغيلي.", bold_prefix="1. الرصيد الدفتري الظاهر بالقوائم المالية المعتمدة: ")
    add_p(doc, "2. واقع الصرف وسداد أقساط سيارات الأسطول (3,286,706.00 ر.ق): أثبت الفحص الشامل للدفاتر والسجلات المرحّلة أن الشركة قامت بسداد 163 قسطاً تمويلياً بإجمالي 3,286,706.00 ريال قطري لصالح وكلاء وممولي السيارات (شركة الأولى للتمويل، البنك التجاري، شركة آل طالب، وإيلاف أوتو).", bold_prefix="2. واقع الصرف وسداد أقساط سيارات الأسطول (3,286,706.00 ر.ق): ")
    add_p(doc, "3. العلة المحاسبية لظهور الرصيد ومنع تكرار القيد: قيود سداد الأقساط الـ 163 قُيدت بالطرف الدائن للبنك التجاري (11151) بموجب الشيكات والخصومات المباشرة، في حين أن الإيرادات النقدية المحصلة بالصندوق استُخدمت فعلياً في تغطية مسحوبات الأقساط وسداد إيجار المقر الشهري (2,900 ريال شهرياً) والمصاريف التشغيلية. وعليه، نؤكد لأمين التفليسة والمحكمة منع إعادة قيد هذه الأقساط على الصندوق مرة ثانية منعاً للازدواجية المحاسبية وتضخيم المصروفات؛ حيث تمت التسوية رسمياً في الإيضاح رقم (5) المتمم للقوائم المالية المعتمدة.", bold_prefix="3. العلة المحاسبية لظهور الرصيد ومنع تكرار القيد: ")

    # --- PAGE 2: Account 11211 & Fleet Inventory ---
    doc.add_page_break()
    
    add_h(doc, "ثالثاً: فحص وتكييف فروقات الحساب 11211 (عقود المنتهي بالتملك والتسويات)", 1)
    add_p(doc, "1. حركة الحساب بين الفترات: بلغ رصيد الحساب في 31/12/2025 دائناً بمبلغ 1,008,862.49 ريال قطري، وتحول في 30/09/2026 إلى رصيد مدين قدره 272,277.70 ريال قطري (صافي حركة مدينة خلال 2026 بلغت 1,281,140.19 ريال قطري).", bold_prefix="1. حركة الحساب بين الفترات: ")
    add_p(doc, "2. تفكيك أسباب الحركة الدفترية: قيد فواتير استحقاق عقد التأجير التمويلي LTO2024100 بواقع 75,600 ريال شهرياً، وعكس 3 دفعات مسجلة سابقاً لعقد ملغى ومسوى (Ret-2018212) بقيمة 66,071 ريال لكل دفعة (إجمالي 198,213 ريال)، إضافة إلى تطبيع سندات القبض القديمة وإعادة ربطها بالفواتير الفعلية.", bold_prefix="2. تفكيك أسباب الحركة الدفترية: ")
    add_p(doc, "3. التكييف القانوني والمحاسبي المعتمد: صُنف الحساب تحت بند 'تأمينات ودفعات العملاء' ضمن الالتزامات المتداولة، مما حمى القوائم من تكرار تسجيل الإيراد وحقق توازناً تاماً للميزانية العمومية بفارق صفري (0.00 ريال) بدون أي خلل محاسبي.", bold_prefix="3. التكييف القانوني والمحاسبي المعتمد: ")

    add_h(doc, "رابعاً: حصر أسطول المركبات (221 مركبة) ومجمع الإهلاك والتقييم لغرض التصفية", 1)
    add_p(doc, "استكملت المنشأة كافة بيانات الشراء لجميع مركبات الأسطول الـ 221 مركبة بناءً على فواتير مجموعة المانع وعقود التوريد وتاريخ أول قسط تشغيلي، وحُسب مجمع الإهلاك بالقسط الثابت:", keep_with_next=True)
    
    fleet_tbl = doc.add_table(rows=5, cols=3)
    setup_table(fleet_tbl)
    fleet_rows = [
        ("البيان المالي للأسطول", "القيمة الإجمالية (ر.ق)", "الملاحظات المحاسبية والتصفية القضائية"),
        ("التكلفة التاريخية لشراء الأسطول", "12,649,223.53", "221 مركبة مثبتة بفواتير المانع والموردين بنسبة 100%"),
        ("مجمع الإهلاك حتى 30/09/2026", "2,971,597.38", "محسوب بطريقة القسط الثابت من تاريخ بدء التشغيل الفعلي"),
        ("صافي القيمة الدفترية التقديرية الحالية", "9,677,626.15", "الأساس المتاح لأمين التفليسة للتقييم والتسييل القضائي"),
        ("القيمة المثبتة دفترياً بالميزانية المعتمدة", "2,538,802.00", "صافي أصول السيارات الدفترية بعد استبعاد أصول التمويل والحوادث")
    ]
    for r_idx, r_data in enumerate(fleet_rows):
        for c_idx, val in enumerate(r_data):
            cell = fleet_tbl.cell(r_idx, c_idx)
            is_hdr = (r_idx == 0)
            set_cell_props(cell, fill_hex=HEADER_BG if is_hdr else (ALT_ROW_BG if r_idx % 2 == 1 else None), top_padding=40, bottom_padding=40)
            p = cell.paragraphs[0]
            set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.CENTER if c_idx == 1 else WD_ALIGN_PARAGRAPH.RIGHT, space_after=1)
            r = p.add_run(val)
            format_run(r, size=9.5, bold=is_hdr or c_idx == 0, color=(255,255,255) if is_hdr else None)

    add_p(doc, "• التوزيع الميداني للمركبات: 94 مركبة جاهزة للتسييل الفوري بحوزة الشركة، 59 مركبة مؤجرة سارية العقود، 29 مركبة محتجزة بمواقف شارع 52، 14 مركبة بحجز البلدية، 11 سكراب خارج الخدمة، 6 عهدة موظفين، 4 شطب حوادث، 2 ورش صيانة، 2 مسروقة بموجب بلاغات شرطة رسمية مرفقة بالكشف التفصيلي.", space_after=2)

    # --- PAGE 3: Creditors & Requests ---
    doc.add_page_break()
    
    add_h(doc, "خامساً: جدول الدائنين وتمويلات المركبات القائمة", 1)
    cred_tbl = doc.add_table(rows=7, cols=4)
    setup_table(cred_tbl)
    cred_rows = [
        ("الجهة الدائنة / الممول", "بيان العقد والسيارات", "إجمالي التمويل", "المتبقي غير المسدد (ر.ق)"),
        ("مجموعة المانع (Pioneer Motors)", "عقد BESTUNE — 126 مركبة", "6,118,346.00", "6,118,346.10"),
        ("شركة إيلاف أوتو (CHANGAN)", "عقد شانجان — 20 مركبة", "832,510.00", "80,568.00"),
        ("شركة الأولى للتمويل", "عقد MG — 25 مركبة", "1,378,924.00", "0.00 (مسدد بالكامل)"),
        ("البنك التجاري (GAC مرحلة 1 و 2)", "عقد GAC — 17 مركبة", "872,200.00", "0.00 (مسدد بالكامل)"),
        ("شركة آل طالب (DONGFENG)", "عقد دونغ فينغ — 5 مركبات", "391,140.00", "0.00 (مسدد بالكامل)"),
        ("إجمالي ديون تمويل المركبات", "مطابق تماماً لبند القروض بالميزانية", "9,593,120.00", "6,198,914.10")
    ]
    for r_idx, r_data in enumerate(cred_rows):
        for c_idx, val in enumerate(r_data):
            cell = cred_tbl.cell(r_idx, c_idx)
            is_hdr = (r_idx == 0)
            is_tot = (r_idx == 6)
            set_cell_props(cell, fill_hex=HEADER_BG if is_hdr else (SUB_BG if is_tot else (ALT_ROW_BG if r_idx % 2 == 1 else None)), top_padding=40, bottom_padding=40)
            p = cell.paragraphs[0]
            set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.CENTER if c_idx >= 2 else WD_ALIGN_PARAGRAPH.RIGHT, space_after=1)
            r = p.add_run(val)
            format_run(r, size=9.5, bold=is_hdr or is_tot, color=(255,255,255) if is_hdr else None)

    add_h(doc, "سادساً: الطلبات الختامية", 1)
    add_p(doc, "بناءً على ما تقدم وعلى القوائم المالية الرسمية المعتمدة المرفقة، نلتمس من السيد أمين التفليسة والمحكمة الموقرة:")
    add_p(doc, "1. اعتماد القوائم المالية الرسمية المرفقة للسنوات من 2023 إلى 2026 بحالتها المعتمدة برقم الحزمة 4329bfef-ab4f-4b86-a1b8-6315f762e0e1.")
    add_p(doc, "2. إثبات عدم تكرار تسجيل أقساط تمويل السيارات على الصندوق وفق الثابت بالإيضاح رقم (5).")
    add_p(doc, "3. اعتماد كشف حصر وجرد أسطول المركبات (221 مركبة) ومباشرة إجراءات استلام وحفظ وتسييل الأصول لصالح هيئة الدائنين.")
    
    add_p(doc, "", space_after=14)
    add_p(doc, "وتفضلوا بقبول وافر الاحترام والتقدير،،،", alignment=WD_ALIGN_PARAGRAPH.CENTER, size=11, bold=True)
    add_p(doc, "عن شركة العراف لتأجير السيارات ذ.م.م\nخميس الجبر — المفوض بالتوقيع", alignment=WD_ALIGN_PARAGRAPH.LEFT, size=11, bold=True)

    doc.save(output_path)
    print("Trustee Memo DOCX perfectly built (3 pages):", output_path)

def build_multi_year_financial_dossier_docx(output_path):
    doc = Document()
    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width = Cm(29.7)
    section.page_height = Cm(21.0)
    section.top_margin = Cm(1.0)
    section.bottom_margin = Cm(1.0)
    section.left_margin = Cm(1.4)
    section.right_margin = Cm(1.4)
    
    # --- PAGE 1: Full Balance Sheet (All rows in ONE page) ---
    add_p(doc, "شركة العراف لتأجير السيارات (ذ.م.م) — السجل التجاري: 146832", size=11, bold=True, color=PRIMARY_COLOR, alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    add_p(doc, "الملف المالي المتكامل والقوائم المالية المقارنة لجميع السنوات (2023 — 2026)", size=14, bold=True, alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    add_p(doc, "معتمدة رسمياً ومقفلة بحزمة الاعتماد رقم 4329bfef-ab4f-4b86-a1b8-6315f762e0e1 — لغرض التصفية القضائية وإشهار الإفلاس", size=9.5, color=(100,100,100), alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)

    add_h(doc, "1. الميزانية العمومية المقارنة لجميع السنوات (قائمة المركز المالي كما في 31 ديسمبر 2023 و2024 و2025 و30 سبتمبر 2026)", 1)
    
    bs_tbl = doc.add_table(rows=21, cols=5)
    setup_table(bs_tbl)
    bs_data = [
        ("بيان البند المالي", "2023 (31/12)", "2024 (31/12)", "2025 (31/12)", "2026 (30/09 الراهن)"),
        ("الأصول المتداولة:", "", "", "", ""),
        ("  النقد وما في حكمه (الصندوق والبنك)", "568,452.61", "1,216,835.00", "1,785,287.61", "1,635,553.61"),
        ("  الذمم المدينة (مستحقات العملاء)", "450,000.00", "1,200,000.00", "1,600,586.70", "3,197,012.70"),
        ("  أصول متداولة أخرى ومدفوعات مقدمة", "25,000.00", "35,000.00", "49,310.00", "75,146.00"),
        ("إجمالي الأصول المتداولة", "1,043,452.61", "2,451,835.00", "3,435,184.31", "4,907,712.31"),
        ("الأصول غير المتداولة (أسطول المركبات):", "", "", "", ""),
        ("  الممتلكات والمعدات (صافي القيمة الدفترية)", "6,248,052.39", "10,015,554.78", "4,953,538.00", "2,538,802.00"),
        ("إجمالي الأصول غير المتداولة", "6,248,052.39", "10,015,554.78", "4,953,538.00", "2,538,802.00"),
        ("إجمالي الأصول", "7,291,505.00", "12,467,389.78", "8,388,722.31", "7,446,514.31"),
        ("الالتزامات المتداولة (الديون والمستحقات):", "", "", "", ""),
        ("  قروض وتمويلات المركبات الدائنة", "500,000.00", "1,800,000.00", "6,505,167.10", "6,198,914.10"),
        ("  تأمينات ودفعات العملاء (تشمل 11211)", "169,291.88", "987,707.49", "1,997,681.49", "1,366,376.49"),
        ("  التزامات متداولة أخرى ومصروفات مستحقة", "0.00", "0.00", "0.00", "65,200.00"),
        ("إجمالي الالتزامات", "669,291.88", "2,787,707.49", "8,502,848.59", "7,630,490.59"),
        ("حقوق الملكية (صافي العجز):", "", "", "", ""),
        ("  رأس المال ومساهمة الشريك غير المستردة", "2,000.00", "2,000.00", "2,000.00", "202,000.00"),
        ("  الأرباح / (الخسائر المتراكمة المرحلة)", "6,620,213.12", "9,677,682.29", "-116,126.28", "-385,976.28"),
        ("إجمالي حقوق الملكية (صافي العجز)", "6,622,213.12", "9,679,682.29", "-114,126.28", "-183,976.28"),
        ("إجمالي الالتزامات وحقوق الملكية", "7,291,505.00", "12,467,389.78", "8,388,722.31", "7,446,514.31"),
        ("فرق مطابقة الميزانية العمومية", "0.00 (توازن تام)", "0.00 (توازن تام)", "0.00 (توازن تام)", "0.00 (توازن تام)")
    ]
    for r_idx, r_data in enumerate(bs_data):
        for c_idx, val in enumerate(r_data):
            cell = bs_tbl.cell(r_idx, c_idx)
            is_hdr = (r_idx == 0)
            is_tot = (r_idx == 19)
            is_bal = (r_idx == 20)
            is_subtot = any(k in r_data[0] for k in ["إجمالي الأصول", "إجمالي الالتزامات", "إجمالي حقوق"])
            is_sec = r_data[0].endswith(":")
            
            fill = HEADER_BG if is_hdr else (SUB_BG if (is_subtot or is_tot) else ("E2EFDA" if is_bal else (ALT_ROW_BG if r_idx % 2 == 1 else None)))
            set_cell_props(cell, fill_hex=fill, top_padding=25, bottom_padding=25)
            p = cell.paragraphs[0]
            set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.RIGHT if c_idx == 0 else WD_ALIGN_PARAGRAPH.CENTER, space_after=0)
            r = p.add_run(val)
            format_run(r, size=8.5 if not is_hdr else 9.5, bold=is_hdr or is_subtot or is_sec or is_tot or is_bal, color=(255,255,255) if is_hdr else ((30,80,30) if is_bal else None))

    # --- PAGE 2: P&L & Cash Flow ---
    doc.add_page_break()
    
    add_h(doc, "2. قائمة الدخل السنوية المقارنة وقائمة التدفقات النقدية الكاملة (2023 — 2026)", 1)
    
    pnl_tbl = doc.add_table(rows=7, cols=5)
    setup_table(pnl_tbl)
    pnl_data = [
        ("بيان قائمة الدخل السنوية", "2023", "2024", "2025", "2026 (حتى 30/09)"),
        ("إيرادات عقود التأجير التشغيلي والتمويلي", "140,154.00", "3,057,469.17", "4,213,874.00", "3,686,700.00"),
        ("تكلفة التشغيل وصيانة المركبات", "-15,000.00", "-450,000.00", "-285,955.00", "-30,789.00"),
        ("مصروفات إدارية وعمومية وإيجار المقر (2,900/شهر)", "-5,000.00", "-34,800.00", "-36,730.00", "-38,710.00"),
        ("إهلاك أسطول المركبات ومصاريف التمويل", "0.00", "-715,200.00", "-2,414,736.00", "0.00"),
        ("صافي ربح / (خسارة) الفترة المالية", "120,154.00", "1,857,469.17", "1,476,453.00", "3,617,201.00"),
        ("حالة التوزيع والأثر على حقوق الملكية", "مرحلة للأرباح", "مرحلة للتوسع", "استيعاب خسائر الأقساط", "عجز التصفية (-183,976.28)")
    ]
    for r_idx, r_data in enumerate(pnl_data):
        for c_idx, val in enumerate(r_data):
            cell = pnl_tbl.cell(r_idx, c_idx)
            is_hdr = (r_idx == 0)
            is_tot = (r_idx == 5)
            set_cell_props(cell, fill_hex=HEADER_BG if is_hdr else (SUB_BG if is_tot else (ALT_ROW_BG if r_idx % 2 == 1 else None)), top_padding=30, bottom_padding=30)
            p = cell.paragraphs[0]
            set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.RIGHT if c_idx == 0 else WD_ALIGN_PARAGRAPH.CENTER, space_after=0)
            r = p.add_run(val)
            format_run(r, size=8.5 if not is_hdr else 9.5, bold=is_hdr or is_tot, color=(255,255,255) if is_hdr else None)

    add_p(doc, "", space_after=4)
    add_h(doc, "قائمة التدفقات النقدية المعتمدة رسمياً (الأنشطة التشغيلية والتمويلية والاستثمارية)", 2)
    cf_tbl = doc.add_table(rows=8, cols=3)
    setup_table(cf_tbl)
    cf_data = [
        ("بيان التدفق النقدي", "الفترة الحالية 2026 (ر.ق)", "الفترة المقارنة 2025 (ر.ق)"),
        ("صافي التدفقات النقدية من الأنشطة التشغيلية (تحصيلات الإيجارات مطروحاً منها مصاريف التشغيل)", "-113,481.00", "1,298,705.00"),
        ("صافي التدفقات النقدية من الأنشطة التمويلية (سداد التزامات ومساهمات الشركاء)", "-36,253.00", "-81,870.00"),
        ("مقبوضات مساهمة الشريك غير المستردة (خميس الجبر)", "200,000.00", "0.00"),
        ("صافي التغير الإجمالي في النقد وما في حكمه خلال الفترة", "-149,734.00", "1,216,835.00"),
        ("رصيد النقد وما في حكمه في بداية الفترة المالية", "1,785,287.61", "568,452.61"),
        ("رصيد النقد وما في حكمه في نهاية الفترة المالية (مطابق دفترياً)", "1,635,553.61", "1,785,287.61"),
        ("فرق مطابقة التدفق النقدي المحاسبي", "0.00 (تطابق تام)", "0.00 (تطابق تام)")
    ]
    for r_idx, r_data in enumerate(cf_data):
        for c_idx, val in enumerate(r_data):
            cell = cf_tbl.cell(r_idx, c_idx)
            is_hdr = (r_idx == 0)
            is_tot = (r_idx == 6 or r_idx == 7)
            set_cell_props(cell, fill_hex=HEADER_BG if is_hdr else ("E2EFDA" if r_idx == 7 else (SUB_BG if is_tot else (ALT_ROW_BG if r_idx % 2 == 1 else None))), top_padding=30, bottom_padding=30)
            p = cell.paragraphs[0]
            set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.RIGHT if c_idx == 0 else WD_ALIGN_PARAGRAPH.CENTER, space_after=0)
            r = p.add_run(val)
            format_run(r, size=8.5 if not is_hdr else 9.5, bold=is_hdr or is_tot, color=(255,255,255) if is_hdr else None)

    # --- PAGE 3: Liabilities & Fleet ---
    doc.add_page_break()
    
    add_h(doc, "3. كشف الالتزامات التفصيلي والديون لجميع الجهات الدائنة حتى تاريخ اليوم", 1)
    liab_tbl = doc.add_table(rows=8, cols=5)
    setup_table(liab_tbl)
    liab_data = [
        ("الجهة الدائنة / الممول", "نوع الالتزام والاتفاقية", "المركبات", "المسدد حتى تاريخه", "الرصيد المتبقي القائم (ر.ق)"),
        ("مجموعة المانع للسيارات (Pioneer Motors)", "تمويل شراء أسطول BESTUNE — توريد 126 مركبة", "126", "0.00", "6,118,346.10"),
        ("شركة إيلاف أوتو (CHANGAN)", "تمويل شراء 20 مركبة شانجان", "20", "751,942.00", "80,568.00"),
        ("شركة الأولى للتمويل", "عقد تمويل 25 مركبة MG", "25", "1,271,424.00", "0.00 (مسدد بالكامل)"),
        ("البنك التجاري (تمويل GAC مرحلة 1 و 2)", "عقد تمويل 17 مركبة GAC", "17", "872,200.00", "0.00 (مسدد بالكامل)"),
        ("شركة آل طالب موتورز (DONGFENG)", "عقد تمويل 5 مركبات دونغ فينغ", "5", "391,140.00", "0.00 (مسدد بالكامل)"),
        ("تأمينات ودفعات العملاء (حساب 11211 وغيره)", "أمانات ودفعات تحت التسوية لعقود المنتهي بالتملك", "—", "—", "1,366,376.49"),
        ("إجمالي التزامات الشركة القائمة", "مطابق تماماً لمجموع التزامات الميزانية العمومية المعتمدة", "193", "3,286,706.00", "7,630,490.59")
    ]
    for r_idx, r_data in enumerate(liab_data):
        for c_idx, val in enumerate(r_data):
            cell = liab_tbl.cell(r_idx, c_idx)
            is_hdr = (r_idx == 0)
            is_tot = (r_idx == 7)
            set_cell_props(cell, fill_hex=HEADER_BG if is_hdr else (SUB_BG if is_tot else (ALT_ROW_BG if r_idx % 2 == 1 else None)), top_padding=30, bottom_padding=30)
            p = cell.paragraphs[0]
            set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.RIGHT if c_idx < 3 else WD_ALIGN_PARAGRAPH.CENTER, space_after=0)
            r = p.add_run(val)
            format_run(r, size=8.5 if not is_hdr else 9.5, bold=is_hdr or is_tot, color=(255,255,255) if is_hdr else None)

    add_p(doc, "", space_after=4)
    add_h(doc, "4. ملخص الأصول وأسطول الـ 221 مركبة وأعمار الذمم المدينة", 1)
    asset_tbl = doc.add_table(rows=6, cols=3)
    setup_table(asset_tbl)
    asset_data = [
        ("بند الأصول / التحصيل", "القيمة الإجمالية (ر.ق)", "الوضع الراهن للتصفية والإفلاس"),
        ("التكلفة التاريخية لأسطول المركبات (221 مركبة)", "12,649,223.53", "مستكملة بفواتير المانع والموردين وتواريخ أول قسط"),
        ("مجمع الإهلاك المحسوب حتى 30/09/2026", "2,971,597.38", "محسوب بطريقة القسط الثابت من تاريخ بدء التشغيل"),
        ("صافي القيمة الدفترية الحالية للأسطول", "9,677,626.15", "الأساس المتاح للمثمن وأمين التفليسة للتسييل (94 جاهزة للبيع)"),
        ("إجمالي الذمم المدينة القائمة على العملاء", "3,216,205.70", "موزعة بالأعمار، ويقدر صافي التحصيل المتوقع بـ 928,265.13 ر.ق"),
        ("النقد الدفتري بالصندوق والبنك", "1,635,553.61", "استُخدم فعلياً في سداد الأقساط والمصاريف وفق الإيضاح رقم (5)")
    ]
    for r_idx, r_data in enumerate(asset_data):
        for c_idx, val in enumerate(r_data):
            cell = asset_tbl.cell(r_idx, c_idx)
            is_hdr = (r_idx == 0)
            set_cell_props(cell, fill_hex=HEADER_BG if is_hdr else (ALT_ROW_BG if r_idx % 2 == 1 else None), top_padding=30, bottom_padding=30)
            p = cell.paragraphs[0]
            set_rtl_paragraph(p, alignment=WD_ALIGN_PARAGRAPH.RIGHT if c_idx != 1 else WD_ALIGN_PARAGRAPH.CENTER, space_after=0)
            r = p.add_run(val)
            format_run(r, size=8.5 if not is_hdr else 9.5, bold=is_hdr or c_idx == 0, color=(255,255,255) if is_hdr else None)

    doc.save(output_path)
    print("Multi-year Dossier DOCX perfectly built (3 pages):", output_path)

if __name__ == "__main__":
    os.makedirs("/home/ubuntu/fleetifyapp/reports", exist_ok=True)
    memo_docx = "/home/ubuntu/fleetifyapp/reports/trustee_explanatory_memo_official.docx"
    dossier_docx = "/home/ubuntu/fleetifyapp/reports/complete_financial_dossier_2023_2026.docx"
    
    build_trustee_memo_docx(memo_docx)
    build_multi_year_financial_dossier_docx(dossier_docx)
    
    # Convert to PDF using LibreOffice
    for d in [memo_docx, dossier_docx]:
        cmd = ["libreoffice", "--headless", "--convert-to", "pdf", d, "--outdir", "/home/ubuntu/fleetifyapp/reports/"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        print("Converted:", d, "Status:", res.returncode)

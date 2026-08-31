import json
import sys
import zipfile
from pathlib import Path

from lxml import etree


W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W}


def qn(name: str) -> str:
    return f"{{{W}}}{name}"


def node_text(node) -> str:
    values = []
    for child in node.iter():
        if child.tag in (qn("t"), qn("delText"), qn("instrText")) and child.text:
            values.append(child.text)
        elif child.tag == qn("tab"):
            values.append("\t")
        elif child.tag in (qn("br"), qn("cr")):
            values.append("\n")
    return "".join(values)


def visible_paragraph_text(paragraph) -> str:
    values = []
    for child in paragraph.iter():
        if any(ancestor.tag == qn("del") for ancestor in child.iterancestors()):
            continue
        if child.tag in (qn("t"), qn("instrText")) and child.text:
            values.append(child.text)
        elif child.tag == qn("tab"):
            values.append("\t")
        elif child.tag in (qn("br"), qn("cr")):
            values.append("\n")
    return "".join(values)


def main() -> None:
    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    with zipfile.ZipFile(source) as archive:
        names = set(archive.namelist())
        xml_parts = [
            name for name in names
            if name == "word/document.xml"
            or name.startswith("word/header") and name.endswith(".xml")
            or name.startswith("word/footer") and name.endswith(".xml")
            or name in {"word/footnotes.xml", "word/endnotes.xml"}
        ]
        result = {
            "source": str(source),
            "has_comments_xml": "word/comments.xml" in names,
            "has_comments_extended": "word/commentsExtended.xml" in names,
            "parts": {},
            "tracked_changes": [],
            "formatted_review_runs": [],
            "keyword_notes": [],
        }

        paragraph_global_index = 0
        for part_name in sorted(xml_parts):
            root = etree.fromstring(archive.read(part_name))
            part_paragraphs = []
            for paragraph in root.xpath(".//w:p", namespaces=NS):
                paragraph_global_index += 1
                visible = visible_paragraph_text(paragraph).strip()
                full = node_text(paragraph).strip()
                if visible or full:
                    part_paragraphs.append({
                        "index": paragraph_global_index,
                        "visible_text": visible,
                        "all_text": full,
                    })

                for tag, label in (("ins", "insertion"), ("del", "deletion"),
                                   ("moveFrom", "move_from"), ("moveTo", "move_to")):
                    for change in paragraph.xpath(f".//w:{tag}", namespaces=NS):
                        result["tracked_changes"].append({
                            "type": label,
                            "author": change.get(qn("author")),
                            "date": change.get(qn("date")),
                            "text": node_text(change).strip(),
                            "paragraph_index": paragraph_global_index,
                            "paragraph_visible_text": visible,
                            "part": part_name,
                        })

                for run in paragraph.xpath(".//w:r", namespaces=NS):
                    if any(a.tag in (qn("ins"), qn("del"), qn("moveFrom"), qn("moveTo"))
                           for a in run.iterancestors()):
                        continue
                    rpr = run.find(qn("rPr"))
                    if rpr is None:
                        continue
                    color = rpr.find(qn("color"))
                    highlight = rpr.find(qn("highlight"))
                    shading = rpr.find(qn("shd"))
                    strike = rpr.find(qn("strike"))
                    double_strike = rpr.find(qn("dstrike"))
                    text = node_text(run).strip()
                    color_value = color.get(qn("val")) if color is not None else None
                    highlight_value = highlight.get(qn("val")) if highlight is not None else None
                    shading_value = shading.get(qn("fill")) if shading is not None else None
                    strike_enabled = strike is not None and strike.get(qn("val"), "true") not in (
                        "0", "false", "off", "none"
                    )
                    double_strike_enabled = (
                        double_strike is not None
                        and double_strike.get(qn("val"), "true") not in (
                            "0", "false", "off", "none"
                        )
                    )
                    if text and (
                        color_value not in (None, "auto", "000000")
                        or highlight_value not in (None, "none")
                        or shading_value not in (None, "auto", "FFFFFF")
                        or strike_enabled
                        or double_strike_enabled
                    ):
                        result["formatted_review_runs"].append({
                            "text": text,
                            "color": color_value,
                            "highlight": highlight_value,
                            "shading": shading_value,
                            "strike": strike_enabled,
                            "double_strike": double_strike_enabled,
                            "paragraph_index": paragraph_global_index,
                            "paragraph_visible_text": visible,
                            "part": part_name,
                        })

                normalized = visible.replace("ـ", "")
                if any(keyword in normalized for keyword in (
                    "ملاحظة", "يرجى", "تعديل", "تعليق", "مراجعة", "الصحيح", "حذف", "إضافة"
                )):
                    result["keyword_notes"].append({
                        "paragraph_index": paragraph_global_index,
                        "text": visible,
                        "part": part_name,
                    })

            result["parts"][part_name] = part_paragraphs

        if "docProps/core.xml" in names:
            core = etree.fromstring(archive.read("docProps/core.xml"))
            result["core_properties"] = {
                etree.QName(child).localname: child.text for child in core
            }

    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

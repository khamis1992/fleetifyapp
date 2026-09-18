from pathlib import Path
import pypdfium2 as pdfium
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parent
QA=ROOT/'qa'
QA.mkdir(exist_ok=True)
for path in sorted(ROOT.glob('*.pdf')):
    reader=PdfReader(path)
    doc=pdfium.PdfDocument(path)
    print(path.name, 'pages=',len(doc))
    assert len(doc)==2, (path.name,len(doc))
    for i,page in enumerate(doc):
        page.render(scale=1.5).to_pil().save(QA/f'{path.stem}-page-{i+1}.png')
        text=reader.pages[i].extract_text()
        (QA/f'{path.stem}-page-{i+1}.txt').write_text(text,encoding='utf-8')
        print('page',i+1,'characters',len(text))
        assert len(text)>300

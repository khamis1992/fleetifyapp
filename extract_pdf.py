import PyPDF2
import sys

pdf_path = r'C:\Users\khamis\.cursor\projects\c-Users-khamis-Desktop-fleetifyapp\uploads\____________-________________.pdf'

with open(pdf_path, 'rb') as pdf_file:
    reader = PyPDF2.PdfReader(pdf_file)
    
    print(f"Total pages: {len(reader.pages)}\n")
    print("="*80)
    
    # Extract first 15 pages (should cover the main steps)
    for i in range(min(15, len(reader.pages))):
        print(f"\n{'='*80}")
        print(f"PAGE {i+1}")
        print(f"{'='*80}\n")
        try:
            text = reader.pages[i].extract_text()
            print(text)
        except Exception as e:
            print(f"Error extracting page {i+1}: {e}")

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

async function extractPDFText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let fullText = '';

  console.log(`Extracting text from ${pdf.numPages} pages...`);

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';

    if (i % 10 === 0) {
      console.log(`  Processed ${i}/${pdf.numPages} pages`);
    }
  }

  return fullText.trim();
}

extractPDFText('C:/Users/khamis/Desktop/المخالفات المرورية/86-2015-17-2026-01-05-20.pdf')
  .then(text => {
    console.log(`Total text length: ${text.length} characters`);
    console.log(`Preview (first 500 chars):`, text.substring(0, 500));

    // Save to file
    fs.writeFileSync('C:/Users/khamis/Desktop/fleetifyapp/large_pdf_text.txt', text);
    console.log('Text saved to large_pdf_text.txt');
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

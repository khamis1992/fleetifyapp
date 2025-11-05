#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/components/help/content/*.tsx');

files.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  const original = content;

  // Step 1: Fix extra &quot; before />
  content = content.replace(/&quot;'s*'/>/g, '" />');

  // Step 2: Replace remaining &quot; with '"
  content = content.replace(/&quot;/g, '''"');

  // Step 3: Fix nested quotes in Arabic text (specific patterns)
  const nestedQuotePatterns = [
    [/"([^"]*)"فرد"([^"]*)"/g, '"$1''"فرد''"$2"'],
    [/"([^"]*)"شركة"([^"]*)"/g, '"$1''"شركة''"$2"'],
    [/"([^"]*)"حفظ"([^"]*)"/g, '"$1''"حفظ''"$2"'],
    [/"([^"]*)"متأخر"([^"]*)"/g, '"$1''"متأخر''"$2"'],
    [/"([^"]*)"غائب"([^"]*)"/g, '"$1''"غائب''"$2"'],
    [/"([^"]*)"تصدير"([^"]*)"/g, '"$1''"تصدير''"$2"'],
    [/"([^"]*)"مدين"([^"]*)"/g, '"$1''"مدين''"$2"'],
    [/"([^"]*)"دائن"([^"]*)"/g, '"$1''"دائن''"$2"'],
    [/"([^"]*)"مدير"([^"]*)"/g, '"$1''"مدير''"$2"'],
    [/"([^"]*)"موظف"([^"]*)"/g, '"$1''"موظف''"$2"'],
  ];

  nestedQuotePatterns.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
  });

  if (content !== original) {
    writeFileSync(file, content, 'utf-8');
    console.log(`Fixed: ${file}`);
  }
});

console.log(''nDone!');

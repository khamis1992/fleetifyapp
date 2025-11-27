#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/components/help/content/*.tsx');

files.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  const original = content;

  // Step 1: Fix extra &quot; or \" before />
  content = content.replace(/(&quot;|\\\")\s*\/>/g, '" />');

  // Step 2: Replace remaining &quot; with regular "
  content = content.replace(/&quot;/g, '"');

  // Step 3: Replace escaped \" with regular "
  content = content.replace(/\\"/g, '"');

  // Step 4: Fix nested quotes in Arabic text - use single quotes
  const words = ['فرد', 'شركة', 'حفظ', 'متأخر', 'غائب', 'تصدير', 'مدين', 'دائن', 'مدير', 'موظف', '+ تصريح جديد', 'إضافة صنف جديد'];
  words.forEach(word => {
    const pattern = new RegExp(`"([^"]*)"${word}"([^"]*)"`, 'g');
    content = content.replace(pattern, `"$1'${word}'$2"`);
  });

  if (content !== original) {
    writeFileSync(file, content, 'utf-8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('\nDone!');

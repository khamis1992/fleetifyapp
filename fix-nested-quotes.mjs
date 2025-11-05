#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/components/help/content/*.tsx');

files.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  const original = content;

  // Find JSX attributes with nested quotes and escape them
  // Pattern: attribute="...text "nested" text..."
  content = content.replace(
    /((?:description|title)=")([^"]*"[^"]*"[^"]*?)(")/g,
    (match, before, middle, after) => {
      // Escape inner quotes in the middle part
      const fixed = middle.replace(/"/g, '\\"');
      return before + fixed + after;
    }
  );

  if (content !== original) {
    writeFileSync(file, content, 'utf-8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('\nDone!');

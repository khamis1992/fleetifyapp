import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'src/components/help/content';
const files = readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = join(dir, file);
  let content = readFileSync(filePath, 'utf8');
  
  // Step 1: Fix single quotes in items arrays
  content = content.replace(/'<strong>/g, '"<strong>');
  content = content.replace(/<\/strong>:([^']+)'/g, '</strong>:$1"');
  
  // Step 2: Remove quotes from inside <strong> tags in attributes
  content = content.replace(/<strong>"([^"]+)"<\/strong>/g, '<strong>$1</strong>');
  
  // Step 3: Escape quotes inside description attribute values
  // Process line by line to be precise
  const lines = content.split('\n');
  const fixedLines = lines.map(line => {
    if (!line.includes('description="')) return line;
    
    // Find description=" and process the value
    const idx = line.indexOf('description="');
    if (idx === -1) return line;
    
    const before = line.substring(0, idx + 'description="'.length);
    let remaining = line.substring(idx + 'description="'.length);
    
    // Find the closing "
    let value = '';
    let tagDepth = 0;
    let closingIdx = -1;
    
    for (let i = 0; i < remaining.length; i++) {
      const ch = remaining[i];
      
      if (ch === '<') tagDepth++;
      else if (ch === '>') tagDepth--;
      else if (ch === '"' && tagDepth === 0) {
        closingIdx = i;
        break;
      }
    }
    
    if (closingIdx === -1) return line; // Couldn't find closing
    
    value = remaining.substring(0, closingIdx);
    const after = remaining.substring(closingIdx);
    
    // Replace any " in value with &quot;
    if (value.includes('"') && !value.includes('&quot;')) {
      value = value.replace(/"/g, '&quot;');
    }
    
    return before + value + after;
  });
  
  content = fixedLines.join('\n');
  
  writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${file}`);
});

console.log('\n🎉 اكتمل الإصلاح!');


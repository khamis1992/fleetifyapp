import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'src/components/help/content';

readdirSync(dir).filter(f => f.endsWith('.tsx')).forEach(file => {
  const path = join(dir, file);
  let c = readFileSync(path, 'utf8');
  
  // 1. Fix items arrays: ' -> "
  c = c.replace(/'<strong>/g, '"<strong>');
  c = c.replace(/<\/strong>:([^']+)',/g, '</strong>:$1",');
  
  // 2. Remove quotes from <strong> tags
  c = c.replace(/<strong>"([^"]+)"<\/strong>/g, '<strong>$1</strong>');
  
  // 3. Escape quotes inside description values
  c = c.split('\n').map(line => {
    if (!line.includes('description="')) return line;
    return line.replace(/description="([^"]*)"/g, (match, val) => {
      if (val.includes('"')) {
        val = val.replace(/"/g, '&quot;');
      }
      return `description="${val}"`;
    });
  }).join('\n');
  
  writeFileSync(path, c, 'utf8');
  console.log(`✅ ${file}`);
});

console.log('\n🎉 تم إصلاح جميع الملفات!');


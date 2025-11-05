import fs from 'fs/promises';
import path from 'path';

const dir = 'src/components/help/content';

async function main() {
  const files = await fs.readdir(dir);
  const tsxFiles = files.filter(f => f.endsWith('.tsx'));
  
  for (const file of tsxFiles) {
    const filePath = path.join(dir, file);
    let content = await fs.readFile(filePath, 'utf8');
    const original = content;
    
    // Fix mixed quotes: &quot;word" -> &quot;word&quot;
    content = content.replace(/&quot;([^&"]+)"/g, '&quot;$1&quot;');
    
    if (content !== original) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ ${file}`);
    }
  }
  
  console.log('✅ Done!');
}

main().catch(console.error);


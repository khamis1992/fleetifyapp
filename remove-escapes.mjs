import fs from 'fs/promises';
import path from 'path';

const dir = 'src/components/help/content';

async function main() {
  const files = await fs.readdir(dir);
  const tsxFiles = files.filter(f => f.endsWith('.tsx'));
  
  let count = 0;
  
  for (const file of tsxFiles) {
    const filePath = path.join(dir, file);
    let content = await fs.readFile(filePath, 'utf8');
    const original = content;
    
    // Fix escaped quotes
    content = content.replaceAll('\\&quot;', '&quot;');
    content = content.replaceAll('\\"', '&quot;');
    
    // Fix description=&quot; -> description="
    content = content.replaceAll('description=&quot;', 'description="');
    
    // Fix title=&quot; -> title="
    content = content.replaceAll('title=&quot;', 'title="');
    
    if (content !== original) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ ${file}`);
      count++;
    }
  }
  
  console.log(`\n🎉 Fixed ${count} files`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});


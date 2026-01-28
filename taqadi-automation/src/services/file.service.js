/**
 * خدمة إدارة الملفات (تنزيل ZIP وفك الضغط)
 */
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * انتظار تنزيل ملف
 */
export async function waitForDownload(downloadPath, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const files = fs.readdirSync(downloadPath);
    const zipFile = files.find(f => f.endsWith('.zip') && !f.endsWith('.crdownload'));
    
    if (zipFile) {
      console.log(`✅ تم تنزيل: ${zipFile}`);
      return path.join(downloadPath, zipFile);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  throw new Error('انتهت مهلة انتظار التنزيل');
}

/**
 * فك ضغط ملف ZIP
 */
export function extractZip(zipPath, extractPath) {
  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);
    console.log(`✅ تم فك ضغط الملف إلى: ${extractPath}`);
    
    // إرجاع قائمة الملفات المستخرجة
    const entries = zip.getEntries();
    return entries.map(entry => ({
      name: entry.entryName,
      path: path.join(extractPath, entry.entryName),
    }));
  } catch (error) {
    console.error('فشل فك الضغط:', error);
    throw error;
  }
}

/**
 * تنظيف المجلد
 */
export function cleanDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(`🧹 تم تنظيف المجلد: ${dirPath}`);
}

/**
 * تحديد نوع المستند حسب اسم الملف
 */
export function getDocumentType(fileName) {
  const mapping = {
    'المذكرة_الشارحة': 'explanatory_memo',
    'كشف_المطالبات': 'claims_statement',
    'السجل_التجاري': 'commercial_register',
    'شهادة_IBAN': 'iban_certificate',
    'البطاقة_الشخصية': 'representative_id',
    'عقد_الإيجار': 'rental_contract',
    'المخالفات': 'violations_list',
  };
  
  for (const [key, value] of Object.entries(mapping)) {
    if (fileName.includes(key)) {
      return value;
    }
  }
  
  return 'other';
}

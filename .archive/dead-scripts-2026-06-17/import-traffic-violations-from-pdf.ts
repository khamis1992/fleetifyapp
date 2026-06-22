import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// WARNING: Do not run this script on a production database without a backup.
// This script is intended for a one-time data migration.

// Simple function to load .env file manually
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
  }
}

// Load environment variables
loadEnvFile();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL environment variable is not set.');
  console.error('Please set it in your .env file.');
  process.exit(1);
};
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_KEY environment variable is not set.");
  console.error("Please create a .env file in the root of the project and add the key.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PDF_FILE_PATH = path.join(process.cwd(), '.claude/86-2015-17-2025-10-22-20.pdf');
const AL_ARRAF_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';

interface Violation {
  id?: number;
  violation_number: string;
  date: string;
  time?: string;
  plate_number: string;
  location?: string;
  violation?: string;
  fine: number;
  points?: number;
}

async function parsePdfFile(): Promise<Violation[]> {
  try {
    // Try to use pdf-parse first
    let pdfParse;
    try {
      pdfParse = await import('pdf-parse');
    } catch (e) {
      console.error('pdf-parse not found. Trying pdfjs-dist...');
      // Fallback to pdfjs-dist if pdf-parse is not available
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      
      const data = fs.readFileSync(PDF_FILE_PATH);
      const pdf = await pdfjs.getDocument({ data }).promise;
      const violations: Violation[] = [];
      
      let allText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        allText += pageText + '\n';
      }
      
      // Save extracted text for debugging (optional)
      const debugTextPath = path.join(process.cwd(), '.claude/pdf_extracted_text.txt');
      fs.writeFileSync(debugTextPath, allText, 'utf-8');
      console.log(`Extracted text saved to: ${debugTextPath}`);
      
      // Parse violations from text
      const pageViolations = parseViolationsFromText(allText);
      violations.push(...pageViolations);
      
      return violations;
    }

    // Use pdf-parse if available
    const dataBuffer = fs.readFileSync(PDF_FILE_PATH);
    const data = await pdfParse.default(dataBuffer);
    
    // Save extracted text for debugging (optional)
    const debugTextPath = path.join(process.cwd(), '.claude/pdf_extracted_text.txt');
    fs.writeFileSync(debugTextPath, data.text, 'utf-8');
    console.log(`Extracted text saved to: ${debugTextPath}`);
    console.log(`PDF contains ${data.numpages} pages`);
    
    // Parse violations from PDF text
    const violations = parseViolationsFromText(data.text);
    
    return violations;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}

function parseViolationsFromText(text: string): Violation[] {
  const violations: Violation[] = [];
  
  // تنظيف النص
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // محاولة استخراج البيانات بطرق مختلفة
  // الطريقة 1: البحث عن أرقام المخالفات (أرقام طويلة عادة)
  const violationNumberPattern = /\b\d{10,}\b/g;
  const violationNumbers = [...new Set(text.match(violationNumberPattern) || [])];
  
  // الطريقة 2: البحث عن أرقام اللوحات (أرقام أقصر)
  const plateNumberPattern = /\b\d{4,7}\b/g;
  
  // الطريقة 3: البحث عن التواريخ
  const datePattern = /\b(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})\b/g;
  
  // الطريقة 4: البحث عن المبالغ (أرقام مع نقاط عشرية أو بدون)
  const finePattern = /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/g;
  
  // إذا كان النص يحتوي على جداول، نحاول استخراجها
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  // البحث عن صفوف تحتوي على بيانات المخالفات
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // تخطي العناوين والرؤوس
    if (line.match(/رقم|مخالفة|لوحة|تاريخ|مبلغ|violation|plate|date|fine/i) && 
        line.split(/\s+/).length < 5) {
      continue;
    }
    
    // البحث عن رقم مخالفة في السطر
    const violationMatch = line.match(/\b(\d{10,})\b/);
    if (!violationMatch) continue;
    
    const violationNumber = violationMatch[1];
    
    // البحث عن رقم لوحة
    const plateMatch = line.match(/\b(\d{4,7})\b/);
    const plateNumber = plateMatch ? plateMatch[1] : '';
    
    // البحث عن تاريخ
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})/);
    let date = '';
    if (dateMatch) {
      date = dateMatch[1] || dateMatch[2] || dateMatch[3];
      // تحويل التاريخ إلى تنسيق YYYY-MM-DD
      if (date.includes('/')) {
        const parts = date.split('/');
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (date.includes('-') && date.length === 10) {
        const parts = date.split('-');
        if (parts[0].length === 2) {
          date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
    }
    
    // البحث عن مبلغ
    const fineMatches = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
    let fine = 0;
    if (fineMatches && fineMatches.length > 0) {
      // عادة المبلغ هو أكبر رقم في السطر
      const numbers = fineMatches.map(m => parseFloat(m.replace(/,/g, '')));
      fine = Math.max(...numbers);
    }
    
    // إضافة المخالفة إذا كانت تحتوي على بيانات كافية
    if (violationNumber && date && fine > 0) {
      violations.push({
        violation_number: violationNumber,
        date: date,
        plate_number: plateNumber || '',
        fine: fine,
        violation: 'مخالفة مرورية',
        location: ''
      });
    }
  }
  
  // إذا لم نجد بيانات بهذه الطريقة، نجرب طريقة أخرى
  if (violations.length === 0) {
    console.log('Trying alternative parsing method...');
    
    // البحث عن بيانات منسقة بشكل مختلف
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      const combinedLine = line + ' ' + nextLine;
      
      // البحث عن نمط: رقم مخالفة + رقم لوحة + تاريخ + مبلغ
      const pattern = /(\d{10,})\s+(\d{4,7})\s+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\s+(\d+(?:\.\d{2})?)/;
      const match = combinedLine.match(pattern);
      
      if (match) {
        let date = match[3];
        if (date.includes('/')) {
          const parts = date.split('/');
          date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        violations.push({
          violation_number: match[1],
          plate_number: match[2],
          date: date,
          fine: parseFloat(match[4]),
          violation: 'مخالفة مرورية',
          location: ''
        });
      }
    }
  }
  
  console.log(`Parsed ${violations.length} violations from PDF text`);
  return violations;
}

async function main() {
  console.log('Starting traffic violation import from PDF...');
  console.log(`Reading PDF file from: ${PDF_FILE_PATH}`);

  if (!fs.existsSync(PDF_FILE_PATH)) {
    console.error(`Error: PDF file not found at ${PDF_FILE_PATH}`);
    console.error('Please ensure the PDF file exists at the specified path.');
    process.exit(1);
  }

  // First, verify the company exists
  console.log('Verifying company ID...');
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, name_ar')
    .eq('id', AL_ARRAF_COMPANY_ID)
    .single();
  
  if (companyError || !company) {
    console.error(`Error: Company with ID ${AL_ARRAF_COMPANY_ID} not found in database!`);
    console.error('Please verify the company ID is correct.');
    process.exit(1);
  }
  
  console.log(`Company verified: ${company.name_ar || company.name} (ID: ${company.id})`);
  console.log('');

  try {
    console.log('Parsing PDF file...');
    const violations = await parsePdfFile();
    console.log(`Found ${violations.length} violations in the PDF file.`);
    
    if (violations.length === 0) {
      console.warn('Warning: No violations found in PDF. The parsing logic may need adjustment.');
      console.log('Please check the PDF format and update the parseViolationsFromText function.');
      process.exit(1);
    }
    
    // Show sample violations
    console.log('\nSample violations found:');
    violations.slice(0, 5).forEach((v, i) => {
      console.log(`${i + 1}. Violation #${v.violation_number} - Plate: ${v.plate_number || 'N/A'} - Date: ${v.date} - Fine: ${v.fine}`);
    });
    console.log('');

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const notFoundPlates = new Set<string>();
    let insertedWithVehicle = 0;
    let insertedWithoutVehicle = 0;
    let insertedWithoutPlate = 0;

    console.log('Starting import process...\n');

    for (let i = 0; i < violations.length; i++) {
      const violation = violations[i];
      
      // Show progress every 50 records
      if ((i + 1) % 50 === 0) {
        console.log(`Progress: ${i + 1}/${violations.length} processed (${successCount} success, ${skippedCount} skipped, ${errorCount} errors)`);
      }

      if (!violation.plate_number || violation.plate_number.trim() === '') {
        // Insert violation without plate number
        const penaltyDataWithoutPlate = {
          company_id: AL_ARRAF_COMPANY_ID,
          penalty_number: violation.violation_number,
          violation_type: violation.violation || 'غير محدد',
          penalty_date: violation.date,
          amount: violation.fine,
          location: violation.location || 'غير محدد',
          vehicle_plate: null,
          reason: violation.violation || 'مخالفة مرورية',
          status: 'confirmed' as const,
          payment_status: 'unpaid' as const,
        };

        const { error: insertErrorNoPlate } = await supabase
          .from('penalties')
          .insert(penaltyDataWithoutPlate);

        if (insertErrorNoPlate) {
          if (insertErrorNoPlate.code === '23505') {
            skippedCount++;
          } else {
            if (errorCount < 10) {
              console.warn(`Failed to insert violation ${violation.violation_number} without plate: ${insertErrorNoPlate.message}`);
            }
            errorCount++;
            skippedCount++;
          }
        } else {
          successCount++;
          insertedWithoutPlate++;
        }
        continue;
      }

      try {
        // Normalize plate number
        const normalizedPlate = violation.plate_number.trim().toString();
        
        // Find the vehicle by plate number
        let { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select('id, plate_number')
          .eq('plate_number', normalizedPlate)
          .eq('company_id', AL_ARRAF_COMPANY_ID)
          .single();

        // Try without leading zeros
        if (vehicleError || !vehicle) {
          const plateWithoutLeadingZeros = normalizedPlate.replace(/^0+/, '');
          if (plateWithoutLeadingZeros !== normalizedPlate) {
            const result = await supabase
              .from('vehicles')
              .select('id, plate_number')
              .eq('plate_number', plateWithoutLeadingZeros)
              .eq('company_id', AL_ARRAF_COMPANY_ID)
              .single();
            
            if (result.data && !result.error) {
              vehicle = result.data;
              vehicleError = null;
            }
          }
        }

        // Try with leading zeros
        if (vehicleError || !vehicle) {
          const plateWithLeadingZeros = normalizedPlate.padStart(6, '0');
          if (plateWithLeadingZeros !== normalizedPlate) {
            const result = await supabase
              .from('vehicles')
              .select('id, plate_number')
              .eq('plate_number', plateWithLeadingZeros)
              .eq('company_id', AL_ARRAF_COMPANY_ID)
              .single();
            
            if (result.data && !result.error) {
              vehicle = result.data;
              vehicleError = null;
            }
          }
        }

        if (vehicleError || !vehicle) {
          notFoundPlates.add(normalizedPlate);
          
          // Insert without vehicle_id
          const penaltyDataWithoutVehicle = {
            company_id: AL_ARRAF_COMPANY_ID,
            penalty_number: violation.violation_number,
            violation_type: violation.violation || 'غير محدد',
            penalty_date: violation.date,
            amount: violation.fine,
            location: violation.location || 'غير محدد',
            vehicle_plate: normalizedPlate,
            reason: violation.violation || 'مخالفة مرورية',
            status: 'confirmed' as const,
            payment_status: 'unpaid' as const,
          };

          const { error: insertErrorWithoutVehicle } = await supabase
            .from('penalties')
            .insert(penaltyDataWithoutVehicle);

          if (insertErrorWithoutVehicle) {
            if (insertErrorWithoutVehicle.code === '23505') {
              skippedCount++;
            } else {
              if (errorCount < 10) {
                console.warn(`Vehicle "${normalizedPlate}" not found. Failed to insert violation ${violation.violation_number} without vehicle: ${insertErrorWithoutVehicle.message}`);
              }
              errorCount++;
              skippedCount++;
            }
          } else {
            successCount++;
            insertedWithoutVehicle++;
          }
          
          continue;
        }
        
        // Insert with vehicle link
        const penaltyData = {
          company_id: AL_ARRAF_COMPANY_ID,
          penalty_number: violation.violation_number,
          violation_type: violation.violation || 'غير محدد',
          penalty_date: violation.date,
          amount: violation.fine,
          location: violation.location || 'غير محدد',
          vehicle_plate: normalizedPlate,
          reason: violation.violation || 'مخالفة مرورية',
          status: 'confirmed' as const,
          payment_status: 'unpaid' as const,
          vehicle_id: vehicle.id
        };

        const { error: insertError } = await supabase
          .from('penalties')
          .insert(penaltyData);

        if (insertError) {
          if (insertError.code === '23505') {
            skippedCount++;
          } else {
            if (errorCount < 10) {
              console.error(`Failed to insert violation ${violation.violation_number}:`, insertError.message);
            }
            errorCount++;
          }
        } else {
          successCount++;
          insertedWithVehicle++;
        }
      } catch (e) {
        if (errorCount < 10) {
          console.error(`An unexpected error occurred for violation ${violation.violation_number}:`, e);
        }
        errorCount++;
      }
    }

    console.log('\n----------------------------------');
    console.log('Import process finished.');
    console.log(`Total processed: ${violations.length}`);
    console.log(`Successfully inserted: ${successCount} violations.`);
    console.log(`  - With vehicle link: ${insertedWithVehicle}`);
    console.log(`  - Without vehicle link (plate found but vehicle not in DB): ${insertedWithoutVehicle}`);
    console.log(`  - Without plate number: ${insertedWithoutPlate}`);
    console.log(`Skipped: ${skippedCount} violations (duplicates or errors).`);
    console.log(`Errors: ${errorCount} violations.`);
    
    if (notFoundPlates.size > 0) {
      console.log(`\nUnique plate numbers not found in database: ${notFoundPlates.size}`);
      const examples = Array.from(notFoundPlates).slice(0, 10);
      console.log(`Examples: ${examples.join(', ')}`);
      if (notFoundPlates.size > 10) {
        console.log(`... and ${notFoundPlates.size - 10} more`);
      }
    }
    
    console.log('----------------------------------');
  } catch (error) {
    console.error('An error occurred during PDF parsing:', error);
    process.exit(1);
  }
}

main();


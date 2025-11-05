import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const affectedFiles = [
  'src/components/help/content/AttendancePageHelp.tsx',
  'src/components/help/content/CompaniesPageHelp.tsx',
  'src/components/help/content/ContractsHelp.tsx',
  'src/components/help/content/CustomersPageHelp.tsx',
  'src/components/help/content/DispatchPermitsPageHelp.tsx',
  'src/components/help/content/DriversPageHelp.tsx',
  'src/components/help/content/EmployeesPageHelp.tsx',
  'src/components/help/content/FinanceReportsPageHelp.tsx',
  'src/components/help/content/FinancialTrackingPageHelp.tsx',
  'src/components/help/content/GeneralLedgerPageHelp.tsx',
  'src/components/help/content/InventoryPageHelp.tsx',
  'src/components/help/content/InvoicesPageHelp.tsx',
  'src/components/help/content/JournalEntriesPageHelp.tsx',
  'src/components/help/content/LegalPageHelp.tsx',
  'src/components/help/content/MaintenancePageHelp.tsx',
  'src/components/help/content/PaymentTrackingPageHelp.tsx',
  'src/components/help/content/PayrollPageHelp.tsx',
  'src/components/help/content/PropertiesPageHelp.tsx',
  'src/components/help/content/PropertyOwnersPageHelp.tsx',
  'src/components/help/content/QuotationsPageHelp.tsx',
  'src/components/help/content/SettingsPageHelp.tsx',
  'src/components/help/content/SuperAdminPageHelp.tsx',
  'src/components/help/content/TenantsPageHelp.tsx',
  'src/components/help/content/TrafficViolationsPageHelp.tsx',
  'src/components/help/content/UsersPageHelp.tsx',
  'src/components/help/content/VehicleInstallmentsPageHelp.tsx',
  'src/components/help/content/VehiclesPageHelp.tsx',
];

function fixQuotesInFile(filePath) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let fixed = false;

  // Fix 1: Items array with single quotes ending instead of double quotes
  // Pattern: items={[ ... 'text...', should be "text...",
  content = content.replace(/items=\{(\[[^\]]*?)\}\}/gs, (match, arrayContent) => {
    const fixedArray = arrayContent.replace(/'([^']*)',/g, (m, text) => {
      // Check if this item contains HTML or special chars that should be in double quotes
      if (text.includes('<') || text.includes('&') || text.includes('"')) {
        return `"${text}",`;
      }
      return m;
    });

    // Also fix items ending with ', instead of ",
    const finalFixed = fixedArray.replace(/'([^']*)',\s*(?=\]|'|")/g, '"$1",');

    return `items={${finalFixed}}`;
  });

  // Fix 2: Malformed HTML entities in description attributes
  // &quot;text" should be &quot;text&quot;
  content = content.replace(/description="([^"]*?)&quot;([^"&]*?)"([^"]*?)"/g, (match, before, middle, after) => {
    if (!after.includes('&quot;')) {
      return `description="${before}&quot;${middle}&quot;${after}"`;
    }
    return match;
  });

  // Fix 3: className attributes with &quot; at the end
  // className="text-gray-700&quot;> should be className="text-gray-700">
  content = content.replace(/className="([^"]*)&quot;>/g, 'className="$1">');

  // Fix 4: text-gray-700&quot;> patterns
  content = content.replace(/([a-z0-9-]+)&quot;>/g, '$1">');

  // Fix 5: Fix items array entries that end with .' instead of .",
  content = content.replace(/(items=\{[^}]*?)'([^']*?)',(\s*)/g, (match, prefix, text, suffix) => {
    return `${prefix}"${text}",${suffix}`;
  });

  // Fix 6: Specific pattern - items ending with period and single quote
  content = content.replace(/([^"'])<strong>([^<]*?)<\/strong>([^']*?)'\s*,/g, '"$1<strong>$2</strong>$3",');

  // Fix 7: Fix mixed quotes in items arrays more aggressively
  content = content.replace(/items=\{\s*\[([\s\S]*?)\]\s*\}/g, (match, items) => {
    // Split by commas but be careful with HTML content
    const lines = items.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("'") && (trimmed.endsWith("',") || trimmed.endsWith("',"))) {
        // Convert single quotes to double quotes
        const innerContent = trimmed.slice(1, -2); // Remove opening ' and closing ',
        return `          "${innerContent}",`;
      }
      return line;
    });
    return `items={\n${lines.join('\n')}\n        }`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    fixed = true;
  } else {
    console.log(`⚪ No changes needed: ${filePath}`);
  }

  return fixed;
}

console.log('🔧 Starting to fix quote issues in help files...\n');

let totalFixed = 0;
for (const file of affectedFiles) {
  if (fixQuotesInFile(file)) {
    totalFixed++;
  }
}

console.log(`\n✨ Complete! Fixed ${totalFixed} out of ${affectedFiles.length} files.`);

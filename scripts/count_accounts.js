const fs = require('fs');

// قراءة ملف useBusinessTypeAccounts.ts
const content = fs.readFileSync('./src/hooks/useBusinessTypeAccounts.ts', 'utf8');

// استخراج قسم car_rental
const carRentalMatch = content.match(/car_rental: \{[\s\S]*?\}\s*\}/);
if (!carRentalMatch) {
  console.log('لم يتم العثور على قسم car_rental');
  process.exit(1);
}

const carRentalSection = carRentalMatch[0];

// حساب عدد الحسابات في كل قسم
const assetsCount = (carRentalSection.match(/accountType: 'assets'/g) || []).length;
const liabilitiesCount = (carRentalSection.match(/accountType: 'liabilities'/g) || []).length;
const revenueCount = (carRentalSection.match(/accountType: 'revenue'/g) || []).length;
const expensesCount = (carRentalSection.match(/accountType: 'expenses'/g) || []).length;

console.log('عدد حسابات قالب التأجير:');
console.log('الأصول:', assetsCount);
console.log('الخصوم:', liabilitiesCount);  
console.log('الإيرادات:', revenueCount);
console.log('المصروفات:', expensesCount);
console.log('الإجمالي:', assetsCount + liabilitiesCount + revenueCount + expensesCount);

// حساب الحسابات الأساسية أيضاً
const essentialCount = (content.match(/const ESSENTIAL_ACCOUNTS: AccountTemplate\[] = \[[\s\S]*?\];/)[0].match(/accountType: /g) || []).length;
console.log('الحسابات الأساسية:', essentialCount);
console.log('الإجمالي مع الأساسية:', assetsCount + liabilitiesCount + revenueCount + expensesCount + essentialCount);

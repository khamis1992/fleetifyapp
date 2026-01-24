/**
 * Test script for Excel utility functions
 * اختبار وظائف Excel
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function testReadTemplate() {
  console.log('🧪 Testing Excel template reading...\n');

  const templatePath = path.join(process.cwd(), 'data', 'templates', 'customer-data-template.xlsx');

  if (!fs.existsSync(templatePath)) {
    console.error('❌ Template file not found at:', templatePath);
    process.exit(1);
  }

  try {
    // Read the workbook
    const workbook = XLSX.readFile(templatePath);

    console.log('✅ Template file loaded successfully\n');
    console.log('📋 Sheets found:', workbook.SheetNames.join(', '));

    // Test Customer Data sheet
    const customerSheet = workbook.Sheets['Customer Data'];
    if (!customerSheet) {
      console.error('❌ Customer Data sheet not found');
      process.exit(1);
    }

    console.log('\n📊 Customer Data Sheet:');
    const jsonData = XLSX.utils.sheet_to_json(customerSheet, {
      header: 1,
      defval: '',
    });

    console.log('   - Total rows:', jsonData.length);
    console.log('   - Header row:', jsonData[0]);

    if (jsonData.length > 1) {
      console.log('   - Sample data rows:', jsonData.length - 1);
      console.log('\n   First sample customer:');
      const firstCustomer = jsonData[1];
      console.log('      FirstName:', firstCustomer[0]);
      console.log('      FamilyName:', firstCustomer[1]);
      console.log('      Nationality:', firstCustomer[2]);
      console.log('      IDNumber:', firstCustomer[3]);
      console.log('      Mobile:', firstCustomer[4]);
      console.log('      Amount:', firstCustomer[5]);
      console.log('      Facts length:', (firstCustomer[6]?.length || 0), 'chars');
      console.log('      Requests length:', (firstCustomer[7]?.length || 0), 'chars');
    }

    // Test Instructions sheet
    const instructionsSheet = workbook.Sheets['Instructions'];
    if (instructionsSheet) {
      console.log('\n📝 Instructions Sheet:');
      const instructionsData = XLSX.utils.sheet_to_json(instructionsSheet, {
        header: 1,
        defval: '',
      });
      console.log('   - Total instructions rows:', instructionsData.length);
    }

    // Test Validation Rules sheet
    const validationSheet = workbook.Sheets['Validation Rules'];
    if (validationSheet) {
      console.log('\n✓ Validation Rules Sheet:');
      const validationData = XLSX.utils.sheet_to_json(validationSheet, {
        header: 1,
        defval: '',
      });
      console.log('   - Total validation rows:', validationData.length);
      if (validationData.length > 1) {
        console.log('   - Rules defined:', validationData.length - 1);
      }
    }

    console.log('\n✅ All tests passed!\n');

    // Test column widths
    if (customerSheet['!cols']) {
      console.log('📐 Column Widths:');
      const letters = 'ABCDEFGH';
      customerSheet['!cols'].forEach((col, index) => {
        console.log(`   Column ${letters[index]}: ${col.wch} characters`);
      });
    }

  } catch (error) {
    console.error('❌ Error reading template:', error);
    process.exit(1);
  }
}

// Run the test
testReadTemplate();

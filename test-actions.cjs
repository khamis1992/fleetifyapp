const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Login
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"], input[name="email"]').first().fill('khamis-1992@hotmail.com');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(6000);
  
  // Go to Quick Payment -> payment history tab
  await page.goto('http://localhost:8080/finance/payments/quick', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(4000);
  
  // Click on "سجل الدفعات" tab
  const historyTab = page.locator('button:has-text("سجل الدفعات")');
  if (await historyTab.isVisible().catch(() => false)) {
    await historyTab.click();
    await page.waitForTimeout(2000);
  }
  
  // Find test payments rows and test actions on them
  console.log('=== Testing Actions on TEST DATA payments ===\n');
  
  // Find the actions button for a row with "150" (PAY-TEST-001)
  const rows = await page.locator('tr:has-text("150")').all();
  console.log(`Found ${rows.length} rows with "150"`);
  
  for (const row of rows) {
    const text = await row.innerText().catch(() => '');
    if (text.includes('PAY-TEST') || text.includes('TEST DATA')) {
      console.log(`Found test row: ${text.substring(0, 80)}...`);
      
      // Click the actions dropdown
      const actionsBtn = row.locator('button:has(svg)').last();
      if (await actionsBtn.isVisible().catch(() => false)) {
        await actionsBtn.click();
        await page.waitForTimeout(500);
        
        // Test View Details
        const viewBtn = page.locator('[role="menuitem"]:has-text("عرض التفاصيل")');
        if (await viewBtn.isVisible().catch(() => false)) {
          console.log('  Clicking "عرض التفاصيل"...');
          await viewBtn.click();
          await page.waitForTimeout(1000);
          
          // Check if dialog opened
          const dialog = page.locator('[role="dialog"]');
          if (await dialog.isVisible().catch(() => false)) {
            const dialogText = await dialog.innerText();
            console.log(`  ✅ Dialog opened: ${dialogText.substring(0, 100)}...`);
            
            // Close dialog
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          } else {
            console.log('  ❌ No dialog opened');
          }
        }
        
        // Re-open dropdown for delete test
        await actionsBtn.click();
        await page.waitForTimeout(500);
        
        // Test Delete
        const deleteBtn = page.locator('[role="menuitem"]:has-text("حذف")');
        if (await deleteBtn.isVisible().catch(() => false)) {
          console.log('  Clicking "حذف"...');
          await deleteBtn.click();
          await page.waitForTimeout(1000);
          
          // Check if confirmation dialog opened
          const confirmDialog = page.locator('[role="alertdialog"]');
          if (await confirmDialog.isVisible().catch(() => false)) {
            const confirmText = await confirmDialog.innerText();
            console.log(`  ✅ Delete confirmation: ${confirmText.substring(0, 100)}...`);
            
            // DO NOT actually delete - click cancel
            const cancelBtn = page.locator('button:has-text("إلغاء")').last();
            if (await cancelBtn.isVisible().catch(() => false)) {
              await cancelBtn.click();
              console.log('  ✅ Clicked Cancel (no data deleted)');
            }
          } else {
            console.log('  ❌ No confirmation dialog');
          }
        }
        
        break; // Test only one row
      }
    }
  }
  
  // Verify test data still exists
  console.log('\n=== Verifying test data intact ===');
  const testRows = await page.locator('text=PAY-TEST').all();
  console.log(`Test payments still visible: ${testRows.length > 0 ? '✅ Yes' : '❌ No'}`);
  
  await browser.close();
}

main().catch(console.error);

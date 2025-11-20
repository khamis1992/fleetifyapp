/**
 * Contract Management E2E Tests
 *
 * Comprehensive end-to-end tests for contract management workflows including:
 * - Contract creation and validation
 * - Contract editing and status updates
 * - Bulk operations
 * - Document management
 * - Financial calculations validation
 * - Search and filtering
 */

import { test, expect } from '@playwright/test';
import { generateTestContract, generateTestCustomer, generateTestVehicle } from '../utils/testDataGenerators';

test.describe('Contract Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to contracts
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
    await page.click('[data-testid="contracts-nav-link"]');
    await page.waitForURL('/contracts');
  });

  test('should create a new contract successfully', async ({ page }) => {
    // Click on create contract button
    await page.click('[data-testid="create-contract-button"]');
    await page.waitForURL('/contracts/create');

    // Fill in contract details
    const contract = generateTestContract();
    const customer = generateTestCustomer();
    const vehicle = generateTestVehicle();

    // Select customer
    await page.click('[data-testid="customer-select"]');
    await page.fill('[data-testid="customer-search"]', customer.name);
    await page.click(`[data-testid="customer-option-${customer.id}"]`);

    // Select vehicle
    await page.click('[data-testid="vehicle-select"]');
    await page.fill('[data-testid="vehicle-search"]', vehicle.make);
    await page.click(`[data-testid="vehicle-option-${vehicle.id}"]`);

    // Fill contract details
    await page.fill('[data-testid="agreement-number"]', contract.agreementNumber);
    await page.selectOption('[data-testid="contract-type"]', contract.type);
    await page.fill('[data-testid="start-date"]', contract.startDate);
    await page.fill('[data-testid="end-date"]', contract.endDate);
    await page.fill('[data-testid="monthly-rate"]', contract.monthlyRate.toString());

    // Fill financial terms
    await page.fill('[data-testid="deposit-amount"]', contract.depositAmount.toString());
    await page.fill('[data-testid="insurance-fees"]', contract.insuranceFees.toString());
    await page.fill('[data-testid="service-fees"]', contract.serviceFees.toString());
    await page.fill('[data-testid="tax-rate"]', contract.taxRate.toString());

    // Add notes
    await page.fill('[data-testid="contract-notes"]', contract.notes);

    // Submit contract
    await page.click('[data-testid="create-contract-submit"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Contract created successfully');

    // Verify contract appears in list
    await page.waitForURL('/contracts');
    await expect(page.locator(`[data-testid="contract-row-${contract.agreementNumber}"]`)).toBeVisible();
  });

  test('should validate contract form inputs correctly', async ({ page }) => {
    await page.click('[data-testid="create-contract-button"]');

    // Try to submit without required fields
    await page.click('[data-testid="create-contract-submit"]');

    // Check for validation errors
    await expect(page.locator('[data-testid="customer-error"]')).toContainText('Customer is required');
    await expect(page.locator('[data-testid="vehicle-error"]')).toContainText('Vehicle is required');
    await expect(page.locator('[data-testid="agreement-number-error"]')).toContainText('Agreement number is required');
    await expect(page.locator('[data-testid="start-date-error"]')).toContainText('Start date is required');
    await expect(page.locator('[data-testid="end-date-error"]')).toContainText('End date is required');
    await expect(page.locator('[data-testid="monthly-rate-error"]')).toContainText('Monthly rate is required');

    // Test invalid date range
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await page.fill('[data-testid="start-date"]', today);
    await page.fill('[data-testid="end-date"]', yesterday);

    await expect(page.locator('[data-testid="date-range-error"]')).toContainText('End date must be after start date');

    // Test negative amounts
    await page.fill('[data-testid="monthly-rate"]', '-1000');
    await expect(page.locator('[data-testid="monthly-rate-error"]')).toContainText('Monthly rate must be positive');
  });

  test('should calculate contract totals correctly', async ({ page }) => {
    await page.click('[data-testid="create-contract-button"]');

    // Fill in contract with known values for calculation testing
    await page.fill('[data-testid="agreement-number"]', 'CALC-TEST-001');
    await page.fill('[data-testid="monthly-rate"]', '1000');
    await page.fill('[data-testid="deposit-amount"]', '2000');
    await page.fill('[data-testid="insurance-fees"]', '150');
    await page.fill('[data-testid="service-fees"]', '50');
    await page.fill('[data-testid="tax-rate"]', '0.15'); // 15%

    // Check if calculations are displayed correctly
    await expect(page.locator('[data-testid="monthly-subtotal"]')).toContainText('1,200.00'); // 1000 + 150 + 50
    await expect(page.locator('[data-testid="monthly-tax"]')).toContainText('180.00'); // 1200 * 0.15
    await expect(page.locator('[data-testid="monthly-total"]')).toContainText('1,380.00'); // 1200 + 180

    // Check annual projection
    await expect(page.locator('[data-testid="annual-revenue"]')).toContainText('16,560.00'); // 1380 * 12
  });

  test('should edit an existing contract', async ({ page }) => {
    // Navigate to existing contract
    await page.click('[data-testid="contract-row-AGR-001-2024"]');
    await page.waitForURL('/contracts/AGR-001-2024');

    // Click edit button
    await page.click('[data-testid="edit-contract-button"]');

    // Modify contract details
    await page.fill('[data-testid="monthly-rate"]', '1200'); // Increase from original
    await page.fill('[data-testid="contract-notes"]', 'Updated contract notes for testing');

    // Save changes
    await page.click('[data-testid="save-contract-changes"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Contract updated successfully');

    // Verify updated values are displayed
    await expect(page.locator('[data-testid="monthly-rate-display"]')).toContainText('1,200.00');
    await expect(page.locator('[data-testid="contract-notes-display"]')).toContainText('Updated contract notes for testing');
  });

  test('should handle contract status changes', async ({ page }) => {
    // Navigate to contract details
    await page.click('[data-testid="contract-row-AGR-002-2024"]');
    await page.waitForURL('/contracts/AGR-002-2024');

    // Change contract status to active
    await page.click('[data-testid="contract-status-select"]');
    await page.click('[data-testid="status-option-active"]');

    // Confirm status change
    await page.click('[data-testid="confirm-status-change"]');

    // Verify status is updated
    await expect(page.locator('[data-testid="contract-status-badge"]')).toContainText('Active');

    // Verify status change is logged
    await page.click('[data-testid="contract-history-tab"]');
    await expect(page.locator('[data-testid="status-change-log"]')).toContainText('Status changed to Active');
  });

  test('should upload and manage contract documents', async ({ page }) => {
    await page.click('[data-testid="contract-row-AGR-003-2024"]');
    await page.waitForURL('/contracts/AGR-003-2024');

    // Navigate to documents tab
    await page.click('[data-testid="documents-tab"]');

    // Upload contract document
    const fileInput = page.locator('[data-testid="document-upload"]');
    await fileInput.setInputFiles('tests/fixtures/sample-contract.pdf');

    // Fill document details
    await page.fill('[data-testid="document-name"]', 'Test Contract Document');
    await page.selectOption('[data-testid="document-type"]', 'contract');
    await page.fill('[data-testid="document-description"]', 'Test document upload');

    // Upload file
    await page.click('[data-testid="upload-document-button"]');

    // Verify upload success
    await expect(page.locator('[data-testid="upload-success-message"]')).toContainText('Document uploaded successfully');

    // Verify document appears in list
    await expect(page.locator('[data-testid="document-item-test-contract-document"]')).toBeVisible();

    // Test document download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-document-test-contract-document"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('test-contract-document.pdf');

    // Test document deletion
    await page.click('[data-testid="delete-document-test-contract-document"]');
    await page.click('[data-testid="confirm-document-delete"]');
    await expect(page.locator('[data-testid="document-item-test-contract-document"]')).not.toBeVisible();
  });

  test('should search and filter contracts correctly', async ({ page }) => {
    // Test search by agreement number
    await page.fill('[data-testid="contract-search"]', 'AGR-001');
    await page.click('[data-testid="search-button"]');

    // Verify search results
    await expect(page.locator('[data-testid="contract-row-AGR-001-2024"]')).toBeVisible();
    await expect(page.locator('[data-testid="contract-row-AGR-002-2024"]')).not.toBeVisible();

    // Clear search
    await page.fill('[data-testid="contract-search"]', '');
    await page.click('[data-testid="search-button"]');

    // Test filter by status
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="status-filter-active"]');

    // Verify filter results
    await expect(page.locator('[data-testid="contract-row-AGR-001-2024"]')).toBeVisible(); // Assuming this is active
    // Filter out non-active contracts

    // Test filter by contract type
    await page.click('[data-testid="type-filter"]');
    await page.click('[data-testid="type-filter-rental"]');

    // Verify combined filters work
    await expect(page.locator('[data-testid="filter-results-count"]')).toContainText('contracts found');
  });

  test('should handle bulk operations on contracts', async ({ page }) => {
    // Select multiple contracts
    await page.check('[data-testid="select-contract-AGR-001-2024"]');
    await page.check('[data-testid="select-contract-AGR-002-2024"]');
    await page.check('[data-testid="select-contract-AGR-003-2024"]');

    // Verify bulk action buttons appear
    await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible();

    // Test bulk status change
    await page.click('[data-testid="bulk-status-change"]');
    await page.selectOption('[data-testid="bulk-status-select"]', 'suspended');
    await page.click('[data-testid="confirm-bulk-status-change"]');

    // Verify confirmation message
    await expect(page.locator('[data-testid="bulk-success-message"]')).toContainText('3 contracts updated');

    // Verify status changes in list
    await expect(page.locator('[data-testid="contract-row-AGR-001-2024"] [data-testid="status-badge"]')).toContainText('Suspended');
    await expect(page.locator('[data-testid="contract-row-AGR-002-2024"] [data-testid="status-badge"]')).toContainText('Suspended');
    await expect(page.locator('[data-testid="contract-row-AGR-003-2024"] [data-testid="status-badge"]')).toContainText('Suspended');

    // Test bulk delete
    await page.check('[data-testid="select-contract-AGR-001-2024"]');
    await page.click('[data-testid="bulk-delete"]');
    await page.fill('[data-testid="delete-confirmation-input"]', 'DELETE');
    await page.click('[data-testid="confirm-bulk-delete"]');

    // Verify deletion
    await expect(page.locator('[data-testid="contract-row-AGR-001-2024"]')).not.toBeVisible();
  });

  test('should generate contract reports correctly', async ({ page }) => {
    // Navigate to reports section
    await page.click('[data-testid="reports-nav-link"]');
    await page.waitForURL('/reports');

    // Generate contract report
    await page.click('[data-testid="contract-report-button"]');

    // Set report parameters
    await page.fill('[data-testid="report-start-date"]', '2024-01-01');
    await page.fill('[data-testid="report-end-date"]', '2024-12-31');
    await page.selectOption('[data-testid="report-format"]', 'excel');
    await page.check('[data-testid="include-financial-data"]');
    await page.check('[data-testid="include-payments-history"]');

    // Generate report
    await page.click('[data-testid="generate-report-button"]');

    // Verify report generation
    await expect(page.locator('[data-testid="report-generation-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-ready-message"]')).toBeVisible({ timeout: 30000 });

    // Test report download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-report-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/contract-report.*\.xlsx$/);
  });

  test('should handle contract cancellation workflow', async ({ page }) => {
    // Navigate to active contract
    await page.click('[data-testid="contract-row-AGR-004-2024"]');
    await page.waitForURL('/contracts/AGR-004-2024');

    // Initiate cancellation
    await page.click('[data-testid="cancel-contract-button"]');

    // Select cancellation reason
    await page.selectOption('[data-testid="cancellation-reason"]', 'customer_request');
    await page.fill('[data-testid="cancellation-notes"]', 'Customer requested contract cancellation due to budget constraints');

    // Review cancellation details
    await expect(page.locator('[data-testid="early-termination-fee"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="final-invoice-amount"]')).toBeVisible();

    // Confirm cancellation
    await page.click('[data-testid="confirm-cancellation"]');

    // Verify cancellation confirmation
    await expect(page.locator('[data-testid="cancellation-success-message"]')).toContainText('Contract cancelled successfully');

    // Verify contract status is updated
    await expect(page.locator('[data-testid="contract-status-badge"]')).toContainText('Cancelled');

    // Verify cancellation email is sent notification
    await expect(page.locator('[data-testid="notification-sent-message"]')).toContainText('Cancellation notification sent to customer');
  });

  test('should handle contract renewal workflow', async ({ page }) => {
    // Navigate to expiring contract
    await page.click('[data-testid="contract-row-AGR-005-2024"]');
    await page.waitForURL('/contracts/AGR-005-2024');

    // Initiate renewal
    await page.click('[data-testid="renew-contract-button"]');

    // Modify renewal terms
    await page.fill('[data-testid="renewal-monthly-rate"]', '1100'); // Increase rate
    await page.fill('[data-testid="renewal-start-date"]', '2025-01-01');
    await page.fill('[data-testid="renewal-end-date"]', '2025-12-31');

    // Test renewal calculations
    await expect(page.locator('[data-testid="renewal-monthly-total"]')).toContainText('1,265.00'); // 1100 + fees + tax

    // Add renewal notes
    await page.fill('[data-testid="renewal-notes"]', 'Contract renewed with updated terms for 2025');

    // Confirm renewal
    await page.click('[data-testid="confirm-renewal"]');

    // Verify renewal success
    await expect(page.locator('[data-testid="renewal-success-message"]')).toContainText('Contract renewed successfully');

    // Verify new contract is created
    await expect(page.locator('[data-testid="new-contract-reference"]')).toContainText('AGR-006-2025');

    // Verify original contract is marked as renewed
    await expect(page.locator('[data-testid="contract-status-badge"]')).toContainText('Renewed');
  });

  test('should display contract analytics and insights', async ({ page }) => {
    // Navigate to contract analytics
    await page.click('[data-testid="contract-analytics-tab"]');

    // Verify key metrics are displayed
    await expect(page.locator('[data-testid="total-contracts"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-contracts"]')).toBeVisible();
    await expect(page.locator('[data-testid="expiring-contracts"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible();

    // Test analytics date range filter
    await page.click('[data-testid="analytics-period-filter"]');
    await page.click('[data-testid="period-last-6-months"]');

    // Verify analytics update
    await expect(page.locator('[data-testid="analytics-updated-timestamp"]')).toBeVisible();

    // Test contract value breakdown chart
    await expect(page.locator('[data-testid="contract-value-chart"]')).toBeVisible();

    // Test contract status distribution
    await expect(page.locator('[data-testid="status-distribution-chart"]')).toBeVisible();

    // Test revenue trends chart
    await expect(page.locator('[data-testid="revenue-trends-chart"]')).toBeVisible();

    // Export analytics report
    await page.click('[data-testid="export-analytics-button"]');
    await page.selectOption('[data-testid="export-format"]', 'pdf');
    await page.click('[data-testid="download-analytics-button"]');

    // Verify export
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/contract-analytics.*\.pdf$/);
  });
});

// Helper functions for test data generation
function generateTestContract() {
  return {
    agreementNumber: `AGR-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-${new Date().getFullYear()}`,
    type: 'rental',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthlyRate: Math.floor(Math.random() * 2000) + 500,
    depositAmount: Math.floor(Math.random() * 5000) + 1000,
    insuranceFees: Math.floor(Math.random() * 300) + 50,
    serviceFees: Math.floor(Math.random() * 100) + 25,
    taxRate: 0.15,
    notes: 'Test contract for E2E testing',
  };
}

function generateTestCustomer() {
  return {
    id: `cust_${Math.random().toString(36).substring(7)}`,
    name: 'Test Customer Company',
  };
}

function generateTestVehicle() {
  return {
    id: `veh_${Math.random().toString(36).substring(7)}`,
    make: 'Toyota',
    model: 'Camry',
  };
}
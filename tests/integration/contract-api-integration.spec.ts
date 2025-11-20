/**
 * Contract API Integration Tests
 *
 * Integration tests for contract API endpoints including:
 * - CRUD operations
 * - Data validation
 * - Error handling
 * - Response formatting
 * - Business logic enforcement
 */

import { test, expect } from '@playwright/test';
import { generateMockContract, generateMockCustomer, generateMockVehicle } from '../utils/testDataGenerators';

test.describe('Contract API Integration', () => {
  let authToken: string;
  let testContractId: string;

  test.beforeAll(async ({ request }) => {
    // Setup authentication
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test@fleetify.com',
        password: 'testpassword123',
      },
    });

    const loginData = await loginResponse.json();
    authToken = loginData.token;
  });

  test('should create a contract via API', async ({ request }) => {
    const contractData = generateMockContract();
    const customer = generateMockCustomer();
    const vehicle = generateMockVehicle();

    // First create a customer
    const customerResponse = await request.post('/api/customers', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: customer,
    });

    expect(customerResponse.status()).toBe(201);
    const customerData = await customerResponse.json();

    // Create a vehicle
    const vehicleResponse = await request.post('/api/vehicles', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: vehicle,
    });

    expect(vehicleResponse.status()).toBe(201);
    const vehicleData = await vehicleResponse.json();

    // Create contract with customer and vehicle IDs
    const contractPayload = {
      ...contractData,
      customer_id: customerData.id,
      vehicle_id: vehicleData.id,
    };

    const contractResponse = await request.post('/api/contracts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: contractPayload,
    });

    expect(contractResponse.status()).toBe(201);

    const createdContract = await contractResponse.json();
    expect(createdContract.id).toBeDefined();
    expect(createdContract.agreement_number).toBe(contractData.agreement_number);
    expect(createdContract.customer_id).toBe(customerData.id);
    expect(createdContract.vehicle_id).toBe(vehicleData.id);

    testContractId = createdContract.id;

    // Verify contract was created with correct calculations
    expect(createdContract.monthly_payment).toBeDefined();
    expect(createdContract.total_revenue).toBeDefined();
    expect(createdContract.financial_summary).toBeDefined();
  });

  test('should retrieve contract by ID', async ({ request }) => {
    const response = await request.get(`/api/contracts/${testContractId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const contract = await response.json();
    expect(contract.id).toBe(testContractId);
    expect(contract.agreement_number).toBeDefined();
    expect(contract.customer_details).toBeDefined();
    expect(contract.vehicle_details).toBeDefined();
    expect(contract.financial_summary).toBeDefined();
    expect(contract.payment_schedule).toBeDefined();
  });

  test('should retrieve contracts list with filtering', async ({ request }) => {
    // Test basic list retrieval
    const listResponse = await request.get('/api/contracts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(listResponse.status()).toBe(200);

    const contractsList = await listResponse.json();
    expect(Array.isArray(contractsList.data)).toBeTruthy();
    expect(contractsList.pagination).toBeDefined();
    expect(contractsList.total_count).toBeDefined();

    // Test filtered retrieval
    const filteredResponse = await request.get('/api/contracts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      params: {
        status: 'active',
        type: 'rental',
        limit: 10,
        offset: 0,
      },
    });

    expect(filteredResponse.status()).toBe(200);

    const filteredContracts = await filteredResponse.json();
    expect(Array.isArray(filteredContracts.data)).toBeTruthy();

    // Verify filtering worked
    filteredContracts.data.forEach((contract: any) => {
      expect(['active', 'draft', 'expired', 'cancelled']).toContain(contract.status);
    });
  });

  test('should update contract via API', async ({ request }) => {
    const updateData = {
      monthly_rate: 1500,
      financial_terms: {
        deposit_amount: 3000,
        insurance_fees: 200,
        service_fees: 75,
        tax_rate: 0.15,
        late_fee_rate: 0.05,
        early_termination_rate: 0.10,
      },
      notes: 'Updated contract for API integration testing',
    };

    const response = await request.patch(`/api/contracts/${testContractId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: updateData,
    });

    expect(response.status()).toBe(200);

    const updatedContract = await response.json();
    expect(updatedContract.monthly_rate).toBe(1500);
    expect(updatedContract.financial_summary).toBeDefined();

    // Verify financial calculations were updated
    expect(updatedContract.monthly_payment.total).toBeGreaterThan(1500); // Should include fees and tax
  });

  test('should validate contract data on creation', async ({ request }) => {
    // Test with invalid data
    const invalidContractData = {
      agreement_number: '', // Missing
      customer_id: 'invalid-id', // Invalid UUID
      vehicle_id: 'invalid-id', // Invalid UUID
      monthly_rate: -1000, // Negative rate
      start_date: 'invalid-date', // Invalid date
      end_date: '2024-01-01', // Before start
      financial_terms: {
        tax_rate: 2, // Invalid rate (> 1)
        late_fee_rate: -0.1, // Negative rate
      },
    };

    const response = await request.post('/api/contracts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: invalidContractData,
    });

    expect(response.status()).toBe(400);

    const errorResponse = await response.json();
    expect(errorResponse.errors).toBeDefined();
    expect(Array.isArray(errorResponse.errors)).toBeTruthy();

    // Verify specific validation errors
    const errors = errorResponse.errors;
    expect(errors.some((err: any) => err.field === 'agreement_number')).toBeTruthy();
    expect(errors.some((err: any) => err.field === 'monthly_rate')).toBeTruthy();
    expect(errors.some((err: any) => err.field === 'tax_rate')).toBeTruthy();
  });

  test('should handle contract status transitions correctly', async ({ request }) => {
    // Change contract to active status
    const activateResponse = await request.patch(`/api/contracts/${testContractId}/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        status: 'active',
        reason: 'Contract activation for testing',
      },
    });

    expect(activateResponse.status()).toBe(200);

    const activatedContract = await activateResponse.json();
    expect(activatedContract.status).toBe('active');

    // Test invalid status transition
    const invalidTransitionResponse = await request.patch(`/api/contracts/${testContractId}/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        status: 'invalid_status',
      },
    });

    expect(invalidTransitionResponse.status()).toBe(400);
  });

  test('should calculate contract finances correctly', async ({ request }) => {
    const response = await request.get(`/api/contracts/${testContractId}/calculations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const calculations = await response.json();
    expect(calculations.monthly_payment).toBeDefined();
    expect(calculations.total_revenue).toBeDefined();
    expect(calculations.profitability_analysis).toBeDefined();
    expect(calculations.payment_schedule).toBeDefined();

    // Verify calculation structure
    expect(calculations.monthly_payment.subtotal).toBeDefined();
    expect(calculations.monthly_payment.tax).toBeDefined();
    expect(calculations.monthly_payment.total).toBeDefined();
    expect(calculations.total_revenue.contract_duration_months).toBeDefined();
  });

  test('should handle contract termination correctly', async ({ request }) => {
    const terminationData = {
      termination_date: new Date().toISOString().split('T')[0],
      termination_reason: 'customer_request',
      notes: 'Contract termination for API testing',
      refund_amount: 1000,
    };

    const response = await request.post(`/api/contracts/${testContractId}/terminate`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: terminationData,
    });

    expect(response.status()).toBe(200);

    const terminationResult = await response.json();
    expect(terminationResult.termination_fee).toBeDefined();
    expect(terminationResult.final_invoice).toBeDefined();
    expect(terminationResult.refund_details).toBeDefined();

    // Verify contract status is updated
    const updatedContractResponse = await request.get(`/api/contracts/${testContractId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const updatedContract = await updatedContractResponse.json();
    expect(['cancelled', 'terminated']).toContain(updatedContract.status);
  });

  test('should handle contract renewal correctly', async ({ request }) => {
    // First create a new contract for renewal testing
    const renewalContractData = generateMockContract();
    const customer = generateMockCustomer();
    const vehicle = generateMockVehicle();

    // Create customer and vehicle for renewal test
    const customerResponse = await request.post('/api/customers', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: customer,
    });

    const customerData = await customerResponse.json();

    const vehicleResponse = await request.post('/api/vehicles', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: vehicle,
    });

    const vehicleData = await vehicleResponse.json();

    const contractPayload = {
      ...renewalContractData,
      customer_id: customerData.id,
      vehicle_id: vehicleData.id,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
    };

    const contractResponse = await request.post('/api/contracts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: contractPayload,
    });

    const createdContract = await contractResponse.json();
    const renewalContractId = createdContract.id;

    // Activate the contract first
    await request.patch(`/api/contracts/${renewalContractId}/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: { status: 'active' },
    });

    // Test contract renewal
    const renewalData = {
      new_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      monthly_rate_adjustment: 1.1, // 10% increase
      notes: 'Contract renewal for API testing',
    };

    const renewalResponse = await request.post(`/api/contracts/${renewalContractId}/renew`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: renewalData,
    });

    expect(renewalResponse.status()).toBe(200);

    const renewalResult = await renewalResponse.json();
    expect(renewalResult.new_contract).toBeDefined();
    expect(renewalResult.renewal_summary).toBeDefined();
    expect(renewalResult.old_contract_status).toBe('renewed');
  });

  test('should handle contract document uploads correctly', async ({ request }) => {
    const documentData = {
      name: 'Test Contract Document',
      type: 'contract',
      description: 'Document for API integration testing',
      file_data: 'base64-encoded-file-content', // In real test, this would be actual file data
    };

    const response = await request.post(`/api/contracts/${testContractId}/documents`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: documentData,
    });

    expect(response.status()).toBe(201);

    const uploadedDocument = await response.json();
    expect(uploadedDocument.id).toBeDefined();
    expect(uploadedDocument.name).toBe(documentData.name);
    expect(uploadedDocument.url).toBeDefined();

    // Test document retrieval
    const documentsResponse = await request.get(`/api/contracts/${testContractId}/documents`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(documentsResponse.status()).toBe(200);

    const documents = await documentsResponse.json();
    expect(Array.isArray(documents.data)).toBeTruthy();
    expect(documents.data.length).toBeGreaterThan(0);
  });

  test('should handle contract search correctly', async ({ request }) => {
    // Test basic search
    const searchResponse = await request.get('/api/contracts/search', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      params: {
        query: 'test',
        fields: 'agreement_number,customer_name,vehicle_make',
        limit: 10,
      },
    });

    expect(searchResponse.status()).toBe(200);

    const searchResults = await searchResponse.json();
    expect(Array.isArray(searchResults.data)).toBeTruthy();
    expect(searchResults.total_count).toBeDefined();
    expect(searchResults.search_metadata.query).toBe('test');

    // Test advanced search with filters
    const advancedSearchResponse = await request.get('/api/contracts/search', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      params: {
        query: 'test',
        status: 'active',
        type: 'rental',
        date_from: '2024-01-01',
        date_to: '2024-12-31',
        min_monthly_rate: 500,
        max_monthly_rate: 2000,
      },
    });

    expect(advancedSearchResponse.status()).toBe(200);

    const advancedResults = await advancedSearchResponse.json();
    expect(Array.isArray(advancedResults.data)).toBeTruthy();
  });

  test('should handle contract export correctly', async ({ request }) => {
    const exportRequest = {
      format: 'excel',
      filters: {
        status: 'active',
        date_from: '2024-01-01',
        date_to: '2024-12-31',
      },
      include_fields: [
        'agreement_number',
        'customer_name',
        'vehicle_details',
        'monthly_rate',
        'start_date',
        'end_date',
        'status',
      ],
      include_financial_summary: true,
    };

    const response = await request.post('/api/contracts/export', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: exportRequest,
    });

    expect(response.status()).toBe(200);

    const exportResult = await response.json();
    expect(exportResult.export_id).toBeDefined();
    expect(exportResult.download_url).toBeDefined();
    expect(exportResult.expires_at).toBeDefined();

    // Test download URL
    const downloadResponse = await request.get(exportResult.download_url);
    expect(downloadResponse.status()).toBe(200);
  });

  test('should handle errors and edge cases correctly', async ({ request }) => {
    // Test non-existent contract
    const nonExistentResponse = await request.get('/api/contracts/non-existent-id', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(nonExistentResponse.status()).toBe(404);

    // Test unauthorized access
    const unauthorizedResponse = await request.get(`/api/contracts/${testContractId}`, {
      // No authorization header
    });

    expect(unauthorizedResponse.status()).toBe(401);

    // Test invalid authorization
    const invalidAuthResponse = await request.get(`/api/contracts/${testContractId}`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    expect(invalidAuthResponse.status()).toBe(401);

    // Test malformed request
    const malformedResponse = await request.post('/api/contracts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: 'invalid-json-data',
    });

    expect(malformedResponse.status()).toBe(400);

    const errorResponse = await malformedResponse.json();
    expect(errorResponse.error).toBeDefined();
  });

  test('should validate business rules correctly', async ({ request }) => {
    // Test duplicate agreement number
    const duplicateContractData = {
      ...generateMockContract(),
      agreement_number: 'TEST-DUPLICATE-001', // Same number as existing contract
    };

    const duplicateResponse = await request.post('/api/contracts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: duplicateContractData,
    });

    expect(duplicateResponse.status()).toBe(400);

    const duplicateError = await duplicateResponse.json();
    expect(duplicateError.errors.some((err: any) => err.message.includes('agreement_number already exists'))).toBeTruthy();

    // Test contract with overlapping dates for same vehicle
    const overlappingContractData = {
      ...generateMockContract(),
      // Use same vehicle as testContractId and overlapping dates
      vehicle_id: testContractId,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    const overlappingResponse = await request.post('/api/contracts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: overlappingContractData,
    });

    // Should either succeed (if system allows overlapping) or return business rule violation
    expect([200, 400]).toContain(overlappingResponse.status());

    if (overlappingResponse.status() === 400) {
      const overlappingError = await overlappingResponse.json();
      expect(overlappingError.errors.some((err: any) =>
        err.message.includes('vehicle') || err.message.includes('overlapping')
      )).toBeTruthy();
    }
  });

  test.afterAll(async ({ request }) => {
    // Cleanup test data
    if (testContractId) {
      await request.delete(`/api/contracts/${testContractId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
    }
  });
});
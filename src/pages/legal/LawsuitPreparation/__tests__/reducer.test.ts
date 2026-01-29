/**
 * Lawsuit Preparation Reducer Tests
 * اختبارات معالج تجهيز الدعوى
 */

import { describe, it, expect } from 'vitest';
import { 
  lawsuitPreparationReducer, 
  createInitialState 
} from '../store/reducer';
import type { LawsuitPreparationState } from '../store';

describe('lawsuitPreparationReducer', () => {
  const initialState = createInitialState('test-contract-id');
  
  describe('Document Actions', () => {
    it('should handle GENERATE_DOCUMENT_START', () => {
      const action = { 
        type: 'GENERATE_DOCUMENT_START' as const, 
        payload: { docId: 'memo' as const } 
      };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.documents.memo.status).toBe('generating');
      expect(newState.documents.memo.error).toBeNull();
    });
    
    it('should handle GENERATE_DOCUMENT_SUCCESS', () => {
      const html = '<html>Test</html>';
      const url = 'blob:test';
      
      const action = { 
        type: 'GENERATE_DOCUMENT_SUCCESS' as const, 
        payload: { docId: 'memo' as const, url, html } 
      };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.documents.memo.status).toBe('ready');
      expect(newState.documents.memo.url).toBe(url);
      expect(newState.documents.memo.htmlContent).toBe(html);
      expect(newState.documents.memo.generatedAt).toBeDefined();
    });
    
    it('should handle GENERATE_DOCUMENT_ERROR', () => {
      const error = new Error('Generation failed');
      
      const action = { 
        type: 'GENERATE_DOCUMENT_ERROR' as const, 
        payload: { docId: 'memo' as const, error } 
      };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.documents.memo.status).toBe('error');
      expect(newState.documents.memo.error).toBe(error);
    });
    
    it('should handle RESET_DOCUMENT', () => {
      // First set a document to ready
      const readyState = lawsuitPreparationReducer(
        initialState,
        { 
          type: 'GENERATE_DOCUMENT_SUCCESS', 
          payload: { docId: 'memo' as const, url: 'blob:test', html: '<html></html>' } 
        }
      );
      
      // Then reset it
      const newState = lawsuitPreparationReducer(
        readyState,
        { type: 'RESET_DOCUMENT' as const, payload: { docId: 'memo' as const } }
      );
      
      expect(newState.documents.memo.status).toBe('pending');
      expect(newState.documents.memo.url).toBeNull();
      expect(newState.documents.memo.htmlContent).toBeNull();
    });
    
    it('should calculate progress correctly when document is generated', () => {
      const action = { 
        type: 'GENERATE_DOCUMENT_SUCCESS' as const, 
        payload: { docId: 'memo' as const, url: 'blob:test', html: '<html></html>' } 
      };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.ui.progress.ready).toBe(1);
      expect(newState.ui.progress.percentage).toBe(33);
    });
  });
  
  describe('UI Actions', () => {
    it('should handle TOGGLE_TAQADI_DATA', () => {
      const action = { type: 'TOGGLE_TAQADI_DATA' as const };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.ui.showTaqadiData).toBe(true);
      
      const secondToggle = lawsuitPreparationReducer(newState, action);
      expect(secondToggle.ui.showTaqadiData).toBe(false);
    });
    
    it('should handle SET_COPIED_FIELD', () => {
      const action = { 
        type: 'SET_COPIED_FIELD' as const, 
        payload: 'title' 
      };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.ui.copiedField).toBe('title');
    });
    
    it('should handle SET_LOADING', () => {
      const action = { 
        type: 'SET_LOADING' as const, 
        payload: false 
      };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.ui.isLoading).toBe(false);
    });
  });
  
  describe('Data Loading Actions', () => {
    it('should handle SET_CONTRACT_DATA', () => {
      const contract = {
        id: 'contract-1',
        contract_number: 'C-001',
        start_date: '2024-01-01',
        end_date: null,
        monthly_amount: 5000,
        customer_id: 'customer-1',
        vehicle_id: 'vehicle-1',
        license_plate: '12345',
      };
      
      const customer = {
        id: 'customer-1',
        first_name: 'محمد',
        first_name_ar: 'محمد',
        last_name: 'أحمد',
        last_name_ar: 'أحمد',
        customer_type: 'individual' as const,
        company_name: null,
        company_name_ar: null,
        national_id: '1234567890',
        nationality: 'قطري',
        phone: '55123456',
        email: null,
        address: null,
        country: 'قطر',
      };
      
      const vehicle = {
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        plate_number: '12345',
        color: 'أبيض',
        vin: '123456789',
      };
      
      const action = { 
        type: 'SET_CONTRACT_DATA' as const, 
        payload: { contract, customer, vehicle } 
      };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.contract).toEqual(contract);
      expect(newState.customer).toEqual(customer);
      expect(newState.vehicle).toEqual(vehicle);
    });
    
    it('should handle SET_INVOICES', () => {
      const invoices = [
        {
          id: 'inv-1',
          invoice_number: 'INV-001',
          due_date: '2024-02-01',
          total_amount: 5000,
          paid_amount: 0,
        },
      ];
      
      const action = { 
        type: 'SET_INVOICES' as const, 
        payload: invoices 
      };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.overdueInvoices).toEqual(invoices);
    });
    
    it('should handle SET_VIOLATIONS', () => {
      const violations = [
        {
          id: 'viol-1',
          violation_number: 'V-001',
          violation_date: '2024-01-15',
          violation_type: 'سرعة',
          location: 'شارع الخليج',
          fine_amount: 500,
          total_amount: 500,
          status: 'unpaid',
        },
      ];
      
      const action = { 
        type: 'SET_VIOLATIONS' as const, 
        payload: violations 
      };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.trafficViolations).toEqual(violations);
    });
  });
  
  describe('Batch Actions', () => {
    it('should handle GENERATE_ALL_START', () => {
      const action = { type: 'GENERATE_ALL_START' as const };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.ui.isGeneratingAll).toBe(true);
    });
    
    it('should handle GENERATE_ALL_COMPLETE', () => {
      const startAction = { type: 'GENERATE_ALL_START' as const };
      const completeAction = { type: 'GENERATE_ALL_COMPLETE' as const };
      
      const startedState = lawsuitPreparationReducer(initialState, startAction);
      const completedState = lawsuitPreparationReducer(startedState, completeAction);
      
      expect(completedState.ui.isGeneratingAll).toBe(false);
    });
    
    it('should handle REGISTER_CASE_START', () => {
      const action = { type: 'REGISTER_CASE_START' as const };
      
      const newState = lawsuitPreparationReducer(initialState, action);
      
      expect(newState.ui.isRegistering).toBe(true);
    });
  });
  
  describe('RESET_STATE', () => {
    it('should reset to initial state', () => {
      // Modify state first
      const modifiedState = lawsuitPreparationReducer(
        initialState,
        { type: 'TOGGLE_TAQADI_DATA' as const }
      );
      
      expect(modifiedState.ui.showTaqadiData).toBe(true);
      
      // Reset
      const resetState = lawsuitPreparationReducer(
        modifiedState,
        { type: 'RESET_STATE' as const }
      );
      
      expect(resetState.ui.showTaqadiData).toBe(false);
      expect(resetState.contractId).toBe('test-contract-id');
    });
  });
});

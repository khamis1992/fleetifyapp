/**
 * Lawsuit Preparation Context Provider
 * موفر سياق تجهيز الدعوى
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { calculateDelinquencyAmounts } from '@/utils/calculateDelinquencyAmounts';
import { generateDocument as generateDocumentUtil } from '../utils/documentGenerators';
import { registerLegalCase } from '../utils/caseRegistration';
import { exportDocumentsAsZip } from '../utils/zipExport';
import { lawsuitService } from '@/services/LawsuitService';
import { formatCustomerName } from '@/utils/formatCustomerName';

import { 
  lawsuitPreparationReducer, 
  createInitialState 
} from './reducer';
import type { 
  LawsuitPreparationContextValue, 
  LawsuitPreparationState,
  DocumentsState 
} from './types';

// ==========================================
// Context
// ==========================================

const LawsuitPreparationContext = createContext<LawsuitPreparationContextValue | null>(null);

// ==========================================
// Hook
// ==========================================

export function useLawsuitPreparationContext() {
  const context = useContext(LawsuitPreparationContext);
  if (!context) {
    throw new Error('useLawsuitPreparationContext must be used within LawsuitPreparationProvider');
  }
  return context;
}

// ==========================================
// Provider Props
// ==========================================

interface LawsuitPreparationProviderProps {
  children: React.ReactNode;
  contractId: string;
}

// ==========================================
// Provider Component
// ==========================================

export function LawsuitPreparationProvider({ 
  children, 
  contractId 
}: LawsuitPreparationProviderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { companyId, isLoading: companyLoading } = useUnifiedCompanyAccess();
  
  const [state, dispatch] = useReducer(
    lawsuitPreparationReducer, 
    createInitialState(contractId)
  );
  
  // Refs to store generated content for download
  const contentRefs = useRef<{
    memoHtml: string | null;
    claimsHtml: string | null;
    criminalComplaintHtml: string | null;
    violationsTransferHtml: string | null;
  }>({
    memoHtml: null,
    claimsHtml: null,
    criminalComplaintHtml: null,
    violationsTransferHtml: null,
  });
  
  // Update companyId in state when available
  useEffect(() => {
    if (companyId) {
      dispatch({ type: 'SET_COMPANY_ID', payload: companyId });
    }
  }, [companyId]);
  
  // ==========================================
  // Data Fetching
  // ==========================================
  
  // Fetch contract data
  const { isLoading: contractLoading } = useQuery({
    queryKey: ['contract-details', contractId],
    staleTime: 0,
    queryFn: async () => {
      const { data: contract, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();
      
      if (error) throw error;
      if (!contract) throw new Error('لم يتم العثور على العقد');
      
      // Fetch customer
      let customer = null;
      if (contract.customer_id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('id, first_name, first_name_ar, last_name, last_name_ar, customer_type, company_name, company_name_ar, national_id, nationality, phone, email, address, country')
          .eq('id', contract.customer_id)
          .single();
        customer = cust;
      }
      
      // Fetch vehicle
      let vehicle = null;
      if (contract.vehicle_id) {
        const { data: veh } = await supabase
          .from('vehicles')
          .select('make, model, year, plate_number, color, vin')
          .eq('id', contract.vehicle_id)
          .single();
        vehicle = veh;
      }
      
      dispatch({ 
        type: 'SET_CONTRACT_DATA', 
        payload: { contract, customer, vehicle } 
      });
      
      return { contract, customer, vehicle };
    },
    enabled: !!contractId,
  });
  
  // Fetch overdue invoices
  const { isLoading: invoicesLoading } = useQuery({
    queryKey: ['overdue-invoices', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', contractId)
        .lt('due_date', new Date().toISOString().split('T')[0]);
      
      if (error) throw error;
      
      const filtered = (data || []).filter(
        inv => (inv.total_amount || 0) - (inv.paid_amount || 0) > 0
      );
      
      dispatch({ type: 'SET_INVOICES', payload: filtered });
      return filtered;
    },
    enabled: !!contractId,
  });
  
  // Fetch traffic violations
  const { isLoading: violationsLoading } = useQuery({
    queryKey: ['contract-traffic-violations', contractId, companyId],
    queryFn: async () => {
      if (!contractId || !companyId) return [];
      
      const { data, error } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('contract_id', contractId)
        .eq('company_id', companyId)
        .neq('status', 'paid')
        .order('violation_date', { ascending: false });
      
      if (error) throw error;
      
      dispatch({ type: 'SET_VIOLATIONS', payload: data || [] });
      return data || [];
    },
    enabled: !!contractId && !!companyId,
  });
  
  // Fetch company legal documents
  useQuery({
    queryKey: ['company-legal-documents', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const docs = await lawsuitService.getCompanyLegalDocuments(companyId);
      dispatch({ type: 'SET_COMPANY_DOCUMENTS', payload: docs });
      return docs;
    },
    enabled: !!companyId,
  });
  
  // Fetch contract document (signed contract)
  useQuery({
    queryKey: ['contract-document', contractId, companyId],
    queryFn: async () => {
      if (!contractId || !companyId) return null;
      
      const { data, error } = await supabase
        .from('contract_documents')
        .select('id, file_path, document_name, document_type, mime_type')
        .eq('contract_id', contractId)
        .eq('company_id', companyId)
        .eq('document_type', 'signed_contract')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data?.file_path) return null;
      
      const { data: urlData } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(data.file_path);
      
      if (urlData?.publicUrl) {
        dispatch({ 
          type: 'UPLOAD_DOCUMENT_SUCCESS', 
          payload: { docId: 'contract', url: urlData.publicUrl } 
        });
      }
      
      return data;
    },
    enabled: !!contractId && !!companyId,
  });
  
  // ==========================================
  // Derived Data (Calculations & Taqadi Data)
  // ==========================================
  
  useEffect(() => {
    if (state.overdueInvoices.length > 0 || state.trafficViolations.length > 0) {
      const calculations = calculateDelinquencyAmounts(
        state.overdueInvoices.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          due_date: inv.due_date,
          total_amount: inv.total_amount || 0,
          paid_amount: inv.paid_amount || 0,
        })),
        state.trafficViolations.map(v => ({
          id: v.id,
          violation_number: v.violation_number,
          fine_amount: v.fine_amount,
          total_amount: v.total_amount,
          status: v.status,
        })),
        { includeDamagesFee: true }
      );
      
      dispatch({ 
        type: 'UPDATE_CALCULATIONS', 
        payload: {
          ...calculations,
          amountInWords: lawsuitService.convertAmountToWords(calculations.total),
        } 
      });
    }
  }, [state.overdueInvoices, state.trafficViolations]);
  
  useEffect(() => {
    if (state.contract && state.calculations) {
      const customerName = formatCustomerName(state.customer) || 'غير محدد';
      const claimAmount = state.calculations.total - state.calculations.violationsFines;
      
      let factsText = lawsuitService.generateFactsText(
        customerName,
        state.contract.start_date,
        `${state.vehicle?.make || ''} ${state.vehicle?.model || ''} ${state.vehicle?.year || ''}`,
        claimAmount
      );
      
      if (state.calculations.violationsCount > 0) {
        factsText += `\n\nبالإضافة إلى ذلك، ترتبت على المدعى عليه مخالفات مرورية بسبب استخدام السيارة المؤجرة بعدد (${state.calculations.violationsCount}) مخالفة بإجمالي مبلغ (${state.calculations.violationsFines.toLocaleString('ar-QA')}) ريال قطري.`;
      }
      
      let claimsText = `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${claimAmount.toLocaleString('ar-QA')}) ريال قطري.\n2. الأمر بتحويل المخالفات المرورية المسجلة على المركبة إلى الرقم الشخصي للمدعى عليه.\n3. الحكم بفسخ عقد الإيجار.\n4. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`;
      
      if (state.calculations.violationsCount === 0) {
        claimsText = `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${claimAmount.toLocaleString('ar-QA')}) ريال قطري.\n2. الحكم بفسخ عقد الإيجار.\n3. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`;
      }
      
      dispatch({
        type: 'UPDATE_TAQADI_DATA',
        payload: {
          caseTitle: lawsuitService.generateCaseTitle(customerName),
          facts: factsText,
          claims: claimsText,
          amount: claimAmount,
          amountInWords: lawsuitService.convertAmountToWords(claimAmount),
        },
      });
    }
  }, [state.contract, state.calculations, state.customer, state.vehicle]);
  
  // Update loading state
  useEffect(() => {
    const isLoading = companyLoading || contractLoading || invoicesLoading || violationsLoading;
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, [companyLoading, contractLoading, invoicesLoading, violationsLoading]);
  
  // ==========================================
  // Actions
  // ==========================================
  
  const generateDocument = useCallback(async (docId: keyof DocumentsState) => {
    dispatch({ type: 'GENERATE_DOCUMENT_START', payload: { docId } });
    
    try {
      // Get current state for generation
      const currentState = state;
      
      // Generate document using utility
      const { url, html } = await generateDocumentUtil(docId, currentState);
      
      // Store HTML in refs for ZIP download
      if (docId === 'memo') contentRefs.current.memoHtml = html;
      if (docId === 'claims') contentRefs.current.claimsHtml = html;
      if (docId === 'criminalComplaint') contentRefs.current.criminalComplaintHtml = html;
      if (docId === 'violationsTransfer') contentRefs.current.violationsTransferHtml = html;
      
      dispatch({ 
        type: 'GENERATE_DOCUMENT_SUCCESS', 
        payload: { docId, url, html } 
      });
    } catch (error) {
      dispatch({ 
        type: 'GENERATE_DOCUMENT_ERROR', 
        payload: { docId, error: error as Error } 
      });
    }
  }, [state]);
  
  const generateAllDocuments = useCallback(async () => {
    dispatch({ type: 'GENERATE_ALL_START' });
    
    try {
      // Generate mandatory documents
      const mandatoryDocs: (keyof DocumentsState)[] = ['memo', 'claims', 'docsList'];
      
      for (const docId of mandatoryDocs) {
        if (state.documents[docId].status !== 'ready') {
          await generateDocument(docId);
          // Small delay between generations
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Generate violations document if there are violations
      if (state.trafficViolations.length > 0 && state.documents.violations.status !== 'ready') {
        await generateDocument('violations');
      }
    } finally {
      dispatch({ type: 'GENERATE_ALL_COMPLETE' });
    }
  }, [state.documents, state.trafficViolations, generateDocument]);
  
  const uploadDocument = useCallback(async (docId: keyof DocumentsState, file: File) => {
    if (!companyId || !contractId) return;
    
    dispatch({ type: 'UPLOAD_DOCUMENT_START', payload: { docId } });
    
    try {
      const fileName = `contracts/${companyId}/${contractId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('legal-documents')
        .getPublicUrl(fileName);
      
      dispatch({ 
        type: 'UPLOAD_DOCUMENT_SUCCESS', 
        payload: { docId, url: urlData.publicUrl } 
      });
    } catch (error: any) {
      dispatch({ 
        type: 'UPLOAD_DOCUMENT_ERROR', 
        payload: { docId, error: error.message } 
      });
    }
  }, [companyId, contractId]);
  
  const registerCase = useCallback(async () => {
    if (!user?.id) {
      throw new Error('المستخدم غير مسجل الدخول');
    }
    
    dispatch({ type: 'REGISTER_CASE_START' });
    
    try {
      const result = await registerLegalCase(state, user.id);
      
      dispatch({ type: 'REGISTER_CASE_COMPLETE' });
      
      // Navigate to cases page
      setTimeout(() => {
        navigate('/legal/cases?view=cases');
      }, 1500);
      
      return result;
    } catch (error) {
      dispatch({ type: 'REGISTER_CASE_ERROR', payload: error as Error });
      throw error;
    }
  }, [state, user, navigate]);
  
  const downloadAllAsZip = useCallback(async () => {
    dispatch({ type: 'DOWNLOAD_ZIP_START' });
    
    try {
      await exportDocumentsAsZip(state, contentRefs.current);
    } finally {
      dispatch({ type: 'DOWNLOAD_ZIP_COMPLETE' });
    }
  }, [state]);
  
  const sendToLawsuitData = useCallback(async () => {
    dispatch({ type: 'SEND_TO_LAWSUIT_DATA_START' });
    
    try {
      if (!state.taqadiData || !companyId || !state.contract) return;
      
      const customer = state.customer;
      const fullName = formatCustomerName(customer);
      const nameParts = fullName.split(' ');
      
      const lawsuitRecord = {
        company_id: companyId,
        case_title: state.taqadiData.caseTitle,
        facts: state.taqadiData.facts,
        requests: state.taqadiData.claims,
        claim_amount: state.taqadiData.amount,
        claim_amount_words: state.taqadiData.amountInWords,
        defendant_first_name: nameParts[0] || '',
        defendant_middle_name: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null,
        defendant_last_name: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
        defendant_nationality: customer?.nationality || customer?.country || null,
        defendant_id_number: customer?.national_id || null,
        defendant_address: customer?.address || null,
        defendant_phone: customer?.phone || null,
        defendant_email: customer?.email || null,
        contract_id: contractId,
        customer_id: customer?.id || null,
      };
      
      const { error } = await supabase
        .from('lawsuit_templates')
        .insert([lawsuitRecord]);
      
      if (error) throw error;
      
    } finally {
      dispatch({ type: 'SEND_TO_LAWSUIT_DATA_COMPLETE' });
    }
  }, [state.taqadiData, state.contract, state.customer, companyId, contractId]);
  
  const startTaqadiAutomation = useCallback(async () => {
    dispatch({ type: 'TAQADI_AUTOMATION_START' });
    
    try {
      // Check server status
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error('سيرفر الأتمتة غير متاح');
      }
      
      dispatch({ type: 'TAQADI_AUTOMATION_STATUS', payload: 'جاري رفع الدعوى...' });
      
      // Call automation API
      const submitResponse = await fetch('http://localhost:3001/api/taqadi/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          prepareUrl: window.location.href,
        }),
      });
      
      const result = await submitResponse.json();
      
      if (result.success) {
        dispatch({ 
          type: 'TAQADI_AUTOMATION_STATUS', 
          payload: `تم رفع الدعوى بنجاح! رقم القضية: ${result.caseNumber}` 
        });
      } else {
        throw new Error(result.error || 'فشلت الأتمتة');
      }
    } catch (error: any) {
      dispatch({ 
        type: 'TAQADI_AUTOMATION_STATUS', 
        payload: `خطأ: ${error.message}` 
      });
    }
  }, [contractId]);
  
  const stopTaqadiAutomation = useCallback(() => {
    dispatch({ type: 'TAQADI_AUTOMATION_STOP' });
  }, []);
  
  const checkTaqadiServer = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      const isRunning = data.status === 'ok';
      dispatch({ type: 'SET_TAQADI_SERVER_STATUS', payload: isRunning });
      return isRunning;
    } catch {
      dispatch({ type: 'SET_TAQADI_SERVER_STATUS', payload: false });
      return false;
    }
  }, []);
  
  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      dispatch({ type: 'SET_COPIED_FIELD', payload: field });
      setTimeout(() => {
        dispatch({ type: 'SET_COPIED_FIELD', payload: null });
      }, 2000);
    } catch {
      console.error('Failed to copy');
    }
  }, []);
  
  const toggleTaqadiData = useCallback(() => {
    dispatch({ type: 'TOGGLE_TAQADI_DATA' });
  }, []);
  
  const setIncludeCriminalComplaint = useCallback((value: boolean) => {
    dispatch({ type: 'SET_INCLUDE_CRIMINAL_COMPLAINT', payload: value });
  }, []);
  
  const setIncludeViolationsTransfer = useCallback((value: boolean) => {
    dispatch({ type: 'SET_INCLUDE_VIOLATIONS_TRANSFER', payload: value });
  }, []);
  
  // Check Taqadi server on mount
  useEffect(() => {
    checkTaqadiServer();
  }, [checkTaqadiServer]);
  
  // ==========================================
  // Context Value
  // ==========================================
  
  const value: LawsuitPreparationContextValue = {
    state,
    dispatch,
    actions: {
      generateDocument,
      generateAllDocuments,
      uploadDocument,
      registerCase,
      downloadAllAsZip,
      sendToLawsuitData,
      startTaqadiAutomation,
      stopTaqadiAutomation,
      checkTaqadiServer,
      copyToClipboard,
      toggleTaqadiData,
      setIncludeCriminalComplaint,
      setIncludeViolationsTransfer,
    },
  };
  
  return (
    <LawsuitPreparationContext.Provider value={value}>
      {children}
    </LawsuitPreparationContext.Provider>
  );
}

export default LawsuitPreparationProvider;

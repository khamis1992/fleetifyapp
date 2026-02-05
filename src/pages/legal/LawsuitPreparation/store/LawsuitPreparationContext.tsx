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
import { toast } from 'sonner';

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
      if (!contractId || !companyId) {
        console.log('[Contract Document] Missing contractId or companyId');
        return null;
      }
      
      console.log('[Contract Document] Fetching for contract:', contractId);
      
      const { data, error } = await supabase
        .from('contract_documents')
        .select('id, file_path, document_name, document_type, mime_type')
        .eq('contract_id', contractId)
        .eq('company_id', companyId)
        .eq('document_type', 'signed_contract')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[Contract Document] Query error:', error);
        dispatch({
          type: 'UPLOAD_DOCUMENT_ERROR',
          payload: { docId: 'contract', error: 'فشل في جلب ملف العقد من قاعدة البيانات' }
        });
        return null;
      }
      
      if (!data) {
        console.warn('[Contract Document] No contract document found');
        dispatch({
          type: 'UPLOAD_DOCUMENT_ERROR',
          payload: { docId: 'contract', error: 'لم يتم العثور على ملف العقد. يرجى رفع ملف العقد الموقع.' }
        });
        return null;
      }
      
      if (!data.file_path) {
        console.error('[Contract Document] No file_path in document');
        dispatch({
          type: 'UPLOAD_DOCUMENT_ERROR',
          payload: { docId: 'contract', error: 'مسار الملف غير موجود' }
        });
        return null;
      }
      
      console.log('[Contract Document] Found document:', data.document_name, 'at path:', data.file_path);
      
      const { data: urlData } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(data.file_path);
      
      if (urlData?.publicUrl) {
        console.log('[Contract Document] Public URL generated:', urlData.publicUrl);
        dispatch({ 
          type: 'UPLOAD_DOCUMENT_SUCCESS', 
          payload: { docId: 'contract', url: urlData.publicUrl } 
        });
      } else {
        console.error('[Contract Document] Failed to generate public URL');
        dispatch({
          type: 'UPLOAD_DOCUMENT_ERROR',
          payload: { docId: 'contract', error: 'فشل في توليد رابط الملف' }
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
    if (state.contract && state.calculations && state.customer) {
      const customerName = formatCustomerName(state.customer) || 'غير محدد';
      const claimAmount = state.calculations.total - state.calculations.violationsFines;
      
      let factsText = lawsuitService.generateFactsText(
        customerName,
        state.contract.start_date,
        `${state.vehicle?.make || ''} ${state.vehicle?.model || ''} ${state.vehicle?.year || ''}`,
        claimAmount
      );
      
      if (state.calculations.violationsCount > 0) {
        factsText += `\n\nبالإضافة إلى ذلك، ترتبت على المدعى عليه مخالفات مرورية بسبب استخدام السيارة المؤجرة بعدد (${state.calculations.violationsCount}) مخالفة بإجمالي مبلغ (${state.calculations.violationsFines.toLocaleString('en-US')}) ريال قطري.`;
      }
      
      let claimsText = `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${claimAmount.toLocaleString('en-US')}) ريال قطري.\n2. الأمر بتحويل المخالفات المرورية المسجلة على المركبة إلى الرقم الشخصي للمدعى عليه.\n3. الحكم بفسخ عقد الإيجار.\n4. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`;
      
      if (state.calculations.violationsCount === 0) {
        claimsText = `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${claimAmount.toLocaleString('en-US')}) ريال قطري.\n2. الحكم بفسخ عقد الإيجار.\n3. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`;
      }
      
      // استخراج معلومات المدعى عليه
      const fullName = customerName;
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || null;
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;
      
      // تحديد نوع الهوية
      let idType = 'بطاقة شخصية';
      if (state.customer.nationality === 'Qatar' || state.customer.nationality === 'قطر') {
        idType = 'بطاقة قطرية';
      } else if (state.customer.national_id && state.customer.national_id.length > 10) {
        idType = 'جواز سفر';
      }
      
      // معلومات السيارة
      const vehicleFullDesc = state.vehicle 
        ? `${state.vehicle.make || ''} ${state.vehicle.model || ''} ${state.vehicle.year || ''} - ${state.vehicle.plateNumber || ''}`.trim()
        : 'غير محدد';
      
      dispatch({
        type: 'UPDATE_TAQADI_DATA',
        payload: {
          caseTitle: lawsuitService.generateCaseTitle(customerName),
          facts: factsText,
          claims: claimsText,
          amount: claimAmount,
          amountInWords: lawsuitService.convertAmountToWords(claimAmount),
          
          // بيانات المدعى عليه
          defendant: {
            fullName: fullName,
            firstName: firstName,
            middleName: middleName,
            lastName: lastName,
            idNumber: state.customer.national_id,
            idType: idType,
            nationality: state.customer.nationality || state.customer.country,
            phone: state.customer.phone,
            email: state.customer.email,
            address: state.customer.address,
          },
          
          // بيانات العقد
          contract: {
            contractNumber: state.contract.contract_number,
            startDate: state.contract.start_date,
            endDate: state.contract.end_date,
            monthlyAmount: state.contract.monthly_amount,
          },
          
          // بيانات السيارة
          vehicle: {
            make: state.vehicle?.make || null,
            model: state.vehicle?.model || null,
            year: state.vehicle?.year || null,
            plateNumber: state.vehicle?.plate_number || null,
            color: state.vehicle?.color || null,
            vin: state.vehicle?.vin || null,
            fullDescription: vehicleFullDesc,
          },
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
  
  // دالة لتحميل الصور (اللوقو، التوقيع، الختم) كـ Base64
  const loadImageAsBase64 = async (path: string): Promise<string> => {
    try {
      const response = await fetch(path);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`Failed to load image ${path}:`, error);
      return '';
    }
  };

  // دالة لتضمين جميع الصور في HTML
  const embedImagesInHtml = async (html: string): Promise<string> => {
    try {
      // تحميل جميع الصور
      const [logoBase64, signatureBase64, stampBase64] = await Promise.all([
        loadImageAsBase64('/receipts/logo.png'),
        loadImageAsBase64('/receipts/signature.png'),
        loadImageAsBase64('/receipts/stamp.png'),
      ]);
      
      // استبدال جميع المسارات
      let result = html;
      
      if (logoBase64) {
        result = result
          .replace(/src="\/receipts\/logo\.png"/g, `src="${logoBase64}"`)
          .replace(/src='\/receipts\/logo\.png'/g, `src='${logoBase64}'`);
      }
      
      if (signatureBase64) {
        result = result
          .replace(/src="\/receipts\/signature\.png"/g, `src="${signatureBase64}"`)
          .replace(/src='\/receipts\/signature\.png'/g, `src='${signatureBase64}'`);
      }
      
      if (stampBase64) {
        result = result
          .replace(/src="\/receipts\/stamp\.png"/g, `src="${stampBase64}"`)
          .replace(/src='\/receipts\/stamp\.png'/g, `src='${stampBase64}'`);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to embed images:', error);
      return html;
    }
  };

  const generateDocument = useCallback(async (docId: keyof DocumentsState) => {
    dispatch({ type: 'GENERATE_DOCUMENT_START', payload: { docId } });
    
    try {
      // Get current state for generation
      const currentState = state;
      
      // Generate document using utility
      const { url, html: originalHtml } = await generateDocumentUtil(docId, currentState);
      
      // تضمين اللوقو والتوقيع والختم في HTML
      const html = await embedImagesInHtml(originalHtml);
      
      // إنشاء URL جديد مع الصور المضمّنة
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const urlWithImages = URL.createObjectURL(blob);
      
      // Store HTML in refs for ZIP download
      if (docId === 'memo') contentRefs.current.memoHtml = html;
      if (docId === 'claims') contentRefs.current.claimsHtml = html;
      if (docId === 'criminalComplaint') contentRefs.current.criminalComplaintHtml = html;
      if (docId === 'violationsTransfer') contentRefs.current.violationsTransferHtml = html;
      
      dispatch({ 
        type: 'GENERATE_DOCUMENT_SUCCESS', 
        payload: { docId, url: urlWithImages, html } 
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
      // Use 'documents' bucket for all uploads (standard bucket name)
      const bucketName = 'documents';
      
      const fileName = `contracts/${companyId}/${contractId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      // If it's a contract document, save to contract_documents table
      if (docId === 'contract') {
        const { error: dbError } = await supabase
          .from('contract_documents')
          .insert({
            contract_id: contractId,
            company_id: companyId,
            file_path: fileName,
            document_name: file.name,
            document_type: 'signed_contract',
            mime_type: file.type,
          });
        
        if (dbError) {
          console.error('Failed to save contract document to database:', dbError);
          // Continue anyway - file is uploaded
        }
      }
      
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
  
  const downloadMemoPdf = useCallback(async () => {
    try {
      const memoHtml = contentRefs.current.memoHtml;
      if (!memoHtml) {
        toast.error('يجب توليد المذكرة الشارحة أولاً');
        return;
      }
      
      // Dynamic import for heavy libraries
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      
      // Create iframe for rendering
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '794px';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        toast.error('فشل في إنشاء PDF');
        return;
      }
      
      // Write HTML to iframe
      iframeDoc.open();
      iframeDoc.write(memoHtml);
      iframeDoc.close();
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast.info('جاري تحويل المذكرة إلى PDF...');
      
      // Capture canvas
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
      });
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const contentHeight = imgHeight * ratio;
      
      // Add pages if content is long
      let heightLeft = contentHeight;
      let position = 0;
      let pageCount = 0;
      
      while (heightLeft > 0 && pageCount < 10) {
        if (pageCount > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, contentHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
        position -= pdfHeight;
        pageCount++;
      }
      
      // Cleanup
      document.body.removeChild(iframe);
      
      // Download
      const customerName = formatCustomerName(state.customer) || 'عميل';
      const fileName = `المذكرة_الشارحة_${customerName}_${state.contract?.contract_number || ''}.pdf`;
      pdf.save(fileName);
      
      toast.success('تم تحميل المذكرة بصيغة PDF');
    } catch (error) {
      console.error('Error downloading memo as PDF:', error);
      toast.error('فشل في تحميل المذكرة بصيغة PDF');
    }
  }, [state.customer, state.contract]);
  
  const downloadMemoDocx = useCallback(async () => {
    try {
      const memoHtml = contentRefs.current.memoHtml;
      if (!memoHtml) {
        toast.error('يجب توليد المذكرة الشارحة أولاً');
        return;
      }
      
      toast.info('جاري تحويل المذكرة إلى Word...');
      
      // Use the downloadHtmlAsDocx utility function from document-export
      const { downloadHtmlAsDocx } = await import('@/utils/document-export');
      
      // Prepare filename
      const customerName = formatCustomerName(state.customer) || 'عميل';
      const fileName = `المذكرة_الشارحة_${customerName}_${state.contract?.contract_number || ''}.docx`;
      
      // Download using the utility function
      await downloadHtmlAsDocx(memoHtml, fileName);
      
      toast.success('تم تحميل المذكرة بصيغة Word');
    } catch (error) {
      console.error('Error downloading memo as DOCX:', error);
      toast.error(`فشل في تحميل المذكرة بصيغة Word: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  }, [state.customer, state.contract]);
  
  const markCaseAsOpened = useCallback(async () => {
    if (!user?.id || !companyId || !state.contract || !state.customer) {
      toast.error('بيانات غير كاملة');
      throw new Error('بيانات غير كاملة');
    }
    
    dispatch({ type: 'MARK_CASE_OPENED_START' });
    
    try {
      const contract = state.contract;
      const customer = state.customer;
      const delinquencyData = state.calculations;
      
      // 1. Update contract status to under_legal_procedure
      const { error: contractError } = await supabase
        .from('contracts')
        .update({ status: 'under_legal_procedure' })
        .eq('id', contract.id);
      
      if (contractError) throw contractError;
      
      // 2. Create legal case record
      const customerName = formatCustomerName(customer);
      const caseTitle = `قضية تحصيل مستحقات - ${customerName}`;
      
      const { data: legalCase, error: caseError } = await supabase
        .from('legal_cases')
        .insert({
          company_id: companyId,
          contract_id: contract.id,
          client_id: customer.id,
          client_name: customerName,
          client_phone: customer.phone,
          client_email: customer.email,
          case_number: `LC-${Date.now()}`,
          case_title: caseTitle,
          case_title_ar: caseTitle,
          case_type: 'collection',
          case_status: 'open',
          case_value: delinquencyData?.total || contract.balance_due || 0,
          priority: 'high',
          filing_date: new Date().toISOString(),
          created_by: user.id,
        })
        .select()
        .single();
      
      if (caseError) throw caseError;
      
      dispatch({ type: 'MARK_CASE_OPENED_COMPLETE' });
      
      toast.success('تم فتح القضية بنجاح! سيتم نقلك إلى صفحة القضايا...');
      
      // Navigate to cases page
      setTimeout(() => {
        navigate('/legal/cases?view=cases');
      }, 1500);
      
      return legalCase;
    } catch (error: any) {
      dispatch({ type: 'MARK_CASE_OPENED_ERROR', payload: error as Error });
      toast.error(`خطأ في فتح القضية: ${error.message}`);
      throw error;
    }
  }, [state, user, companyId, navigate]);
  
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
      markCaseAsOpened,
      downloadMemoPdf,
      downloadMemoDocx,
    },
  };
  
  return (
    <LawsuitPreparationContext.Provider value={value}>
      {children}
    </LawsuitPreparationContext.Provider>
  );
}

export default LawsuitPreparationProvider;

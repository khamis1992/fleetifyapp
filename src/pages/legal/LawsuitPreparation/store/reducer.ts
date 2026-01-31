/**
 * Lawsuit Preparation Reducer
 * معالج حالة تجهيز الدعوى
 */

import type { 
  LawsuitPreparationState, 
  LawsuitPreparationAction, 
  DocumentsState 
} from './types';
import { DOCUMENT_CONFIG } from './types';

// ==========================================
// Initial State Factory
// ==========================================

function createInitialDocumentState(): DocumentsState {
  return {
    memo: {
      id: 'memo',
      ...DOCUMENT_CONFIG.memo,
      status: 'pending',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
    },
    claims: {
      id: 'claims',
      ...DOCUMENT_CONFIG.claims,
      status: 'pending',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
    },
    docsList: {
      id: 'docsList',
      ...DOCUMENT_CONFIG.docsList,
      status: 'pending',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
    },
    violations: {
      id: 'violations',
      ...DOCUMENT_CONFIG.violations,
      status: 'pending',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
    },
    criminalComplaint: {
      id: 'criminalComplaint',
      ...DOCUMENT_CONFIG.criminalComplaint,
      status: 'pending',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
    },
    violationsTransfer: {
      id: 'violationsTransfer',
      ...DOCUMENT_CONFIG.violationsTransfer,
      status: 'pending',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
    },
    contract: {
      id: 'contract',
      ...DOCUMENT_CONFIG.contract,
      status: 'pending',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
      isUploading: false,
      uploadError: null,
    },
    commercialRegister: {
      id: 'commercialRegister',
      ...DOCUMENT_CONFIG.commercialRegister,
      status: 'missing',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
    },
    ibanCertificate: {
      id: 'ibanCertificate',
      ...DOCUMENT_CONFIG.ibanCertificate,
      status: 'missing',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
    },
    representativeId: {
      id: 'representativeId',
      ...DOCUMENT_CONFIG.representativeId,
      status: 'missing',
      url: null,
      htmlContent: null,
      error: null,
      generatedAt: null,
    },
  };
}

export function createInitialState(contractId: string | null = null): LawsuitPreparationState {
  return {
    contractId,
    companyId: null,
    contract: null,
    customer: null,
    vehicle: null,
    overdueInvoices: [],
    trafficViolations: [],
    companyDocuments: [],
    calculations: null,
    taqadiData: null,
    documents: createInitialDocumentState(),
    ui: {
      isLoading: true,
      isGeneratingAll: false,
      isRegistering: false,
      isDownloadingZip: false,
      isSendingToLawsuitData: false,
      isTaqadiAutomating: false,
      isMarkingCaseOpened: false,
      showTaqadiData: false,
      taqadiServerRunning: false,
      taqadiAutomationStatus: '',
      copiedField: null,
      progress: {
        total: 3, // mandatory generated documents
        ready: 0,
        percentage: 0,
      },
      includeCriminalComplaint: false,
      includeViolationsTransfer: false,
    },
  };
}

// ==========================================
// Helper Functions
// ==========================================

function calculateProgress(documents: DocumentsState): { total: number; ready: number; percentage: number } {
  // Only count generated documents (memo, claims, docsList)
  const generatedDocs = ['memo', 'claims', 'docsList'] as const;
  const total = generatedDocs.length;
  const ready = generatedDocs.filter(id => documents[id].status === 'ready').length;
  const percentage = total > 0 ? Math.round((ready / total) * 100) : 0;
  
  return { total, ready, percentage };
}

// ==========================================
// Reducer
// ==========================================

export function lawsuitPreparationReducer(
  state: LawsuitPreparationState,
  action: LawsuitPreparationAction
): LawsuitPreparationState {
  switch (action.type) {
    // ==========================================
    // Data Loading
    // ==========================================
    
    case 'SET_CONTRACT_DATA': {
      return {
        ...state,
        contract: action.payload.contract,
        customer: action.payload.customer,
        vehicle: action.payload.vehicle,
      };
    }
    
    case 'SET_INVOICES': {
      return {
        ...state,
        overdueInvoices: action.payload,
      };
    }
    
    case 'SET_VIOLATIONS': {
      return {
        ...state,
        trafficViolations: action.payload,
      };
    }
    
    case 'SET_COMPANY_DOCUMENTS': {
      const documents = { ...state.documents };
      
      // Update status of company documents based on fetched data
      action.payload.forEach((doc) => {
        if (doc.document_type === 'commercial_register') {
          documents.commercialRegister = {
            ...documents.commercialRegister,
            status: 'ready',
            url: doc.file_url,
          };
        } else if (doc.document_type === 'iban_certificate') {
          documents.ibanCertificate = {
            ...documents.ibanCertificate,
            status: 'ready',
            url: doc.file_url,
          };
        } else if (doc.document_type === 'representative_id') {
          documents.representativeId = {
            ...documents.representativeId,
            status: 'ready',
            url: doc.file_url,
          };
        }
      });
      
      return {
        ...state,
        companyDocuments: action.payload,
        documents,
      };
    }
    
    case 'SET_COMPANY_ID': {
      return {
        ...state,
        companyId: action.payload,
      };
    }
    
    // ==========================================
    // Calculations
    // ==========================================
    
    case 'UPDATE_CALCULATIONS': {
      return {
        ...state,
        calculations: action.payload,
      };
    }
    
    case 'UPDATE_TAQADI_DATA': {
      return {
        ...state,
        taqadiData: action.payload,
      };
    }
    
    // ==========================================
    // Document Actions
    // ==========================================
    
    case 'GENERATE_DOCUMENT_START': {
      const docId = action.payload.docId;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            status: 'generating',
            error: null,
          },
        },
      };
    }
    
    case 'GENERATE_DOCUMENT_SUCCESS': {
      const docId = action.payload.docId;
      const newDocuments = {
        ...state.documents,
        [docId]: {
          ...state.documents[docId],
          status: 'ready',
          url: action.payload.url,
          htmlContent: action.payload.html,
          generatedAt: new Date().toISOString(),
          error: null,
        },
      };
      
      return {
        ...state,
        documents: newDocuments,
        ui: {
          ...state.ui,
          progress: calculateProgress(newDocuments),
        },
      };
    }
    
    case 'GENERATE_DOCUMENT_ERROR': {
      const docId = action.payload.docId;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            status: 'error',
            error: action.payload.error,
          },
        },
      };
    }
    
    case 'RESET_DOCUMENT': {
      const docId = action.payload.docId;
      const isCompanyDoc = ['commercialRegister', 'ibanCertificate', 'representativeId'].includes(docId);
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            status: isCompanyDoc ? 'missing' : 'pending',
            url: null,
            htmlContent: null,
            error: null,
            generatedAt: null,
          },
        },
      };
    }
    
    case 'UPLOAD_DOCUMENT_START': {
      const docId = action.payload.docId;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            isUploading: true,
            uploadError: null,
          },
        },
      };
    }
    
    case 'UPLOAD_DOCUMENT_SUCCESS': {
      const docId = action.payload.docId;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            status: 'ready',
            url: action.payload.url,
            isUploading: false,
            uploadError: null,
          },
        },
      };
    }
    
    case 'UPLOAD_DOCUMENT_ERROR': {
      const docId = action.payload.docId;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            isUploading: false,
            uploadError: action.payload.error,
          },
        },
      };
    }
    
    // ==========================================
    // Batch Actions
    // ==========================================
    
    case 'GENERATE_ALL_START': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isGeneratingAll: true,
        },
      };
    }
    
    case 'GENERATE_ALL_COMPLETE': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isGeneratingAll: false,
        },
      };
    }
    
    case 'REGISTER_CASE_START': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isRegistering: true,
        },
      };
    }
    
    case 'REGISTER_CASE_COMPLETE': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isRegistering: false,
        },
      };
    }
    
    case 'REGISTER_CASE_ERROR': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isRegistering: false,
        },
      };
    }
    
    case 'DOWNLOAD_ZIP_START': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isDownloadingZip: true,
        },
      };
    }
    
    case 'DOWNLOAD_ZIP_COMPLETE': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isDownloadingZip: false,
        },
      };
    }
    
    case 'SEND_TO_LAWSUIT_DATA_START': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isSendingToLawsuitData: true,
        },
      };
    }
    
    case 'SEND_TO_LAWSUIT_DATA_COMPLETE': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isSendingToLawsuitData: false,
        },
      };
    }
    
    // ==========================================
    // Taqadi Automation
    // ==========================================
    
    case 'TAQADI_AUTOMATION_START': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isTaqadiAutomating: true,
          taqadiAutomationStatus: 'جاري بدء الأتمتة...',
        },
      };
    }
    
    case 'TAQADI_AUTOMATION_STATUS': {
      return {
        ...state,
        ui: {
          ...state.ui,
          taqadiAutomationStatus: action.payload,
        },
      };
    }
    
    case 'TAQADI_AUTOMATION_STOP': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isTaqadiAutomating: false,
        },
      };
    }
    
    case 'SET_TAQADI_SERVER_STATUS': {
      return {
        ...state,
        ui: {
          ...state.ui,
          taqadiServerRunning: action.payload,
        },
      };
    }
    
    // ==========================================
    // Mark Case as Opened
    // ==========================================
    
    case 'MARK_CASE_OPENED_START': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isMarkingCaseOpened: true,
        },
      };
    }
    
    case 'MARK_CASE_OPENED_COMPLETE': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isMarkingCaseOpened: false,
        },
      };
    }
    
    case 'MARK_CASE_OPENED_ERROR': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isMarkingCaseOpened: false,
        },
      };
    }
    
    // ==========================================
    // UI Actions
    // ==========================================
    
    case 'TOGGLE_TAQADI_DATA': {
      return {
        ...state,
        ui: {
          ...state.ui,
          showTaqadiData: !state.ui.showTaqadiData,
        },
      };
    }
    
    case 'SET_COPIED_FIELD': {
      return {
        ...state,
        ui: {
          ...state.ui,
          copiedField: action.payload,
        },
      };
    }
    
    case 'SET_INCLUDE_CRIMINAL_COMPLAINT': {
      return {
        ...state,
        ui: {
          ...state.ui,
          includeCriminalComplaint: action.payload,
        },
      };
    }
    
    case 'SET_INCLUDE_VIOLATIONS_TRANSFER': {
      return {
        ...state,
        ui: {
          ...state.ui,
          includeViolationsTransfer: action.payload,
        },
      };
    }
    
    case 'SET_LOADING': {
      return {
        ...state,
        ui: {
          ...state.ui,
          isLoading: action.payload,
        },
      };
    }
    
    case 'RESET_STATE': {
      return createInitialState(state.contractId);
    }
    
    default:
      return state;
  }
}

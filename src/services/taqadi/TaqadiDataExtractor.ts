/**
 * Taqadi Data Extraction Service
 * Extracts and structures data from Fleetify system for Taqadi submission
 */

import { supabase } from '@/integrations/supabase/client';
import { lawsuitService } from '@/services/LawsuitService';
import {
  TaqadiSubmissionData,
  TaqadiPlaintiff,
  TaqadiDefendant,
  TaqadiCaseDetails,
  TaqadiCaseType,
  TaqadiDocumentType,
} from './TaqadiTypes';

// ==========================================
// Input Types
// ==========================================

/**
 * Contract data from database
 */
export interface ContractData {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  customer_id: string;
  vehicle_id: string;
  monthly_amount?: number;
  balance_due?: number;
  days_overdue?: number;
  status: string;
  customer?: CustomerData;
  vehicle?: VehicleData;
}

/**
 * Customer data
 */
export interface CustomerData {
  id: string;
  first_name?: string;
  first_name_ar?: string;
  last_name?: string;
  last_name_ar?: string;
  company_name_ar?: string;
  national_id?: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type?: 'individual' | 'company';
}

/**
 * Vehicle data
 */
export interface VehicleData {
  make: string;
  model: string;
  year: number;
  plate_number: string;
  color?: string;
  vin?: string;
}

/**
 * Invoice data
 */
export interface InvoiceData {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  days_overdue: number;
}

/**
 * Traffic violation data
 */
export interface TrafficViolationData {
  id: string;
  violation_number: string;
  violation_date: string;
  violation_type: string;
  location?: string;
  fine_amount: number;
  total_amount?: number;
  status: string;
}

/**
 * Company legal document
 */
export interface LegalDocument {
  document_type: string;
  file_url: string;
  document_name: string;
}

/**
 * Extraction options
 */
export interface ExtractionOptions {
  includeViolations?: boolean; // Include traffic violations
  includeInvoices?: boolean; // Include invoice details
  generateDocuments?: boolean; // Generate document URLs
  companyId: string;
}

// ==========================================
// Extraction Service
// ==========================================

export class TaqadiDataExtractor {
  /**
   * Main extraction function - extracts all data for Taqadi submission
   */
  async extractForSubmission(
    contractId: string,
    options: ExtractionOptions
  ): Promise<TaqadiSubmissionData> {
    // Extract all data in parallel where possible
    const [
      contract,
      plaintiff,
      defendant,
      caseDetails,
    ] = await Promise.all([
      this.extractContractData(contractId, options.companyId),
      this.extractPlaintiffData(options.companyId),
      this.extractDefendantData(contractId, options.companyId),
      this.extractCaseDetails(contractId, options),
    ]);

    return {
      metadata: {
        contractId,
        extractedAt: new Date().toISOString(),
        version: '1.0.0',
      },
      plaintiff,
      defendant,
      case: caseDetails,
      validation: undefined, // Will be added by validator
    };
  }

  // ==========================================
  // Contract Data Extraction
  // ==========================================

  /**
   * Extract contract data with all related information
   */
  private async extractContractData(
    contractId: string,
    companyId: string
  ): Promise<ContractData & { customer: CustomerData; vehicle: VehicleData }> {
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        start_date,
        end_date,
        customer_id,
        vehicle_id,
        monthly_amount,
        balance_due,
        days_overdue,
        status,
        customers (
          id,
          first_name,
          first_name_ar,
          last_name,
          last_name_ar,
          company_name_ar,
          national_id,
          phone,
          email,
          address,
          customer_type
        ),
        vehicles (
          make,
          model,
          year,
          plate_number,
          color,
          vin
        )
      `)
      .eq('id', contractId)
      .eq('company_id', companyId)
      .single();

    if (error || !contract) {
      throw new Error(`Contract not found: ${error?.message || 'Unknown error'}`);
    }

    return {
      ...contract,
      customer: (contract as any).customers || {},
      vehicle: (contract as any).vehicles || {},
    } as any;
  }

  // ==========================================
  // Plaintiff (المدعي) Data Extraction
  // ==========================================

  /**
   * Extract plaintiff company data
   */
  async extractPlaintiffData(companyId: string): Promise<TaqadiPlaintiff> {
    // Get company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error(`Company not found: ${companyError?.message}`);
    }

    // Get legal documents
    const { data: legalDocs } = await supabase
      .from('company_legal_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const documents = this.legalDocsToMap(legalDocs || []);

    return {
      companyName: company.name || 'شركة العراف لتأجير السيارات',
      companyNameArabic: company.name_ar || company.name || 'شركة العراف لتأجير السيارات',
      commercialRegisterNumber: company.commercial_register_number || '',
      establishmentNumber: company.establishment_number,
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      bankName: company.bank_name,
      iban: company.iban || '',
      representativeName: company.legal_representative_name || '',
      representativeId: company.legal_representative_id || '',
      representativePosition: company.legal_representative_position || 'مدير الشركة',
      representativePhone: company.legal_representative_phone,
      documents: {
        commercialRegister: documents.get('commercial_register'),
        establishmentRecord: documents.get('establishment_record'),
        ibanCertificate: documents.get('iban_certificate'),
        representativeId: documents.get('representative_id'),
        authorizationLetter: documents.get('authorization_letter'),
      },
    };
  }

  /**
   * Convert legal documents array to map
   */
  private legalDocsToMap(docs: any[]): Map<string, string> {
    const map = new Map<string, string>();
    docs.forEach(doc => {
      map.set(doc.document_type, doc.file_url);
    });
    return map;
  }

  // ==========================================
  // Defendant (المدعى عليه) Data Extraction
  // ==========================================

  /**
   * Extract defendant data from contract
   */
  async extractDefendantData(
    contractId: string,
    companyId: string
  ): Promise<TaqadiDefendant> {
    const contractData = await this.extractContractData(contractId, companyId);
    const customer = contractData.customer;
    const vehicle = contractData.vehicle;
    const contract = contractData;

    // Build full name
    const firstName = customer.first_name || '';
    const lastName = customer.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'غير معروف';

    return {
      type: 'natural_person',
      firstName,
      lastName,
      fullName,
      idNumber: customer.national_id,
      idType: customer.national_id ? 'qatar_id' : undefined,
      address: customer.address,
      phone: customer.phone,
      email: customer.email,
      contractNumber: contract.contract_number,
      contractStartDate: contract.start_date,
      contractEndDate: contract.end_date,
      vehicle: vehicle ? {
        make: vehicle.make || contract.make || '',
        model: vehicle.model || contract.model || '',
        year: vehicle.year || contract.year || new Date().getFullYear(),
        plateNumber: vehicle.plate_number || contract.license_plate || '',
        color: vehicle.color,
        vin: vehicle.vin,
      } : undefined,
    };
  }

  // ==========================================
  // Case Details Extraction
  // ==========================================

  /**
   * Extract complete case details
   */
  async extractCaseDetails(
    contractId: string,
    options: ExtractionOptions
  ): Promise<TaqadiCaseDetails> {
    const [
      overdueInvoices,
      trafficViolations,
      calculations,
      texts,
    ] = await Promise.all([
      options.includeInvoices !== false ? this.getOverdueInvoices(contractId) : [],
      options.includeViolations ? this.getTrafficViolations(contractId, options.companyId) : [],
      this.calculateAmounts(contractId, options.companyId),
      this.generateCaseTexts(contractId, options.companyId),
    ]);

    const documents = await this.extractDocuments(contractId, options);

    return {
      caseType: TaqadiCaseType.RENT,
      caseTitle: texts.caseTitle,
      facts: texts.facts,
      claims: texts.claims,
      amounts: {
        principalAmount: calculations.overdueRent,
        lateFees: calculations.lateFees,
        violationsFines: calculations.violationsFines,
        otherFees: calculations.otherFees,
        totalAmount: calculations.total,
        amountInWords: calculations.amountInWords,
        currency: 'QAR',
      },
      dates: {
        incidentDate: texts.contractStartDate,
        claimDate: new Date().toISOString().split('T')[0],
        lastPaymentDate: texts.lastPaymentDate,
      },
      notes: calculations.violationsCount > 0
        ? `يوجد ${calculations.violationsCount} مخالفة مرورية غير مسددة`
        : undefined,
      documents: {
        invoices: overdueInvoices.map(inv => inv.id),
        violations: trafficViolations.map(v => v.id),
        ...documents,
      },
    };
  }

  /**
   * Get overdue invoices for a contract
   */
  private async getOverdueInvoices(contractId: string): Promise<InvoiceData[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contractId)
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || [])
      .filter(inv => (inv.total_amount || 0) - (inv.paid_amount || 0) > 0)
      .map(inv => {
        const dueDate = new Date(inv.due_date);
        const today = new Date();
        const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: inv.id,
          invoice_number: inv.invoice_number || '',
          total_amount: inv.total_amount || 0,
          paid_amount: inv.paid_amount || 0,
          due_date: inv.due_date,
          days_overdue: daysLate,
        };
      });
  }

  /**
   * Get unpaid traffic violations for a contract
   */
  private async getTrafficViolations(
    contractId: string,
    companyId: string
  ): Promise<TrafficViolationData[]> {
    const { data, error } = await supabase
      .from('traffic_violations')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .neq('status', 'paid')
      .order('violation_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(v => ({
      id: v.id,
      violation_number: v.violation_number || '',
      violation_date: v.violation_date || '',
      violation_type: v.violation_type || 'غير محدد',
      location: v.location,
      fine_amount: Number(v.fine_amount) || 0,
      total_amount: Number(v.total_amount) || Number(v.fine_amount) || 0,
      status: v.status,
    }));
  }

  /**
   * Calculate all amounts for the lawsuit
   */
  private async calculateAmounts(
    contractId: string,
    companyId: string
  ): Promise<{
    overdueRent: number;
    lateFees: number;
    violationsFines: number;
    otherFees: number;
    total: number;
    amountInWords: string;
    violationsCount: number;
  }> {
    const invoices = await this.getOverdueInvoices(contractId);
    const violations = await this.getTrafficViolations(contractId, companyId);

    const overdueRent = invoices.reduce(
      (sum, inv) => sum + (inv.total_amount - inv.paid_amount),
      0
    );
    const lateFees = Math.round(overdueRent * 0.05); // 5% late fee
    const otherFees = 500; // Administrative fees
    const violationsFines = violations.reduce(
      (sum, v) => sum + v.total_amount,
      0
    );
    const total = overdueRent + lateFees + otherFees + violationsFines;

    return {
      overdueRent,
      lateFees,
      violationsFines,
      otherFees,
      total,
      amountInWords: lawsuitService.convertAmountToWords(total),
      violationsCount: violations.length,
    };
  }

  /**
   * Generate case texts (title, facts, claims)
   */
  private async generateCaseTexts(
    contractId: string,
    companyId: string
  ): Promise<{
    caseTitle: string;
    facts: string;
    claims: string;
    contractStartDate: string;
    lastPaymentDate?: string;
  }> {
    const contractData = await this.extractContractData(contractId, companyId);
    const calculations = await this.calculateAmounts(contractId, companyId);

    const customerName = contractData.customer
      ? `${contractData.customer.first_name || ''} ${contractData.customer.last_name || ''}`.trim()
      : 'غير معروف';

    const vehicleInfo = contractData.vehicle
      ? `${contractData.vehicle.make} ${contractData.vehicle.model} ${contractData.vehicle.year}`
      : `${contractData.make || ''} ${contractData.model || ''} ${contractData.year || ''}`.trim();

    // Generate case title
    const caseTitle = lawsuitService.generateCaseTitle(customerName);

    // Generate facts
    let facts = lawsuitService.generateFactsText(
      customerName,
      contractData.start_date,
      vehicleInfo,
      calculations.total
    );

    // Add violations info if exists
    if (calculations.violationsCount > 0) {
      facts += `\n\nبالإضافة إلى ذلك، ترتبت على المدعى عليه مخالفات مرورية بسبب استخدام السيارة المؤجرة بعدد (${calculations.violationsCount}) مخالفة بإجمالي مبلغ (${calculations.violationsFines.toLocaleString('ar-QA')}) ريال قطري، والتي لم يقم بسدادها حتى تاريخه.`;
    }

    // Generate claims
    let claims: string;
    if (calculations.violationsCount > 0) {
      claims = `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${calculations.overdueRent.toLocaleString('ar-QA')}) ريال قطري قيمة الإيجارات المتأخرة.

2. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${calculations.violationsFines.toLocaleString('ar-QA')}) ريال قطري قيمة المخالفات المرورية غير المسددة (عدد ${calculations.violationsCount} مخالفة).

3. إلزام المدعى عليه بالفوائد القانونية من تاريخ الاستحقاق وحتى تمام السداد.

4. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`;
    } else {
      claims = lawsuitService.generateClaimsText(calculations.total);
    }

    // Get last payment date
    const { data: payments } = await supabase
      .from('payments')
      .select('payment_date')
      .eq('contract_id', contractId)
      .order('payment_date', { ascending: false })
      .limit(1);

    const lastPaymentDate = payments?.[0]?.payment_date;

    return {
      caseTitle,
      facts,
      claims,
      contractStartDate: contractData.start_date,
      lastPaymentDate,
    };
  }

  /**
   * Extract document URLs
   */
  private async extractDocuments(
    contractId: string,
    options: ExtractionOptions
  ): Promise<Record<string, string>> {
    const documents: Record<string, string> = {};

    // Get company legal documents
    const { data: legalDocs } = await supabase
      .from('company_legal_documents')
      .select('*')
      .eq('company_id', options.companyId)
      .eq('is_active', true);

    if (legalDocs) {
      for (const doc of legalDocs) {
        const key = this.documentTypeToKey(doc.document_type);
        if (key) {
          documents[key] = doc.file_url;
        }
      }
    }

    // Get contract-specific documents if generation is enabled
    if (options.generateDocuments) {
      // These would be generated documents
      // For now, they'll be generated by the UI
      documents.explanatoryMemo = ''; // Will be generated
      documents.documentsList = ''; // Will be generated
      documents.claimsStatement = ''; // Will be generated
    }

    return documents;
  }

  /**
   * Convert document type to storage key
   */
  private documentTypeToKey(type: string): string | null {
    const mapping: Record<string, string> = {
      commercial_register: 'commercialRegister',
      establishment_record: 'establishmentRecord',
      iban_certificate: 'ibanCertificate',
      representative_id: 'representativeId',
      authorization_letter: 'authorizationLetter',
      explanatory_memo: 'explanatoryMemo',
      contract_copy: 'contractCopy',
      documents_list: 'documentsList',
      claims_statement: 'claimsStatement',
    };
    return mapping[type] || null;
  }
}

// Export singleton instance
export const taqadiDataExtractor = new TaqadiDataExtractor();
export default taqadiDataExtractor;

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// SmartLinkingResult interface - compatible with smartPaymentLinker
export interface SmartLinkingResult {
  success: boolean;
  suggested_contract_id?: string;
  confidence: number;
  linkedContracts: Array<{
    contractId: string;
    contractNumber: string;
    amount: number;
    confidence: number;
  }>;
  suggestions: Array<{
    type?: 'invoice' | 'contract' | 'customer';
    contract_id?: string;
    contract_number?: string;
    id?: string;
    reason: string;
    confidence: number;
  }>;
  autoInvoiceGenerated?: boolean;
}

export interface LinkingCriteria {
  customerId?: string;
  amount?: number;
  referenceNumber?: string;
  paymentDate?: string;
  tolerancePercentage?: number;
  companyId?: string;
}

class ProfessionalPaymentLinking {
  private readonly DEFAULT_TOLERANCE = 0.05; // 5% tolerance

  async performSmartLinking(
    paymentId: string,
    criteria: LinkingCriteria
  ): Promise<SmartLinkingResult> {
    try {
      logger.debug('Starting smart payment linking', { paymentId, criteria });

      // Get active contracts for customer
      const contracts = await this.getActiveContracts(criteria.customerId, criteria.companyId);
      
      // Find matching contracts based on amount and other criteria
      const linkedContracts = await this.matchContracts(contracts, criteria);
      
      // Generate suggestions for partial matches
      const suggestions = await this.generateSuggestions(criteria, linkedContracts);
      
      // Auto-generate invoice if criteria met
      const autoInvoiceGenerated = await this.shouldGenerateAutoInvoice(linkedContracts);

      return {
        success: true,
        linkedContracts,
        suggestions,
        autoInvoiceGenerated
      };
    } catch (error) {
      logger.error('Smart linking failed', { error, paymentId });
      return {
        success: false,
        linkedContracts: [],
        suggestions: []
      };
    }
  }

  private async getActiveContracts(customerId?: string, companyId?: string) {
    if (!companyId) {
      logger.warn('No company ID provided for contract search');
      return [];
    }

    try {
      let contractsQuery = supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          contract_amount,
          monthly_amount,
          start_date,
          end_date,
          status,
          customer_id,
          company_id
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'under_review', 'draft'])
        .limit(50);

      // If customer ID exists, filter by it
      if (customerId) {
        contractsQuery = contractsQuery.eq('customer_id', customerId);
      }

      const { data: contracts, error } = await contractsQuery;

      if (error) {
        logger.error('Failed to fetch contracts', error);
        return [];
      }

      logger.debug('Contracts fetched for linking', { customerId, companyId, count: contracts?.length || 0 });
      return contracts || [];
    } catch (error) {
      logger.error('Exception while fetching contracts', { error, customerId, companyId });
      return [];
    }
  }

  private async matchContracts(contracts: any[], criteria: LinkingCriteria) {
    const matches = [];
    const tolerance = criteria.tolerancePercentage || this.DEFAULT_TOLERANCE;

    // Enhanced fallback matching
    if (criteria.companyId) {
      // Try reference number matching first
      if (criteria.referenceNumber && !criteria.customerId) {
        const referenceContracts = await this.getFallbackContractsByReference(criteria.referenceNumber, criteria.companyId);
        contracts = [...contracts, ...referenceContracts];
      }
      
      // Then try amount-based matching
      if (criteria.amount && contracts.length < 5) {
        const fallbackContracts = await this.getFallbackContractsByAmount(criteria.amount, criteria.companyId);
        contracts = [...contracts, ...fallbackContracts];
      }
    }

    for (const contract of contracts) {
      const confidence = this.calculateMatchingConfidence(contract, criteria);
      
      // Dynamic threshold based on available data
      const threshold = criteria.customerId ? 0.7 : (criteria.referenceNumber ? 0.6 : 0.5);
      
      if (confidence > threshold) {
        matches.push({
          contractId: contract.id,
          contractNumber: contract.contract_number,
          amount: criteria.amount || 0,
          confidence
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateMatchingConfidence(contract: any, criteria: LinkingCriteria): number {
    let confidence = 0;
    const statusBonus = contract.status === 'active' ? 0.1 : 0;

    // Amount matching - enhanced scoring
    if (criteria.amount && contract.monthly_amount) {
      const amountDiff = Math.abs(criteria.amount - contract.monthly_amount) / contract.monthly_amount;
      if (amountDiff <= (criteria.tolerancePercentage || this.DEFAULT_TOLERANCE)) {
        confidence += 0.5;
      } else if (amountDiff <= 0.1) {
        confidence += 0.25;
      } else if (amountDiff <= 0.2) {
        confidence += 0.1;
      }
    }

    // Enhanced reference number matching with partial search
    if (criteria.referenceNumber && contract.contract_number) {
      const refNum = criteria.referenceNumber.toUpperCase();
      const contractNum = contract.contract_number.toUpperCase();
      
      // Exact match
      if (refNum === contractNum) {
        confidence += 0.4;
      }
      // One contains the other
      else if (refNum.includes(contractNum) || contractNum.includes(refNum)) {
        confidence += 0.35;
      }
      // Similar patterns (e.g., LTO20244 matches LTO202442)
      else if (this.isPartialNumberMatch(refNum, contractNum)) {
        confidence += 0.3;
      }
      // Loose similarity
      else if (this.calculateStringSimilarity(refNum, contractNum) > 0.7) {
        confidence += 0.2;
      }
    }

    // Date proximity bonus
    if (criteria.paymentDate) {
      const paymentDate = new Date(criteria.paymentDate);
      const contractStart = new Date(contract.start_date);
      const daysDiff = Math.abs((paymentDate.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff % 30 <= 3 || daysDiff % 30 >= 27) {
        confidence += 0.05;
      }
    }

    return Math.min(confidence + statusBonus, 1);
  }

  private isPartialNumberMatch(ref: string, contract: string): boolean {
    // Remove non-alphanumeric characters for comparison
    const cleanRef = ref.replace(/[^A-Z0-9]/g, '');
    const cleanContract = contract.replace(/[^A-Z0-9]/g, '');
    
    // Check if one is a substring of the other with at least 80% match
    const minLength = Math.min(cleanRef.length, cleanContract.length);
    if (minLength < 4) return false;
    
    const longer = cleanRef.length > cleanContract.length ? cleanRef : cleanContract;
    const shorter = cleanRef.length <= cleanContract.length ? cleanRef : cleanContract;
    
    return longer.includes(shorter) && shorter.length / longer.length >= 0.8;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    let matches = 0;
    const range = Math.floor(Math.max(len1, len2) / 2) - 1;
    const str1Matches = new Array(len1).fill(false);
    const str2Matches = new Array(len2).fill(false);
    
    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - range);
      const end = Math.min(i + range + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = str2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0;
    
    // Calculate transpositions
    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }
    
    return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  }

  private async generateSuggestions(criteria: LinkingCriteria, linkedContracts: any[]) {
    const suggestions = [];

    // If no high-confidence matches, suggest potential contracts
    if (linkedContracts.length === 0 && criteria.companyId) {
      
      // Try to find contracts by reference number
      if (criteria.referenceNumber) {
        const referenceContracts = await this.getFallbackContractsByReference(criteria.referenceNumber, criteria.companyId);
        referenceContracts.forEach(contract => {
          const confidence = this.calculateMatchingConfidence(contract, criteria);
          if (confidence > 0.1) {
            suggestions.push({
              type: 'contract' as const,
              id: contract.id,
              reason: `رقم مرجعي مشابه: ${contract.contract_number} - المبلغ: ${contract.monthly_amount} ر.ق`,
              confidence: confidence
            });
          }
        });
      }

      // If still no suggestions, try amount-based search
      if (suggestions.length === 0 && criteria.amount) {
        let contractsQuery = supabase
          .from('contracts')
          .select('id, contract_number, monthly_amount, customer_id, status')
          .eq('company_id', criteria.companyId)
          .in('status', ['active', 'under_review'])
          .gte('monthly_amount', criteria.amount * 0.8)
          .lte('monthly_amount', criteria.amount * 1.2)
          .limit(5);

        if (criteria.customerId) {
          contractsQuery = contractsQuery.eq('customer_id', criteria.customerId);
        }

        const { data: similarContracts } = await contractsQuery;

        similarContracts?.forEach(contract => {
          const confidence = this.calculateMatchingConfidence(contract, criteria);
          suggestions.push({
            type: 'contract' as const,
            id: contract.id,
            reason: `مبلغ مشابه: ${contract.monthly_amount} ر.ق - الحالة: ${contract.status}`,
            confidence: confidence
          });
        });
      }
    }

    // Sort suggestions by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  private async getFallbackContractsByAmount(amount: number, companyId: string) {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          contract_amount,
          monthly_amount,
          start_date,
          end_date,
          status,
          customer_id,
          company_id
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'under_review', 'draft'])
        .gte('monthly_amount', amount * 0.7)
        .lte('monthly_amount', amount * 1.3)
        .limit(15);

      if (error) {
        logger.error('Failed to fetch fallback contracts', error);
        return [];
      }

      logger.debug('Fallback contracts fetched by amount', { amount, companyId, count: contracts?.length || 0 });
      return contracts || [];
    } catch (error) {
      logger.error('Exception while fetching fallback contracts', { error, amount, companyId });
      return [];
    }
  }

  async getFallbackContractsByReference(referenceNumber: string, companyId: string) {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          contract_amount,
          monthly_amount,
          start_date,
          end_date,
          status,
          customer_id,
          company_id
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'under_review', 'draft'])
        .or(`contract_number.ilike.%${referenceNumber}%,contract_number.ilike.%${referenceNumber.substring(0, -1)}%`)
        .limit(10);

      if (error) {
        logger.error('Failed to fetch contracts by reference', error);
        return [];
      }

      logger.debug('Fallback contracts fetched by reference', { referenceNumber, companyId, count: contracts?.length || 0 });
      return contracts || [];
    } catch (error) {
      logger.error('Exception while fetching contracts by reference', { error, referenceNumber, companyId });
      return [];
    }
  }

  private async shouldGenerateAutoInvoice(linkedContracts: any[]): Promise<boolean> {
    // Auto-generate invoice if high confidence single match
    return linkedContracts.length === 1 && linkedContracts[0].confidence > 0.9;
  }

  async linkPaymentToContract(paymentId: string, contractId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ contract_id: contractId })
        .eq('id', paymentId);

      if (error) throw error;

      logger.info('Payment linked to contract successfully', { paymentId, contractId });

      // Auto-create invoice for the linked payment
      try {
        const { data: payment } = await supabase
          .from('payments')
          .select('company_id')
          .eq('id', paymentId)
          .single();

        if (payment) {
          const { createInvoiceForPayment } = await import('@/utils/createInvoiceForPayment');
          const invoiceResult = await createInvoiceForPayment(paymentId, payment.company_id);
          
          if (invoiceResult.success) {
            logger.info('Invoice auto-created for linked payment', { 
              paymentId, 
              contractId,
              invoiceId: invoiceResult.invoiceId 
            });
          }
        }
      } catch (invoiceError) {
        logger.warn('Failed to auto-create invoice for linked payment', { invoiceError, paymentId });
        // Don't fail the linking operation due to invoice creation failure
      }
      return true;
    } catch (error) {
      logger.error('Failed to link payment to contract', { error, paymentId, contractId });
      return false;
    }
  }

  /**
   * Find best matching contract for a payment (migrated from smartPaymentLinker)
   * Used by useProfessionalPaymentSystem for smart linking
   */
  async findBestContract(payment: any): Promise<SmartLinkingResult> {
    try {
      logger.debug('Finding best contract for payment', { paymentId: payment.id });

      // Get all possible contracts for the company
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('company_id', payment.company_id)
        .eq('status', 'active');

      if (error) {
        logger.error('Failed to fetch contracts', error);
        throw error;
      }

      if (!contracts || contracts.length === 0) {
        return {
          success: false,
          confidence: 0,
          linkedContracts: [],
          suggestions: []
        };
      }

      // Calculate confidence for each contract
      const matches = contracts.map(contract => ({
        contract_id: contract.id,
        contract_number: contract.contract_number,
        confidence: this.calculatePaymentContractConfidence(payment, contract),
        reason: this.getPaymentMatchReason(payment, contract)
      }));

      // Sort by confidence
      matches.sort((a, b) => b.confidence - a.confidence);

      const bestMatch = matches[0];

      return {
        success: bestMatch.confidence > 0.4,
        suggested_contract_id: bestMatch.confidence > 0.4 ? bestMatch.contract_id : undefined,
        confidence: bestMatch.confidence,
        linkedContracts: bestMatch.confidence > 0.4 ? [{
          contractId: bestMatch.contract_id,
          contractNumber: bestMatch.contract_number,
          amount: payment.amount || 0,
          confidence: bestMatch.confidence
        }] : [],
        suggestions: matches.slice(0, 5) // Top 5 suggestions
      };
    } catch (error) {
      logger.error('Error in smart linking', error);
      return {
        success: false,
        confidence: 0,
        linkedContracts: [],
        suggestions: []
      };
    }
  }

  /**
   * Calculate linking confidence between payment and contract
   */
  private calculatePaymentContractConfidence(payment: any, contract: any): number {
    let confidence = 0.30; // Base confidence
    let bonusPoints = 0;

    // Agreement number match (high weight)
    if (payment.agreement_number && contract.contract_number) {
      const agreementMatch = payment.agreement_number.toLowerCase().includes(contract.contract_number.toLowerCase()) ||
                           contract.contract_number.toLowerCase().includes(payment.agreement_number.toLowerCase());
      if (agreementMatch) bonusPoints += 0.40;
    }

    // Amount match (medium-high weight)
    if (payment.amount && contract.monthly_amount) {
      const amountDiff = Math.abs(payment.amount - contract.monthly_amount) / contract.monthly_amount;
      if (amountDiff <= 0.02) bonusPoints += 0.30;
      else if (amountDiff <= 0.05) bonusPoints += 0.25;
      else if (amountDiff <= 0.1) bonusPoints += 0.15;
      else if (amountDiff <= 0.2) bonusPoints += 0.08;
    }

    // Customer match (medium weight)
    if (payment.customer_id && contract.customer_id && payment.customer_id === contract.customer_id) {
      bonusPoints += 0.20;
    }

    // Date proximity (lower weight)
    if (payment.payment_date && contract.start_date) {
      const paymentDate = new Date(payment.payment_date);
      const contractDate = new Date(contract.start_date);
      const daysDiff = Math.abs(paymentDate.getTime() - contractDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 3) bonusPoints += 0.10;
      else if (daysDiff <= 7) bonusPoints += 0.08;
      else if (daysDiff <= 30) bonusPoints += 0.05;
    }

    // Reference number match
    if (payment.reference_number && contract.reference_number) {
      if (payment.reference_number === contract.reference_number) bonusPoints += 0.15;
    }

    return Math.min(Math.max(confidence + bonusPoints, 0), 1.0);
  }

  /**
   * Get human-readable match reason
   */
  private getPaymentMatchReason(payment: any, contract: any): string {
    const reasons = [];

    if (payment.agreement_number && contract.contract_number) {
      const agreementMatch = payment.agreement_number.toLowerCase().includes(contract.contract_number.toLowerCase()) ||
                           contract.contract_number.toLowerCase().includes(payment.agreement_number.toLowerCase());
      if (agreementMatch) reasons.push('تطابق رقم الاتفاقية');
    }

    if (payment.amount && contract.monthly_amount) {
      const amountDiff = Math.abs(payment.amount - contract.monthly_amount) / contract.monthly_amount;
      if (amountDiff <= 0.05) reasons.push('تطابق المبلغ');
      else if (amountDiff <= 0.2) reasons.push('مبلغ مشابه');
    }

    if (payment.customer_id && contract.customer_id && payment.customer_id === contract.customer_id) {
      reasons.push('نفس العميل');
    }

    return reasons.length > 0 ? reasons.join(' + ') : 'مطابقة عامة';
  }
}

export const professionalPaymentLinking = new ProfessionalPaymentLinking();

// Backward compatibility alias - use professionalPaymentLinking.findBestContract instead
export const smartPaymentLinker = {
  findBestContract: (payment: any) => professionalPaymentLinking.findBestContract(payment),
  calculateLinkingConfidence: (payment: any, contract: any) => 
    (professionalPaymentLinking as any).calculatePaymentContractConfidence(payment, contract)
};
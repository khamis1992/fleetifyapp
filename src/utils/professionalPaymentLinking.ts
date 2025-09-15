import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface SmartLinkingResult {
  success: boolean;
  linkedContracts: Array<{
    contractId: string;
    contractNumber: string;
    amount: number;
    confidence: number;
  }>;
  suggestions: Array<{
    type: 'invoice' | 'contract' | 'customer';
    id: string;
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
      const contracts = await this.getActiveContracts(criteria.customerId);
      
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

  private async getActiveContracts(customerId?: string) {
    if (!customerId) return [];

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
        customer_id
      `)
      .eq('customer_id', customerId)
      .eq('status', 'active');

    if (error) {
      logger.error('Failed to fetch contracts', error);
      return [];
    }

    return contracts || [];
  }

  private async matchContracts(contracts: any[], criteria: LinkingCriteria) {
    const matches = [];
    const tolerance = criteria.tolerancePercentage || this.DEFAULT_TOLERANCE;

    for (const contract of contracts) {
      const confidence = this.calculateMatchingConfidence(contract, criteria);
      
      if (confidence > 0.7) { // High confidence threshold
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

    // Amount matching
    if (criteria.amount && contract.monthly_amount) {
      const amountDiff = Math.abs(criteria.amount - contract.monthly_amount) / contract.monthly_amount;
      if (amountDiff <= (criteria.tolerancePercentage || this.DEFAULT_TOLERANCE)) {
        confidence += 0.6;
      } else if (amountDiff <= 0.1) {
        confidence += 0.3;
      }
    }

    // Reference number matching
    if (criteria.referenceNumber && contract.contract_number) {
      if (criteria.referenceNumber.includes(contract.contract_number) || 
          contract.contract_number.includes(criteria.referenceNumber)) {
        confidence += 0.3;
      }
    }

    // Date proximity (payments near due dates)
    if (criteria.paymentDate) {
      const paymentDate = new Date(criteria.paymentDate);
      const contractStart = new Date(contract.start_date);
      const daysDiff = Math.abs((paymentDate.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff % 30 <= 3 || daysDiff % 30 >= 27) { // Near monthly cycle
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1);
  }

  private async generateSuggestions(criteria: LinkingCriteria, linkedContracts: any[]) {
    const suggestions = [];

    // If no high-confidence matches, suggest similar amounts
    if (linkedContracts.length === 0 && criteria.customerId && criteria.amount) {
      const { data: similarContracts } = await supabase
        .from('contracts')
        .select('id, contract_number, monthly_amount')
        .eq('customer_id', criteria.customerId)
        .gte('monthly_amount', criteria.amount * 0.8)
        .lte('monthly_amount', criteria.amount * 1.2)
        .limit(3);

      similarContracts?.forEach(contract => {
        suggestions.push({
          type: 'contract' as const,
          id: contract.id,
          reason: `مبلغ مشابه: ${contract.monthly_amount} ر.ق`,
          confidence: 0.5
        });
      });
    }

    return suggestions;
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
      return true;
    } catch (error) {
      logger.error('Failed to link payment to contract', { error, paymentId, contractId });
      return false;
    }
  }
}

export const professionalPaymentLinking = new ProfessionalPaymentLinking();
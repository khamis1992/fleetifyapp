import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface SmartLinkingResult {
  success: boolean;
  suggested_contract_id?: string;
  confidence: number;
  suggestions: Array<{
    contract_id: string;
    contract_number: string;
    confidence: number;
    reason: string;
  }>;
}

class SmartPaymentLinker {
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
          suggestions: []
        };
      }

      // Calculate confidence for each contract
      const matches = contracts.map(contract => ({
        contract_id: contract.id,
        contract_number: contract.contract_number,
        confidence: this.calculateLinkingConfidence(payment, contract),
        reason: this.getMatchReason(payment, contract)
      }));

      // Sort by confidence
      matches.sort((a, b) => b.confidence - a.confidence);

      const bestMatch = matches[0];

      return {
        success: bestMatch.confidence > 0.4,
        suggested_contract_id: bestMatch.confidence > 0.4 ? bestMatch.contract_id : undefined,
        confidence: bestMatch.confidence,
        suggestions: matches.slice(0, 5) // Top 5 suggestions
      };
    } catch (error) {
      logger.error('Error in smart linking', error);
      return {
        success: false,
        confidence: 0,
        suggestions: []
      };
    }
  }

  calculateLinkingConfidence(payment: any, contract: any): number {
    // Start with base confidence for any potential match
    let confidence = 0.30;
    let bonusPoints = 0;

    // Strong indicators (high weight)
    if (payment.agreement_number && contract.contract_number) {
      const agreementMatch = payment.agreement_number.toLowerCase().includes(contract.contract_number.toLowerCase()) ||
                           contract.contract_number.toLowerCase().includes(payment.agreement_number.toLowerCase());
      if (agreementMatch) bonusPoints += 0.40; // Strong match
    }

    // Amount match (medium-high weight)
    if (payment.amount && contract.monthly_amount) {
      const amountDiff = Math.abs(payment.amount - contract.monthly_amount) / contract.monthly_amount;
      if (amountDiff <= 0.02) bonusPoints += 0.30; // Very close match
      else if (amountDiff <= 0.05) bonusPoints += 0.25; // Close match
      else if (amountDiff <= 0.1) bonusPoints += 0.15; // Reasonable match
      else if (amountDiff <= 0.2) bonusPoints += 0.08; // Possible match
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

    // Additional indicators
    if (payment.reference_number && contract.reference_number) {
      const refMatch = payment.reference_number === contract.reference_number;
      if (refMatch) bonusPoints += 0.15;
    }

    const finalConfidence = Math.min(confidence + bonusPoints, 1.0);
    return Math.max(finalConfidence, 0);
  }

  private getMatchReason(payment: any, contract: any): string {
    const reasons = [];

    // Check agreement number match
    if (payment.agreement_number && contract.contract_number) {
      const agreementMatch = payment.agreement_number.toLowerCase().includes(contract.contract_number.toLowerCase()) ||
                           contract.contract_number.toLowerCase().includes(payment.agreement_number.toLowerCase());
      if (agreementMatch) reasons.push('تطابق رقم الاتفاقية');
    }

    // Check amount match
    if (payment.amount && contract.monthly_amount) {
      const amountDiff = Math.abs(payment.amount - contract.monthly_amount) / contract.monthly_amount;
      if (amountDiff <= 0.05) reasons.push('تطابق المبلغ');
      else if (amountDiff <= 0.2) reasons.push('مبلغ مشابه');
    }

    // Check customer match
    if (payment.customer_id && contract.customer_id && payment.customer_id === contract.customer_id) {
      reasons.push('نفس العميل');
    }

    return reasons.length > 0 ? reasons.join(' + ') : 'مطابقة عامة';
  }
}

export const smartPaymentLinker = new SmartPaymentLinker();
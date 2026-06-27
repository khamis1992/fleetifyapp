import { supabase } from '@/integrations/supabase/client';

type TrafficViolationJournalInput = {
  id?: string;
  violationId?: string;
  company_id?: string;
  companyId?: string;
  violation_type?: string | null;
  fine_amount?: number | null;
  amount?: number | null;
  violation_date?: string | null;
  penalty_date?: string | null;
  date?: string | null;
  charged_to_customer?: boolean | null;
  isCompanyLiability?: boolean | null;
  customer_id?: string | null;
  customerId?: string | null;
};

export const useTrafficViolationJournalIntegration = () => {
  const createJournalEntry = async (violation: TrafficViolationJournalInput) => {
    try {
      const violationId = violation.id || violation.violationId;
      const companyId = violation.company_id || violation.companyId;
      const amount = Number(violation.fine_amount ?? violation.amount ?? 0);
      const entryDate =
        violation.violation_date ||
        violation.penalty_date ||
        violation.date ||
        new Date().toISOString().split('T')[0];
      const violationType = violation.violation_type || 'مخالفة مرورية';
      const isCustomerResponsible = Boolean(
        violation.charged_to_customer ??
        violation.customer_id ??
        violation.customerId ??
        !violation.isCompanyLiability
      );

      if (!violationId || !companyId || amount <= 0) {
        console.warn('Traffic violation journal entry skipped: missing required data', violation);
        return null;
      }

      const { data: existingEntry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .eq('reference_type', 'traffic_violation')
        .eq('reference_id', violationId)
        .maybeSingle();

      if (existingEntry?.id) return existingEntry.id;

      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .in('account_code', ['1010', '1200', '4300', '5700']);

      const accountMap = new Map((accounts || []).map((account) => [account.account_code, account.id]));
      const requiredCodes = isCustomerResponsible ? ['1200', '4300'] : ['5700', '1010'];
      if (requiredCodes.some((code) => !accountMap.get(code))) {
        console.warn('Traffic violation journal entry skipped: required accounts not found', requiredCodes);
        return null;
      }

      const { data: lastEntry } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .eq('company_id', companyId)
        .order('entry_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextEntryNumber = lastEntry?.entry_number
        ? String(Number.parseInt(lastEntry.entry_number, 10) + 1).padStart(6, '0')
        : '000001';

      const description = isCustomerResponsible
        ? `مخالفة مرورية - ${violationType} - يتحملها العميل`
        : `مخالفة مرورية - ${violationType} - تتحملها الشركة`;

      const lines = isCustomerResponsible
        ? [
            {
              account_id: accountMap.get('1200'),
              line_description: 'ذمم العميل - مخالفة مرورية',
              debit_amount: amount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              account_id: accountMap.get('4300'),
              line_description: 'إيراد مخالفة مرورية - يتحملها العميل',
              debit_amount: 0,
              credit_amount: amount,
              line_number: 2,
            },
          ]
        : [
            {
              account_id: accountMap.get('5700'),
              line_description: 'مصروف مخالفة مرورية - تتحملها الشركة',
              debit_amount: amount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              account_id: accountMap.get('1010'),
              line_description: 'دفع مخالفة مرورية',
              debit_amount: 0,
              credit_amount: amount,
              line_number: 2,
            },
          ];

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: nextEntryNumber,
          entry_date: entryDate,
          description,
          reference_type: 'traffic_violation',
          reference_id: violationId,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) throw entryError;

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines.map((line) => ({ ...line, journal_entry_id: entry.id })));

      if (linesError) {
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        throw linesError;
      }

      return entry.id;
    } catch (error) {
      console.error('Error creating journal entry for traffic violation:', error);
      return null;
    }
  };

  const deleteJournalEntry = async (violationId: string, companyId: string) => {
    try {
      const { data: entry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .eq('reference_type', 'traffic_violation')
        .eq('reference_id', violationId)
        .maybeSingle();

      if (!entry?.id) return;

      await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', entry.id);
      await supabase.from('journal_entries').delete().eq('id', entry.id);
    } catch (error) {
      console.error('Error deleting journal entry for traffic violation:', error);
    }
  };

  return {
    createJournalEntry,
    createViolationJournalEntry: createJournalEntry,
    deleteJournalEntry,
  };
};

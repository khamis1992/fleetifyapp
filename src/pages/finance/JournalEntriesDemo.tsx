import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RedesignedJournalEntryCard } from '@/components/finance/RedesignedJournalEntryCard';
import { Search, Filter } from 'lucide-react';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';

const JournalEntriesDemo = () => {
  const { isMobile } = useSimpleBreakpoint();

  // Sample data matching the structure from the API
  const sampleEntries = [
    {
      id: '1',
      company_id: 'company-1',
      entry_number: '000227',
      entry_date: '2026-03-01',
      description: 'دفعة إيجار - إبراهيم حضر عبدالله',
      total_debit: 1500.000,
      total_credit: 1500.000,
      status: 'posted',
      reference_type: null,
      reference_id: null,
      created_at: '2026-03-01T10:00:00Z',
      updated_at: '2026-03-01T10:00:00Z',
      journal_entry_lines: [
        {
          id: 'line-1',
          debit_amount: 1500.000,
          credit_amount: 0,
          line_description: 'إيجار شهر مارس',
          line_number: 1,
          account_id: 'account-1',
          journal_entry_id: '1',
          cost_center_id: null,
          created_at: '2026-03-01T10:00:00Z',
          updated_at: '2026-03-01T10:00:00Z',
          chart_of_accounts: {
            id: 'account-1',
            company_id: 'company-1',
            account_code: '4510',
            account_name: 'Rent Expense',
            account_name_ar: 'مصاريف إيجار',
            account_type: 'expense',
            account_level: 3,
            parent_account_id: null,
            is_active: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
          }
        },
        {
          id: 'line-2',
          debit_amount: 0,
          credit_amount: 1500.000,
          line_description: 'دفع المبلغ نقداً',
          line_number: 2,
          account_id: 'account-2',
          journal_entry_id: '1',
          cost_center_id: null,
          created_at: '2026-03-01T10:00:00Z',
          updated_at: '2026-03-01T10:00:00Z',
          chart_of_accounts: {
            id: 'account-2',
            company_id: 'company-1',
            account_code: '1110',
            account_name: 'Cash',
            account_name_ar: 'الصندوق',
            account_type: 'asset',
            account_level: 3,
            parent_account_id: null,
            is_active: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
          }
        }
      ]
    },
    {
      id: '2',
      company_id: 'company-1',
      entry_number: '000226',
      entry_date: '2026-02-01',
      description: 'فاتورة مبيعات شهر فبراير',
      total_debit: 2500.000,
      total_credit: 2500.000,
      status: 'draft',
      reference_type: null,
      reference_id: null,
      created_at: '2026-02-01T10:00:00Z',
      updated_at: '2026-02-01T10:00:00Z',
      journal_entry_lines: [
        {
          id: 'line-3',
          debit_amount: 2500.000,
          credit_amount: 0,
          line_description: 'قيد المبيعات الآجلة',
          line_number: 1,
          account_id: 'account-3',
          journal_entry_id: '2',
          cost_center_id: null,
          created_at: '2026-02-01T10:00:00Z',
          updated_at: '2026-02-01T10:00:00Z',
          chart_of_accounts: {
            id: 'account-3',
            company_id: 'company-1',
            account_code: '1220',
            account_name: 'Accounts Receivable',
            account_name_ar: 'عملاء',
            account_type: 'asset',
            account_level: 3,
            parent_account_id: null,
            is_active: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
          }
        },
        {
          id: 'line-4',
          debit_amount: 0,
          credit_amount: 2500.000,
          line_description: 'الإيراد المحقق',
          line_number: 2,
          account_id: 'account-4',
          journal_entry_id: '2',
          cost_center_id: null,
          created_at: '2026-02-01T10:00:00Z',
          updated_at: '2026-02-01T10:00:00Z',
          chart_of_accounts: {
            id: 'account-4',
            company_id: 'company-1',
            account_code: '3310',
            account_name: 'Sales Revenue',
            account_name_ar: 'إيرادات مبيعات',
            account_type: 'revenue',
            account_level: 3,
            parent_account_id: null,
            is_active: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
          }
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">القيود المحاسبية</h1>
          <p className="text-muted-foreground">عرض وتصفية القيود المحاسبية حسب التصميم الجديد</p>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <Filter className="h-5 w-5" />
            البحث والفلتر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث في القيود..."
                className="pr-10 text-right"
              />
            </div>
            
            <Input
              type="date"
              placeholder="من تاريخ"
              className="text-right"
            />
            
            <Input
              type="date"
              placeholder="إلى تاريخ"
              className="text-right"
            />
          </div>
        </CardContent>
      </Card>

      {/* Journal Entries */}
      <div className="space-y-4">
        {sampleEntries.map((entry) => (
          <RedesignedJournalEntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
};

export default JournalEntriesDemo;
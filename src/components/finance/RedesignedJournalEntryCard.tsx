import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ChevronDown, Calendar, FileText } from 'lucide-react';

interface JournalEntryLine {
  id: string;
  debit_amount: number | null;
  credit_amount: number | null;
  line_description?: string | null;
  line_number: number;
  account_id: string;
  journal_entry_id?: string;
  cost_center_id?: string | null;
  created_at?: string;
  updated_at?: string;
  chart_of_accounts?: {
    id: string;
    company_id?: string;
    account_code: string;
    account_name: string;
    account_name_ar?: string | null;
    account_type?: string;
    account_level?: number;
    parent_account_id?: string | null;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  } | null;
}

interface JournalEntry {
  id: string;
  company_id?: string;
  entry_number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: string;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at?: string;
  updated_at?: string;
  journal_entry_lines?: JournalEntryLine[];
}

interface RedesignedJournalEntryCardProps {
  entry: JournalEntry;
}

export function RedesignedJournalEntryCard({ entry }: RedesignedJournalEntryCardProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted': return 'مرحل';
      case 'draft': return 'مسودة';
      case 'cancelled': 
      case 'reversed': return 'ملغي';
      default: return status;
    }
  };

  return (
    <Card 
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-0"
      dir="rtl"
    >
      {/* Summary Section (Header) */}
      <div 
        className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Basic Entry Information */}
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-8 md:space-x-reverse">
          <h2 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            سند قيد رقم: {entry.entry_number}
          </h2>
          <Badge className={`${getStatusClass(entry.status)} px-3 py-1 rounded-full whitespace-nowrap`}>
            {getStatusLabel(entry.status)}
          </Badge>
          <p className="text-sm text-gray-600 flex items-center">
            <Calendar className="ml-1 w-4 h-4 text-gray-400" />
            التاريخ: {new Date(entry.entry_date).toLocaleDateString('ar-SA')}
          </p>
        </div>
        
        {/* Totals and Details Button */}
        <div className="mt-4 md:mt-0 flex items-center space-x-4 space-x-reverse">
          <div className="text-sm text-gray-700 text-right">
            <p>إجمالي المدين: <span className="font-semibold text-green-600">{formatCurrency(entry.total_debit, { minimumFractionDigits: 3 })}</span></p>
            <p>إجمالي الدائن: <span className="font-semibold text-red-600">{formatCurrency(entry.total_credit, { minimumFractionDigits: 3 })}</span></p>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            className="flex items-center text-indigo-600 hover:text-indigo-800 font-semibold transition duration-150 p-0"
          >
            <span className="mr-1">عرض التفاصيل</span>
            <ChevronDown 
              className={`w-5 h-5 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </Button>
        </div>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="p-5 bg-gray-50 rounded-b-xl">
          {entry.description && (
            <p className="text-gray-700 font-medium text-right mb-4">
              البيان: <span className="font-normal">{entry.description}</span>
            </p>
          )}
          
          {/* Entry Details Table */}
          <div className="overflow-x-auto mt-4 pt-4 border-t border-gray-200">
            <Table className="min-w-full divide-y divide-gray-200 text-sm">
              <TableHeader>
                <TableRow className="text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  <TableHead className="px-6 py-3 text-right">رمز الحساب</TableHead>
                  <TableHead className="px-6 py-3 text-right">اسم الحساب</TableHead>
                  <TableHead className="px-6 py-3 text-right">البيان</TableHead>
                  <TableHead className="px-6 py-3 text-right">مدين</TableHead>
                  <TableHead className="px-6 py-3 text-right">دائن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white divide-y divide-gray-200">
                {entry.journal_entry_lines?.map((line, index) => (
                  <TableRow key={line.id || index} className="hover:bg-gray-50">
                    <TableCell className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono">
                      {line.chart_of_accounts?.account_code || '-'}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-gray-900">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {line.chart_of_accounts?.account_name_ar || line.chart_of_accounts?.account_name || '-'}
                        </div>
                        {line.chart_of_accounts?.account_name_ar && line.chart_of_accounts?.account_name && (
                          <div className="text-xs text-muted-foreground">
                            {line.chart_of_accounts.account_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-600">
                      {line.line_description || entry.description || '-'}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-green-600 font-semibold">
                      {(line.debit_amount || 0) > 0 ? formatCurrency(line.debit_amount || 0, { minimumFractionDigits: 3 }) : '-'}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-red-600 font-semibold">
                      {(line.credit_amount || 0) > 0 ? formatCurrency(line.credit_amount || 0, { minimumFractionDigits: 3 }) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Totals Row */}
                <TableRow className="bg-indigo-50 font-bold">
                  <TableCell className="px-6 py-3 text-base text-gray-800" colSpan={3}>
                    المجموع
                  </TableCell>
                  <TableCell className="px-6 py-3 whitespace-nowrap text-green-700 text-base">
                    {formatCurrency(entry.total_debit, { minimumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell className="px-6 py-3 whitespace-nowrap text-red-700 text-base">
                    {formatCurrency(entry.total_credit, { minimumFractionDigits: 3 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" className="text-sm text-blue-500 hover:underline">
              معاينة عكس القيد
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
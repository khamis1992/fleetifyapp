import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BarChart3,
  LineChart as LineChartIcon 
} from "lucide-react";
import { useEnhancedFinancialReports } from "@/hooks/useEnhancedFinancialReports";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { buildIncomeStatementReport } from "@/utils/standardFinancialReportRules";
import {
  exportOfficialFinancialReportToExcel,
  type OfficialFinancialReportExportPayload,
} from "@/utils/officialFinancialReportExport";
import { exportArabicReportPdf, formatPdfMoney, type PdfAlign } from "@/utils/arabicReportPdf";

import { useFleetifyTranslation } from "@/hooks/useTranslation";

export function IncomeStatementReport() {
  const { t } = useFleetifyTranslation("ui");
  const [viewMode, setViewMode] = useState<'single' | 'comparative'>('single');
  const [startDate, setStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { formatCurrency } = useCurrencyFormatter();
  const { user } = useAuth();
  const { data: company } = useCurrentCompany();

  // Fetch main period data
  const { data: reportData, isLoading, error } = useEnhancedFinancialReports(
    'income_statement',
    startDate,
    endDate
  );

  // Calculate comparative periods (last 6 months)
  const periods = [];
  for (let i = 0; i < 6; i++) {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date).toISOString().split('T')[0];
    const end = endOfMonth(date).toISOString().split('T')[0];
    periods.push({
      month: format(date, 'MMMM yyyy', { locale: ar }),
      startDate: start,
      endDate: end
    });
  }
  periods.reverse();

  // The six hooks are intentionally explicit so their order is stable across renders.
  const period0 = useEnhancedFinancialReports('income_statement', periods[0].startDate, periods[0].endDate);
  const period1 = useEnhancedFinancialReports('income_statement', periods[1].startDate, periods[1].endDate);
  const period2 = useEnhancedFinancialReports('income_statement', periods[2].startDate, periods[2].endDate);
  const period3 = useEnhancedFinancialReports('income_statement', periods[3].startDate, periods[3].endDate);
  const period4 = useEnhancedFinancialReports('income_statement', periods[4].startDate, periods[4].endDate);
  const period5 = useEnhancedFinancialReports('income_statement', periods[5].startDate, periods[5].endDate);
  const comparativeResults = [period0, period1, period2, period3, period4, period5];
  const periodsData = periods.map((period, index) => ({
    ...period,
    data: comparativeResults[index].data,
  }));

  // Calculate totals
  const totalRevenue = reportData?.totalCredits || 0;
  const totalExpenses = reportData?.totalDebits || 0;
  const netIncome = reportData?.netIncome || 0;
  const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : 0;

  // Prepare chart data
  const chartData = periodsData.map((period) => ({
    month: period.month,
    revenue: period.data?.totalCredits || 0,
    expenses: period.data?.totalDebits || 0,
    netIncome: period.data?.netIncome || 0
  }));

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || !reportData.sections || reportData.sections.length === 0) {
      toast.error("Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Main Report Sheet
      const revenueData = reportData.sections[0]?.accounts?.map(acc => ({
        'Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨': acc.accountCode,
        'Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨': acc.accountNameAr || acc.accountName,
        'Ø§Ù„Ù…Ø¨Ù„Øº': Number(acc.balance)
      })) || [];

      const expenseData = reportData.sections[1]?.accounts?.map(acc => ({
        'Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨': acc.accountCode,
        'Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨': acc.accountNameAr || acc.accountName,
        'Ø§Ù„Ù…Ø¨Ù„Øº': Number(acc.balance)
      })) || [];

      // Add summary rows
      revenueData.push({
        'Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨': '',
        'Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨': 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª',
        'Ø§Ù„Ù…Ø¨Ù„Øº': totalRevenue
      });

      const combinedData = [
        ...revenueData,
        { 'Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨': '', 'Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨': '', 'Ø§Ù„Ù…Ø¨Ù„Øº': '' },
        ...expenseData,
        {
          'Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨': '',
          'Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨': 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª',
          'Ø§Ù„Ù…Ø¨Ù„Øº': totalExpenses
        },
        { 'Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨': '', 'Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨': '', 'Ø§Ù„Ù…Ø¨Ù„Øº': '' },
        {
          'Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨': '',
          'Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨': 'ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„',
          'Ø§Ù„Ù…Ø¨Ù„Øº': netIncome
        }
      ];

      const ws = XLSX.utils.json_to_sheet(combinedData);
      ws['!cols'] = [
        { wch: 15 },
        { wch: 40 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„');

      // Comparative Analysis Sheet (if available)
      if (viewMode === 'comparative' && chartData.length > 0) {
        const compData = chartData.map(item => ({
          'Ø§Ù„Ø´Ù‡Ø±': item.month,
          'Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª': item.revenue,
          'Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª': item.expenses,
          'ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„': item.netIncome
        }));
        const wsComp = XLSX.utils.json_to_sheet(compData);
        XLSX.utils.book_append_sheet(wb, wsComp, 'Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…Ù‚Ø§Ø±Ù†');
      }

      // Metadata Sheet
      const metadata = XLSX.utils.aoa_to_sheet([
        ['Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„ - Income Statement'],
        ['Ù…Ù† ØªØ§Ø±ÙŠØ®:', startDate || 'Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø³Ù†Ø©'],
        ['Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ®:', endDate],
        ['ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥ØµØ¯Ø§Ø±:', new Date().toLocaleDateString('ar-EG')],
        [''],
        ['Ø§Ù„Ù…Ù„Ø®Øµ Ø§Ù„Ù…Ø§Ù„ÙŠ'],
        ['Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª:', totalRevenue],
        ['Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª:', totalExpenses],
        ['ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„:', netIncome],
        ['Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­:', `${profitMargin.toFixed(2)}%`]
      ]);
      XLSX.utils.book_append_sheet(wb, metadata, 'Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªÙ‚Ø±ÙŠØ±');

      const fileName = `income_statement_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("ØªÙ… ØªØµØ¯ÙŠØ± Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø¨Ù†Ø¬Ø§Ø­");
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error("Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØµØ¯ÙŠØ± Ø§Ù„ØªÙ‚Ø±ÙŠØ±");
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!reportData || !reportData.sections || reportData.sections.length === 0) {
      toast.error("\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631");
      return;
    }

    const revenueAccounts = reportData.sections[0]?.accounts || [];
    const expenseAccounts = reportData.sections[1]?.accounts || [];
    const sourceReport = buildIncomeStatementReport([
      ...revenueAccounts.map((acc: any) => ({
        accountCode: acc.accountCode,
        accountName: acc.accountNameAr || acc.accountName,
        accountType: "revenue",
        debit: 0,
        credit: Number(acc.balance || 0),
      })),
      ...expenseAccounts.map((acc: any) => ({
        accountCode: acc.accountCode,
        accountName: acc.accountNameAr || acc.accountName,
        accountType: "expense",
        debit: Number(acc.balance || 0),
        credit: 0,
      })),
    ]);

    const payload: OfficialFinancialReportExportPayload = {
      metadata: {
        reportTitle: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062f\u062e\u0644",
        reportType: "income_statement",
        companyName: company?.name || "Fleetify",
        companyNameAr: company?.name_ar || company?.name || undefined,
        companyNameEn: company?.name || undefined,
        commercialRegister: company?.commercial_register || undefined,
        companyAddressAr: company?.address_ar || company?.address || undefined,
        companyAddressEn: company?.address || undefined,
        preparedByName: user?.email || undefined,
        periodStart: startDate || undefined,
        periodEnd: endDate,
        currency: company?.currency || "QAR",
        exportedAt: new Date().toISOString(),
        status: "published",
        sourceFingerprint: sourceReport.sourceFingerprint,
        reportHash: sourceReport.sourceFingerprint,
      },
      columns: [
        { key: "section", header: "\u0627\u0644\u0628\u0646\u062f", width: 18 },
        { key: "accountCode", header: "\u0631\u0645\u0632 \u0627\u0644\u062d\u0633\u0627\u0628", width: 18 },
        { key: "accountName", header: "\u0627\u0633\u0645 \u0627\u0644\u062d\u0633\u0627\u0628", width: 42 },
        { key: "amount", header: "\u0627\u0644\u0645\u0628\u0644\u063a", type: "money", width: 18 },
      ],
      rows: [
        ...revenueAccounts.map((acc: any) => ({
          section: "\u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a",
          accountCode: acc.accountCode,
          accountName: acc.accountNameAr || acc.accountName,
          amount: Number(acc.balance || 0),
        })),
        ...expenseAccounts.map((acc: any) => ({
          section: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a",
          accountCode: acc.accountCode,
          accountName: acc.accountNameAr || acc.accountName,
          amount: Number(acc.balance || 0),
        })),
      ],
      summaryRows: [
        { section: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a", accountCode: "", accountName: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a", amount: totalRevenue },
        { section: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a", accountCode: "", accountName: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a", amount: totalExpenses },
        { section: "\u0627\u0644\u0646\u062a\u064a\u062c\u0629", accountCode: "", accountName: "\u0635\u0627\u0641\u064a \u0627\u0644\u062f\u062e\u0644", amount: netIncome },
        { section: "\u0627\u0644\u0646\u0633\u0628\u0629", accountCode: "", accountName: "\u0647\u0627\u0645\u0634 \u0627\u0644\u0631\u0628\u062d", amount: `${profitMargin.toFixed(2)}%` },
      ],
    };

    try {
      await exportArabicReportPdf(
        {
          metadata: {
            reportTitle: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„",
            companyAr: company?.name_ar || company?.name || "Ø´Ø±ÙƒØ© Ø§Ù„Ø¹Ø±Ø§Ù Ù„ØªØ£Ø¬ÙŠØ± Ø§Ù„Ø³ÙŠØ§Ø±Ø§Øª Ø°.Ù….Ù…",
            companyEn: company?.name || "Alaraf Car Rental LLC",
            commercialRegister: company?.commercial_register || "146832",
            addressAr: company?.address_ar || company?.address || "Ø§Ù„Ø¯ÙˆØ­Ø© - Ø¯ÙˆÙ„Ø© Ù‚Ø·Ø±",
            currency: company?.currency || "QAR",
            periodStart: startDate || null,
            periodEnd: endDate,
            status: "Ù†Ø´Ø±",
            sourceFingerprint: sourceReport.sourceFingerprint,
            preparedBy: user?.email,
            exportedAt: new Date().toISOString(),
          },
          sections: [
            {
              title: "Ø£ÙˆÙ„Ø§Ù‹: Ø¨Ù†ÙˆØ¯ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„",
              table: {
                header: {
                  cells: ["Ø§Ù„Ø¨Ù†Ø¯", "Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨", "Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨", "Ø§Ù„Ù…Ø¨Ù„Øº"],
                  widths: [16, 16, 48, 20],
                  aligns: ["right", "right", "right", "left"],
                },
                rows: [
                  ...revenueAccounts.map((acc: any) => ({
                    cells: [
                      "Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª",
                      acc.accountCode,
                      acc.accountNameAr || acc.accountName,
                      formatPdfMoney(Number(acc.balance || 0)),
                    ],
                    widths: [16, 16, 48, 20],
                    aligns: ["right", "right", "right", "left"] as PdfAlign[],
                  })),
                  ...expenseAccounts.map((acc: any) => ({
                    cells: [
                      "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª",
                      acc.accountCode,
                      acc.accountNameAr || acc.accountName,
                      formatPdfMoney(Number(acc.balance || 0)),
                    ],
                    widths: [16, 16, 48, 20],
                    aligns: ["right", "right", "right", "left"] as PdfAlign[],
                  })),
                ],
                summaryRows: [
                  {
                    cells: ["", "", "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª", formatPdfMoney(totalRevenue)],
                    widths: [16, 16, 48, 20],
                    aligns: ["right", "right", "right", "left"] as PdfAlign[],
                  },
                  {
                    cells: ["", "", "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª", formatPdfMoney(totalExpenses)],
                    widths: [16, 16, 48, 20],
                    aligns: ["right", "right", "right", "left"] as PdfAlign[],
                  },
                  {
                    cells: ["", "", "ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„", formatPdfMoney(netIncome)],
                    widths: [16, 16, 48, 20],
                    aligns: ["right", "right", "right", "left"] as PdfAlign[],
                  },
                  {
                    cells: ["", "", "Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­", `${profitMargin.toFixed(2)}%`],
                    widths: [16, 16, 48, 20],
                    aligns: ["right", "right", "right", "left"] as PdfAlign[],
                  },
                ],
              },
            },
            {
              title: "Ø«Ø§Ù†ÙŠØ§Ù‹: Ø£Ø³Ø§Ø³ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯",
              paragraphs: [
                "ØªØ¹Ø±Ø¶ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ÙˆØ§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø®Ù„Ø§Ù„ Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© Ø£Ø¹Ù„Ø§Ù‡.",
                "Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¯Ø§Ø®Ù„ Ø§Ù„Ø´Ø±ÙƒØ© Ù„Ø§ ÙŠÙ…Ø«Ù„ Ø±Ø£ÙŠ ØªØ¯Ù‚ÙŠÙ‚ Ø£Ùˆ ØªØµØ¯ÙŠÙ‚Ø§Ù‹ Ù…Ù† Ù…Ø­Ø§Ø³Ø¨ Ù‚Ø§Ù†ÙˆÙ†ÙŠ Ø®Ø§Ø±Ø¬ÙŠ.",
              ],
            },
          ],
          footerNote: `Ø£ÙØ¹Ø¯ Ø¨ÙˆØ§Ø³Ø·Ø©: ${user?.email || "â€”"} â€” ÙˆÙ‚Øª Ø§Ù„Ø¥ØµØ¯Ø§Ø±: ${new Date().toLocaleString("ar-QA")}`,
        },
        `income_statement_${endDate}_${sourceReport.sourceFingerprint.slice(0, 8)}.pdf`,
      );
      toast.success("ØªÙ… ØªØµØ¯ÙŠØ± Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„ Ø¨ØµÙŠØºØ© PDF Ù†ØµÙŠØ© Ø±Ø³Ù…ÙŠØ©");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("ØªØ¹Ø°Ø± ØªØµØ¯ÙŠØ± Ù…Ù„Ù PDF");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData || !reportData.sections || reportData.sections.length === 0) {
      toast.error("Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±");
      return;
    }

    try {
      let csvContent = 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„ - Income Statement\n';
      csvContent += `Ù…Ù† ØªØ§Ø±ÙŠØ® - From,${startDate || 'Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø³Ù†Ø©'}\n`;
      csvContent += `Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ® - To,${endDate}\n`;
      csvContent += `ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥ØµØ¯Ø§Ø± - Generated,${new Date().toLocaleDateString('ar-EG')}\n\n`;

      csvContent += 'Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª - Revenue\n';
      csvContent += 'Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨,Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨,Ø§Ù„Ù…Ø¨Ù„Øº\n';
      reportData.sections[0]?.accounts?.forEach(acc => {
        csvContent += `${acc.accountCode},${acc.accountNameAr || acc.accountName},${acc.balance}\n`;
      });
      csvContent += `,,Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª,${totalRevenue}\n\n`;

      csvContent += 'Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª - Expenses\n';
      csvContent += 'Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨,Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨,Ø§Ù„Ù…Ø¨Ù„Øº\n';
      reportData.sections[1]?.accounts?.forEach(acc => {
        csvContent += `${acc.accountCode},${acc.accountNameAr || acc.accountName},${acc.balance}\n`;
      });
      csvContent += `,,Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª,${totalExpenses}\n\n`;

      csvContent += `,,ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„ - Net Income,${netIncome}\n`;
      csvContent += `,,Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­ - Profit Margin,${profitMargin.toFixed(2)}%\n`;

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `income_statement_${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("ØªÙ… ØªØµØ¯ÙŠØ± Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø¨Ù†Ø¬Ø§Ø­");
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error("Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØµØ¯ÙŠØ± Ø§Ù„ØªÙ‚Ø±ÙŠØ±");
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <TrendingDown className="h-5 w-5" />
            <p>Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„
              </CardTitle>
              <CardDescription>
                Ø¹Ø±Ø¶ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ÙˆØ§Ù„Ù…ØµØ±ÙˆÙØ§Øª ÙˆØµØ§ÙÙŠ Ø§Ù„Ø±Ø¨Ø­ Ù„Ù„ÙØªØ±Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportPDF}
                variant="outline"
                size="sm"
                disabled={isLoading || !reportData}
                title={isLoading ? 'Ø¬Ø§Ø±Ù ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙØªØ±Ø©â€¦' : reportData ? '' : 'Ø­Ø¯Ø¯ ÙØªØ±Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø£ÙˆÙ„Ø§Ù‹ Ù„ØªØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„ØªØµØ¯ÙŠØ±'}
              >
                <Download className="h-4 w-4 mr-2" />{t("pdf")}</Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                disabled={isLoading || !reportData}
                title={isLoading ? 'Ø¬Ø§Ø±Ù ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙØªØ±Ø©â€¦' : reportData ? '' : 'Ø­Ø¯Ø¯ ÙØªØ±Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø£ÙˆÙ„Ø§Ù‹ Ù„ØªØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„ØªØµØ¯ÙŠØ±'}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />{t("excel")}</Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                disabled={isLoading || !reportData}
                title={isLoading ? 'Ø¬Ø§Ø±Ù ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙØªØ±Ø©â€¦' : reportData ? '' : 'Ø­Ø¯Ø¯ ÙØªØ±Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø£ÙˆÙ„Ø§Ù‹ Ù„ØªØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„ØªØµØ¯ÙŠØ±'}
              >
                <FileText className="h-4 w-4 mr-2" />{t("csv")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Ù…Ù† ØªØ§Ø±ÙŠØ®</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="endDate">Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ®</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø±Ø¶</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={viewMode === 'single' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('single')}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    ÙØªØ±Ø© ÙˆØ§Ø­Ø¯Ø©
                  </Button>
                  <Button
                    variant={viewMode === 'comparative' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('comparative')}
                    className="flex-1"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Ù…Ù‚Ø§Ø±Ù†
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="statement" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="statement">Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„</TabsTrigger>
                <TabsTrigger value="analysis">Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†ÙŠ</TabsTrigger>
              </TabsList>

              {/* Income Statement Tab */}
              <TabsContent value="statement" className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                  </div>
                ) : reportData && reportData.sections && reportData.sections.length > 0 ? (
                  <div>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</p>
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalRevenue)}
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</p>
                              <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalExpenses)}
                              </p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„</p>
                              <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(netIncome)}
                              </p>
                            </div>
                            <Badge variant={netIncome >= 0 ? "default" : "destructive"}>
                              {netIncome >= 0 ? 'Ø±Ø¨Ø­' : 'Ø®Ø³Ø§Ø±Ø©'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­</p>
                              <p className="text-2xl font-bold">
                                {profitMargin.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="w-[120px]">Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨</TableHead>
                            <TableHead>Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨</TableHead>
                            <TableHead className="text-right">Ø§Ù„Ù…Ø¨Ù„Øº</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Revenue Section */}
                          <TableRow className="bg-green-50">
                            <TableCell colSpan={3} className="font-bold text-green-700">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª
                              </div>
                            </TableCell>
                          </TableRow>
                          {reportData.sections[0]?.accounts?.map((account, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{account.accountCode}</TableCell>
                              <TableCell>{account.accountNameAr || account.accountName}</TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {formatCurrency(Number(account.balance))}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-green-100 font-bold">
                            <TableCell colSpan={2}>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</TableCell>
                            <TableCell className="text-right text-green-700">
                              {formatCurrency(totalRevenue)}
                            </TableCell>
                          </TableRow>

                          {/* Spacer */}
                          <TableRow>
                            <TableCell colSpan={3} className="h-4"></TableCell>
                          </TableRow>

                          {/* Expenses Section */}
                          <TableRow className="bg-red-50">
                            <TableCell colSpan={3} className="font-bold text-red-700">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" />
                                Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª
                              </div>
                            </TableCell>
                          </TableRow>
                          {reportData.sections[1]?.accounts?.map((account, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{account.accountCode}</TableCell>
                              <TableCell>{account.accountNameAr || account.accountName}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                {formatCurrency(Number(account.balance))}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-red-100 font-bold">
                            <TableCell colSpan={2}>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</TableCell>
                            <TableCell className="text-right text-red-700">
                              {formatCurrency(totalExpenses)}
                            </TableCell>
                          </TableRow>

                          {/* Net Income */}
                          <TableRow className={`${netIncome >= 0 ? 'bg-blue-100' : 'bg-red-200'} font-bold text-lg`}>
                            <TableCell colSpan={2} className="py-6">
                              ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„
                            </TableCell>
                            <TableCell className={`text-right py-6 ${netIncome >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                              {formatCurrency(netIncome)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <FileText className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ø¹Ø±Ø¶Ù‡Ø§</p>
                    <p className="text-sm">Ù‚Ù… Ø¨Ø¥Ù†Ø´Ø§Ø¡ Ù‚ÙŠÙˆØ¯ Ù…Ø­Ø§Ø³Ø¨ÙŠØ© Ù„Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ÙˆØ§Ù„Ù…ØµØ±ÙˆÙØ§Øª</p>
                  </div>
                )}
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-4">
                {chartData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Revenue vs Expenses Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Ù…Ù‚Ø§Ø±Ù†Ø© Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ÙˆØ§Ù„Ù…ØµØ±ÙˆÙØ§Øª (6 Ø£Ø´Ù‡Ø±)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                            <Bar dataKey="revenue" name="Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª" fill="#22c55e" />
                            <Bar dataKey="expenses" name="Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª" fill="#ef4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Net Income Trend */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <LineChartIcon className="h-5 w-5" />
                          Ø§ØªØ¬Ø§Ù‡ ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„ (6 Ø£Ø´Ù‡Ø±)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="netIncome" 
                              name="ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Monthly Comparison Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ù…Ù‚Ø§Ø±Ù† Ø§Ù„Ø´Ù‡Ø±ÙŠ</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ø§Ù„Ø´Ù‡Ø±</TableHead>
                              <TableHead className="text-right">Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</TableHead>
                              <TableHead className="text-right">Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</TableHead>
                              <TableHead className="text-right">ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„</TableHead>
                              <TableHead className="text-right">Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {periodsData.map((period, index) => {
                              const revenue = period.data?.totalCredits || 0;
                              const expenses = period.data?.totalDebits || 0;
                              const net = period.data?.netIncome || 0;
                              const margin = revenue > 0 ? ((net / revenue) * 100) : 0;
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{period.month}</TableCell>
                                  <TableCell className="text-right text-green-600">
                                    {formatCurrency(revenue)}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600">
                                    {formatCurrency(expenses)}
                                  </TableCell>
                                  <TableCell className={`text-right font-semibold ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {formatCurrency(net)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={margin >= 0 ? "default" : "destructive"}>
                                      {margin.toFixed(2)}%
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <LineChartIcon className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ØªØ­Ù„ÙŠÙ„</p>
                    <p className="text-sm">Ø£Ø¶Ù Ø§Ù„Ù…Ø²ÙŠØ¯ Ù…Ù† Ø§Ù„Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠØ© Ù„Ø±Ø¤ÙŠØ© Ø§Ù„Ø§ØªØ¬Ø§Ù‡Ø§Øª</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


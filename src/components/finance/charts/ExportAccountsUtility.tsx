import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  FileText, 
  Image, 
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { useToast } from '@/hooks/use-toast';

interface ExportAccountsUtilityProps {
  accounts: ChartOfAccount[];
  expandedNodes: Set<string>;
  searchTerm: string;
  filterType: string;
}

export const ExportAccountsUtility: React.FC<ExportAccountsUtilityProps> = ({
  accounts,
  expandedNodes,
  searchTerm,
  filterType
}) => {
  const { toast } = useToast();
  
  const exportToPDF = async () => {
    try {
      // Dynamic import to avoid bundling jsPDF if not used
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const element = document.createElement('div');
      element.innerHTML = generateHTMLReport();
      element.style.direction = 'rtl';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      document.body.appendChild(element);

      try {
        // Convert to canvas
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        // Get image data
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        // Create PDF
        const doc = new jsPDF({
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        });

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = 297; // A4 height in mm

        let heightLeft = imgHeight;
        let position = 0;

        // Add image to PDF
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Save PDF
        doc.save(`chart-of-accounts-${new Date().toISOString().split('T')[0]}.pdf`);

        toast({
          title: "تم التصدير بنجاح",
          description: "تم تصدير دليل الحسابات إلى ملف PDF",
        });
      } finally {
        // Clean up
        document.body.removeChild(element);
      }
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير الملف",
        variant: "destructive",
      });
    }
  };
  
  const exportToCSV = () => {
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chart-of-accounts-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "تم التصدير بنجاح",
      description: "تم تصدير دليل الحسابات إلى ملف CSV",
    });
  };
  
  const exportToJSON = () => {
    const jsonContent = JSON.stringify(accounts, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chart-of-accounts-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "تم التصدير بنجاح",
      description: "تم تصدير دليل الحسابات إلى ملف JSON",
    });
  };
  
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>دليل الحسابات</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .header { text-align: center; margin-bottom: 30px; }
              .account-level-0 { font-weight: bold; background-color: #f8f9fa; }
              .account-level-1 { padding-right: 20px; }
              .account-level-2 { padding-right: 40px; }
              .account-level-3 { padding-right: 60px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${generateHTMLReport()}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast({
      title: "تم فتح نافذة الطباعة",
      description: "يمكنك الآن طباعة التقرير",
    });
  };
  
  const generateHTMLReport = () => {
    const filteredAccounts = accounts.filter(account => {
      const matchesSearch = !searchTerm || 
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.account_name_ar && account.account_name_ar.includes(searchTerm));
      
      const matchesType = filterType === 'all' || account.account_type === filterType;
      
      return matchesSearch && matchesType;
    });
    
    const buildHierarchy = (parentId: string | null = null, level: number = 0): any[] => {
      return filteredAccounts
        .filter(account => account.parent_account_id === parentId)
        .map(account => ({
          ...account,
          level,
          children: buildHierarchy(account.id, level + 1),
        }))
        .sort((a, b) => a.account_code.localeCompare(b.account_code));
    };
    
    const hierarchy = buildHierarchy();
    
    const renderAccountRow = (account: any): string => {
      const indent = '&nbsp;'.repeat(account.level * 4);
      const balanceDisplay = account.is_header ? '' : account.current_balance.toLocaleString('ar');
      const statusBadges = [
        account.is_system ? 'نظامي' : '',
        !account.is_active ? 'غير نشط' : '',
        account.is_header ? 'رئيسي' : ''
      ].filter(Boolean).join(', ');
      
      let rows = `
        <tr class="account-level-${account.level}">
          <td>${account.account_code}</td>
          <td>${indent}${account.account_name_ar || account.account_name}</td>
          <td>${getAccountTypeLabel(account.account_type)}</td>
          <td>${account.account_level}</td>
          <td>${balanceDisplay}</td>
          <td>${statusBadges}</td>
        </tr>
      `;
      
      account.children.forEach((child: any) => {
        rows += renderAccountRow(child);
      });
      
      return rows;
    };
    
    const accountRows = hierarchy.map(account => renderAccountRow(account)).join('');
    
    return `
      <div class="header">
        <h1>دليل الحسابات</h1>
        <p>تاريخ التصدير: ${new Date().toLocaleDateString('ar')}</p>
        ${searchTerm ? `<p>البحث: ${searchTerm}</p>` : ''}
        ${filterType !== 'all' ? `<p>المرشح: ${getAccountTypeLabel(filterType)}</p>` : ''}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>رمز الحساب</th>
            <th>اسم الحساب</th>
            <th>نوع الحساب</th>
            <th>المستوى</th>
            <th>الرصيد الحالي</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${accountRows}
        </tbody>
      </table>
      
      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
        <p>تم إنشاء هذا التقرير بواسطة نظام دليل الحسابات</p>
      </div>
    `;
  };
  
  const generateCSVContent = () => {
    const headers = [
      'رمز الحساب',
      'اسم الحساب بالعربية',
      'اسم الحساب بالإنجليزية',
      'نوع الحساب',
      'المستوى',
      'الحساب الرئيسي',
      'الرصيد الحالي',
      'رئيسي',
      'نشط',
      'نظامي',
      'تاريخ الإنشاء'
    ];
    
    const rows = accounts.map(account => [
      account.account_code,
      account.account_name_ar || '',
      account.account_name,
      getAccountTypeLabel(account.account_type),
      account.account_level,
      account.parent_account_id || '',
      account.current_balance,
      account.is_header ? 'نعم' : 'لا',
      account.is_active ? 'نعم' : 'لا',
      account.is_system ? 'نعم' : 'لا',
      new Date(account.created_at).toLocaleDateString('ar')
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  };
  
  const getAccountTypeLabel = (type: string) => {
    const labels = {
      assets: 'أصول',
      liabilities: 'خصوم',
      equity: 'حقوق ملكية',
      revenue: 'إيرادات',
      expenses: 'مصروفات',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm" dir="rtl">
          <Download className="h-4 w-4" />
          تصدير وطباعة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3" dir="rtl">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            className="flex items-center gap-2 text-xs"
          >
            <FileText className="h-3 w-3" />
            PDF
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="flex items-center gap-2 text-xs"
          >
            <FileSpreadsheet className="h-3 w-3" />
            CSV
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToJSON}
            className="flex items-center gap-2 text-xs"
          >
            <FileText className="h-3 w-3" />
            JSON
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={printReport}
            className="flex items-center gap-2 text-xs"
          >
            <Printer className="h-3 w-3" />
            طباعة
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          سيتم تصدير الحسابات حسب الفلاتر المطبقة حالياً
        </div>
      </CardContent>
    </Card>
  );
};
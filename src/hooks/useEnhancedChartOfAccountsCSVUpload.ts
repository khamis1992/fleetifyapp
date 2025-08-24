import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess"
import Papa from "papaparse"

interface HierarchyError {
  accountCode: string;
  message: string;
  rowNumber: number;
}

interface ProcessedAccountData {
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  account_subtype?: string;
  balance_type: string;
  parent_account_code?: string;
  parent_account_id?: string;
  account_level?: number;
  is_header?: boolean;
  description?: string;
  _rowNumber?: number;
}

interface EnhancedCSVUploadResults {
  total: number;
  successful: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; message: string; account_code?: string }>;
  hierarchyErrors: HierarchyError[];
}

export function useEnhancedChartOfAccountsCSVUpload() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const companyId = useCurrentCompanyId()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<EnhancedCSVUploadResults | null>(null)
  const [processedData, setProcessedData] = useState<ProcessedAccountData[]>([])
  const [hierarchyErrors, setHierarchyErrors] = useState<HierarchyError[]>([])

  /**
   * تحليل البيانات وإنشاء التسلسل الهرمي تلقائياً
   */
  const processHierarchy = (rawData: any[]): { 
    processedData: ProcessedAccountData[], 
    hierarchyErrors: HierarchyError[] 
  } => {
    console.log('🔍 [HIERARCHY] Processing hierarchy for', rawData.length, 'accounts');
    
    const processed: ProcessedAccountData[] = [];
    const errors: HierarchyError[] = [];
    const accountMap = new Map<string, ProcessedAccountData>();

    // تطبيع البيانات أولاً
    rawData.forEach((row, index) => {
      const accountCode = (row['رقم الحساب'] || row['account_code'] || '').toString().trim();
      const accountName = row['الوصف بالإنجليزي'] || row['account_name'] || '';
      const accountNameAr = row['الوصف'] || row['account_name_ar'] || '';
      const level = parseInt(row['المستوى'] || row['account_level'] || '1');
      
      if (!accountCode) {
        errors.push({
          accountCode: '',
          message: 'رقم الحساب مطلوب',
          rowNumber: row._rowNumber || index + 2
        });
        return;
      }

      if (!accountName && !accountNameAr) {
        errors.push({
          accountCode,
          message: 'اسم الحساب مطلوب',
          rowNumber: row._rowNumber || index + 2
        });
        return;
      }

      // تحديد نوع الحساب تلقائياً بناءً على رقم الحساب
      let accountType = 'assets';
      let balanceType = 'debit';
      
      const firstDigit = accountCode.charAt(0);
      switch (firstDigit) {
        case '1':
          accountType = 'assets';
          balanceType = 'debit';
          break;
        case '2':
          accountType = 'liabilities';
          balanceType = 'credit';
          break;
        case '3':
          accountType = 'equity';
          balanceType = 'credit';
          break;
        case '4':
          accountType = 'revenue';
          balanceType = 'credit';
          break;
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          accountType = 'expenses';
          balanceType = 'debit';
          break;
      }

      const processedAccount: ProcessedAccountData = {
        account_code: accountCode,
        account_name: accountName || accountNameAr,
        account_name_ar: accountNameAr || accountName,
        account_type: accountType,
        balance_type: balanceType,
        account_level: level,
        is_header: level <= 3, // الحسابات من المستوى 1-3 تعتبر رئيسية
        description: `${accountNameAr || accountName} - ${accountName || accountNameAr}`,
        _rowNumber: row._rowNumber || index + 2
      };

      processed.push(processedAccount);
      accountMap.set(accountCode, processedAccount);
    });

    // ترتيب الحسابات حسب رقم الحساب
    processed.sort((a, b) => {
      const aNum = parseFloat(a.account_code) || 0;
      const bNum = parseFloat(b.account_code) || 0;
      return aNum - bNum;
    });

    // إنشاء العلاقات الهرمية
    /**
     * البحث عن الحساب الأب بناءً على المستوى ورقم الحساب
     */
    const findParentAccount = (account: ProcessedAccountData, accountMap: Map<string, ProcessedAccountData>): string => {
      const { account_code, account_level } = account;
      
      if (!account_level || account_level <= 1) {
        return ''; // الحسابات من المستوى 1 ليس لها آباء
      }
      
      const targetParentLevel = account_level - 1;
      let bestParent = '';
      let bestParentLength = 0;
      
      console.log(`🔍 [HIERARCHY] Looking for parent of ${account_code} (level ${account_level}), target parent level: ${targetParentLevel}`);
      
      // ابحث عن جميع الحسابات المحتملة كآباء
      for (const [parentCode, parentAccount] of accountMap) {
        // يجب أن يكون الأب بمستوى أقل بـ 1
        if (parentAccount.account_level !== targetParentLevel) continue;
        
        // يجب أن يكون رقم الحساب الأب بداية رقم الحساب الفرعي
        if (!account_code.startsWith(parentCode)) continue;
        
        // اختر الأب الأطول (الأكثر تحديداً)
        if (parentCode.length > bestParentLength) {
          bestParent = parentCode;
          bestParentLength = parentCode.length;
          console.log(`🔍 [HIERARCHY] Found potential parent ${parentCode} (level ${parentAccount.account_level}) for ${account_code}`);
        }
      }
      
      return bestParent;
    };

    // إنشاء العلاقات الهرمية - المنطق المحسن
    processed.forEach(account => {
      const parentCode = findParentAccount(account, accountMap);
      
      if (parentCode) {
        account.parent_account_code = parentCode;
        console.log(`✅ [HIERARCHY] Successfully linked ${account.account_code} to parent ${parentCode}`);
      } else if (account.account_level && account.account_level > 1) {
        // إذا لم يتم العثور على الأب المطلوب
        errors.push({
          accountCode: account.account_code,
          message: `لم يتم العثور على الحساب الأب للمستوى ${account.account_level - 1}`,
          rowNumber: account._rowNumber || 0
        });
        console.warn(`❌ [HIERARCHY] Missing parent for ${account.account_code} (level ${account.account_level})`);
      }
    });

    console.log('🔍 [HIERARCHY] Processing complete:', {
      processed: processed.length,
      errors: errors.length
    });

    return { processedData: processed, hierarchyErrors: errors };
  };

  /**
   * معالجة البيانات المستوردة من CSV
   */
  const processCSVData = (rawData: any[]): { 
    data: ProcessedAccountData[], 
    hierarchyErrors: HierarchyError[] 
  } => {
    console.log('🔍 [CSV_PROCESS] Starting data processing...');
    
    if (!rawData || rawData.length === 0) {
      throw new Error('لا توجد بيانات للمعالجة');
    }

    // Filter out empty rows
    const validData = rawData.filter((row: any) => {
      const accountCode = (row['رقم الحساب'] || row['account_code'] || '').toString().trim();
      return accountCode !== '';
    });

    if (validData.length === 0) {
      throw new Error('لم يتم العثور على بيانات صالحة في الملف');
    }

    // Process hierarchy
    const { processedData, hierarchyErrors } = processHierarchy(validData);
    
    setProcessedData(processedData);
    setHierarchyErrors(hierarchyErrors);

    return { data: processedData, hierarchyErrors };
  };

  /**
   * معالجة ملف CSV
   */
  const processCSVFile = async (file: File): Promise<{ 
    data: ProcessedAccountData[], 
    hierarchyErrors: HierarchyError[] 
  }> => {
    console.log('🔍 [CSV_PROCESS] Starting file processing...');
    
    const text = await file.text();
    
    // Parse CSV using Papa Parse
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim()
    });

    if (parseResult.errors.length > 0) {
      console.warn('🔍 [CSV_PROCESS] Parse warnings:', parseResult.errors);
    }

    if (!parseResult.data || parseResult.data.length === 0) {
      throw new Error('الملف فارغ أو لا يحتوي على بيانات صالحة');
    }

    // Add row numbers
    const dataWithRowNumbers = parseResult.data.map((row: any, index: number) => ({
      ...row,
      _rowNumber: index + 2 // Account for header row
    }));

    return processCSVData(dataWithRowNumbers);
  };

  /**
   * التحقق من صحة بيانات الحساب
   */
  const validateAccountData = (data: ProcessedAccountData): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.account_code) {
      errors.push('رقم الحساب مطلوب');
    }

    if (!data.account_name && !data.account_name_ar) {
      errors.push('اسم الحساب مطلوب');
    }

    if (!data.account_type) {
      errors.push('نوع الحساب مطلوب');
    } else {
      const validTypes = ['assets', 'liabilities', 'equity', 'revenue', 'expenses'];
      if (!validTypes.includes(data.account_type)) {
        errors.push(`نوع الحساب غير صحيح. يجب أن يكون أحد: ${validTypes.join(', ')}`);
      }
    }

    if (!data.balance_type) {
      errors.push('نوع الرصيد مطلوب');
    } else {
      const validBalanceTypes = ['debit', 'credit'];
      if (!validBalanceTypes.includes(data.balance_type)) {
        errors.push('نوع الرصيد يجب أن يكون debit أو credit');
      }
    }

    if (data.account_level && (data.account_level < 1 || data.account_level > 6)) {
      errors.push('مستوى الحساب يجب أن يكون بين 1 و 6');
    }

    return { valid: errors.length === 0, errors };
  };

  /**
   * رفع الحسابات إلى قاعدة البيانات
   */
  const uploadAccounts = async (accountsData?: ProcessedAccountData[]) => {
    if (!companyId) {
      toast.error('معرف الشركة غير موجود');
      return;
    }

    const dataToUpload = accountsData || processedData;
    if (dataToUpload.length === 0) {
      toast.error('لا توجد بيانات للرفع');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      console.log('🔍 [UPLOAD] Starting upload process...');
      
      const results: EnhancedCSVUploadResults = {
        total: dataToUpload.length,
        successful: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
        hierarchyErrors: hierarchyErrors
      };

      // Get existing accounts
      const { data: existingAccounts } = await supabase
        .from('chart_of_accounts')
        .select('account_code, id')
        .eq('company_id', companyId);

      const existingAccountsMap = new Map(
        existingAccounts?.map(acc => [acc.account_code, acc.id]) || []
      );

      // Process accounts in chunks
      const CHUNK_SIZE = 20;
      
      for (let chunkStart = 0; chunkStart < dataToUpload.length; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, dataToUpload.length);
        const chunk = dataToUpload.slice(chunkStart, chunkEnd);
        
        for (let i = 0; i < chunk.length; i++) {
          const globalIndex = chunkStart + i;
          const accountData = chunk[i];
          const rowNumber = accountData._rowNumber || globalIndex + 2;

          try {
            const progressPercent = ((globalIndex + 1) / dataToUpload.length) * 100;
            setProgress(progressPercent);
            
            // Add small delay for UI responsiveness
            if (globalIndex % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }

            // Validate data
            const validation = validateAccountData(accountData);
            if (!validation.valid) {
              results.failed++;
              results.errors.push({
                row: rowNumber,
                message: validation.errors.join(', '),
                account_code: accountData.account_code
              });
              continue;
            }

            // Prepare data for insertion
            const insertData = {
              account_code: accountData.account_code,
              account_name: accountData.account_name,
              account_name_ar: accountData.account_name_ar,
              account_type: accountData.account_type,
              account_subtype: accountData.account_subtype,
              balance_type: accountData.balance_type,
              description: accountData.description,
              account_level: accountData.account_level,
              is_header: accountData.is_header,
              parent_account_code: accountData.parent_account_code,
              company_id: companyId
            };

            // Check if account exists
            const existingAccountId = existingAccountsMap.get(accountData.account_code);
            
            if (existingAccountId) {
              // Update existing account
              const { error } = await supabase
                .from('chart_of_accounts')
                .update(insertData)
                .eq('id', existingAccountId)
                .eq('company_id', companyId);

              if (error) {
                results.failed++;
                results.errors.push({
                  row: rowNumber,
                  message: `خطأ في تحديث الحساب: ${error.message}`,
                  account_code: accountData.account_code
                });
              } else {
                results.updated++;
              }
            } else {
              // Create new account
              const { data: newAccount, error } = await supabase
                .from('chart_of_accounts')
                .insert(insertData)
                .select('id')
                .single();

              if (error) {
                results.failed++;
                results.errors.push({
                  row: rowNumber,
                  message: `خطأ في إنشاء الحساب: ${error.message}`,
                  account_code: accountData.account_code
                });
              } else {
                results.successful++;
                existingAccountsMap.set(accountData.account_code, newAccount?.id || 'new');
              }
            }

          } catch (error: any) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              message: `خطأ غير متوقع: ${error.message}`,
              account_code: accountData.account_code
            });
          }
        }
        
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      setProgress(100);
      setResults(results);

      // Update query cache
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });

      // Show success/error messages
      if (results.successful > 0 || results.updated > 0) {
        const total = results.successful + results.updated;
        toast.success(`✅ تم استيراد شجرة الحسابات بنجاح - ${total} حساب (${results.successful} جديد، ${results.updated} محدث)`);
      }

      if (results.failed > 0) {
        toast.error(`فشل في رفع ${results.failed} حساب. راجع تقرير الأخطاء للتفاصيل.`);
      }

      if (results.hierarchyErrors.length > 0) {
        toast.warning(`تم العثور على ${results.hierarchyErrors.length} خطأ في التسلسل الهرمي`);
      }

    } catch (error: any) {
      console.error('🔍 [UPLOAD] Fatal error:', error);
      toast.error(`خطأ في رفع الملف: ${error.message}`);
      setResults({
        total: 0,
        successful: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        errors: [{ row: 1, message: error.message }],
        hierarchyErrors: []
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  /**
   * تنزيل قالب CSV
   */
  const downloadTemplate = () => {
    const headers = [
      'المستوى',
      'رقم الحساب', 
      'الوصف',
      'الوصف بالإنجليزي'
    ];

    const exampleData = [
      ['1', '1', 'الأصول', 'Assets'],
      ['2', '11', 'الأصول المتداولة', 'Current Assets'],
      ['3', '111', 'النقدية وما يعادلها', 'Cash and Cash Equivalents'],
      ['4', '1101', 'النقدية', 'Cash'],
      ['5', '11101', 'الصندوق الرئيسي', 'Main Cash Fund'],
      ['2', '12', 'الأصول الثابتة', 'Fixed Assets'],
      ['3', '121', 'المباني والمنشآت', 'Buildings and Structures']
    ];

    const csvContent = [
      headers.join(','),
      ...exampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'chart_of_accounts_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    processCSVFile,
    processCSVData,
    uploadAccounts,
    downloadTemplate,
    isUploading,
    progress,
    results,
    processedData,
    hierarchyErrors,
    setProcessedData,
    setHierarchyErrors
  };
}

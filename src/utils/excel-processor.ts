// معالج ملفات Excel المحسن
import Papa from 'papaparse';

export interface ExcelProcessingResult {
  data: any[];
  errors: string[];
  warnings: string[];
  detectedFormat: 'csv' | 'excel' | 'json' | 'unknown';
}

// محاولة قراءة ملف Excel كـ CSV (طريقة مؤقتة حتى يتم دمج مكتبة xlsx)
export const processExcelFile = async (file: File): Promise<ExcelProcessingResult> => {
  const result: ExcelProcessingResult = {
    data: [],
    errors: [],
    warnings: [],
    detectedFormat: 'unknown'
  };
  
  try {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    console.log('📊 Excel Processor: Processing file:', file.name, 'Extension:', fileExtension);
    
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      result.detectedFormat = 'excel';
      result.warnings.push('ملفات Excel يتم معالجتها كـ CSV مؤقتاً. للحصول على أفضل النتائج، احفظ الملف كـ CSV أولاً.');
      
      // محاولة قراءة كـ CSV
      const text = await file.text();
      const parsed = Papa.parse(text, { 
        header: true, 
        skipEmptyLines: 'greedy',
        delimiter: ',',
        encoding: 'UTF-8'
      });
      
      if (parsed.errors.length > 0) {
        result.errors.push(...parsed.errors.map(err => `خطأ في قراءة Excel: ${err.message}`));
        
        // محاولة مع فاصل مختلف
        const parsedTab = Papa.parse(text, { 
          header: true, 
          skipEmptyLines: 'greedy',
          delimiter: '\t'
        });
        
        if (parsedTab.errors.length === 0) {
          result.data = parsedTab.data as any[];
          result.warnings.push('تم اكتشاف فاصل Tab في الملف');
        } else {
          result.errors.push('فشل في قراءة الملف بجميع الفواصل المدعومة');
          return result;
        }
      } else {
        result.data = parsed.data as any[];
      }
    } else {
      result.errors.push(`نوع الملف ${fileExtension} غير مدعوم في معالج Excel`);
      return result;
    }
    
    // تنظيف البيانات
    result.data = result.data.filter(row => {
      // إزالة الصفوف الفارغة
      const hasData = Object.values(row).some(value => 
        value !== null && value !== undefined && value !== ''
      );
      return hasData;
    });
    
    console.log('📊 Excel Processor: Processed', result.data.length, 'rows');
    
    if (result.data.length === 0) {
      result.errors.push('لا توجد بيانات صالحة في الملف');
    }
    
    return result;
    
  } catch (error: any) {
    console.error('📊 Excel Processor Error:', error);
    result.errors.push(`خطأ في معالجة ملف Excel: ${error.message}`);
    return result;
  }
};

// دالة لاكتشاف تنسيق الملف
export const detectFileFormat = (file: File): 'csv' | 'excel' | 'json' | 'text' | 'unknown' => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type;
  
  if (extension === '.csv' || mimeType === 'text/csv') {
    return 'csv';
  }
  
  if (extension === '.xlsx' || extension === '.xls' || 
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel') {
    return 'excel';
  }
  
  if (extension === '.json' || mimeType === 'application/json') {
    return 'json';
  }
  
  if (extension === '.txt' || mimeType === 'text/plain') {
    return 'text';
  }
  
  return 'unknown';
};

// دالة لتحويل البيانات إلى تنسيق موحد
export const normalizeFileData = (data: any[], fileFormat: string): any[] => {
  console.log('🔄 Normalizing data from format:', fileFormat);
  
  return data.map((row, index) => {
    // تنظيف البيانات الأساسي
    const cleanedRow: any = {};
    
    Object.entries(row).forEach(([key, value]) => {
      // تنظيف المفاتيح
      const cleanKey = key.trim().toLowerCase();
      
      // تنظيف القيم
      let cleanValue = value;
      if (typeof value === 'string') {
        cleanValue = value.trim();
        
        // تحويل القيم الرقمية
        if (cleanKey.includes('amount') || cleanKey.includes('مبلغ') || cleanKey.includes('قيمة')) {
          const numValue = parseFloat(cleanValue.replace(/[^\d.-]/g, ''));
          if (!isNaN(numValue)) {
            cleanValue = numValue;
          }
        }
        
        // تنظيف أرقام الهواتف
        if (cleanKey.includes('phone') || cleanKey.includes('هاتف') || cleanKey.includes('جوال')) {
          cleanValue = cleanValue.replace(/\s|-|\(|\)/g, '');
        }
      }
      
      cleanedRow[key] = cleanValue;
    });
    
    // إضافة معرف الصف للتتبع
    cleanedRow._rowNumber = index + 1;
    
    return cleanedRow;
  });
};

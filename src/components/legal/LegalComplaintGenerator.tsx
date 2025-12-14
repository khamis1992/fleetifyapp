/**
 * مكون توليد البلاغ القانوني
 * يقوم بجلب القالب من قاعدة البيانات واستبدال المتغيرات بالقيم الفعلية
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { formatCurrency } from '@/lib/utils';

interface LegalComplaintGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData?: {
    customer_name?: string;
    customer_id?: string;
    national_id?: string;
    phone?: string;
    total_amount?: number;
    late_fees?: number;
    unpaid_rent?: number;
  };
}

interface TemplateVariable {
  key: string;
  label_ar: string;
  type: string;
}

// تحويل الأرقام إلى كلمات عربية
const numberToArabicWords = (num: number): string => {
  if (num === 0) return 'صفر';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    
    let result = '';
    
    if (n >= 100) {
      result += hundreds[Math.floor(n / 100)];
      n %= 100;
      if (n > 0) result += ' و';
    }
    
    if (n >= 20) {
      const unit = n % 10;
      const ten = Math.floor(n / 10);
      if (unit > 0) {
        result += ones[unit] + ' و' + tens[ten];
      } else {
        result += tens[ten];
      }
    } else if (n >= 10) {
      result += teens[n - 10];
    } else if (n > 0) {
      result += ones[n];
    }
    
    return result;
  };
  
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    let result = convertLessThanThousand(millions) + ' مليون';
    if (remainder > 0) {
      result += ' و' + numberToArabicWords(remainder);
    }
    return result;
  }
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    let result = '';
    if (thousands === 1) {
      result = 'ألف';
    } else if (thousands === 2) {
      result = 'ألفان';
    } else if (thousands <= 10) {
      result = convertLessThanThousand(thousands) + ' آلاف';
    } else {
      result = convertLessThanThousand(thousands) + ' ألف';
    }
    if (remainder > 0) {
      result += ' و' + convertLessThanThousand(remainder);
    }
    return result;
  }
  
  return convertLessThanThousand(num);
};

export const LegalComplaintGenerator: React.FC<LegalComplaintGeneratorProps> = ({
  open,
  onOpenChange,
  caseData,
}) => {
  const { companyId } = useUnifiedCompanyAccess();
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // جلب القالب ومعلومات الشركة
  useEffect(() => {
    if (open) {
      fetchTemplate();
      fetchCompanyInfo();
    }
  }, [open, companyId]);

  // تحديث المتغيرات من بيانات القضية
  useEffect(() => {
    if (caseData && companyInfo) {
      const totalAmount = (caseData.late_fees || 0) + (caseData.unpaid_rent || 0);
      
      setVariables(prev => ({
        ...prev,
        company_name: companyInfo?.name_ar || companyInfo?.name || 'شركة العراف لتأجير السيارات',
        company_address: companyInfo?.address || 'قطر - الدوحة',
        company_cr: companyInfo?.commercial_registration || '',
        defendant_name: caseData.customer_name || '',
        defendant_qid: caseData.national_id || '',
        late_payment_penalty: formatCurrency(caseData.late_fees || 0),
        unpaid_rent: formatCurrency(caseData.unpaid_rent || 0),
        damages_compensation: formatCurrency(0),
        total_amount_numeric: formatCurrency(totalAmount),
        total_amount_words: numberToArabicWords(Math.round(totalAmount)) + ' ريال قطري',
      }));
    }
  }, [caseData, companyInfo]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('legal_templates')
        .select('*')
        .eq('code', 'CIVIL_MEMO_TRAFFIC_FINES_TRANSFER')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.error('فشل في تحميل القالب');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyInfo = async () => {
    if (!companyId) return;
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name, name_ar, address, commercial_registration')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      setCompanyInfo(data);
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  const generateDocument = () => {
    if (!template?.body_ar) {
      toast.error('القالب غير متوفر');
      return;
    }

    let document = template.body_ar;
    
    // استبدال المتغيرات
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      document = document.replace(regex, value || `[${key}]`);
    });

    setGeneratedDocument(document);
    toast.success('تم توليد المستند بنجاح');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedDocument);
      setCopied(true);
      toast.success('تم نسخ المستند');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('فشل في نسخ المستند');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const today = new Date().toLocaleDateString('en-US');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>مذكرة شارحة - بلاغ</title>
          <style>
            @page { 
              size: A4; 
              margin: 20mm; 
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Traditional Arabic', 'Times New Roman', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.8;
              padding: 20px;
              direction: rtl;
              text-align: right;
              color: #000;
              background: #fff;
              margin: 0;
            }
            .container {
              max-width: 170mm;
              margin: 0 auto;
              border: 2px solid #004d40;
              border-radius: 8px;
              padding: 20px;
            }
            /* Header with Logo */
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px double #004d40;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .company-info {
              text-align: right;
              flex: 1;
            }
            .company-name-ar {
              font-size: 22px;
              font-weight: bold;
              color: #004d40;
              margin-bottom: 4px;
            }
            .company-name-en {
              font-size: 12px;
              color: #666;
              font-style: italic;
            }
            .company-details {
              font-size: 10px;
              color: #666;
              margin-top: 5px;
            }
            .logo-container {
              width: 120px;
              text-align: left;
            }
            .logo {
              max-width: 100px;
              max-height: 100px;
            }
            /* Document Title */
            .document-title {
              text-align: center;
              margin: 20px 0;
              padding: 12px 0;
              background: linear-gradient(135deg, #004d40 0%, #00695c 100%);
              border-radius: 6px;
            }
            .document-title h1 {
              font-size: 20px;
              font-weight: bold;
              margin: 0;
              color: #fff;
              letter-spacing: 2px;
            }
            .document-date {
              font-size: 11px;
              color: rgba(255,255,255,0.9);
              margin-top: 5px;
            }
            /* Bismillah */
            .bismillah {
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              margin: 15px 0;
              color: #004d40;
            }
            /* Defendant Info */
            .defendant-info {
              margin: 20px 0;
              padding: 15px;
              border: 2px solid #004d40;
              border-radius: 8px;
              background: linear-gradient(135deg, rgba(0, 77, 64, 0.03) 0%, rgba(0, 77, 64, 0.08) 100%);
            }
            .defendant-title {
              font-size: 14px;
              font-weight: bold;
              color: #004d40;
              text-align: center;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid rgba(0, 77, 64, 0.2);
            }
            .defendant-grid {
              display: flex;
              justify-content: space-around;
              gap: 20px;
            }
            .defendant-field {
              text-align: center;
            }
            .field-label {
              font-size: 11px;
              color: #666;
              display: block;
              margin-bottom: 4px;
            }
            .field-value {
              font-size: 14px;
              font-weight: bold;
              color: #000;
            }
            .qid-number {
              font-family: 'Courier New', monospace;
              font-size: 16px;
              color: #004d40;
              background: rgba(0, 77, 64, 0.1);
              padding: 4px 12px;
              border-radius: 4px;
              display: inline-block;
              letter-spacing: 1px;
            }
            /* Content */
            .content {
              white-space: pre-wrap;
              font-family: inherit;
              text-align: justify;
              line-height: 2;
              margin-bottom: 30px;
            }
            /* Signatures Section */
            .signatures-section {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #004d40;
              page-break-inside: avoid;
            }
            .signatures-title {
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              color: #004d40;
              margin-bottom: 20px;
            }
            .signature-stamp-grid {
              display: flex;
              justify-content: space-around;
              align-items: flex-end;
              gap: 40px;
              margin: 30px 0;
            }
            .signature-box {
              text-align: center;
            }
            .signature-image {
              max-width: 150px;
              max-height: 80px;
              margin-bottom: 10px;
            }
            .signature-line {
              border-top: 1px solid #333;
              width: 180px;
              margin: 0 auto 10px;
            }
            .signature-info {
              font-size: 11px;
              color: #333;
              line-height: 1.6;
            }
            .signature-info span {
              font-size: 10px;
              color: #666;
            }
            /* Stamp Area */
            .stamp-box {
              text-align: center;
              padding: 10px;
            }
            .stamp-image {
              width: 140px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .stamp-label {
              font-size: 10px;
              color: #666;
              margin-top: 8px;
            }
            /* Closing Text */
            .closing-text {
              text-align: center;
              margin-top: 30px;
              font-size: 14px;
              line-height: 2;
            }
            .closing-text p {
              margin: 5px 0;
            }
            /* Footer */
            .footer {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #004d40;
              text-align: center;
              font-size: 9px;
              color: #666;
            }
            .footer-contacts {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-top: 5px;
            }
            @media print {
              body { 
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .container { 
                border: none;
                padding: 0;
              }
              .signatures-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header with Logo -->
            <div class="header">
              <div class="company-info">
                <div class="company-name-ar">${companyInfo?.name_ar || 'شركة العراف لتأجير السيارات'}</div>
                <div class="company-name-en">AL-ARAF CAR RENTAL L.L.C</div>
                <div class="company-details">
                  ${companyInfo?.address || 'قطر - الدوحة'}<br>
                  السجل التجاري: ${companyInfo?.commercial_registration || ''}
                </div>
              </div>
              <div class="logo-container">
                <img src="${window.location.origin}/receipts/logo.png" alt="Logo" class="logo" />
              </div>
            </div>

            <!-- Document Title -->
            <div class="document-title">
              <h1>مذكرة شارحة</h1>
              <div class="document-date">التاريخ: ${today}</div>
            </div>

            <!-- Bismillah -->
            <div class="bismillah">بسم الله الرحمن الرحيم</div>

            <!-- Defendant Info Box -->
            <div class="defendant-info">
              <div class="defendant-title">بيانات المدعى عليه</div>
              <div class="defendant-grid">
                <div class="defendant-field">
                  <span class="field-label">الاسم:</span>
                  <span class="field-value">${variables.defendant_name || '[غير محدد]'}</span>
                </div>
                <div class="defendant-field">
                  <span class="field-label">الرقم الشخصي (QID):</span>
                  <span class="field-value qid-number">${variables.defendant_qid || '[غير محدد]'}</span>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="content">${generatedDocument}</div>

            <!-- Signature and Stamp Section -->
            <div class="signatures-section">
              <div class="signatures-title">التوقيع والختم</div>
              <div class="signature-stamp-grid">
                <!-- Signature -->
                <div class="signature-box">
                  <img src="${window.location.origin}/receipts/signature.png" alt="التوقيع" class="signature-image" />
                  <div class="signature-line"></div>
                  <div class="signature-info">
                    <strong>خميس هاشم الجابر</strong><br>
                    <span>المدير العام المفوض بالتوقيع</span>
                  </div>
                </div>
                
                <!-- Stamp -->
                <div class="stamp-box">
                  <img src="${window.location.origin}/receipts/stamp.png" alt="ختم الشركة" class="stamp-image" />
                  <div class="stamp-label">ختم الشركة</div>
                </div>
              </div>

              <!-- Company Info -->
              <div class="closing-text">
                <p>وتفضلوا بقبول فائق الاحترام والتقدير،</p>
                <p><strong>عن شركة العراف لتأجير السيارات – ذ.م.م</strong></p>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div>شركة العراف لتأجير السيارات ذ.م.م - AL-ARAF CAR RENTAL L.L.C</div>
              <div class="footer-contacts">
                <span>📞 +974 XXXX XXXX</span>
                <span>📧 info@alaraf.qa</span>
                <span>🌐 www.alaraf.online</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      // Wait for images to load before printing
      const images = printWindow.document.querySelectorAll('img');
      let loadedCount = 0;
      const totalImages = images.length;
      
      if (totalImages === 0) {
        printWindow.print();
      } else {
        images.forEach((img) => {
          if (img.complete) {
            loadedCount++;
            if (loadedCount === totalImages) {
              setTimeout(() => printWindow.print(), 300);
            }
          } else {
            img.onload = () => {
              loadedCount++;
              if (loadedCount === totalImages) {
                setTimeout(() => printWindow.print(), 300);
              }
            };
            img.onerror = () => {
              loadedCount++;
              console.warn('Failed to load image:', img.src);
              if (loadedCount === totalImages) {
                setTimeout(() => printWindow.print(), 300);
              }
            };
          }
        });
        
        // Fallback: print after 2 seconds if images haven't loaded
        setTimeout(() => {
          if (loadedCount < totalImages) {
            printWindow.print();
          }
        }, 2000);
      }
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `بلاغ_${caseData?.customer_name || 'قضية'}_${new Date().toLocaleDateString('en-US')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('تم تحميل المستند');
  };

  const templateVariables: TemplateVariable[] = template?.variables || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            إنشاء ملف البلاغ
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* قسم المتغيرات */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      تعبئة البيانات
                      <Badge variant="secondary">{templateVariables.length} حقل</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {/* معلومات الشركة */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">معلومات الشركة</Label>
                          <div className="space-y-2">
                            <div>
                              <Label htmlFor="company_name" className="text-xs">اسم الشركة</Label>
                              <Input
                                id="company_name"
                                value={variables.company_name || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, company_name: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="company_address" className="text-xs">عنوان الشركة</Label>
                              <Input
                                id="company_address"
                                value={variables.company_address || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, company_address: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="company_cr" className="text-xs">رقم السجل التجاري</Label>
                              <Input
                                id="company_cr"
                                value={variables.company_cr || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, company_cr: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* معلومات المدعى عليه */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">معلومات المدعى عليه</Label>
                          <div className="space-y-2">
                            <div>
                              <Label htmlFor="defendant_name" className="text-xs">اسم المدعى عليه</Label>
                              <Input
                                id="defendant_name"
                                value={variables.defendant_name || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, defendant_name: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="defendant_qid" className="text-xs">رقم الهوية</Label>
                              <Input
                                id="defendant_qid"
                                value={variables.defendant_qid || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, defendant_qid: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* المبالغ المالية */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">المبالغ المالية</Label>
                          <div className="space-y-2">
                            <div>
                              <Label htmlFor="late_payment_penalty" className="text-xs">غرامات التأخير</Label>
                              <Input
                                id="late_payment_penalty"
                                value={variables.late_payment_penalty || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, late_payment_penalty: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="unpaid_rent" className="text-xs">الإيجار المتأخر</Label>
                              <Input
                                id="unpaid_rent"
                                value={variables.unpaid_rent || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, unpaid_rent: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="damages_compensation" className="text-xs">تعويض الأضرار</Label>
                              <Input
                                id="damages_compensation"
                                value={variables.damages_compensation || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, damages_compensation: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="total_amount_numeric" className="text-xs">المبلغ الإجمالي</Label>
                              <Input
                                id="total_amount_numeric"
                                value={variables.total_amount_numeric || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, total_amount_numeric: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="total_amount_words" className="text-xs">المبلغ كتابة</Label>
                              <Input
                                id="total_amount_words"
                                value={variables.total_amount_words || ''}
                                onChange={(e) => setVariables(prev => ({ ...prev, total_amount_words: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Button onClick={generateDocument} className="w-full">
                  <RefreshCw className="w-4 h-4 ml-2" />
                  توليد المستند
                </Button>
              </div>

              {/* قسم المعاينة */}
              <div className="space-y-4">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      معاينة المستند
                      {generatedDocument && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={handleCopy}>
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handlePrint}>
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleDownload}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[450px]">
                      {generatedDocument ? (
                        <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-right" dir="rtl">
                          {generatedDocument}
                        </pre>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>قم بتعبئة البيانات ثم اضغط "توليد المستند"</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          {generatedDocument && (
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 ml-2" />
              تحميل المستند
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LegalComplaintGenerator;


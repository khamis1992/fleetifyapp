/**
 * صفحة عرض مستندات الدعوى القانونية
 * يمكن مشاركة رابط هذه الصفحة مع الموظفين لتحميل المستندات
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  FileText, 
  Download, 
  Eye, 
  ArrowLeft,
  FileCheck,
  ShieldAlert,
  FileWarning,
  Building2,
  User,
  Car,
  Calendar,
  DollarSign,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentInfo {
  name: string;
  url: string | null;
  htmlContent: string | null;
  type: 'pdf' | 'html';
  icon: React.ReactNode;
  description: string;
  available: boolean;
}

export default function LawsuitDocumentsView() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);

  useEffect(() => {
    if (contractId) {
      loadContractAndDocuments();
    }
  }, [contractId]);

  const loadContractAndDocuments = async () => {
    try {
      setLoading(true);

      // جلب بيانات العقد
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (
            id,
            first_name,
            last_name,
            company_name,
            national_id,
            phone,
            email
          ),
          vehicles (
            id,
            plate_number,
            make,
            model,
            year
          )
        `)
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      // جلب المستندات المحفوظة
      const { data: savedDocs } = await supabase
        .from('lawsuit_documents')
        .select('*')
        .eq('contract_id', contractId);

      // بناء قائمة المستندات
      const docsList: DocumentInfo[] = [
        {
          name: 'المذكرة الشارحة',
          url: savedDocs?.find(d => d.document_type === 'explanatory_memo')?.file_url || null,
          htmlContent: savedDocs?.find(d => d.document_type === 'explanatory_memo')?.html_content || null,
          type: 'html',
          icon: <FileText className="h-5 w-5" />,
          description: 'مذكرة شارحة للدعوى القضائية',
          available: !!savedDocs?.find(d => d.document_type === 'explanatory_memo')
        },
        {
          name: 'كشف المطالبات المالية',
          url: savedDocs?.find(d => d.document_type === 'claims_statement')?.file_url || null,
          htmlContent: savedDocs?.find(d => d.document_type === 'claims_statement')?.html_content || null,
          type: 'html',
          icon: <DollarSign className="h-5 w-5" />,
          description: 'كشف تفصيلي بالمبالغ المستحقة',
          available: !!savedDocs?.find(d => d.document_type === 'claims_statement')
        },
        {
          name: 'بلاغ سرقة المركبة',
          url: savedDocs?.find(d => d.document_type === 'criminal_complaint')?.file_url || null,
          htmlContent: savedDocs?.find(d => d.document_type === 'criminal_complaint')?.html_content || null,
          type: 'html',
          icon: <ShieldAlert className="h-5 w-5" />,
          description: 'بلاغ سرقة/خيانة أمانة',
          available: !!savedDocs?.find(d => d.document_type === 'criminal_complaint')
        },
        {
          name: 'طلب تحويل المخالفات',
          url: savedDocs?.find(d => d.document_type === 'violations_transfer')?.file_url || null,
          htmlContent: savedDocs?.find(d => d.document_type === 'violations_transfer')?.html_content || null,
          type: 'html',
          icon: <FileWarning className="h-5 w-5" />,
          description: 'طلب تحويل المخالفات المرورية',
          available: !!savedDocs?.find(d => d.document_type === 'violations_transfer')
        },
        {
          name: 'صورة العقد',
          url: savedDocs?.find(d => d.document_type === 'contract_copy')?.file_url || null,
          htmlContent: null,
          type: 'pdf',
          icon: <FileCheck className="h-5 w-5" />,
          description: 'نسخة من عقد الإيجار',
          available: !!savedDocs?.find(d => d.document_type === 'contract_copy')
        }
      ];

      setDocuments(docsList);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('حدث خطأ أثناء تحميل المستندات');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (doc: DocumentInfo) => {
    if (doc.htmlContent) {
      // فتح HTML في نافذة جديدة
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(doc.htmlContent);
        newWindow.document.close();
      }
    } else if (doc.url) {
      // فتح PDF في نافذة جديدة
      window.open(doc.url, '_blank');
    }
  };

  const handleDownloadDocument = async (doc: DocumentInfo) => {
    try {
      if (doc.htmlContent) {
        // تحويل HTML إلى PDF وتحميله
        const { default: html2canvas } = await import('html2canvas');
        const { jsPDF } = await import('jspdf');

        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.width = '794px';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Failed to create iframe');
        }

        iframeDoc.open();
        iframeDoc.write(doc.htmlContent);
        iframeDoc.close();

        await new Promise(r => setTimeout(r, 800));

        const canvas = await html2canvas(iframeDoc.body, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
        });

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = pdfWidth / imgWidth;
        const contentHeight = imgHeight * ratio;

        let heightLeft = contentHeight;
        let position = 0;
        let pageCount = 0;

        while (heightLeft > 0) {
          if (pageCount > 0) {
            pdf.addPage();
          }
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, contentHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
          position -= pdfHeight;
          pageCount++;
          if (pageCount >= 10) break;
        }

        document.body.removeChild(iframe);

        const fileName = `${doc.name.replace(/\s+/g, '_')}_${contract?.contract_number || 'document'}.pdf`;
        pdf.save(fileName);
        
        toast.success('تم تحميل المستند بنجاح');
      } else if (doc.url) {
        // تحميل PDF مباشرة
        const link = document.createElement('a');
        link.href = doc.url;
        link.download = `${doc.name}.pdf`;
        link.click();
        toast.success('تم تحميل المستند بنجاح');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('حدث خطأ أثناء تحميل المستند');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">لم يتم العثور على العقد</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="h-4 w-4 ml-2" />
              رجوع
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customer = contract.customers;
  const vehicle = contract.vehicles;
  const customerName = customer
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.company_name || 'غير محدد'
    : 'غير محدد';

  const availableDocuments = documents.filter(d => d.available);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg">
              <FileCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              مستندات الدعوى القانونية
            </h1>
          </div>
          <p className="text-muted-foreground">
            جميع المستندات المطلوبة لرفع الدعوى
          </p>
        </motion.div>

        {/* Contract Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-l from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                معلومات العقد
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <User className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">العميل</p>
                    <p className="font-medium">{customerName}</p>
                    {customer?.national_id && (
                      <p className="text-xs text-muted-foreground font-mono">{customer.national_id}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Car className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">المركبة</p>
                    <p className="font-medium">{vehicle?.plate_number || 'غير محدد'}</p>
                    {vehicle && (
                      <p className="text-xs text-muted-foreground">
                        {vehicle.make} {vehicle.model} {vehicle.year}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <FileCheck className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">رقم العقد</p>
                    <p className="font-medium">{contract.contract_number || 'غير محدد'}</p>
                    {contract.start_date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(contract.start_date).toLocaleDateString('ar-QA')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-l from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  المستندات المتاحة
                </CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {availableDocuments.length} مستند
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {availableDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileWarning className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد مستندات متاحة حالياً</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {availableDocuments.map((doc, index) => (
                    <motion.div
                      key={doc.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-transparent hover:border-teal-500 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg text-teal-600 dark:text-teal-400">
                          {doc.icon}
                        </div>
                        <div>
                          <h3 className="font-medium">{doc.name}</h3>
                          <p className="text-xs text-muted-foreground">{doc.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDocument(doc)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          عرض
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownloadDocument(doc)}
                          className="gap-2 bg-teal-600 hover:bg-teal-700"
                        >
                          <Download className="h-4 w-4" />
                          تحميل
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>جميع المستندات جاهزة للتحميل والطباعة</span>
          </div>
          
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>
        </motion.div>

      </div>
    </div>
  );
}

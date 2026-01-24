/**
 * صفحة إدارة مستندات الشركة القانونية
 * لرفع وإدارة المستندات الثابتة مثل السجل التجاري وشهادة IBAN
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Eye,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  CreditCard,
  UserCheck,
  FileSignature,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { 
  lawsuitService, 
  CompanyLegalDocument, 
  LegalDocumentType,
  DOCUMENT_TYPE_NAMES,
  FIXED_DOCUMENTS 
} from '@/services/LawsuitService';
import { Landmark } from 'lucide-react';

// أيقونات أنواع المستندات
const DOCUMENT_TYPE_ICONS: Record<LegalDocumentType, React.ReactNode> = {
  commercial_register: <Building2 className="h-5 w-5" />,
  establishment_record: <Landmark className="h-5 w-5" />,
  iban_certificate: <CreditCard className="h-5 w-5" />,
  representative_id: <UserCheck className="h-5 w-5" />,
  authorization_letter: <FileSignature className="h-5 w-5" />,
  explanatory_memo: <FileText className="h-5 w-5" />,
  contract_copy: <FileText className="h-5 w-5" />,
  documents_list: <FileText className="h-5 w-5" />,
};

// استخدام المستندات الثابتة من الخدمة
const REQUIRED_DOCUMENTS = FIXED_DOCUMENTS;

export default function CompanyLegalDocuments() {
  const queryClient = useQueryClient();
  const { companyId, isLoading: companyLoading } = useUnifiedCompanyAccess();
  
  // الحالات
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<LegalDocumentType | ''>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  // جلب المستندات
  const { data: documents = [], isLoading: docsLoading, refetch } = useQuery({
    queryKey: ['company-legal-documents', companyId],
    queryFn: () => lawsuitService.getCompanyLegalDocuments(companyId!),
    enabled: !!companyId,
  });

  // رفع مستند
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !selectedDocType || selectedFiles.length === 0) {
        throw new Error('بيانات غير مكتملة');
      }

      let fileToUpload = selectedFiles[0];

      // دمج الصور في ملف PDF واحد في حالة السجل التجاري
      if (selectedDocType === 'commercial_register' && selectedFiles.length > 0) {
        const isImages = selectedFiles.every(f => f.type.startsWith('image/'));
        
        if (isImages) {
          try {
            const pdf = new jsPDF();
            
            for (let i = 0; i < selectedFiles.length; i++) {
              const file = selectedFiles[i];
              if (i > 0) pdf.addPage();
              
              const imgData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              
              const imgProps = pdf.getImageProperties(imgData);
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
              
              pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }
            
            const pdfBlob = pdf.output('blob');
            fileToUpload = new File([pdfBlob], 'commercial_register.pdf', { type: 'application/pdf' });
          } catch (error) {
            console.error('Error creating PDF:', error);
            throw new Error('فشل في دمج الصور في ملف PDF');
          }
        }
      }

      return lawsuitService.uploadLegalDocument(
        companyId,
        selectedDocType,
        fileToUpload,
        expiryDate || undefined,
        notes || undefined
      );
    },
    onSuccess: () => {
      toast.success('تم رفع المستند بنجاح');
      queryClient.invalidateQueries({ queryKey: ['company-legal-documents'] });
      resetUploadForm();
    },
    onError: (error: any) => {
      toast.error(`فشل رفع المستند: ${error.message}`);
    },
  });

  // حذف مستند
  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => lawsuitService.deleteLegalDocument(documentId),
    onSuccess: () => {
      toast.success('تم حذف المستند');
      queryClient.invalidateQueries({ queryKey: ['company-legal-documents'] });
    },
    onError: (error: any) => {
      toast.error(`فشل حذف المستند: ${error.message}`);
    },
  });

  // إعادة تعيين نموذج الرفع
  const resetUploadForm = useCallback(() => {
    setUploadDialogOpen(false);
    setSelectedDocType('');
    setSelectedFiles([]);
    setExpiryDate('');
    setNotes('');
  }, []);

  // التحقق من وجود مستند لنوع معين
  const getDocumentByType = useCallback((type: LegalDocumentType): CompanyLegalDocument | undefined => {
    return documents.find(doc => doc.document_type === type);
  }, [documents]);

  // حساب حالة الإكمال
  const completionStatus = REQUIRED_DOCUMENTS.map(type => ({
    type,
    exists: !!getDocumentByType(type),
    document: getDocumentByType(type),
  }));

  const completedCount = completionStatus.filter(s => s.exists).length;
  const completionPercentage = Math.round((completedCount / REQUIRED_DOCUMENTS.length) * 100);

  // التحقق من انتهاء الصلاحية
  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
  };

  if (companyLoading || docsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">مستندات الشركة القانونية</h1>
              <p className="text-muted-foreground">
                رفع وإدارة المستندات الثابتة المطلوبة لرفع الدعاوى
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              رفع مستند
            </Button>
          </div>
        </div>
      </motion.div>

      {/* نسبة الإكمال */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">حالة المستندات</CardTitle>
            <CardDescription>
              يجب رفع جميع المستندات قبل إمكانية رفع دعوى في تقاضي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${
                    completionPercentage === 100 ? 'bg-green-500' : 'bg-primary'
                  }`}
                />
              </div>
              <span className="text-sm font-medium">
                {completedCount} / {REQUIRED_DOCUMENTS.length}
              </span>
            </div>
            
            {completionPercentage === 100 ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  جميع المستندات مكتملة! يمكنك الآن رفع الدعاوى في تقاضي.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  لم يتم رفع جميع المستندات بعد. أكمل رفع المستندات المطلوبة.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* قائمة المستندات المطلوبة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>المستندات المطلوبة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {completionStatus.map(({ type, exists, document }) => (
                <motion.div
                  key={type}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    exists 
                      ? 'border-green-200 bg-green-50/50' 
                      : 'border-dashed border-muted-foreground/30 bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${exists ? 'bg-green-100' : 'bg-muted'}`}>
                        {DOCUMENT_TYPE_ICONS[type]}
                      </div>
                      <div>
                        <h3 className="font-medium">{DOCUMENT_TYPE_NAMES[type]}</h3>
                        {exists && document ? (
                          <div className="text-sm text-muted-foreground mt-1">
                            <p>{document.document_name}</p>
                            {document.expiry_date && (
                              <div className="flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span className={
                                  isExpired(document.expiry_date) 
                                    ? 'text-red-600' 
                                    : isExpiringSoon(document.expiry_date)
                                      ? 'text-amber-600'
                                      : ''
                                }>
                                  ينتهي: {new Date(document.expiry_date).toLocaleDateString('ar-QA')}
                                  {isExpired(document.expiry_date) && ' (منتهي)'}
                                  {isExpiringSoon(document.expiry_date) && ' (قريباً)'}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">لم يتم الرفع بعد</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {exists && document ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewUrl(document.file_url)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(document.file_url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedDocType(type);
                              setUploadDialogOpen(true);
                            }}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocType(type);
                            setUploadDialogOpen(true);
                          }}
                        >
                          <Upload className="h-4 w-4 ml-2" />
                          رفع
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* جدول جميع المستندات */}
      {documents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>سجل المستندات</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>اسم الملف</TableHead>
                    <TableHead>تاريخ الانتهاء</TableHead>
                    <TableHead>تاريخ الرفع</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {DOCUMENT_TYPE_ICONS[doc.document_type as LegalDocumentType]}
                          <span>{DOCUMENT_TYPE_NAMES[doc.document_type as LegalDocumentType]}</span>
                        </div>
                      </TableCell>
                      <TableCell>{doc.document_name}</TableCell>
                      <TableCell>
                        {doc.expiry_date ? (
                          <Badge variant={
                            isExpired(doc.expiry_date) 
                              ? 'destructive' 
                              : isExpiringSoon(doc.expiry_date)
                                ? 'warning'
                                : 'secondary'
                          }>
                            {new Date(doc.expiry_date).toLocaleDateString('ar-QA')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(doc.created_at).toLocaleDateString('ar-QA')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* نافذة رفع مستند */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>رفع مستند قانوني</DialogTitle>
            <DialogDescription>
              اختر نوع المستند وارفع الملف بصيغة PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>نوع المستند</Label>
              <Select
                value={selectedDocType}
                onValueChange={(val) => setSelectedDocType(val as LegalDocumentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع المستند" />
                </SelectTrigger>
                <SelectContent>
                  {REQUIRED_DOCUMENTS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_NAMES[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>
                {selectedDocType === 'commercial_register' 
                  ? 'الملفات (صور أو PDF)' 
                  : 'الملف (PDF)'}
              </Label>
              <Input
                type="file"
                accept={selectedDocType === 'commercial_register' ? "image/*,.pdf" : ".pdf"}
                multiple={selectedDocType === 'commercial_register'}
                onChange={(e) => {
                  if (e.target.files) {
                    setSelectedFiles(Array.from(e.target.files));
                  }
                }}
              />
              {selectedDocType === 'commercial_register' && (
                <p className="text-xs text-muted-foreground">
                  يمكنك اختيار صورتين للسجل التجاري وسيتم دمجهما في ملف واحد تلقائياً
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>تاريخ الانتهاء (اختياري)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetUploadForm}>
              إلغاء
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!selectedDocType || selectedFiles.length === 0 || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <LoadingSpinner className="h-4 w-4 ml-2" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 ml-2" />
                  رفع
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض الملف */}
      <Dialog open={!!viewUrl} onOpenChange={() => setViewUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>عرض المستند</DialogTitle>
          </DialogHeader>
          {viewUrl && (
            <iframe
              src={viewUrl}
              className="w-full h-full rounded-lg"
              title="Document Preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


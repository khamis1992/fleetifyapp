import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { FileText, Download, Calendar, AlertTriangle, Upload, FileImage, Eye, Trash2, RefreshCw, Folder } from "lucide-react";
import { format } from "date-fns";
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface VehicleDocumentsPanelProps {
  vehicleId: string;
  documents?: any[];
  onDocumentAdd?: (document: any) => void;
}

interface DocumentFormData {
  document_type: string;
  document_name: string;
  document_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuer?: string;
  notes?: string;
}

interface VehicleDocumentFile {
  id: string;
  vehicle_id: string;
  document_type: string;
  document_name: string | null;
  document_url: string | null;
  document_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  issuing_authority?: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

const documentTypes = [
  { value: 'registration', label: 'الترخيص', label_ar: 'الترخيص' },
  { value: 'insurance', label: 'التأمين', label_ar: 'التأمين' },
  { value: 'inspection', label: 'الفحص الدوري', label_ar: 'الفحص الدوري' },
  { value: 'purchase_invoice', label: 'فاتورة الشراء', label_ar: 'فاتورة الشراء' },
  { value: 'warranty', label: 'الضمان', label_ar: 'الضمان' },
  { value: 'maintenance_contract', label: 'عقد الصيانة', label_ar: 'عقد الصيانة' },
  { value: 'other', label: 'أخرى', label_ar: 'أخرى' },
];

// Hook لجلب وثائق المركبة
function useVehicleDocumentFiles(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-document-files', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      
      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching vehicle document files:', error);
        throw error;
      }
      
      return data as VehicleDocumentFile[];
    },
    enabled: !!vehicleId,
  });
}

// Hook لرفع وثيقة المركبة
function useUploadVehicleDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { vehicleId: string; file: File; documentType?: string; notes?: string }) => {
      if (!user) {
        throw new Error('المستخدم غير مصادق');
      }

      // رفع الملف إلى Storage
      const fileExt = data.file.name.split('.').pop();
      const fileName = `vehicle-documents/${data.vehicleId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, data.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`فشل رفع الملف: ${uploadError.message}`);
      }

      // إنشاء سجل في قاعدة البيانات
      const { data: document, error: dbError } = await supabase
        .from('vehicle_documents')
        .insert({
          vehicle_id: data.vehicleId,
          document_type: data.documentType || 'other',
          document_name: data.file.name,
          document_url: fileName,
          is_active: true,
        })
        .select()
        .single();

      if (dbError) {
        // حذف الملف في حالة فشل إنشاء السجل
        await supabase.storage.from('documents').remove([fileName]);
        console.error('Database error:', dbError);
        throw new Error(`فشل إنشاء سجل الوثيقة: ${dbError.message}`);
      }

      return document;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-document-files', variables.vehicleId] });
      toast.success('تم رفع الوثيقة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Upload failed:', error);
      toast.error(error.message || 'فشل رفع الوثيقة');
    }
  });
}

// Hook لحذف وثيقة المركبة
function useDeleteVehicleDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: VehicleDocumentFile) => {
      // حذف الملف من Storage
      if (document.document_url) {
        await supabase.storage.from('documents').remove([document.document_url]);
      }

      // حذف السجل من قاعدة البيانات
      const { error } = await supabase
        .from('vehicle_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;
      return document;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-document-files', data.vehicle_id] });
      toast.success('تم حذف الوثيقة بنجاح');
    },
    onError: () => {
      toast.error('فشل حذف الوثيقة');
    }
  });
}

// Hook لتحميل وثيقة المركبة
function useDownloadVehicleDocument() {
  return useMutation({
    mutationFn: async (document: VehicleDocumentFile) => {
      if (!document.document_url) {
        throw new Error('مسار الملف غير موجود');
      }

      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.document_url);

      if (error) throw error;

      // إنشاء رابط التحميل
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.document_name || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data;
    },
    onSuccess: () => {
      toast.success('تم تحميل الوثيقة بنجاح');
    },
    onError: () => {
      toast.error('فشل تحميل الوثيقة');
    }
  });
}

export function VehicleDocumentsPanel({ vehicleId, documents = [], onDocumentAdd }: VehicleDocumentsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: documentFiles = [], isLoading } = useVehicleDocumentFiles(vehicleId);
  const uploadDocument = useUploadVehicleDocument();
  const deleteDocument = useDeleteVehicleDocument();
  const downloadDocument = useDownloadVehicleDocument();

  const form = useForm<DocumentFormData>({
    defaultValues: {
      document_type: "registration",
      document_name: "",
      document_number: "",
      issue_date: "",
      expiry_date: "",
      issuer: "",
      notes: "",
    }
  });

  const handleFileUpload = useCallback(async (file: File) => {
    if (!vehicleId) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)');
      return;
    }

    setIsUploading(true);
    try {
      await uploadDocument.mutateAsync({
        vehicleId,
        file,
        documentType: 'other',
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [vehicleId, uploadDocument]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    for (const file of acceptedFiles) {
      await handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await handleFileUpload(file);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    for (const file of Array.from(files)) {
      await handleFileUpload(file);
    }
    
    event.target.value = '';
  };

  const onSubmit = async (data: DocumentFormData) => {
    const newDocument = {
      id: Date.now().toString(),
      vehicle_id: vehicleId,
      ...data,
      created_at: new Date().toISOString(),
    };
    
    if (onDocumentAdd) {
      onDocumentAdd(newDocument);
    }
    
    setShowForm(false);
    form.reset();
  };

  const getDocumentTypeLabel = (type: string) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType?.label_ar || type;
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return expiry <= thirtyDaysFromNow;
  };

  // دمج الوثائق من المصدرين
  const allDocuments = [...documentFiles, ...documents];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* العنوان وزر الرفع */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Folder className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-teal-900">وثائق المركبة</h3>
            <p className="text-sm text-teal-600">{allDocuments.length} وثيقة</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-teal-200 text-teal-600 hover:bg-teal-50 hover:border-teal-300"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              جاري الرفع...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              رفع وثيقة
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          multiple
        />
      </div>

      {/* منطقة السحب والإفلات */}
      <div
        {...getRootProps()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropFiles}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 mb-6
          ${dropzoneActive || isDragActive 
            ? 'border-teal-500 bg-teal-50/50 shadow-lg shadow-teal-500/10' 
            : 'border-teal-200 hover:border-teal-400 hover:bg-teal-50/30'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence>
          {isUploading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <RefreshCw className="w-10 h-10 text-teal-500 animate-spin" />
              <p className="text-teal-700 font-medium">جاري رفع الوثيقة...</p>
            </motion.div>
          ) : dropzoneActive || isDragActive ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center">
                <Upload className="w-7 h-7 text-teal-600" />
              </div>
              <p className="text-teal-700 font-medium">أفلت الملفات هنا...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                <FileImage className="w-7 h-7 text-teal-500" />
              </div>
              <div>
                <p className="text-teal-900 font-medium">اسحب وأفلت الملفات هنا</p>
                <p className="text-sm text-teal-600 mt-1">أو انقر لاختيار الملفات</p>
              </div>
              <p className="text-xs text-teal-500 mt-2">
                الصيغ المدعومة: PDF, JPG, PNG, DOC, DOCX (حتى 10MB)
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* عرض الوثائق */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      ) : allDocuments.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* وثائق الملفات المرفوعة */}
          {documentFiles.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/10 transition-all cursor-pointer"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center relative">
                <FileImage className="w-10 h-10 text-teal-400" />
                {doc.expiry_date && isExpiringSoon(doc.expiry_date) && (
                  <div className="absolute top-2 right-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-slate-900 truncate">{doc.document_name || 'وثيقة'}</p>
                <Badge variant="outline" className="text-[10px] mt-1 bg-white/50">
                  {getDocumentTypeLabel(doc.document_type)}
                </Badge>
                {doc.expiry_date && (
                  <p className={`text-[10px] mt-1 flex items-center gap-1 ${isExpiringSoon(doc.expiry_date) ? 'text-red-500' : 'text-slate-500'}`}>
                    <Calendar className="w-3 h-3" />
                    {format(new Date(doc.expiry_date), 'dd/MM/yyyy')}
                  </p>
                )}
                {!doc.expiry_date && doc.created_at && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-teal-900/80 to-teal-800/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                {doc.document_url && (
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadDocument.mutate(doc);
                    }}
                  >
                    <Download className="w-4 h-4 text-white" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 border-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('هل أنت متأكد من حذف هذه الوثيقة؟')) {
                      deleteDocument.mutate(doc);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </Button>
              </div>
            </motion.div>
          ))}

          {/* الوثائق التقليدية (من props) */}
          {documents.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (documentFiles.length + index) * 0.05 }}
              className="group relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/10 transition-all cursor-pointer"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center relative">
                <FileText className="w-10 h-10 text-amber-400" />
                {doc.expiry_date && isExpiringSoon(doc.expiry_date) && (
                  <div className="absolute top-2 right-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-slate-900 truncate">{doc.document_name}</p>
                <Badge variant="outline" className="text-[10px] mt-1 bg-white/50">
                  {getDocumentTypeLabel(doc.document_type)}
                </Badge>
                {doc.expiry_date && (
                  <p className={`text-[10px] mt-1 flex items-center gap-1 ${isExpiringSoon(doc.expiry_date) ? 'text-red-500' : 'text-slate-500'}`}>
                    <Calendar className="w-3 h-3" />
                    {format(new Date(doc.expiry_date), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/80 to-amber-800/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 border-0">
                  <Eye className="w-4 h-4 text-white" />
                </Button>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 border-0">
                  <Download className="w-4 h-4 text-white" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {['الترخيص', 'التأمين', 'الفحص الدوري', 'فاتورة الشراء'].map((placeholder, index) => (
            <div
              key={index}
              className="aspect-[4/3] bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-dashed border-teal-200 flex flex-col items-center justify-center text-teal-400 hover:border-teal-400 hover:text-teal-600 transition-all cursor-pointer hover:shadow-sm hover:shadow-teal-500/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileImage className="w-8 h-8 mb-2" />
              <p className="text-xs font-medium">{placeholder}</p>
            </div>
          ))}
        </div>
      )}

      {/* نموذج إضافة وثيقة (اختياري) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة وثيقة جديدة</DialogTitle>
            <DialogDescription>
              تسجيل وثيقة أو مستند خاص بالمركبة
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="document_type">نوع الوثيقة</Label>
              <select
                id="document_type"
                className="w-full p-2 border rounded"
                {...form.register("document_type")}
              >
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label_ar}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="document_name">اسم الوثيقة</Label>
              <Input
                id="document_name"
                {...form.register("document_name", { required: true })}
              />
            </div>
            <div>
              <Label htmlFor="document_number">رقم الوثيقة</Label>
              <Input
                id="document_number"
                {...form.register("document_number")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issue_date">تاريخ الإصدار</Label>
                <Input
                  id="issue_date"
                  type="date"
                  {...form.register("issue_date")}
                />
              </div>
              <div>
                <Label htmlFor="expiry_date">تاريخ الانتهاء</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  {...form.register("expiry_date")}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="issuer">الجهة المصدرة</Label>
              <Input
                id="issuer"
                {...form.register("issuer")}
              />
            </div>
            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <textarea
                id="notes"
                className="w-full p-2 border rounded"
                rows={3}
                {...form.register("notes")}
              />
            </div>
            <div className="flex justify-end space-x-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                إلغاء
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                حفظ الوثيقة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

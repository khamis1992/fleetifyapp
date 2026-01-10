import * as React from 'react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  X,
  FileImage,
  File,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface DocumentUploadData {
  document_type: string;
  document_name: string;
  file?: File;
  notes?: string;
  is_required: boolean;
}

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DocumentUploadData) => Promise<void>;
  isSubmitting?: boolean;
}

const documentTypes = [
  { value: 'general', label: 'عام' },
  { value: 'contract', label: 'عقد' },
  { value: 'signed_contract', label: 'عقد موقع' },
  { value: 'draft_contract', label: 'مسودة عقد' },
  { value: 'condition_report', label: 'تقرير حالة المركبة' },
  { value: 'signature', label: 'توقيع' },
  { value: 'insurance', label: 'تأمين' },
  { value: 'identity', label: 'هوية' },
  { value: 'license', label: 'رخصة' },
  { value: 'receipt', label: 'إيصال' },
  { value: 'other', label: 'أخرى' }
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_FILE_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.csv',
  '.xlsx',
  '.xls',
  '.json',
  '.txt',
  '.zip',
  '.rar'
];

interface FileWithPreview extends File {
  preview?: string;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false
}: DocumentUploadDialogProps) {
  const [documentType, setDocumentType] = useState<string>('general');
  const [documentName, setDocumentName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `حجم الملف كبير جداً. الحد الأقصى 100 ميجابايت`
      };
    }

    // Check file extension
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FILE_TYPES.includes(fileExt)) {
      return {
        valid: false,
        error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${ACCEPTED_FILE_TYPES.join(', ')}`
      };
    }

    return { valid: true };
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Create preview for images
    const fileWithPreview = file as FileWithPreview;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        fileWithPreview.preview = reader.result as string;
        setSelectedFile(fileWithPreview);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(fileWithPreview);
    }

    // Auto-fill document name if empty
    if (!documentName) {
      setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
    }

    toast.success(`تم اختيار الملف: ${file.name}`);
  }, [documentName, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentName.trim()) {
      toast.error('يرجى إدخال اسم المستند');
      return;
    }

    if (!selectedFile) {
      toast.error('يرجى اختيار ملف');
      return;
    }

    // Simulate upload progress
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      await onSubmit({
        document_type: documentType,
        document_name: documentName.trim(),
        file: selectedFile,
        notes: notes.trim() || undefined,
        is_required: isRequired
      });

      setUploadProgress(100);
      clearInterval(progressInterval);

      // Reset form
      setTimeout(() => {
        setDocumentType('general');
        setDocumentName('');
        setSelectedFile(null);
        setNotes('');
        setIsRequired(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onOpenChange(false);
      }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      // Error handling is done by the parent component
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' بايت';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' كيلوبايت';
    return (bytes / (1024 * 1024)).toFixed(1) + ' ميجابايت';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImage className="h-8 w-8 text-emerald-500" />;
    if (file.type === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-slate-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            إضافة مستند جديد
          </DialogTitle>
          <DialogDescription>
            قم برفع مستندات العقد كالصور، ملفات PDF، والمستندات الرقمية الأخرى
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="document_type" className="text-base font-medium">نوع المستند</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="document_type" className="w-full h-11">
                <SelectValue placeholder="اختر نوع المستند" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="document_name" className="text-base font-medium">اسم المستند</Label>
            <Input
              id="document_name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="أدخل اسم المستند"
              className="h-11"
              required
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label className="text-base font-medium">رفع الملف</Label>
            {!selectedFile ? (
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
                  isDragging
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-300 hover:border-teal-400 hover:bg-slate-50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_FILE_TYPES.join(',')}
                  onChange={handleFileInputChange}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                    isDragging ? "bg-teal-100" : "bg-slate-100"
                  )}>
                    <Upload className={cn(
                      "w-8 h-8 transition-colors",
                      isDragging ? "text-teal-600" : "text-slate-400"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      اسحب الملف هنا أو انقر للاختيار
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      الحد الأقصى: 100 ميجابايت • {ACCEPTED_FILE_TYPES.length+1} نوع مدعوم
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-xl p-4 bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getFileIcon(selectedFile)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 h-8 w-8 p-0"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {selectedFile.preview && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={selectedFile.preview}
                      alt="معاينة"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium">ملاحظات (اختياري)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات إضافية..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Required Checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <Checkbox
              id="is_required"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(checked as boolean)}
            />
            <Label htmlFor="is_required" className="cursor-pointer font-medium">
              مستند مطلوب
            </Label>
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">جاري الرفع...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Footer Actions */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="flex-1 sm:flex-none bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 ml-2" />
                  حفظ المستند
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

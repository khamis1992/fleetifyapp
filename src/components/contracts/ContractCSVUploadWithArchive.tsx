import { useState } from "react";
import Papa from "papaparse";
import { useContractCSVUpload } from "@/hooks/useContractCSVUpload";
import { useIntelligentContractProcessor } from "@/hooks/useIntelligentContractProcessor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Archive, FolderOpen, Brain, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { CSVArchiveManager } from "@/components/csv/CSVArchiveManager";
import { CSVArchiveSelector } from "@/components/csv/CSVArchiveSelector";
import { CSVArchiveEntry } from "@/hooks/useCSVArchive";
import { IntelligentContractPreview } from "@/components/contracts/IntelligentContractPreview";
import { normalizeCsvHeaders } from "@/utils/csv";

interface ContractCSVUploadWithArchiveProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function ContractCSVUploadWithArchive({ open, onOpenChange, onUploadComplete }: ContractCSVUploadWithArchiveProps) {
  const [file, setFile] = useState<File | null>(null);
  const [archiveFile, setArchiveFile] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [showArchiveSelector, setShowArchiveSelector] = useState(false);
  const [selectedArchiveEntry, setSelectedArchiveEntry] = useState<CSVArchiveEntry | null>(null);
  const [enableAI, setEnableAI] = useState(true);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'processing'>('upload');
  
  const { uploadContracts, progress, results } = useContractCSVUpload();
  const { 
    processContractData, 
    applyCorrections, 
    getProcessedCSVData,
    clearPreview,
    isProcessing,
    processingProgress,
    preview 
  } = useIntelligentContractProcessor();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('يرجى اختيار ملف CSV صحيح');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleFileFromArchive = (selectedFile: File, archiveEntry: CSVArchiveEntry) => {
    setFile(selectedFile);
    setSelectedArchiveEntry(archiveEntry);
    setShowArchiveSelector(false);
  };

  const handleIntelligentProcess = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً');
      return;
    }

    try {
      setCurrentStep('processing');
      
      // Parse CSV file
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' });
      const rawData = (parsed.data as any[]).filter(Boolean);
      
      // Normalize headers and add row numbers
      const normalizedData = rawData.map((row, idx) => ({
        ...normalizeCsvHeaders(row, 'contract'),
        rowNumber: idx + 2 // Account for header row
      }));

      console.log('📊 [INTELLIGENT_UPLOAD] Processing', normalizedData.length, 'contracts');
      
      // Process with AI
      await processContractData(normalizedData, {
        enableAI,
        autoApplyFixes: true,
        skipValidation: false
      });
      
      setCurrentStep('preview');
      
    } catch (error) {
      console.error('Intelligent processing error:', error);
      toast.error('فشل في المعالجة الذكية للبيانات');
      setCurrentStep('upload');
    }
  };

  const handleProceedWithProcessedData = async () => {
    if (!preview) return;

    try {
      setCurrentStep('processing');
      
      // Convert processed data back to CSV format
      const processedData = getProcessedCSVData();
      const csvContent = Papa.unparse(processedData);
      const processedFile = new File([csvContent], file?.name || 'processed_contracts.csv', { type: 'text/csv' });
      
      await uploadContracts(processedFile, archiveFile);
      onUploadComplete();
      
      if (archiveFile) {
        toast.success('تم رفع العقود المعالجة وحفظ الملف في الأرشيف بنجاح');
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('فشل في رفع البيانات المعالجة');
    }
  };

  const handleCancel = () => {
    setCurrentStep('upload');
    clearPreview();
    setFile(null);
    setSelectedArchiveEntry(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              النظام الذكي لمعالجة العقود
            </DialogTitle>
            <DialogDescription>
              معالجة ذكية لملفات CSV مع إصلاح تلقائي للأخطاء واقتراحات تحسينات
            </DialogDescription>
          </DialogHeader>

          {currentStep === 'upload' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">اختيار ملف CSV</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setShowArchiveSelector(true)}
                    className="px-3"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    من الأرشيف
                  </Button>
                </div>
                {selectedArchiveEntry && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <span className="text-blue-700">
                      تم اختيار من الأرشيف: {selectedArchiveEntry.original_file_name}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="enable-ai"
                    checked={enableAI}
                    onCheckedChange={setEnableAI}
                  />
                  <Label htmlFor="enable-ai" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    تفعيل المعالجة الذكية
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="archive-file"
                    checked={archiveFile}
                    onCheckedChange={setArchiveFile}
                  />
                  <Label htmlFor="archive-file">حفظ الملف في الأرشيف</Label>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setShowArchive(true)}>
                  <Archive className="h-4 w-4 mr-2" />
                  عرض الأرشيف
                </Button>
                
                <div className="space-x-2 space-x-reverse">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    إلغاء
                  </Button>
                  <Button 
                    onClick={handleIntelligentProcess}
                    disabled={!file}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    معالجة ذكية
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'processing' && (
            <div className="space-y-4 text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">جاري المعالجة الذكية...</h3>
                <Progress value={isProcessing ? processingProgress : progress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {isProcessing 
                    ? `معالجة البيانات بالذكاء الاصطناعي... ${processingProgress}%`
                    : `رفع البيانات... ${progress}%`
                  }
                </p>
              </div>
            </div>
          )}

          {currentStep === 'preview' && preview && (
            <IntelligentContractPreview
              preview={preview}
              onApplyCorrections={applyCorrections}
              onProceedWithData={handleProceedWithProcessedData}
              onCancel={handleCancel}
            />
          )}

          {results && currentStep === 'upload' && (
            <div className="p-4 bg-muted rounded-lg">
              <p>تم معالجة {results.total} صف</p>
              <p className="text-success">نجح: {results.successful}</p>
              <p className="text-destructive">فشل: {results.failed}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CSVArchiveManager 
        open={showArchive} 
        onOpenChange={setShowArchive}
      />

      <CSVArchiveSelector
        open={showArchiveSelector}
        onOpenChange={setShowArchiveSelector}
        onFileSelected={handleFileFromArchive}
        uploadType="contracts"
      />
    </>
  );
}
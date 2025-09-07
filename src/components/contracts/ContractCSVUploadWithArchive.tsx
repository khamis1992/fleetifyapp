import { useState } from "react";
import { useContractCSVUpload } from "@/hooks/useContractCSVUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Archive } from "lucide-react";
import { toast } from "sonner";
import { CSVArchiveManager } from "@/components/csv/CSVArchiveManager";

interface ContractCSVUploadWithArchiveProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function ContractCSVUploadWithArchive({ open, onOpenChange, onUploadComplete }: ContractCSVUploadWithArchiveProps) {
  const [file, setFile] = useState<File | null>(null);
  const [archiveFile, setArchiveFile] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const { uploadContracts, isUploading, progress, results } = useContractCSVUpload();

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

  const handleUpload = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً');
      return;
    }

    try {
      await uploadContracts(file, archiveFile);
      onUploadComplete();
      if (archiveFile) {
        toast.success('تم رفع العقود وحفظ الملف في الأرشيف بنجاح');
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>رفع ملف العقود مع الأرشفة</DialogTitle>
            <DialogDescription>
              رفع ملف CSV للعقود مع إمكانية حفظه في الأرشيف للمراجعة المستقبلية
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-file">اختيار ملف CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-2"
              />
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="archive-file"
                checked={archiveFile}
                onCheckedChange={setArchiveFile}
              />
              <Label htmlFor="archive-file">حفظ الملف في الأرشيف</Label>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground">جاري المعالجة... {progress}%</p>
              </div>
            )}

            {results && (
              <div className="p-4 bg-muted rounded-lg">
                <p>تم معالجة {results.total} صف</p>
                <p className="text-success">نجح: {results.successful}</p>
                <p className="text-destructive">فشل: {results.failed}</p>
              </div>
            )}

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
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'جاري الرفع...' : 'رفع الملف'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CSVArchiveManager 
        open={showArchive} 
        onOpenChange={setShowArchive}
      />
    </>
  );
}
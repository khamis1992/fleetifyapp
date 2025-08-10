import { useState } from "react";
import { useVehicleCSVUpload } from "@/hooks/useVehicleCSVUpload";
import { SmartCSVUpload } from "@/components/csv/SmartCSVUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Download, FileText, AlertCircle, CheckCircle, Zap } from "lucide-react";
import { toast } from "sonner";

interface VehicleCSVUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

export function VehicleCSVUpload({ open, onOpenChange, onUploadComplete }: VehicleCSVUploadProps) {
  const [uploadMode, setUploadMode] = useState<'classic' | 'smart'>('smart');
  const [file, setFile] = useState<File | null>(null);
  const { 
    uploadVehicles, 
    smartUploadVehicles,
    isUploading, 
    progress, 
    results, 
    downloadTemplate,
    vehicleFieldTypes,
    vehicleRequiredFields
  } = useVehicleCSVUpload();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('يرجى اختيار ملف CSV صحيح')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً')
      return
    }

    try {
      const res = await uploadVehicles(file)
      
      // Handle results after upload completes
      if (res) {
        const skipped = Number((res as any).skipped || 0)
        if (res.successful > 0) {
          if ((res.failed > 0) || skipped > 0) {
            toast.success(`تم رفع ${res.successful} مركبة، تم تخطي ${skipped} مكررة، وفشل ${res.failed} مركبة`)
          } else {
            toast.success(`تم رفع جميع المركبات بنجاح (${res.successful} مركبة)`)
          }
          onUploadComplete()
        } else if (res.successful === 0 && skipped > 0 && res.failed === 0) {
          toast.message('لا توجد مركبات جديدة', { description: `تم تخطي جميع السجلات لأنها مكررة (${skipped}/${res.total})` })
        } else if (res.failed > 0) {
          toast.error(`فشل رفع جميع المركبات (${res.failed} مركبة). يرجى مراجعة الأخطاء أدناه.`)
        } else {
          toast.error('لم يتم رفع أي مركبة. يرجى التحقق من تنسيق الملف.')
        }
      }
    } catch (error: any) {
      console.error('❌ [VEHICLE_CSV_UPLOAD_COMPONENT] Upload failed:', error)
      toast.error(error.message || 'حدث خطأ أثناء رفع الملف')
    }
  }

  const handleDownloadTemplate = () => {
    downloadTemplate()
    toast.success('تم تحميل القالب')
  }

  const handleDownloadErrors = () => {
    if (!results?.errors?.length) return
    const headers = ['row', 'message']
    const rows = results.errors.map(e => [e.row, e.message])
    const csv = [
      headers.join(','),
      ...rows.map(arr => arr.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'vehicle_upload_errors.csv'
    link.click()
  }

  const handleClose = () => {
    setFile(null)
    onOpenChange(false)
  }

  // عرض الرفع الذكي أو التقليدي حسب الاختيار
  if (uploadMode === 'smart') {
    return (
      <SmartCSVUpload
        open={open}
        onOpenChange={onOpenChange}
        onUploadComplete={onUploadComplete}
        entityType="vehicle"
        uploadFunction={smartUploadVehicles}
        downloadTemplate={downloadTemplate}
        fieldTypes={vehicleFieldTypes}
        requiredFields={vehicleRequiredFields}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع المركبات من ملف CSV
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>الطريقة التقليدية لرفع ملفات CSV</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setUploadMode('smart')}
              className="flex items-center gap-1"
            >
              <Zap className="h-3 w-3" />
              التبديل للرفع الذكي
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* تحميل القالب */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-900">قالب CSV</h4>
                  <p className="text-sm text-blue-700">
                    حمل القالب لمعرفة التنسيق المطلوب
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                تحميل القالب
              </Button>
            </div>
          </div>

          {/* اختيار الملف */}
          <div className="space-y-2">
            <label className="text-sm font-medium">اختر ملف CSV</label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                تم اختيار الملف: {file.name}
              </div>
            )}
          </div>

          {/* شريط التقدم */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>جاري المعالجة...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* النتائج */}
          {results && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                  <div className="text-sm text-green-700">تم بنجاح</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{Number((results as any).skipped || 0)}</div>
                  <div className="text-sm text-yellow-700">تم التخطي</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-red-700">فشل</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                  <div className="text-sm text-blue-700">المجموع</div>
                </div>
              </div>

              {/* أخطاء مفصلة */}
              {results.errors && results.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-red-900">الأخطاء:</h4>
                    <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
                      تنزيل تقرير الأخطاء CSV
                    </Button>
                  </div>
                  <ScrollArea className="h-32 w-full border rounded-md p-2">
                    <div className="space-y-1">
                      {results.errors.map((error, index) => (
                        <div key={index} className="text-sm">
                          <Badge variant="destructive" className="text-xs">
                            السطر {error.row}
                          </Badge>
                          <span className="ml-2 text-red-600">{error.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* أزرار العمل */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>جاري الرفع...</>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  رفع الملف
                </>
              )}
            </Button>
          </div>

          {/* تعليمات */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>ملاحظات مهمة:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                <li>يجب أن يكون الملف بصيغة CSV</li>
                <li>استخدم القالب المحدد لضمان التنسيق الصحيح</li>
                <li>رقم اللوحة، الشركة المصنعة، الطراز وسنة الصنع مطلوبة</li>
                <li>التواريخ يجب أن تكون بتنسيق YYYY-MM-DD</li>
                <li>حالة المركبة: available, rented, maintenance, out_of_service, reserved, accident, stolen, police_station</li>
                <li>يمكن إدخال القيمة reserve وسيتم تحويلها تلقائياً إلى reserved</li>
                <li>سيتم تخطي الصفوف التي تحتوي على أخطاء</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}
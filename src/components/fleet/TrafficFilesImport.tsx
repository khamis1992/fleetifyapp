import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import {
  importTrafficFilesByPlate,
  type TrafficFileImportResult,
} from '@/services/trafficViolationDocumentService';
import {
  clearTrafficFilesImportReport,
  clearTrafficFilesImportQueue,
  loadTrafficFilesImportReport,
  loadTrafficFilesImportQueue,
  saveTrafficFilesImportReport,
  saveTrafficFilesImportQueue,
} from '@/utils/trafficViolationImportSession';
import { toast } from 'sonner';

const fileIdentity = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
const plateFromFileName = (fileName: string) => fileName.replace(/\.pdf$/i, '').trim();

export function TrafficFilesImport() {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<TrafficFileImportResult[]>([]);
  const [reportSavedAt, setReportSavedAt] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [isQueueRestored, setIsQueueRestored] = useState(false);
  const activeCompanyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsQueueRestored(false);
    setFiles([]);
    setResults([]);
    setReportSavedAt(null);
    activeCompanyRef.current = companyId || null;

    if (!companyId) {
      setIsQueueRestored(true);
      return () => { cancelled = true; };
    }

    Promise.all([
      loadTrafficFilesImportQueue(companyId),
      loadTrafficFilesImportReport(companyId),
    ])
      .then(([storedFiles, storedReport]) => {
        if (!cancelled && activeCompanyRef.current === companyId) {
          setFiles(storedFiles);
          setResults(storedReport?.results || []);
          setReportSavedAt(storedReport?.savedAt || null);
        }
      })
      .catch(error => {
        console.error('[TrafficFilesImport] Failed to restore queue:', error);
        if (!cancelled) toast.error('تعذر استعادة ملفات المرور المحفوظة');
      })
      .finally(() => {
        if (!cancelled && activeCompanyRef.current === companyId) {
          setIsQueueRestored(true);
        }
      });

    return () => { cancelled = true; };
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !isQueueRestored || activeCompanyRef.current !== companyId) return;

    saveTrafficFilesImportQueue(companyId, files).catch(error => {
      console.error('[TrafficFilesImport] Failed to persist queue:', error);
      toast.error('تعذر حفظ جلسة ملفات المرور');
    });
  }, [companyId, files, isQueueRestored]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    setFiles(current => {
      const existing = new Set(current.map(fileIdentity));
      return [...current, ...pdfFiles.filter(file => !existing.has(fileIdentity(file)))];
    });
    if (pdfFiles.length !== acceptedFiles.length) {
      toast.warning('تم تجاهل الملفات التي ليست بصيغة PDF');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    disabled: isImporting,
  });

  const removeFile = (target: File) => {
    const identity = fileIdentity(target);
    setFiles(current => current.filter(file => fileIdentity(file) !== identity));
  };

  const clearFiles = () => {
    setFiles([]);
    if (companyId) {
      clearTrafficFilesImportQueue(companyId).catch(error => {
        console.error('[TrafficFilesImport] Failed to clear queue:', error);
        toast.error('تعذر مسح ملفات المرور المحفوظة');
      });
    }
  };

  const clearReport = async () => {
    setResults([]);
    setReportSavedAt(null);
    if (!companyId) return;

    try {
      await clearTrafficFilesImportReport(companyId);
      toast.success('تم مسح تقرير ملفات المرور');
    } catch (error) {
      console.error('[TrafficFilesImport] Failed to clear report:', error);
      toast.error('تعذر مسح تقرير ملفات المرور المحفوظ');
    }
  };

  const importFiles = async () => {
    if (!companyId || files.length === 0) return;
    setIsImporting(true);
    setCompleted(0);
    try {
      const importResults = await importTrafficFilesByPlate({
        companyId,
        files,
        onProgress: done => setCompleted(done),
      });
      await queryClient.invalidateQueries({ queryKey: ['vehicle-traffic-files'] });
      setResults(importResults);
      try {
        const savedAt = await saveTrafficFilesImportReport(companyId, importResults);
        setReportSavedAt(savedAt);
      } catch (error) {
        console.error('[TrafficFilesImport] Failed to persist report:', error);
        toast.error('تم الاستيراد، لكن تعذر حفظ التقرير للرجوع إليه لاحقًا');
      }
      const attached = importResults.reduce((sum, result) => sum + result.attached, 0);
      const failed = importResults.filter(result => result.status === 'error').length;
      if (failed > 0) {
        toast.warning(`تم ربط ${attached} نسخة، وتحتاج ${failed} ملفات إلى مراجعة`);
      } else {
        toast.success(`تمت معالجة ${importResults.length} ملفات وربط ${attached} نسخة بالسجلات المطابقة`);
      }
    } catch (error) {
      console.error('[TrafficFilesImport] Import failed:', error);
      toast.error(error instanceof Error ? error.message : 'تعذر استيراد ملفات المرور');
    } finally {
      setIsImporting(false);
    }
  };

  const progress = files.length > 0 ? Math.round((completed / files.length) * 100) : 0;
  const attachedCount = results.filter(result => result.status === 'attached').length;
  const existingCount = results.filter(result => result.status === 'existing').length;
  const errorCount = results.filter(result => result.status === 'error').length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div
        {...getRootProps()}
        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-[8px] border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive ? 'border-[#22C7A1] bg-[#ECFDF8]' : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#22C7A1]'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-[#173A63]" />
        <strong className="text-sm text-[#020617]">رفع ملفات المرور PDF</strong>
        <span className="text-xs text-[#64748B]">اسم الملف هو رقم المركبة، مثال: 2766.pdf</span>
      </div>

      {files.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-[#020617]">الملفات المحددة</h3>
              <span className="text-sm text-[#64748B]">{files.length} ملف</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={clearFiles} disabled={isImporting}>
                مسح الكل
              </Button>
              <Button type="button" onClick={importFiles} disabled={isImporting || !companyId} className="gap-2 bg-[#22C7A1] text-white hover:bg-[#18A989]">
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                استيراد وربط الملفات
              </Button>
            </div>
          </div>

          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} />
              <div className="text-sm font-bold text-[#64748B]">{completed} من {files.length}</div>
            </div>
          )}

          <div className="max-h-72 overflow-auto rounded-[8px] border border-[#DDE5EF]">
            {files.map(file => (
              <div key={fileIdentity(file)} className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3 last:border-0">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-[#173A63]" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[#020617]">{file.name}</div>
                    <div className="text-xs text-[#64748B]">لوحة {plateFromFileName(file.name)}</div>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(file)} disabled={isImporting} aria-label={`حذف ${file.name}`} title="حذف الملف">
                  <Trash2 className="h-4 w-4 text-[#EF4444]" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-[#020617]">آخر تقرير محفوظ</h3>
              {reportSavedAt && (
                <span className="text-xs text-[#64748B]">
                  {new Intl.DateTimeFormat('ar-QA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(reportSavedAt))}
                </span>
              )}
            </div>
            <Button type="button" variant="outline" onClick={clearReport} disabled={isImporting} className="gap-2 text-[#B91C1C]">
              <Trash2 className="h-4 w-4" />
              مسح التقرير
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[8px] border border-[#A7F3D0] bg-[#ECFDF5] p-3"><strong className="block text-xl text-[#047857]">{attachedCount}</strong><span className="text-xs text-[#065F46]">تم الربط</span></div>
            <div className="rounded-[8px] border border-[#BFDBFE] bg-[#EFF6FF] p-3"><strong className="block text-xl text-[#1D4ED8]">{existingCount}</strong><span className="text-xs text-[#1E40AF]">موجود مسبقًا</span></div>
            <div className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] p-3"><strong className="block text-xl text-[#DC2626]">{errorCount}</strong><span className="text-xs text-[#991B1B]">تحتاج مراجعة</span></div>
          </div>

          <div className="overflow-x-auto rounded-[8px] border border-[#DDE5EF]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الملف</TableHead>
                  <TableHead>المركبة</TableHead>
                  <TableHead>العقود</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(result => (
                  <TableRow key={result.fileName}>
                    <TableCell className="font-bold">{result.fileName}</TableCell>
                    <TableCell className="font-mono">
                      {result.vehicleId ? (
                        <Link to={`/fleet/vehicles/${result.vehicleId}`} className="font-bold text-[#173A63] underline underline-offset-2">
                          {result.plateNumber}
                        </Link>
                      ) : result.plateNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {result.contractNumbers.length > 0
                          ? result.contractNumbers.map(contractNumber => (
                              <Link key={contractNumber} to={`/contracts/${encodeURIComponent(contractNumber)}`} className="text-sm font-bold text-[#173A63] underline underline-offset-2">
                                {contractNumber}
                              </Link>
                            ))
                          : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={result.status === 'error' ? 'bg-[#FEE2E2] text-[#B91C1C]' : result.status === 'existing' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-[#D1FAE5] text-[#047857]'}>
                          {result.status === 'error' ? <AlertTriangle className="me-1 h-3 w-3" /> : <CheckCircle2 className="me-1 h-3 w-3" />}
                          {result.status === 'attached' ? 'تم الربط' : result.status === 'existing' ? 'موجود مسبقًا' : 'مراجعة'}
                        </Badge>
                        <div className="text-xs text-[#64748B]">{result.message}</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ExternalLink, Eye, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { TRAFFIC_VIOLATION_VEHICLE_DOCUMENT_TYPE } from '@/services/trafficViolationDocumentService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface VehicleTrafficFilesCardProps {
  vehicleId: string;
}

interface TrafficDocument {
  id: string;
  document_name: string | null;
  document_url: string | null;
  created_at: string | null;
}

export function VehicleTrafficFilesCard({ vehicleId }: VehicleTrafficFilesCardProps) {
  const { companyId } = useUnifiedCompanyAccess();
  const [previewDocument, setPreviewDocument] = useState<TrafficDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['vehicle-traffic-files', companyId, vehicleId],
    enabled: Boolean(companyId && vehicleId),
    queryFn: async (): Promise<TrafficDocument[]> => {
      if (!companyId) return [];
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('id', vehicleId)
        .eq('company_id', companyId)
        .maybeSingle();
      if (vehicleError) throw vehicleError;
      if (!vehicle) return [];

      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('id, document_name, document_url, created_at')
        .eq('vehicle_id', vehicleId)
        .eq('document_type', TRAFFIC_VIOLATION_VEHICLE_DOCUMENT_TYPE)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createSignedUrl = async (document: TrafficDocument) => {
    if (!document.document_url) throw new Error('مسار الملف غير متوفر');
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.document_url, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  };

  const handlePreview = async (document: TrafficDocument) => {
    setLoadingDocumentId(document.id);
    try {
      const signedUrl = await createSignedUrl(document);
      setPreviewDocument(document);
      setPreviewUrl(signedUrl);
    } catch (error) {
      console.error('[VehicleTrafficFilesCard] Preview failed:', error);
      toast.error('تعذر فتح ملف المرور للمعاينة');
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const handleDownload = async (document: TrafficDocument) => {
    if (!document.document_url) return;
    setLoadingDocumentId(document.id);
    try {
      const { data, error } = await supabase.storage.from('documents').download(document.document_url);
      if (error) throw error;
      const objectUrl = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = `${document.document_name || 'traffic-file'}.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('[VehicleTrafficFilesCard] Download failed:', error);
      toast.error('تعذر تنزيل ملف المرور');
    } finally {
      setLoadingDocumentId(null);
    }
  };

  return (
    <>
      <Card className="border-[#DDE5EF]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#173A63]" />
              ملفات المرور
            </span>
            <span className="rounded-full bg-[#EEF4FA] px-2.5 py-1 text-xs text-[#173A63]">
              {documents.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري تحميل الملفات
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
              لا توجد ملفات مرور مرتبطة بالمركبة
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(document => (
                <div key={document.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {document.document_name || 'ملف مرور'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {document.created_at
                        ? format(new Date(document.created_at), 'dd MMMM yyyy، hh:mm a', { locale: ar })
                        : 'تاريخ الرفع غير متوفر'}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => handlePreview(document)} disabled={loadingDocumentId === document.id}>
                      {loadingDocumentId === document.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      معاينة
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => handleDownload(document)} disabled={loadingDocumentId === document.id}>
                      <Download className="h-4 w-4" />
                      تنزيل
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(previewDocument && previewUrl)}
        onOpenChange={open => {
          if (!open) {
            setPreviewDocument(null);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent dir="rtl" className="h-[92vh] w-[96vw] max-w-6xl grid-rows-[auto_minmax(0,1fr)] p-4 sm:p-6">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>{previewDocument?.document_name || 'معاينة ملف المرور'}</DialogTitle>
            <DialogDescription className="flex items-center justify-between gap-3">
              <span>يمكنك معاينة ملف PDF أو فتحه في نافذة مستقلة.</span>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#173A63] underline">
                  فتح الملف
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <iframe title={previewDocument?.document_name || 'ملف المرور'} src={previewUrl} className="h-full min-h-0 w-full rounded-lg border border-slate-200 bg-slate-50" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

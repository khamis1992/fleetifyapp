import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { VehicleConditionReport } from './VehicleConditionReport';
import { useVehicleConditionReports, useCreateConditionReportForPermit } from '@/hooks/useVehicleCondition';
import { Loader2, Plus, FileText, AlertTriangle } from 'lucide-react';

interface VehicleConditionReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permitId: string;
  vehicleId: string;
  vehicleName: string;
}

export const VehicleConditionReportDialog: React.FC<VehicleConditionReportDialogProps> = ({
  open,
  onOpenChange,
  permitId,
  vehicleId,
  vehicleName
}) => {
  const [activeTab, setActiveTab] = useState('pre');
  const { data: reports, isLoading } = useVehicleConditionReports(permitId);
  const createReportMutation = useCreateConditionReportForPermit();

  const preDispatchReports = reports?.filter(r => r.inspection_type === 'pre_dispatch') || [];
  const postDispatchReports = reports?.filter(r => r.inspection_type === 'post_dispatch') || [];

  const handleCreateReport = async (type: 'pre_dispatch' | 'post_dispatch') => {
    await createReportMutation.mutateAsync({
      permitId,
      inspectionType: type
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'requires_attention': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">جاري تحميل تقارير حالة المركبة...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تقارير حالة المركبة - {vehicleName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pre" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              فحص ما قبل الإرسال
              {preDispatchReports.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {preDispatchReports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="post" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              فحص ما بعد الإرسال
              {postDispatchReports.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {postDispatchReports.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pre" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">فحص ما قبل الإرسال</h3>
              {preDispatchReports.length === 0 && (
                <Button 
                  onClick={() => handleCreateReport('pre_dispatch')}
                  disabled={createReportMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إنشاء تقرير ما قبل الإرسال
                </Button>
              )}
            </div>

            {preDispatchReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">لا يوجد تقرير ما قبل الإرسال</p>
                <p>أنشئ تقرير حالة قبل إرسال المركبة.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {preDispatchReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(report.status)}>
                          {report.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.inspection_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <VehicleConditionReport 
                      report={report}
                      readonly={report.status === 'approved'}
                      onClose={() => onOpenChange(false)}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="post" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">فحص ما بعد الإرسال</h3>
              {postDispatchReports.length === 0 && (
                <Button 
                  onClick={() => handleCreateReport('post_dispatch')}
                  disabled={createReportMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إنشاء تقرير ما بعد الإرسال
                </Button>
              )}
            </div>

            {postDispatchReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">لا يوجد تقرير ما بعد الإرسال</p>
                <p>أنشئ تقرير حالة عند عودة المركبة.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {postDispatchReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(report.status)}>
                          {report.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.inspection_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <VehicleConditionReport 
                      report={report}
                      readonly={report.status === 'approved'}
                      onClose={() => onOpenChange(false)}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
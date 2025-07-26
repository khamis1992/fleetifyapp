import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Pause, XCircle, Play } from 'lucide-react';
import { useUpdateContractStatus } from '@/hooks/useContractRenewal';

interface ContractStatusManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
}

export const ContractStatusManagement: React.FC<ContractStatusManagementProps> = ({
  open,
  onOpenChange,
  contract
}) => {
  const [statusData, setStatusData] = useState({
    status: contract?.status || 'active',
    reason: ''
  });

  const updateStatus = useUpdateContractStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateStatus.mutateAsync({
        contractId: contract.id,
        status: statusData.status,
        reason: statusData.reason
      });
      onOpenChange(false);
      
      // Reset form
      setStatusData({
        status: 'active',
        reason: ''
      });
    } catch (error) {
      console.error('Error updating contract status:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4 text-green-600" />;
      case 'suspended': return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'suspended': return 'معلق';
      case 'cancelled': return 'ملغي';
      case 'expired': return 'منتهي';
      case 'renewed': return 'مجدد';
      default: return status;
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            إدارة حالة العقد رقم {contract.contract_number}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الحالة الحالية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                {getStatusIcon(contract.status)}
                <span className="font-medium">{getStatusText(contract.status)}</span>
              </div>
            </CardContent>
          </Card>

          {/* New Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تغيير الحالة</CardTitle>
              <CardDescription>اختر الحالة الجديدة للعقد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">الحالة الجديدة</Label>
                <Select 
                  value={statusData.status} 
                  onValueChange={(value) => setStatusData({...statusData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-green-600" />
                        نشط
                      </div>
                    </SelectItem>
                    <SelectItem value="suspended">
                      <div className="flex items-center gap-2">
                        <Pause className="h-4 w-4 text-yellow-600" />
                        معلق
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        ملغي
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">سبب التغيير</Label>
                <Textarea
                  id="reason"
                  value={statusData.reason}
                  onChange={(e) => setStatusData({...statusData, reason: e.target.value})}
                  placeholder="اختياري: اذكر سبب تغيير حالة العقد"
                  rows={3}
                />
              </div>

              {/* Warning for cancellation */}
              {statusData.status === 'cancelled' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">تحذير</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    إلغاء العقد سيؤثر على جميع المعاملات المرتبطة به. تأكد من هذا الإجراء.
                  </p>
                </div>
              )}

              {/* Warning for suspension */}
              {statusData.status === 'suspended' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <Pause className="h-4 w-4" />
                    <span className="font-medium">ملاحظة</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">
                    تعليق العقد سيوقف جميع المعاملات المرتبطة به مؤقتاً.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={updateStatus.isPending}
              variant={statusData.status === 'cancelled' ? 'destructive' : 'default'}
            >
              {updateStatus.isPending ? 'جاري التحديث...' : 'تحديث الحالة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
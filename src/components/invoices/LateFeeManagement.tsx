/**
 * Late Fee Management Component
 * 
 * Features:
 * - View pending late fees
 * - Apply fees to invoices
 * - Request/approve waivers
 * - View application history
 * - Automated daily processing
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Ban,
  Play
} from 'lucide-react';

interface LateFee {
  id: string;
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  original_amount: number;
  days_overdue: number;
  fee_amount: number;
  fee_type: string;
  status: 'pending' | 'applied' | 'waived' | 'cancelled';
  created_at: string;
  hours_pending?: number;
}

export const LateFeeManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFee, setSelectedFee] = useState<LateFee | null>(null);
  const [showWaiveDialog, setShowWaiveDialog] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');

  // Fetch pending late fees
  const { data: pendingFees, isLoading } = useQuery({
    queryKey: ['pending-late-fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_late_fees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LateFee[];
    }
  });

  // Manually trigger late fee processing
  const processOverdueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc('process_overdue_invoices' as any);

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: '✅ Processing Complete',
        description: `Processed ${(data as any[])?.length || 0} overdue invoices`,
      });
      queryClient.invalidateQueries({ queryKey: ['pending-late-fees'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Processing Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Apply late fee
  const applyFeeMutation = useMutation({
    mutationFn: async (lateFeeId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('apply_late_fee' as any, {
          p_late_fee_id: lateFeeId,
          p_user_id: user.id
        });

      if (error) throw error;
      
      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to apply late fee');
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: '✅ Late Fee Applied',
        description: 'Fee has been added to the invoice',
      });
      queryClient.invalidateQueries({ queryKey: ['pending-late-fees'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Failed to Apply Fee',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Waive late fee
  const waiveFeeMutation = useMutation({
    mutationFn: async ({ lateFeeId, reason }: { lateFeeId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('waive_late_fee' as any, {
          p_late_fee_id: lateFeeId,
          p_reason: reason,
          p_user_id: user.id
        });

      if (error) throw error;
      
      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to waive late fee');
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: '✅ Late Fee Waived',
        description: 'Fee has been waived successfully',
      });
      setShowWaiveDialog(false);
      setWaiveReason('');
      setSelectedFee(null);
      queryClient.invalidateQueries({ queryKey: ['pending-late-fees'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Failed to Waive Fee',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { label: 'قيد الانتظار', variant: 'secondary' as const, icon: Clock },
      applied: { label: 'تم التطبيق', variant: 'default' as const, icon: CheckCircle },
      waived: { label: 'تم الإعفاء', variant: 'default' as const, icon: Ban },
      cancelled: { label: 'ملغي', variant: 'destructive' as const, icon: XCircle },
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleWaive = () => {
    if (!selectedFee) return;
    
    if (!waiveReason.trim()) {
      toast({
        title: '⚠️ السبب مطلوب',
        description: 'يجب إدخال سبب الإعفاء',
        variant: 'destructive',
      });
      return;
    }

    waiveFeeMutation.mutate({
      lateFeeId: selectedFee.id,
      reason: waiveReason
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة غرامات التأخير</h2>
          <p className="text-sm text-muted-foreground">
            معالجة تلقائية يومية للفواتير المتأخرة
          </p>
        </div>
        
        <Button
          onClick={() => processOverdueMutation.mutate()}
          disabled={processOverdueMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Play className="h-4 w-4 mr-2" />
          {processOverdueMutation.isPending ? 'جاري المعالجة...' : 'معالجة الآن'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">غرامات قيد الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingFees?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الغرامات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingFees?.reduce((sum, fee) => sum + fee.fee_amount, 0).toFixed(3) || '0.000'} د.ك
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">متوسط الغرامة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingFees?.length ? 
                (pendingFees.reduce((sum, fee) => sum + fee.fee_amount, 0) / pendingFees.length).toFixed(3) 
                : '0.000'} د.ك
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">متوسط التأخير</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingFees?.length ?
                Math.round(pendingFees.reduce((sum, fee) => sum + fee.days_overdue, 0) / pendingFees.length)
                : 0} يوم
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-500 bg-blue-50">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <p className="font-medium text-blue-900">المعالجة التلقائية اليومية</p>
          <p className="text-sm text-blue-700">
            يتم فحص الفواتير المتأخرة وتطبيق الغرامات تلقائياً كل يوم. يمكنك أيضاً المعالجة يدوياً باستخدام زر "معالجة الآن".
          </p>
        </AlertDescription>
      </Alert>

      {/* Pending Fees Table */}
      <Card>
        <CardHeader>
          <CardTitle>غرامات قيد الانتظار</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : !pendingFees || pendingFees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p>لا توجد غرامات قيد الانتظار</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>أيام التأخير</TableHead>
                  <TableHead>المبلغ الأصلي</TableHead>
                  <TableHead>الغرامة</TableHead>
                  <TableHead>الوقت المنقضي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingFees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.invoice_number}</TableCell>
                    <TableCell>{fee.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{fee.days_overdue} يوم</Badge>
                    </TableCell>
                    <TableCell>{fee.original_amount.toFixed(3)} د.ك</TableCell>
                    <TableCell className="font-bold text-red-600">
                      {fee.fee_amount.toFixed(3)} د.ك
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {Math.round(fee.hours_pending || 0)} ساعة
                    </TableCell>
                    <TableCell>{getStatusBadge(fee.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => applyFeeMutation.mutate(fee.id)}
                          disabled={applyFeeMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          تطبيق
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFee(fee);
                            setShowWaiveDialog(true);
                          }}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          إعفاء
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Waive Dialog */}
      <Dialog open={showWaiveDialog} onOpenChange={setShowWaiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعفاء من الغرامة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <p className="font-medium text-yellow-900">يتطلب موافقة المدير</p>
                <p className="text-sm text-yellow-700">
                  الإعفاء من الغرامة يتطلب تقديم سبب واضح
                </p>
              </AlertDescription>
            </Alert>

            {selectedFee && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">رقم الفاتورة:</span>
                  <span className="font-medium">{selectedFee.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">العميل:</span>
                  <span className="font-medium">{selectedFee.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">مبلغ الغرامة:</span>
                  <span className="font-bold text-red-600">{selectedFee.fee_amount.toFixed(3)} د.ك</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">أيام التأخير:</span>
                  <span className="font-medium">{selectedFee.days_overdue} يوم</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>سبب الإعفاء (مطلوب)</Label>
              <Textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="مثال: عميل قديم موثوق، ظروف خاصة، خطأ في الفاتورة..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowWaiveDialog(false);
                setWaiveReason('');
                setSelectedFee(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleWaive}
              disabled={waiveFeeMutation.isPending || !waiveReason.trim()}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Ban className="h-4 w-4 mr-2" />
              {waiveFeeMutation.isPending ? 'جاري الإعفاء...' : 'إعفاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

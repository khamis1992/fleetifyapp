/**
 * Contract Amendment Form Component
 * 
 * Allows modifying active contracts with:
 * - Change tracking
 * - Approval workflow
 * - Optional customer re-signature
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, FileEdit, Calendar, DollarSign, FileText, Truck, Check, Loader2 } from 'lucide-react';
import type { Contract } from '@/types/contracts';
import type { AmendmentType, AmendmentFormData } from '@/types/amendment';

interface ContractAmendmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
  onSuccess?: () => void;
}

export const ContractAmendmentForm: React.FC<ContractAmendmentFormProps> = ({
  open,
  onOpenChange,
  contract,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const [formData, setFormData] = useState<AmendmentFormData>({
    amendment_type: 'other',
    amendment_reason: '',
    start_date: contract.start_date,
    end_date: contract.end_date,
    contract_amount: contract.contract_amount,
    monthly_amount: contract.monthly_amount,
    description: contract.description || '',
    terms: contract.terms || '',
    requires_customer_signature: false,
  });

  const [changes, setChanges] = useState<Record<string, boolean>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        amendment_type: 'other',
        amendment_reason: '',
        start_date: contract.start_date,
        end_date: contract.end_date,
        contract_amount: contract.contract_amount,
        monthly_amount: contract.monthly_amount,
        description: contract.description || '',
        terms: contract.terms || '',
        requires_customer_signature: false,
      });
      setChanges({});
    }
  }, [open, contract]);

  // Track changes
  const markFieldAsChanged = (field: string, newValue: any, originalValue: any) => {
    setChanges(prev => ({
      ...prev,
      [field]: newValue !== originalValue
    }));
  };

  const hasChanges = Object.values(changes).some(changed => changed);

  const getAmendmentTypeIcon = (type: AmendmentType) => {
    const icons: Record<AmendmentType, any> = {
      extend_duration: Calendar,
      change_amount: DollarSign,
      change_terms: FileText,
      change_vehicle: Truck,
      change_dates: Calendar,
      change_payment: DollarSign,
      other: FileEdit
    };
    return icons[type];
  };

  const handleSubmit = async () => {
    if (!formData.amendment_reason.trim()) {
      return;
    }

    if (!hasChanges) {
      return;
    }

    setIsUpdating(true);
    try {
      // Build update object with only changed fields
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (changes.start_date) {
        updateData.start_date = formData.start_date;
      }
      if (changes.end_date) {
        updateData.end_date = formData.end_date;
      }
      if (changes.contract_amount) {
        updateData.contract_amount = formData.contract_amount;
      }
      if (changes.monthly_amount) {
        updateData.monthly_amount = formData.monthly_amount;
      }
      if (changes.description) {
        updateData.description = formData.description;
      }
      if (changes.terms) {
        updateData.terms = formData.terms;
      }

      // Update the contract directly
      const { error } = await supabase
        .from('contracts')
        .update(updateData as any)
        .eq('id' as any, contract.id);

      if (error) {
        console.error('Contract update error:', error);
        throw error;
      }

      toast({
        title: '✅ تم تعديل العقد',
        description: `تم تحديث العقد ${contract.contract_number} بنجاح`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating contract:', error);
      toast({
        title: '❌ فشل تعديل العقد',
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  void getAmendmentTypeIcon(formData.amendment_type); // Available for future use

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            تعديل العقد
          </DialogTitle>
          <DialogDescription>
            رقم العقد: {contract.contract_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amendment Type & Reason */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">معلومات التعديل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>نوع التعديل *</Label>
                <Select
                  value={formData.amendment_type}
                  onValueChange={(value: AmendmentType) => setFormData({ ...formData, amendment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="extend_duration">تمديد المدة</SelectItem>
                    <SelectItem value="change_amount">تعديل المبلغ</SelectItem>
                    <SelectItem value="change_terms">تعديل الشروط</SelectItem>
                    <SelectItem value="change_vehicle">تغيير المركبة</SelectItem>
                    <SelectItem value="change_dates">تعديل التواريخ</SelectItem>
                    <SelectItem value="change_payment">تعديل الدفعات</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>سبب التعديل *</Label>
                <Textarea
                  value={formData.amendment_reason}
                  onChange={(e) => setFormData({ ...formData, amendment_reason: e.target.value })}
                  placeholder="اشرح سبب التعديل..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contract Changes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">التعديلات المطلوبة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    تاريخ البداية
                    {changes.start_date && <Badge variant="secondary" className="text-xs">تم التعديل</Badge>}
                  </Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      setFormData({ ...formData, start_date: e.target.value });
                      markFieldAsChanged('start_date', e.target.value, contract.start_date);
                    }}
                  />
                  {changes.start_date && (
                    <p className="text-xs text-muted-foreground">
                      القيمة السابقة: {contract.start_date}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    تاريخ النهاية
                    {changes.end_date && <Badge variant="secondary" className="text-xs">تم التعديل</Badge>}
                  </Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => {
                      setFormData({ ...formData, end_date: e.target.value });
                      markFieldAsChanged('end_date', e.target.value, contract.end_date);
                    }}
                  />
                  {changes.end_date && (
                    <p className="text-xs text-muted-foreground">
                      القيمة السابقة: {contract.end_date}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Amounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    مبلغ العقد
                    {changes.contract_amount && <Badge variant="secondary" className="text-xs">تم التعديل</Badge>}
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.contract_amount}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setFormData({ ...formData, contract_amount: value });
                      markFieldAsChanged('contract_amount', value, contract.contract_amount);
                    }}
                  />
                  {changes.contract_amount && (
                    <p className="text-xs text-muted-foreground">
                      القيمة السابقة: {contract.contract_amount.toFixed(3)} د.ك
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    المبلغ الشهري
                    {changes.monthly_amount && <Badge variant="secondary" className="text-xs">تم التعديل</Badge>}
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.monthly_amount}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setFormData({ ...formData, monthly_amount: value });
                      markFieldAsChanged('monthly_amount', value, contract.monthly_amount);
                    }}
                  />
                  {changes.monthly_amount && (
                    <p className="text-xs text-muted-foreground">
                      القيمة السابقة: {contract.monthly_amount.toFixed(3)} د.ك
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Description & Terms */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  الوصف
                  {changes.description && <Badge variant="secondary" className="text-xs">تم التعديل</Badge>}
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    markFieldAsChanged('description', e.target.value, contract.description || '');
                  }}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  الشروط والأحكام
                  {changes.terms && <Badge variant="secondary" className="text-xs">تم التعديل</Badge>}
                </Label>
                <Textarea
                  value={formData.terms}
                  onChange={(e) => {
                    setFormData({ ...formData, terms: e.target.value });
                    markFieldAsChanged('terms', e.target.value, contract.terms || '');
                  }}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">إعدادات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>يتطلب توقيع العميل مجدداً</Label>
                  <p className="text-xs text-muted-foreground">
                    سيحتاج العميل للتوقيع على التعديل
                  </p>
                </div>
                <Switch
                  checked={formData.requires_customer_signature}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, requires_customer_signature: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>تاريخ سريان التعديل (اختياري)</Label>
                <Input
                  type="date"
                  value={formData.effective_date || ''}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Validation */}
          {!formData.amendment_reason.trim() && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                يرجى إدخال سبب التعديل
              </AlertDescription>
            </Alert>
          )}

          {!hasChanges && formData.amendment_reason && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                لم يتم إجراء أي تغييرات على العقد
              </AlertDescription>
            </Alert>
          )}

          {hasChanges && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                عدد الحقول المعدلة: {Object.values(changes).filter(Boolean).length}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.amendment_reason.trim() || !hasChanges || isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ التعديلات'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  User, 
  Car, 
  Building2, 
  Edit, 
  Download, 
  Printer,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContractDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
  onEdit?: (contract: any) => void;
  onCreateInvoice?: (contract: any) => void;
}

export const ContractDetailsDialog: React.FC<ContractDetailsDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onEdit,
  onCreateInvoice
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(contract || {});

  // Fetch related data
  const { data: customer } = useQuery({
    queryKey: ['customer', contract?.customer_id],
    queryFn: async () => {
      if (!contract?.customer_id) return null;
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', contract.customer_id)
        .single();
      return data;
    },
    enabled: !!contract?.customer_id
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', contract?.vehicle_id],
    queryFn: async () => {
      if (!contract?.vehicle_id) return null;
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', contract.vehicle_id)
        .single();
      return data;
    },
    enabled: !!contract?.vehicle_id
  });

  const { data: chartOfAccount } = useQuery({
    queryKey: ['chart-of-account', contract?.account_id],
    queryFn: async () => {
      if (!contract?.account_id) return null;
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('id', contract.account_id)
        .single();
      return data;
    },
    enabled: !!contract?.account_id
  });

  const { data: invoices } = useQuery({
    queryKey: ['contract-invoices', contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!contract?.id
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update(editData)
        .eq('id', contract.id);

      if (error) throw error;

      toast.success('تم تحديث العقد بنجاح');
      setIsEditing(false);
      onEdit?.(editData);
    } catch (error) {
      console.error('Error updating contract:', error);
      toast.error('حدث خطأ في تحديث العقد');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create contract export data
    const exportData = {
      contract_number: contract.contract_number,
      customer_name: customer?.customer_type === 'individual' 
        ? `${customer.first_name} ${customer.last_name}`
        : customer?.company_name,
      contract_type: contract.contract_type,
      start_date: contract.start_date,
      end_date: contract.end_date,
      contract_amount: contract.contract_amount,
      monthly_amount: contract.monthly_amount,
      status: contract.status,
      vehicle_plate: vehicle?.plate_number,
      account: chartOfAccount ? `${chartOfAccount.account_code} - ${chartOfAccount.account_name}` : null
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `contract_${contract.contract_number}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تفاصيل العقد رقم {contract.contract_number}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                تصدير
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'إلغاء التعديل' : 'تعديل'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4" dir="rtl">
            <TabsTrigger value="documents">المستندات</TabsTrigger>
            <TabsTrigger value="timeline">التاريخ</TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="details">التفاصيل</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
              {/* Contract Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    معلومات العقد
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between" dir="rtl">
                    <span className="text-sm text-muted-foreground">حالة العقد</span>
                    <Badge className={getStatusColor(contract.status)}>
                      {getStatusIcon(contract.status)}
                      <span className="ml-1">
                        {contract.status === 'active' ? 'نشط' :
                         contract.status === 'draft' ? 'مسودة' :
                         contract.status === 'expired' ? 'منتهي' :
                         contract.status === 'suspended' ? 'معلق' :
                         contract.status === 'cancelled' ? 'ملغي' : contract.status}
                      </span>
                    </Badge>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label>نوع العقد</Label>
                        <Input
                          value={editData.contract_type}
                          onChange={(e) => setEditData({...editData, contract_type: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>تاريخ البداية</Label>
                        <Input
                          type="date"
                          value={editData.start_date}
                          onChange={(e) => setEditData({...editData, start_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>تاريخ النهاية</Label>
                        <Input
                          type="date"
                          value={editData.end_date}
                          onChange={(e) => setEditData({...editData, end_date: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">نوع العقد</span>
                        <span className="font-medium">
                          {contract.contract_type === 'rental' ? 'إيجار' :
                           contract.contract_type === 'service' ? 'خدمة' :
                           contract.contract_type === 'maintenance' ? 'صيانة' : 'مبيعات'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">تاريخ البداية</span>
                        <span className="font-medium">
                          {new Date(contract.start_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">تاريخ النهاية</span>
                        <span className="font-medium">
                          {new Date(contract.end_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">مدة العقد</span>
                        <span className="font-medium">
                          {Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24))} يوم
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    المعلومات المالية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label>قيمة العقد (د.ك)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editData.contract_amount}
                          onChange={(e) => setEditData({...editData, contract_amount: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label>المبلغ الشهري (د.ك)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editData.monthly_amount}
                          onChange={(e) => setEditData({...editData, monthly_amount: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">قيمة العقد</span>
                        <span className="font-bold text-2xl text-primary">
                          {contract.contract_amount?.toFixed(3)} د.ك
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">المبلغ الشهري</span>
                        <span className="font-medium">
                          {contract.monthly_amount?.toFixed(3)} د.ك
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">المبلغ المدفوع</span>
                        <span className="font-medium text-green-600">
                          {(invoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0).toFixed(3)} د.ك
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">المبلغ المتبقي</span>
                        <span className="font-medium text-orange-600">
                          {(contract.contract_amount - (invoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0)).toFixed(3)} د.ك
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Information */}
              {customer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      معلومات العميل
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">اسم العميل</span>
                      <span className="font-medium">
                        {customer.customer_type === 'individual' 
                          ? `${customer.first_name_ar || customer.first_name} ${customer.last_name_ar || customer.last_name}`
                          : customer.company_name_ar || customer.company_name
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">نوع العميل</span>
                      <span className="font-medium">
                        {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">رقم الهاتف</span>
                      <span className="font-medium" dir="ltr">{customer.phone}</span>
                    </div>
                    
                    {customer.email && (
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">البريد الإلكتروني</span>
                        <span className="font-medium">{customer.email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Account Information */}
              {chartOfAccount && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      معلومات الحساب
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">رقم الحساب</span>
                      <span className="font-medium">{chartOfAccount.account_code}</span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">اسم الحساب</span>
                      <span className="font-medium">{chartOfAccount.account_name}</span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">نوع الحساب</span>
                      <span className="font-medium">{chartOfAccount.account_type}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vehicle Information */}
              {vehicle && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      معلومات المركبة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">رقم اللوحة</span>
                      <span className="font-medium">{vehicle.plate_number}</span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">نوع المركبة</span>
                      <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">سنة الصنع</span>
                      <span className="font-medium">{vehicle.year}</span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">حالة المركبة</span>
                      <Badge variant="outline">{vehicle.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Description and Terms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>وصف العقد</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {contract.description || 'لا يوجد وصف'}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>شروط العقد</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editData.terms || ''}
                      onChange={(e) => setEditData({...editData, terms: e.target.value})}
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {contract.terms || 'لا توجد شروط محددة'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSave}>
                  حفظ التغييرات
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">فواتير العقد</h3>
              <Button onClick={() => onCreateInvoice?.(contract)}>
                <Plus className="h-4 w-4 mr-2" />
                إنشاء فاتورة جديدة
              </Button>
            </div>

            {invoices && invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-semibold">فاتورة رقم {invoice.invoice_number}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{invoice.total_amount?.toFixed(3)} د.ك</div>
                        <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.payment_status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد فواتير بعد</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    ابدأ في إنشاء أول فاتورة لهذا العقد
                  </p>
                  <Button onClick={() => onCreateInvoice?.(contract)}>
                    <Plus className="h-4 w-4 mr-2" />
                    إنشاء فاتورة جديدة
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>تاريخ العقد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">إنشاء العقد</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(contract.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">بداية العقد</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(contract.start_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">نهاية العقد</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(contract.end_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>مستندات العقد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    سيتم إضافة ميزة إدارة المستندات قريباً
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
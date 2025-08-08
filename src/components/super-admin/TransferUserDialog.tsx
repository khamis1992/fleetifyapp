import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, ArrowRight, Building2, User, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useTransferUser } from '@/hooks/useTransferUser';
import { Company } from '@/hooks/useCompanies';

interface User {
  id: string;
  email?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    company_id?: string;
    company?: {
      id: string;
      name: string;
    };
    companies?: {
      id: string;
      name: string;
    };
  };
  user_roles?: Array<{ role: string }>;
  roles?: Array<{ role: string }>;
  orphaned_employee?: {
    first_name?: string;
    last_name?: string;
    company_id?: string;
    companies?: {
      id: string;
      name: string;
      name_ar?: string;
    };
  };
}

interface TransferUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  companies: Company[];
  onTransferComplete: () => void;
}

const ROLE_OPTIONS = [
  { value: 'company_admin', label: 'مدير الشركة' },
  { value: 'manager', label: 'مدير' },
  { value: 'sales_agent', label: 'مندوب مبيعات' },
  { value: 'employee', label: 'موظف' }
];

const DATA_HANDLING_OPTIONS = [
  { value: 'move', label: 'نقل إلى الشركة الجديدة' },
  { value: 'keep', label: 'الاحتفاظ في الشركة الأصلية' },
  { value: 'copy', label: 'نسخ إلى كلا الشركتين' }
];

export const TransferUserDialog: React.FC<TransferUserDialogProps> = ({
  open,
  onOpenChange,
  user,
  companies,
  onTransferComplete
}) => {
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [transferReason, setTransferReason] = useState('');
  const [dataHandling, setDataHandling] = useState({
    contracts: 'keep' as const,
    invoices: 'keep' as const,
    vehicles: 'keep' as const,
    other: 'keep' as const
  });
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  const transferMutation = useTransferUser();

  const handleRoleChange = (role: string, checked: boolean) => {
    setSelectedRoles(prev => 
      checked 
        ? [...prev, role]
        : prev.filter(r => r !== role)
    );
  };

  const handleDataHandlingChange = (type: keyof typeof dataHandling, value: string) => {
    setDataHandling(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleTransfer = async () => {
    if (!user || !selectedCompany || selectedRoles.length === 0 || !confirmTransfer) {
      toast.error('يرجى ملء جميع الحقول المطلوبة وتأكيد النقل');
      return;
    }

    // Extract current company ID - prioritize profiles data, fallback to orphaned employee data
    let currentCompanyId: string;
    
    if (user.profiles?.company?.id) {
      currentCompanyId = user.profiles.company.id;
    } else if (user.orphaned_employee?.company_id) {
      currentCompanyId = user.orphaned_employee.company_id;
    } else if (user.profiles?.companies?.id) {
      currentCompanyId = user.profiles.companies.id;
    } else if (user.orphaned_employee?.companies?.id) {
      currentCompanyId = user.orphaned_employee.companies.id;
    } else {
      toast.error('تعذر تحديد الشركة الحالية للمستخدم. يرجى التحديث والمحاولة مرة أخرى.');
      return;
    }

    if (!currentCompanyId) {
      toast.error('المستخدم ليس لديه ارتباط صحيح بشركة. لا يمكن المتابعة بالنقل.');
      return;
    }

    if (currentCompanyId === selectedCompany) {
      toast.error('المستخدم موجود بالفعل في الشركة المحددة. يرجى اختيار شركة مختلفة.');
      return;
    }

    try {
      console.log('Transfer request:', {
        userId: user.id,
        fromCompanyId: currentCompanyId,
        toCompanyId: selectedCompany,
        newRoles: selectedRoles,
        transferReason,
        dataHandlingStrategy: dataHandling
      });

      await transferMutation.mutateAsync({
        userId: user.id,
        fromCompanyId: currentCompanyId,
        toCompanyId: selectedCompany,
        newRoles: selectedRoles,
        transferReason,
        dataHandlingStrategy: dataHandling
      });

      toast.success('تم نقل المستخدم بنجاح');
      onTransferComplete();
      onOpenChange(false);
      
      // Reset form
      setSelectedCompany('');
      setSelectedRoles([]);
      setTransferReason('');
      setDataHandling({
        contracts: 'keep',
        invoices: 'keep',
        vehicles: 'keep',
        other: 'keep'
      });
      setConfirmTransfer(false);
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error('فشل النقل. يرجى المحاولة مرة أخرى.');
    }
  };

  // Get current company ID for filtering
  const getCurrentCompanyId = () => {
    if (user?.profiles?.company?.id) return user.profiles.company.id;
    if (user?.orphaned_employee?.company_id) return user.orphaned_employee.company_id;
    if (user?.profiles?.companies?.id) return user.profiles.companies.id;
    if (user?.orphaned_employee?.companies?.id) return user.orphaned_employee.companies.id;
    return null;
  };

  const currentCompanyId = getCurrentCompanyId();
  const availableCompanies = companies.filter(
    company => company.id !== currentCompanyId
  );

  if (!user) return null;

  const userName = user.profiles?.first_name && user.profiles?.last_name 
    ? `${user.profiles.first_name} ${user.profiles.last_name}`
    : user.email || 'Unknown User';

  const getCurrentCompanyName = () => {
    if (user?.profiles?.company?.name) return user.profiles.company.name;
    if (user?.orphaned_employee?.companies?.name) return user.orphaned_employee.companies.name;
    if (user?.profiles?.companies?.name) return user.profiles.companies.name;
    if (user?.orphaned_employee?.companies?.name_ar) return user.orphaned_employee.companies.name_ar;
    return 'Unknown Company';
  };

  const currentCompanyName = getCurrentCompanyName();
  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.name || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right" dir="rtl">
            <ArrowRight className="h-5 w-5" />
            نقل المستخدم إلى شركة أخرى
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6" dir="rtl">
          {/* User Info */}
          <div className="bg-background-soft p-4 rounded-lg border">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-medium">معلومات المستخدم</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div><strong>الاسم:</strong> {userName}</div>
              <div><strong>البريد الإلكتروني:</strong> {user.email}</div>
              <div><strong>الشركة الحالية:</strong> {currentCompanyName}</div>
              <div><strong>الأدوار الحالية:</strong> {(user.roles?.map(r => r.role) || user.user_roles?.map(r => r.role) || []).join(', ') || 'لا يوجد'}</div>
            </div>
          </div>

          {/* Target Company */}
          <div className="space-y-2">
            <Label htmlFor="target-company">
              <Building2 className="h-4 w-4 inline ml-2" />
              الشركة المستهدفة *
            </Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الشركة المستهدفة" />
              </SelectTrigger>
              <SelectContent>
                {availableCompanies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New Roles */}
          <div className="space-y-2">
            <Label>
              <Shield className="h-4 w-4 inline ml-2" />
              الأدوار الجديدة في الشركة المستهدفة *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(role => (
                <div key={role.value} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={(checked) => handleRoleChange(role.value, checked as boolean)}
                  />
                  <Label htmlFor={role.value} className="text-sm font-normal">
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Data Handling Strategy */}
          <div className="space-y-4">
            <Label className="text-base font-medium">استراتيجية التعامل مع البيانات</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(dataHandling).map(([type, value]) => (
                <div key={type} className="space-y-2">
                  <Label className="text-sm">{
                    type === 'contracts' ? 'العقود' :
                    type === 'invoices' ? 'الفواتير' :
                    type === 'vehicles' ? 'المركبات' :
                    'أخرى'
                  }</Label>
                  <Select 
                    value={value} 
                    onValueChange={(val) => handleDataHandlingChange(type as keyof typeof dataHandling, val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_HANDLING_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer Reason */}
          <div className="space-y-2">
            <Label htmlFor="transfer-reason">سبب النقل</Label>
            <Textarea
              id="transfer-reason"
              placeholder="أدخل سبب النقل (اختياري)"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Transfer Preview */}
          {selectedCompany && (
            <div className="bg-background-soft p-4 rounded-lg border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                معاينة النقل
              </h4>
              <div className="text-sm space-y-1">
                <div>سيتم نقل {userName} من <strong>{currentCompanyName}</strong> إلى <strong>{selectedCompanyName}</strong></div>
                <div>الأدوار الجديدة: <strong>{selectedRoles.map(role => 
                  ROLE_OPTIONS.find(r => r.value === role)?.label || role
                ).join(', ')}</strong></div>
                <div>التعامل مع البيانات: {Object.entries(dataHandling).map(([key, val]) => {
                  const keyAr = key === 'contracts' ? 'العقود' :
                               key === 'invoices' ? 'الفواتير' :
                               key === 'vehicles' ? 'المركبات' : 'أخرى';
                  const valAr = DATA_HANDLING_OPTIONS.find(opt => opt.value === val)?.label || val;
                  return `${keyAr}: ${valAr}`;
                }).join(', ')}</div>
              </div>
            </div>
          )}

          {/* Confirmation */}
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-destructive">تحذير: لا يمكن التراجع عن هذا الإجراء بسهولة</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    نقل المستخدم سيؤدي فوراً إلى تغيير ارتباط الشركة والأدوار. 
                    سيتم التعامل مع البيانات المرتبطة وفقاً للاستراتيجية المحددة.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="confirm-transfer"
                    checked={confirmTransfer}
                    onCheckedChange={(checked) => setConfirmTransfer(checked as boolean)}
                  />
                  <Label htmlFor="confirm-transfer" className="text-sm">
                    أفهم وأؤكد هذا النقل
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-start gap-3 pt-4 border-t" dir="ltr">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleTransfer}
              disabled={!selectedCompany || selectedRoles.length === 0 || !confirmTransfer || transferMutation.isPending}
              className="min-w-[120px]"
            >
              {transferMutation.isPending ? 'جاري النقل...' : 'نقل المستخدم'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
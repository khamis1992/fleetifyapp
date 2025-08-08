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
    company?: {
      id: string;
      name: string;
    };
  };
  roles?: Array<{ role: string }>;
}

interface TransferUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  companies: Company[];
  onTransferComplete: () => void;
}

const ROLE_OPTIONS = [
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sales_agent', label: 'Sales Agent' },
  { value: 'employee', label: 'Employee' }
];

const DATA_HANDLING_OPTIONS = [
  { value: 'move', label: 'Move to new company' },
  { value: 'keep', label: 'Keep in original company' },
  { value: 'copy', label: 'Copy to both companies' }
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
      toast.error('Please fill in all required fields and confirm the transfer');
      return;
    }

    try {
      await transferMutation.mutateAsync({
        userId: user.id,
        fromCompanyId: user.profiles?.company?.id || '',
        toCompanyId: selectedCompany,
        newRoles: selectedRoles,
        transferReason,
        dataHandlingStrategy: dataHandling
      });

      toast.success('User transferred successfully');
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
      toast.error('Transfer failed. Please try again.');
    }
  };

  const availableCompanies = companies.filter(
    company => company.id !== user?.profiles?.company?.id
  );

  if (!user) return null;

  const userName = user.profiles?.first_name && user.profiles?.last_name 
    ? `${user.profiles.first_name} ${user.profiles.last_name}`
    : user.email || 'Unknown User';

  const currentCompanyName = user.profiles?.company?.name || 'Unknown Company';
  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.name || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Transfer User to Another Company
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-background-soft p-4 rounded-lg border">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-medium">User Information</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div><strong>Name:</strong> {userName}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Current Company:</strong> {currentCompanyName}</div>
              <div><strong>Current Roles:</strong> {user.roles?.map(r => r.role).join(', ') || 'None'}</div>
            </div>
          </div>

          {/* Target Company */}
          <div className="space-y-2">
            <Label htmlFor="target-company">
              <Building2 className="h-4 w-4 inline mr-2" />
              Target Company *
            </Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Select target company" />
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
              <Shield className="h-4 w-4 inline mr-2" />
              New Roles in Target Company *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(role => (
                <div key={role.value} className="flex items-center space-x-2">
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
            <Label className="text-base font-medium">Data Handling Strategy</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(dataHandling).map(([type, value]) => (
                <div key={type} className="space-y-2">
                  <Label className="text-sm capitalize">{type}</Label>
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
            <Label htmlFor="transfer-reason">Transfer Reason</Label>
            <Textarea
              id="transfer-reason"
              placeholder="Enter reason for transfer (optional)"
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
                Transfer Preview
              </h4>
              <div className="text-sm space-y-1">
                <div>{userName} will be transferred from <strong>{currentCompanyName}</strong> to <strong>{selectedCompanyName}</strong></div>
                <div>New roles: <strong>{selectedRoles.join(', ')}</strong></div>
                <div>Data handling: {Object.entries(dataHandling).map(([key, val]) => `${key}: ${val}`).join(', ')}</div>
              </div>
            </div>
          )}

          {/* Confirmation */}
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-destructive">Warning: This action cannot be easily undone</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transferring a user will immediately change their company association and roles. 
                    Associated data will be handled according to your selected strategy.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirm-transfer"
                    checked={confirmTransfer}
                    onCheckedChange={(checked) => setConfirmTransfer(checked as boolean)}
                  />
                  <Label htmlFor="confirm-transfer" className="text-sm">
                    I understand and confirm this transfer
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransfer}
              disabled={!selectedCompany || selectedRoles.length === 0 || !confirmTransfer || transferMutation.isPending}
              className="min-w-[120px]"
            >
              {transferMutation.isPending ? 'Transferring...' : 'Transfer User'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
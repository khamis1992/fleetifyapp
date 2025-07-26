import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AlertCircle, Calendar, DollarSign, Car, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEligibleContractsForRenewal, type EligibleContract } from "@/hooks/useEligibleContractsForRenewal";
import { useAuth } from "@/contexts/AuthContext";
import { BatchContractRenewalDialog } from "./BatchContractRenewalDialog";

interface EligibleContractsForRenewalListProps {
  onRefresh?: () => void;
}

export const EligibleContractsForRenewalList: React.FC<EligibleContractsForRenewalListProps> = ({
  onRefresh
}) => {
  const { user } = useAuth();
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  // For now, we'll use a placeholder company ID - this should be fetched from user profile
  const { data: eligibleContracts, isLoading, error, refetch } = useEligibleContractsForRenewal(
    user?.id // This will need to be updated to get actual company_id from user profile
  );

  const handleSelectContract = (contractId: string, checked: boolean) => {
    if (checked) {
      setSelectedContracts(prev => [...prev, contractId]);
    } else {
      setSelectedContracts(prev => prev.filter(id => id !== contractId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContracts(eligibleContracts?.map(c => c.contract_id) || []);
    } else {
      setSelectedContracts([]);
    }
  };

  const handleBatchRenewal = () => {
    if (selectedContracts.length > 0) {
      setShowBatchDialog(true);
    }
  };

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const getUrgencyBadge = (daysExpired: number) => {
    if (daysExpired <= 7) {
      return <Badge variant="destructive">Critical</Badge>;
    } else if (daysExpired <= 30) {
      return <Badge variant="secondary">High</Badge>;
    } else {
      return <Badge variant="outline">Medium</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          فشل في تحميل العقود المؤهلة للتجديد. حاول مرة أخرى.
        </AlertDescription>
      </Alert>
    );
  }

  if (!eligibleContracts || eligibleContracts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">لا توجد عقود مؤهلة للتجديد الذكي</p>
          <p className="text-sm text-muted-foreground mt-1">
            العقود المؤهلة للتجديد يجب أن تكون منتهية الصلاحية مع مدفوعات مستحقة ولم يتم إرجاع المركبة
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedContractDetails = eligibleContracts.filter(c => 
    selectedContracts.includes(c.contract_id)
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              العقود المؤهلة للتجديد الذكي ({eligibleContracts.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                تحديث
              </Button>
              {selectedContracts.length > 0 && (
                <Button onClick={handleBatchRenewal}>
                  تجديد العقود المحددة ({selectedContracts.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedContracts.length === eligibleContracts.length}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              تحديد الكل
            </label>
          </div>

          <div className="space-y-4">
            {eligibleContracts.map((contract) => (
              <Card key={contract.contract_id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedContracts.includes(contract.contract_id)}
                        onCheckedChange={(checked) => 
                          handleSelectContract(contract.contract_id, checked as boolean)
                        }
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{contract.contract_number}</h3>
                          {getUrgencyBadge(contract.days_since_expiry)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{contract.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span>{contract.vehicle_info}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>انتهت منذ {contract.days_since_expiry} يوم</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>
                              مستحق: {contract.outstanding_amount.toFixed(3)} د.ك
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">قيمة العقد</div>
                      <div className="font-semibold">{contract.contract_amount.toFixed(3)} د.ك</div>
                      <div className="text-muted-foreground">تم دفع: {contract.total_paid.toFixed(3)} د.ك</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <BatchContractRenewalDialog
        open={showBatchDialog}
        onOpenChange={setShowBatchDialog}
        contracts={selectedContractDetails}
        onSuccess={() => {
          setSelectedContracts([]);
          handleRefresh();
        }}
      />
    </>
  );
};
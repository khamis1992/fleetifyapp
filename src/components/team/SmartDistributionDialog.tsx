/**
 * Smart Distribution Dialog
 * حوار التوزيع الذكي للعقود
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Users, 
  FileText, 
  TrendingUp, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SmartDistributionDialog: React.FC<SmartDistributionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = user?.profile?.company_id || user?.company?.id;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [distributionPreview, setDistributionPreview] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  // Fetch available employees with capacity
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-capacity', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('employee_capacity_view')
        .select('*')
        .eq('company_id', companyId)
        .order('capacity_score', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open && !!companyId,
  });

  // Fetch unassigned contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['unassigned-contracts-smart', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          customers:customer_id (
            first_name_ar,
            last_name_ar,
            company_name_ar
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'pending', 'legal_proceedings', 'under_legal_procedure'])
        .is('assigned_to_profile_id', null)
        .limit(1000);

      if (error) throw error;
      return data;
    },
    enabled: open && !!companyId,
  });

  // Calculate distribution preview
  const calculatePreview = async () => {
    if (selectedEmployees.length === 0 || selectedContracts.length === 0) {
      toast.error('يجب اختيار موظفين وعقود');
      return;
    }

    setIsCalculating(true);
    try {
      // Calculate difficulty for each contract
      const contractsWithDifficulty = await Promise.all(
        selectedContracts.map(async (contractId) => {
          const contract = contracts?.find(c => c.id === contractId);
          const { data } = await supabase.rpc('calculate_customer_difficulty', {
            p_customer_id: contract?.customer_id
          });
          
          return {
            contractId,
            contract,
            difficulty: data || 50
          };
        })
      );

      // Sort contracts by difficulty
      const sortedContracts = contractsWithDifficulty.sort((a, b) => b.difficulty - a.difficulty);

      // Calculate capacity for each employee
      const employeesWithCapacity = await Promise.all(
        selectedEmployees.map(async (employeeId) => {
          const employee = employees?.find(e => e.employee_id === employeeId);
          const { data } = await supabase.rpc('calculate_employee_capacity', {
            p_employee_id: employeeId
          });
          
          return {
            employeeId,
            employee,
            capacity: data || 0,
            assignedContracts: [] as any[]
          };
        })
      );

      // Sort employees by capacity
      const sortedEmployees = employeesWithCapacity.sort((a, b) => b.capacity - a.capacity);

      // Distribute contracts
      sortedContracts.forEach((contract) => {
        // Find best employee for this contract
        let bestEmployee = sortedEmployees[0];
        
        // If contract is very difficult, prefer high-performance employees
        if (contract.difficulty > 80) {
          bestEmployee = sortedEmployees.find(e => 
            (e.employee?.performance_score || 0) >= 70
          ) || sortedEmployees[0];
        }
        
        // Assign to employee
        bestEmployee.assignedContracts.push(contract);
        
        // Re-sort employees after assignment
        sortedEmployees.sort((a, b) => 
          (b.capacity - b.assignedContracts.length * 5) - 
          (a.capacity - a.assignedContracts.length * 5)
        );
      });

      setDistributionPreview(sortedEmployees);
      setStep(3);
    } catch (error: any) {
      toast.error('فشل حساب التوزيع', {
        description: error.message
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Apply distribution
  const applyDistributionMutation = useMutation({
    mutationFn: async () => {
      if (!distributionPreview) throw new Error('No preview available');

      const updates = [];
      for (const employee of distributionPreview) {
        for (const contract of employee.assignedContracts) {
          updates.push(
            supabase
              .from('contracts')
              .update({
                assigned_to_profile_id: employee.employeeId,
                assigned_at: new Date().toISOString(),
                assigned_by_profile_id: user?.profile?.id,
                assignment_notes: `توزيع ذكي - صعوبة: ${Math.round(contract.difficulty)}%`
              })
              .eq('id', contract.contractId)
          );
        }
      }

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`فشل تعيين ${errors.length} عقود`);
      }

      // Save distribution history
      await supabase.from('distribution_history').insert({
        company_id: companyId,
        strategy_used: 'smart',
        contracts_distributed: selectedContracts.length,
        employees_involved: selectedEmployees.length,
        distribution_details: distributionPreview,
        performed_by: user?.profile?.id
      });

      return { success: true };
    },
    onSuccess: () => {
      toast.success('تم التوزيع بنجاح!', {
        description: `تم توزيع ${selectedContracts.length} عقود على ${selectedEmployees.length} موظفين`,
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });

      queryClient.invalidateQueries({ queryKey: ['team-employees'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });

      onOpenChange(false);
      resetDialog();
    },
    onError: (error: any) => {
      toast.error('فشل التوزيع', {
        description: error.message
      });
    },
  });

  const resetDialog = () => {
    setStep(1);
    setSelectedEmployees([]);
    setSelectedContracts([]);
    setDistributionPreview(null);
  };

  const getCustomerName = (contract: any) => {
    const customer = contract?.customers;
    if (!customer) return 'غير محدد';
    return customer.company_name_ar || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 'غير محدد';
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 30) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (difficulty < 60) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (difficulty < 80) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty < 30) return '🟢 سهل';
    if (difficulty < 60) return '🟡 متوسط';
    if (difficulty < 80) return '🟠 صعب';
    return '🔴 صعب جداً';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            توزيع ذكي للعقود
          </DialogTitle>
          <DialogDescription>
            نظام توزيع ذكي يراعي العدالة والتوازن بين الموظفين
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                step >= s
                  ? 'bg-purple-500 text-white'
                  : 'bg-neutral-200 text-neutral-500'
              )}>
                {s}
              </div>
              {s < 3 && (
                <div className={cn(
                  'w-12 h-1 mx-1',
                  step > s ? 'bg-purple-500' : 'bg-neutral-200'
                )} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Employees */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  اختر الموظفين
                </h3>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {selectedEmployees.length} محدد
                </Badge>
              </div>

              {employeesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
                </div>
              ) : (
                <ScrollArea className="h-[400px] border border-neutral-200 rounded-lg p-3">
                  <div className="space-y-2">
                    {employees?.map((employee) => {
                      const isSelected = selectedEmployees.includes(employee.employee_id);
                      
                      return (
                        <div
                          key={employee.employee_id}
                          className={cn(
                            'flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer',
                            isSelected
                              ? 'bg-purple-50 border-purple-300'
                              : 'bg-white border-neutral-200 hover:border-purple-200'
                          )}
                          onClick={() => {
                            setSelectedEmployees(prev =>
                              prev.includes(employee.employee_id)
                                ? prev.filter(id => id !== employee.employee_id)
                                : [...prev, employee.employee_id]
                            );
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {}}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-bold text-neutral-900">
                                {employee.employee_name}
                              </p>
                              <Badge className={cn('text-xs', 
                                employee.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                employee.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                'bg-neutral-100 text-neutral-700'
                              )}>
                                {employee.grade}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-neutral-600">
                              <span>{employee.current_contracts} عقود</span>
                              <span>•</span>
                              <span>أداء: {Math.round(employee.performance_score)}%</span>
                              <span>•</span>
                              <span>قدرة: {Math.round(employee.capacity_score)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </motion.div>
          )}

          {/* Step 2: Select Contracts */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  اختر العقود
                </h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {selectedContracts.length} محدد
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const all = contracts?.map(c => c.id) || [];
                      setSelectedContracts(all);
                    }}
                  >
                    تحديد الكل
                  </Button>
                </div>
              </div>

              {contractsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
                </div>
              ) : (
                <ScrollArea className="h-[400px] border border-neutral-200 rounded-lg p-3">
                  <div className="space-y-2">
                    {contracts?.map((contract) => {
                      const isSelected = selectedContracts.includes(contract.id);
                      
                      return (
                        <div
                          key={contract.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                            isSelected
                              ? 'bg-purple-50 border-purple-300'
                              : 'bg-white border-neutral-200 hover:border-purple-200'
                          )}
                          onClick={() => {
                            setSelectedContracts(prev =>
                              prev.includes(contract.id)
                                ? prev.filter(id => id !== contract.id)
                                : [...prev, contract.id]
                            );
                          }}
                        >
                          <Checkbox checked={isSelected} onCheckedChange={() => {}} />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-neutral-900">
                              #{contract.contract_number}
                            </p>
                            <p className="text-xs text-neutral-600">
                              {getCustomerName(contract)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </motion.div>
          )}

          {/* Step 3: Preview Distribution */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  معاينة التوزيع
                </h3>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  ✅ جاهز للتطبيق
                </Badge>
              </div>

              {isCalculating ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
                  <p className="text-sm text-neutral-600">جاري حساب التوزيع الأمثل...</p>
                </div>
              ) : distributionPreview ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {distributionPreview.map((employee: any, index: number) => (
                      <motion.div
                        key={employee.employeeId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 bg-white rounded-xl border border-neutral-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-neutral-900">
                              {employee.employee?.employee_name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {employee.employee?.current_contracts} عقود حالياً → {employee.employee?.current_contracts + employee.assignedContracts.length} بعد التوزيع
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            +{employee.assignedContracts.length} عقود
                          </Badge>
                        </div>

                        {employee.assignedContracts.length > 0 && (
                          <div className="space-y-1 pt-3 border-t border-neutral-100">
                            {employee.assignedContracts.map((contract: any) => (
                              <div key={contract.contractId} className="flex items-center justify-between text-xs">
                                <span className="text-neutral-700">
                                  #{contract.contract?.contract_number}
                                </span>
                                <Badge variant="outline" className={cn('text-xs', getDifficultyColor(contract.difficulty))}>
                                  {getDifficultyLabel(contract.difficulty)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((step - 1) as any)}
              disabled={isCalculating || isDistributing}
            >
              السابق
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetDialog();
            }}
            disabled={isCalculating || isDistributing}
          >
            إلغاء
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && selectedEmployees.length === 0) {
                  toast.error('يجب اختيار موظف واحد على الأقل');
                  return;
                }
                if (step === 2) {
                  if (selectedContracts.length === 0) {
                    toast.error('يجب اختيار عقد واحد على الأقل');
                    return;
                  }
                  calculatePreview();
                  return;
                }
                setStep((step + 1) as any);
              }}
              disabled={isCalculating}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            >
              {step === 2 && isCalculating ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحساب...
                </>
              ) : (
                <>
                  التالي
                  <ArrowRight className="mr-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => applyDistributionMutation.mutate()}
              disabled={isDistributing}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              {isDistributing ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التوزيع...
                </>
              ) : (
                <>
                  <CheckCircle className="ml-2 h-4 w-4" />
                  تطبيق التوزيع
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

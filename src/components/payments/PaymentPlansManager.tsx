/**
 * Payment Plans & Promises Manager Component
 * 
 * Manage payment promises, installment plans, and follow-up automation
 * NOTE: This component uses mock data as payment_promises and payment_plans tables don't exist yet
 */

import React, { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  User,
  CreditCard,
  TrendingUp,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentPromise {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  invoice_id: string;
  invoice_number: string;
  promised_amount: number;
  promise_date: string;
  contact_method: string;
  status: 'pending' | 'kept' | 'broken';
  created_at: string;
}

interface PaymentPlan {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  invoice_id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  installment_amount: number;
  number_of_installments: number;
  status: 'active' | 'completed' | 'defaulted';
  created_at: string;
}

interface PaymentPlansManagerProps {
  companyId: string;
}

export const PaymentPlansManager: React.FC<PaymentPlansManagerProps> = ({ companyId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'promises' | 'plans'>('promises');
  const [showPromiseDialog, setShowPromiseDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedPromise, setSelectedPromise] = useState<PaymentPromise | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);

  // Mock data - Database tables 'payment_promises' and 'payment_plans' not yet created
  const [promises, setPromises] = useState<PaymentPromise[]>([
    {
      id: '1',
      company_id: companyId,
      customer_id: '1',
      customer_name: 'أحمد محمد',
      invoice_id: '1',
      invoice_number: 'INV-001',
      promised_amount: 5000,
      promise_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      contact_method: 'phone',
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  ]);

  const [plans, setPlans] = useState<PaymentPlan[]>([
    {
      id: '1',
      company_id: companyId,
      customer_id: '2',
      customer_name: 'سارة علي',
      invoice_id: '2',
      invoice_number: 'INV-002',
      total_amount: 10000,
      paid_amount: 6000,
      installment_amount: 2000,
      number_of_installments: 5,
      status: 'active',
      created_at: new Date().toISOString(),
    },
  ]);

  // Update promise status mutation (mock)
  const updatePromiseMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return id;
    },
    onSuccess: (id, variables) => {
      setPromises(promises.map(p =>
        p.id === id
          ? { ...p, status: variables.status as 'pending' | 'kept' | 'broken' }
          : p
      ));
      toast.success('Promise Updated');
    },
  });

  // Promise statistics
  const promiseStats = useMemo(() => {
    const total = promises.length;
    const kept = promises.filter(p => p.status === 'kept').length;
    const broken = promises.filter(p => p.status === 'broken').length;
    const pending = promises.filter(p => p.status === 'pending').length;

    return {
      total,
      kept,
      broken,
      pending,
      keptRate: total > 0 ? (kept / total) * 100 : 0,
    };
  }, [promises]);

  // Plan statistics
  const planStats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter(p => p.status === 'active').length;
    const completed = plans.filter(p => p.status === 'completed').length;
    const defaulted = plans.filter(p => p.status === 'defaulted').length;

    const totalAmount = plans.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const paidAmount = plans.reduce((sum, p) => sum + (p.paid_amount || 0), 0);

    return {
      total,
      active,
      completed,
      defaulted,
      totalAmount,
      paidAmount,
      completionRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
    };
  }, [plans]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Plans & Promises</h1>
          <p className="text-muted-foreground">
            Manage payment commitments and installment plans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPromiseDialog(true)}>
            <Flag className="h-4 w-4 mr-2" />
            New Promise
          </Button>
          <Button onClick={() => setShowPlanDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="promises">
            <Flag className="h-4 w-4 mr-2" />
            Payment Promises
          </TabsTrigger>
          <TabsTrigger value="plans">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Plans
          </TabsTrigger>
        </TabsList>

        {/* Promises Tab */}
        <TabsContent value="promises" className="space-y-6">
          {/* Promise Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Promises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{promiseStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Kept</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{promiseStats.kept}</div>
                <Progress value={promiseStats.keptRate} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Broken</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{promiseStats.broken}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{promiseStats.pending}</div>
              </CardContent>
            </Card>
          </div>

          {/* Promises List */}
          <PromisesList
            promises={promises}
            onUpdateStatus={(id, status) => updatePromiseMutation.mutate({ id, status })}
            onView={(promise) => setSelectedPromise(promise)}
          />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          {/* Plan Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{planStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{planStats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{planStats.completionRate.toFixed(1)}%</div>
                <Progress value={planStats.completionRate} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${planStats.totalAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${planStats.paidAmount.toLocaleString()} paid
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Plans List */}
          <PlansList plans={plans} onView={(plan) => setSelectedPlan(plan)} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PromiseDialog
        open={showPromiseDialog}
        onClose={() => setShowPromiseDialog(false)}
        companyId={companyId}
      />

      <PlanDialog open={showPlanDialog} onClose={() => setShowPlanDialog(false)} companyId={companyId} />

      <PromiseDetailDialog promise={selectedPromise} onClose={() => setSelectedPromise(null)} />

      <PlanDetailDialog plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PromisesListProps {
  promises: PaymentPromise[];
  onUpdateStatus: (id: string, status: string) => void;
  onView: (promise: PaymentPromise) => void;
}

const PromisesList: React.FC<PromisesListProps> = ({ promises, onUpdateStatus, onView }) => {
  const overdue = promises.filter(p => p.status === 'pending' && isBefore(new Date(p.promise_date), new Date()));
  const upcoming = promises.filter(p => p.status === 'pending' && isAfter(new Date(p.promise_date), new Date()));
  const recent = promises.filter(p => p.status !== 'pending').slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Overdue Promises */}
      {overdue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Overdue Promises ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdue.map(promise => (
                <PromiseCard
                  key={promise.id}
                  promise={promise}
                  onUpdateStatus={onUpdateStatus}
                  onView={onView}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Promises */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Promises ({upcoming.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming.slice(0, 5).map(promise => (
                <PromiseCard
                  key={promise.id}
                  promise={promise}
                  onUpdateStatus={onUpdateStatus}
                  onView={onView}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent History */}
      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent.map(promise => (
                <PromiseCard
                  key={promise.id}
                  promise={promise}
                  onUpdateStatus={onUpdateStatus}
                  onView={onView}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {promises.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Flag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">No Payment Promises</p>
              <p className="text-muted-foreground">Start tracking customer payment commitments</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const PromiseCard: React.FC<{
  promise: PaymentPromise;
  onUpdateStatus: (id: string, status: string) => void;
  onView: (promise: PaymentPromise) => void;
}> = ({ promise, onUpdateStatus, onView }) => {
  const isOverdue = promise.status === 'pending' && isBefore(new Date(promise.promise_date), new Date());
  const daysUntil = differenceInDays(new Date(promise.promise_date), new Date());

  return (
    <div
      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer ${
        isOverdue ? 'border-red-300 bg-red-50' : ''
      }`}
      onClick={() => onView(promise)}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{promise.customer_name}</span>
          <Badge
            variant={
              promise.status === 'kept'
                ? 'default'
                : promise.status === 'broken'
                  ? 'destructive'
                  : isOverdue
                    ? 'destructive'
                    : 'secondary'
            }
          >
            {promise.status}
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-4">
            <span>Invoice: {promise.invoice_number}</span>
            <span className="font-semibold">${promise.promised_amount.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>Promise Date: {format(parseISO(promise.promise_date), 'MMM d, yyyy')}</span>
            {promise.status === 'pending' && (
              <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                ({daysUntil > 0 ? `in ${daysUntil} days` : `${Math.abs(daysUntil)} days overdue`})
              </span>
            )}
          </div>
          {promise.contact_method && <div>Method: {promise.contact_method}</div>}
        </div>
      </div>

      {promise.status === 'pending' && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(promise.id, 'kept');
            }}
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(promise.id, 'broken');
            }}
          >
            <XCircle className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      )}
    </div>
  );
};

interface PlansListProps {
  plans: PaymentPlan[];
  onView: (plan: PaymentPlan) => void;
}

const PlansList: React.FC<PlansListProps> = ({ plans, onView }) => {
  const active = plans.filter(p => p.status === 'active');
  const completed = plans.filter(p => p.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Active Plans */}
      {active.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Plans ({active.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {active.map(plan => (
                <PlanCard key={plan.id} plan={plan} onView={onView} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Plans */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completed Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completed.slice(0, 5).map(plan => (
                <PlanCard key={plan.id} plan={plan} onView={onView} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {plans.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">No Payment Plans</p>
              <p className="text-muted-foreground">Create installment plans for customers</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const PlanCard: React.FC<{
  plan: PaymentPlan;
  onView: (plan: PaymentPlan) => void;
}> = ({ plan, onView }) => {
  const paidInstallments = Math.floor(plan.paid_amount / plan.installment_amount);
  const totalInstallments = plan.number_of_installments || 0;
  const progress = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

  return (
    <div
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
      onClick={() => onView(plan)}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{plan.customer_name}</span>
          <Badge variant={plan.status === 'completed' ? 'default' : plan.status === 'defaulted' ? 'destructive' : 'secondary'}>
            {plan.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Invoice: {plan.invoice_number}</span>
              <span className="font-semibold">${plan.total_amount.toFixed(2)}</span>
            </div>
            <div>
              {paidInstallments} of {totalInstallments} installments paid (${plan.installment_amount.toFixed(2)} each)
            </div>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      <div className="text-right ml-4">
        <div className="text-sm font-semibold">${plan.paid_amount.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground">of ${plan.total_amount.toFixed(2)}</div>
      </div>
    </div>
  );
};

// Dialog placeholders (implement full dialogs similarly to templates)
const PromiseDialog: React.FC<{ open: boolean; onClose: () => void; companyId: string }> = () => null;
const PlanDialog: React.FC<{ open: boolean; onClose: () => void; companyId: string }> = () => null;
const PromiseDetailDialog: React.FC<{ promise: PaymentPromise | null; onClose: () => void }> = () => null;
const PlanDetailDialog: React.FC<{ plan: PaymentPlan | null; onClose: () => void }> = () => null;

export default PaymentPlansManager;

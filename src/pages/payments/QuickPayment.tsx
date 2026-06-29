import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  CreditCard,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  History,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { QuickPaymentRecording } from '@/components/payments/QuickPaymentRecording';
import { PaymentRegistrationTable } from '@/components/payments/PaymentRegistrationTable';
import { PaymentStatsCards } from '@/components/payments/PaymentStatsCards';
import { cn } from '@/lib/utils';

interface QuickPaymentProps {
  className?: string;
}

const paymentSteps = [
  { label: 'اختيار العميل', icon: UserRound },
  { label: 'الفواتير', icon: FileCheck2 },
  { label: 'بيانات الدفع', icon: WalletCards },
  { label: 'التأكيد', icon: CheckCircle2 },
];

const paymentChannels = [
  { label: 'نقدي', value: 'الصندوق', icon: WalletCards },
  { label: 'تحويل', value: 'البنك', icon: CreditCard },
  { label: 'إيصال', value: 'تلقائي', icon: Receipt },
];

export default function QuickPayment({ className }: QuickPaymentProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quick-entry');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickStep, setQuickStep] = useState(0);

  const activeStepIndex = Math.min(Math.max(quickStep, 0), paymentSteps.length - 1);
  const activeStepLabel = paymentSteps[activeStepIndex]?.label || paymentSteps[0].label;

  const tabTitle = useMemo(
    () => (activeTab === 'quick-entry' ? 'تسجيل دفعة جديدة' : 'سجل الدفعات'),
    [activeTab],
  );

  return (
    <motion.div
      dir="rtl"
      className={cn('min-h-screen bg-[#F6F8FB] pb-24', className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 overflow-hidden rounded-2xl border border-[#DDE5EF] bg-white shadow-sm">
          <div className="border-b border-[#E6ECF3] bg-[#FCFDFE] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#173A63] text-white shadow-sm">
                  <Receipt className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-normal text-[#142033] sm:text-3xl">
                      تسجيل الدفعات السريع
                    </h1>
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      جاهز للتسجيل
                    </Badge>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-[#5B6677]">
                    اختر العميل، راجع الفواتير المستحقة، وسجل الدفعة من شاشة واحدة مع إيصال جاهز للطباعة.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 gap-2 border-[#CAD5E2] bg-white text-[#173A63]"
                  onClick={() => navigate('/finance/payments/import-excel')}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  استيراد Excel
                </Button>
                <Button
                  variant="outline"
                  className="h-10 gap-2 border-[#CAD5E2] bg-white text-[#173A63]"
                  onClick={() => setActiveTab('payment-history')}
                >
                  <History className="h-4 w-4" />
                  السجل
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-0 divide-y divide-[#E6ECF3] px-5 py-4 sm:grid-cols-3 sm:divide-x sm:divide-x-reverse sm:divide-y-0 sm:px-6">
            {paymentChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div key={channel.label} className="flex items-center gap-3 py-3 sm:px-4 sm:first:pr-0 sm:last:pl-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF5FB] text-[#173A63]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#172033]">{channel.label}</p>
                    <p className="text-xs text-[#687385]">{channel.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <PaymentStatsCards />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 w-full">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-[#6A7688]">{tabTitle}</p>
              <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl border border-[#D8E1EC] bg-white p-1 shadow-sm sm:w-[420px]">
                <TabsTrigger
                  value="quick-entry"
                  className="gap-2 rounded-lg text-[#5B6677] data-[state=active]:bg-[#173A63] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  تسجيل سريع
                </TabsTrigger>
                <TabsTrigger
                  value="payment-history"
                  className="gap-2 rounded-lg text-[#5B6677] data-[state=active]:bg-[#173A63] data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <History className="h-4 w-4" />
                  سجل الدفعات
                </TabsTrigger>
              </TabsList>
            </div>

            {activeTab === 'payment-history' && (
              <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                <div className="relative min-w-0 flex-1 xl:w-80">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8698]" />
                  <Input
                    placeholder="ابحث برقم الإيصال أو اسم العميل..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-11 rounded-xl border-[#D8E1EC] bg-white pr-10 shadow-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  <Button
                    variant="outline"
                    className={cn(
                      'h-11 gap-2 rounded-xl border-[#D8E1EC] bg-white shadow-sm',
                      showFilters && 'border-[#173A63] bg-[#EEF5FB] text-[#173A63]',
                    )}
                    onClick={() => setShowFilters((value) => !value)}
                  >
                    <Filter className="h-4 w-4" />
                    تصفية
                  </Button>
                  <Button variant="outline" className="h-11 gap-2 rounded-xl border-[#D8E1EC] bg-white shadow-sm">
                    <Download className="h-4 w-4" />
                    تصدير
                  </Button>
                  <Button variant="outline" className="h-11 gap-2 rounded-xl border-[#D8E1EC] bg-white shadow-sm">
                    <RefreshCw className="h-4 w-4" />
                    تحديث
                  </Button>
                </div>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="quick-entry" className="mt-0">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <QuickPaymentRecording onStepChange={setQuickStep} />
                  </div>

                  <aside className="h-fit rounded-2xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#142033]">مسار التسجيل</p>
                        <p className="mt-1 text-xs text-[#6A7688]">المرحلة الحالية: {activeStepLabel}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {paymentSteps.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index === activeStepIndex;
                        const isDone = index < activeStepIndex;

                        return (
                          <div
                            key={step.label}
                            className={cn(
                              'flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors',
                              isActive && 'border-[#173A63] bg-[#EEF5FB]',
                              isDone && 'border-emerald-200 bg-emerald-50',
                              !isActive && !isDone && 'border-[#E3EAF2] bg-white',
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg',
                                isActive && 'bg-[#173A63] text-white',
                                isDone && 'bg-emerald-600 text-white',
                                !isActive && !isDone && 'bg-[#F2F5F9] text-[#7A8698]',
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[#172033]">{step.label}</p>
                              <p className="text-xs text-[#6A7688]">
                                {isDone ? 'مكتملة' : isActive ? 'قيد التنفيذ' : 'بانتظارها'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 rounded-xl border border-[#DDE5EF] bg-[#FAFBFC] p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#142033]">
                        <HelpCircle className="h-4 w-4 text-[#173A63]" />
                        نقاط مهمة
                      </div>
                      <ul className="space-y-2 text-xs leading-6 text-[#5B6677]">
                        <li>يمكن البحث عن العميل ثم تحديد الفواتير المستحقة فقط.</li>
                        <li>يتم إنشاء الإيصال بعد نجاح تسجيل الدفعة.</li>
                        <li>راجع الحساب أو البنك قبل اعتماد العملية.</li>
                      </ul>
                    </div>
                  </aside>
                </div>
              </TabsContent>

              <TabsContent value="payment-history" className="mt-0">
                <PaymentRegistrationTable searchTerm={searchTerm} showFilters={showFilters} />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-50 sm:hidden">
        <div className="rounded-2xl border border-[#D8E1EC] bg-white p-2 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeTab === 'quick-entry' ? 'default' : 'ghost'}
              className={cn(
                'h-11 gap-2 rounded-xl',
                activeTab === 'quick-entry' && 'bg-[#173A63] text-white hover:bg-[#173A63]/90',
              )}
              onClick={() => setActiveTab('quick-entry')}
            >
              <Plus className="h-4 w-4" />
              تسجيل
            </Button>
            <Button
              variant={activeTab === 'payment-history' ? 'default' : 'ghost'}
              className={cn(
                'h-11 gap-2 rounded-xl',
                activeTab === 'payment-history' && 'bg-[#173A63] text-white hover:bg-[#173A63]/90',
              )}
              onClick={() => setActiveTab('payment-history')}
            >
              <History className="h-4 w-4" />
              السجل
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

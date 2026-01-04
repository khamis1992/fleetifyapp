import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  History,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  CreditCard,
  Sparkles,
  Zap,
  ArrowRight,
  ArrowLeft,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { QuickPaymentRecording } from '@/components/payments/QuickPaymentRecording';
import { PaymentRegistrationTableRedesigned } from '@/components/payments/PaymentRegistrationTableRedesigned';
import { PaymentStatsCardsRedesigned } from '@/components/payments/PaymentStatsCardsRedesigned';

interface QuickPaymentProps {
  className?: string;
}

// Animated gradient background component
const GradientBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 90, 0],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }}
      className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent rounded-full blur-3xl"
    />
    <motion.div
      animate={{
        scale: [1.2, 1, 1.2],
        rotate: [90, 0, 90],
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        ease: "linear"
      }}
      className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-blue-500/10 via-transparent to-transparent rounded-full blur-3xl"
    />
  </div>
);

export default function QuickPayment({ className }: QuickPaymentProps) {
  const [activeTab, setActiveTab] = useState('quick-entry');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: initial, 1: customer selected, 2: invoices selected, 3: payment ready

  const steps = [
    { number: '01', title: 'ابحث عن العميل', icon: Search, color: 'from-blue-500 to-cyan-500' },
    { number: '02', title: 'اختر الفاتورة', icon: Receipt, color: 'from-purple-500 to-pink-500' },
    { number: '03', title: 'سجل الدفعة', icon: CreditCard, color: 'from-emerald-500 to-teal-500' },
  ];

  // Reset step when switching tabs
  useEffect(() => {
    if (activeTab === 'quick-entry') {
      setCurrentStep(0);
    }
  }, [activeTab]);

  return (
    <div className={`min-h-screen relative ${className || ''}`}>
      {/* Animated gradient background */}
      <GradientBackground />

      {/* Sticky Header Bar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-neutral-200/50 shadow-sm"
      >
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left side - Title & Breadcrumb */}
          <div className="flex items-center gap-4">
            <motion.div
              className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Receipt className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent">
                تسجيل الدفعات
              </h1>
              <p className="text-sm text-neutral-500">واجهة متقدمة لتسجيل وإدارة دفعات العملاء</p>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">دفع سريع</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 container mx-auto px-4 py-6 space-y-6"
      >
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <PaymentStatsCardsRedesigned />
        </motion.div>

        {/* Process Steps Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hidden md:block"
        >
          <Card className="backdrop-blur-sm bg-white/60 border-neutral-200/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center divide-x divide-neutral-200/50">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === index + 1;
                  const isCompleted = currentStep > index + 1;
                  return (
                    <motion.div
                      key={step.number}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + index * 0.1 }}
                      className={`flex-1 flex items-center gap-4 p-6 ${
                        isActive ? 'bg-gradient-to-r ' + step.color + ' bg-opacity-10' : ''
                      }`}
                    >
                      <motion.div
                        className={`p-3 rounded-xl bg-gradient-to-br ${
                          isCompleted ? 'from-emerald-500 to-emerald-600' : step.color
                        } shadow-lg relative`}
                        animate={isActive ? {
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, 0],
                        } : {}}
                        transition={{
                          duration: 2,
                          repeat: isActive ? Infinity : 0,
                        }}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5 text-white" />
                        ) : (
                          <Icon className="h-5 w-5 text-white" />
                        )}
                      </motion.div>
                      <div>
                        <div className="text-xs font-medium text-neutral-500 mb-1">{step.number}</div>
                        <div className={`font-semibold ${isActive || isCompleted ? 'text-neutral-900' : 'text-neutral-600'}`}>
                          {step.title}
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <ArrowRight className={`h-5 w-5 ml-auto ${isCompleted ? 'text-emerald-500' : 'text-neutral-300'}`} />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="backdrop-blur-sm bg-white/60 border-neutral-200/50 shadow-xl shadow-neutral-200/20 overflow-hidden">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Tab Navigation */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                  <TabsList className="flex gap-2 p-1 bg-neutral-100/80 rounded-xl h-auto">
                    <TabsTrigger
                      value="quick-entry"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-lg px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4 text-emerald-600" />
                      <span className="font-semibold">تسجيل سريع</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="payment-history"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-lg px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2"
                    >
                      <History className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold">سجل الدفعات</span>
                    </TabsTrigger>
                  </TabsList>

                  {activeTab === 'payment-history' && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 w-full lg:w-auto"
                    >
                      <div className="relative flex-1 lg:flex-initial">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <Input
                          placeholder="البحث في الدفعات..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pr-10 w-full lg:w-64 bg-white/50 backdrop-blur-sm border-neutral-200/50 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className={showFilters ? 'bg-emerald-50 border-emerald-500/50 text-emerald-700' : ''}
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </motion.div>
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
                    <TabsContent value="quick-entry" className="mt-0 space-y-6">
                      <div className="relative overflow-hidden rounded-2xl">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl" />

                        <div className="relative p-6">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between mb-6"
                          >
                            <div>
                              <CardTitle className="flex items-center gap-3 text-xl">
                                <motion.div
                                  className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg"
                                  animate={{
                                    scale: [1, 1.05, 1],
                                    rotate: [0, 2, 0],
                                  }}
                                  transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }}
                                >
                                  <Zap className="h-5 w-5 text-white" />
                                </motion.div>
                                <span>تسجيل دفعة سريع</span>
                              </CardTitle>
                              <CardDescription className="mt-2 text-base">
                                سجل دفعة العميل في أقل من 30 ثانية
                              </CardDescription>
                            </div>
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-lg">
                              <Sparkles className="h-3 w-3 mr-1" />
                              سريع
                            </Badge>
                          </motion.div>

                          <QuickPaymentRecording onStepChange={setCurrentStep} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="payment-history" className="mt-0">
                      <div className="relative overflow-hidden rounded-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />

                        <div className="relative p-6">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between mb-6"
                          >
                            <div>
                              <CardTitle className="flex items-center gap-3 text-xl">
                                <motion.div
                                  className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg"
                                  animate={{
                                    scale: [1, 1.05, 1],
                                    rotate: [0, -2, 0],
                                  }}
                                  transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }}
                                >
                                  <History className="h-5 w-5 text-white" />
                                </motion.div>
                                <span>سجل الدفعات</span>
                              </CardTitle>
                              <CardDescription className="mt-2 text-base">
                                عرض وإدارة جميع سجلات الدفعات
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-white/50 backdrop-blur-sm">
                              <Calendar className="h-3 w-3 ml-1" />
                              آخر 30 يوم
                            </Badge>
                          </motion.div>

                          <PaymentRegistrationTableRedesigned searchTerm={searchTerm} showFilters={showFilters} />
                        </div>
                      </div>
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Mobile Quick Actions Bar - Enhanced */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-inset-bottom"
      >
        <Card className="rounded-none border-t border-neutral-200/50 backdrop-blur-xl bg-white/90 shadow-2xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-around">
              <motion.div className="flex-1">
                <Button
                  variant={activeTab === 'quick-entry' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('quick-entry')}
                  className={`w-full gap-2 ${
                    activeTab === 'quick-entry'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20'
                      : ''
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="h-4 w-4" />
                  <span>تسجيل</span>
                </Button>
              </motion.div>
              <div className="w-px h-8 bg-neutral-200 mx-2" />
              <motion.div className="flex-1">
                <Button
                  variant={activeTab === 'payment-history' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('payment-history')}
                  className={`w-full gap-2 ${
                    activeTab === 'payment-history'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20'
                      : ''
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <History className="h-4 w-4" />
                  <span>السجل</span>
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom spacer for mobile bar */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

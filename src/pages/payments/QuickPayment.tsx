import React, { useState } from 'react';
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
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { QuickPaymentRecording } from '@/components/payments/QuickPaymentRecording';
import { PaymentRegistrationTable } from '@/components/payments/PaymentRegistrationTable';
import { PaymentStatsCards } from '@/components/payments/PaymentStatsCards';
import { PageHelp } from "@/components/help";
import { QuickPaymentPageHelpContent } from "@/components/help/content";

interface QuickPaymentProps {
  className?: string;
}

export default function QuickPayment({ className }: QuickPaymentProps) {
  const [activeTab, setActiveTab] = useState('quick-entry');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className={`container mx-auto py-6 space-y-6 ${className || ''}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Enhanced Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">تسجيل الدفعات</h1>
              <p className="text-muted-foreground text-sm">
                واجهة متقدمة لتسجيل وإدارة دفعات العملاء
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <PageHelp
              title="مساعدة صفحة الدفعات"
              content={<QuickPaymentPageHelpContent />}
              triggerText="مساعدة"
            />
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants}>
        <PaymentStatsCards />
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList className="grid w-full sm:w-auto grid-cols-2 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger
                value="quick-entry"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">تسجيل سريع</span>
                <span className="sm:hidden">سريع</span>
              </TabsTrigger>
              <TabsTrigger
                value="payment-history"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">سجل الدفعات</span>
                <span className="sm:hidden">السجل</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === 'payment-history' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث في الدفعات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 w-full sm:w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="shrink-0"
                >
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="shrink-0">
                  <RefreshCw className="h-4 w-4" />
                </Button>
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
              <TabsContent value="quick-entry" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          تسجيل دفعة سريع
                        </CardTitle>
                        <CardDescription>
                          سجل دفعة العميل في أقل من 30 ثانية
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        سريع
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <QuickPaymentRecording />
                  </CardContent>
                </Card>

              </TabsContent>

              <TabsContent value="payment-history" className="mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <History className="h-5 w-5 text-blue-600" />
                          سجل الدفعات
                        </CardTitle>
                        <CardDescription>
                          عرض وإدارة جميع سجلات الدفعات
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="hidden sm:flex">
                          <Calendar className="h-3 w-3 ml-1" />
                          آخر 30 يوم
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PaymentRegistrationTable searchTerm={searchTerm} showFilters={showFilters} />
                  </CardContent>
                </Card>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </motion.div>

      {/* Quick Actions Bar */}
      <motion.div variants={itemVariants} className="fixed bottom-4 left-4 right-4 z-50 sm:hidden">
        <Card className="shadow-lg border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-around">
              <Button
                variant={activeTab === 'quick-entry' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('quick-entry')}
                className="flex-1"
              >
                <Plus className="h-4 w-4" />
                <span className="mr-2">تسجيل</span>
              </Button>
              <Button
                variant={activeTab === 'payment-history' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('payment-history')}
                className="flex-1"
              >
                <History className="h-4 w-4" />
                <span className="mr-2">السجل</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
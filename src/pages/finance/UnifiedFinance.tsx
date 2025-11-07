import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  Wallet, 
  Users 
} from 'lucide-react';

// Import existing components
import Overview from './Overview';
import { UnifiedPayments } from '@/components/finance/UnifiedPayments';
import Invoices from './Invoices';
import Deposits from './Deposits';
import PurchaseOrders from './PurchaseOrders';
import GeneralLedger from './GeneralLedger';
import JournalEntries from './JournalEntries';
import { ChartOfAccountsManager } from '@/components/finance/ChartOfAccountsManager';
import Treasury from './Treasury';
import { PaymentTrackingDashboard } from '@/components/finance/PaymentTrackingDashboard';
import Vendors from './Vendors';
import VendorCategories from './VendorCategories';

/**
 * صفحة المالية الموحدة
 * 
 * تجمع جميع العمليات المالية اليومية في صفحة واحدة مع 5 تبويبات:
 * 1. نظرة عامة - لوحة التحكم المالية
 * 2. العمليات اليومية - الفواتير والمدفوعات
 * 3. المحاسبة - دفتر الأستاذ والقيود
 * 4. الخزينة - إدارة السيولة النقدية
 * 5. الموردين - إدارة الموردين
 */
const UnifiedFinance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المالية الموحدة</h1>
          <p className="text-muted-foreground mt-1">
            إدارة شاملة لجميع العمليات المالية في مكان واحد
          </p>
        </div>
      </div>

      {/* Unified Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">العمليات اليومية</span>
          </TabsTrigger>
          <TabsTrigger value="accounting" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">المحاسبة</span>
          </TabsTrigger>
          <TabsTrigger value="treasury" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">الخزينة</span>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">الموردين</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <Overview />
        </TabsContent>

        {/* Tab 2: Daily Operations */}
        <TabsContent value="operations" className="space-y-6">
          <Tabs defaultValue="invoices" className="space-y-4">
            <TabsList>
              <TabsTrigger value="invoices">الفواتير</TabsTrigger>
              <TabsTrigger value="payments">المدفوعات</TabsTrigger>
              <TabsTrigger value="deposits">الإيداعات</TabsTrigger>
              <TabsTrigger value="purchase-orders">أوامر الشراء</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
              <Invoices />
            </TabsContent>

            <TabsContent value="payments">
              <UnifiedPayments />
            </TabsContent>

            <TabsContent value="deposits">
              <Deposits />
            </TabsContent>

            <TabsContent value="purchase-orders">
              <PurchaseOrders />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab 3: Accounting */}
        <TabsContent value="accounting" className="space-y-6">
          <Tabs defaultValue="general-ledger" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general-ledger">دفتر الأستاذ العام</TabsTrigger>
              <TabsTrigger value="journal-entries">القيود اليومية</TabsTrigger>
              <TabsTrigger value="chart-of-accounts">دليل الحسابات</TabsTrigger>
            </TabsList>

            <TabsContent value="general-ledger">
              <GeneralLedger />
            </TabsContent>

            <TabsContent value="journal-entries">
              <JournalEntries />
            </TabsContent>

            <TabsContent value="chart-of-accounts">
              <ChartOfAccountsManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab 4: Treasury */}
        <TabsContent value="treasury" className="space-y-6">
          <Tabs defaultValue="treasury-management" className="space-y-4">
            <TabsList>
              <TabsTrigger value="treasury-management">إدارة الخزينة</TabsTrigger>
              <TabsTrigger value="payment-tracking">تتبع المدفوعات</TabsTrigger>
            </TabsList>

            <TabsContent value="treasury-management">
              <Treasury />
            </TabsContent>

            <TabsContent value="payment-tracking">
              <PaymentTrackingDashboard />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab 5: Vendors */}
        <TabsContent value="vendors" className="space-y-6">
          <Tabs defaultValue="vendors-list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="vendors-list">قائمة الموردين</TabsTrigger>
              <TabsTrigger value="vendor-categories">فئات الموردين</TabsTrigger>
            </TabsList>

            <TabsContent value="vendors-list">
              <Vendors />
            </TabsContent>

            <TabsContent value="vendor-categories">
              <VendorCategories />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedFinance;

/**
 * Collections Page
 * 
 * Displays the Collections Command Center dashboard
 */

import React, { useEffect, useState } from 'react';
import { PageCustomizer } from '@/components/PageCustomizer';
import { CollectionsDashboard, PaymentCalendar, ReminderTemplatesManager, CustomerPaymentIntelligence, PaymentPlansManager } from '@/components/payments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Calendar, Mail, Target, CreditCard, MessageSquare, AlertCircle, AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import WhatsAppReminders from './legal/WhatsAppReminders';
import { LateFeeManagement } from '@/components/invoices/LateFeeManagement';
import { InvoiceDisputeManagement } from '@/components/invoices/InvoiceDisputeManagement';
import { ARAgingReport } from '@/components/finance/ARAgingReport';
import { PaymentTracking } from '@/components/finance/PaymentTracking';

const Collections = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Get current user's company
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view collections data.",
          variant: "destructive",
        });
      }
    };

    checkAuth();
  }, [toast]);

  // Get company ID and name from current user's profile
  const getCompanyData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) return null;

    const { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', profile.company_id)
      .single();

    return company;
  };

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    getCompanyData().then(company => {
      if (company) {
        setCompanyId(company.id);
        setCompanyName(company.name);
      }
    });
  }, []);

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading collections data...</p>
        </div>
      </div>
    );
  }

  return (
    <PageCustomizer
      pageId="collections-page"
      title="Collections"
      titleAr="التحصيل"
    >
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6">
          <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-full grid-cols-10">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Intelligence
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="late-fees" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Late Fees
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disputes
            </TabsTrigger>
            <TabsTrigger value="ar-aging" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              AR Aging
            </TabsTrigger>
            <TabsTrigger value="payment-tracking" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <CollectionsDashboard companyId={companyId} />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <PaymentCalendar companyId={companyId} />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <ReminderTemplatesManager companyId={companyId} companyName={companyName} />
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6">
            <CustomerPaymentIntelligence companyId={companyId} />
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <PaymentPlansManager companyId={companyId} />
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <WhatsAppReminders />
          </TabsContent>

          <TabsContent value="late-fees" className="space-y-6">
            <LateFeeManagement />
          </TabsContent>

          <TabsContent value="disputes" className="space-y-6">
            <InvoiceDisputeManagement />
          </TabsContent>

          <TabsContent value="ar-aging" className="space-y-6">
            <ARAgingReport />
          </TabsContent>

          <TabsContent value="payment-tracking" className="space-y-6">
            <PaymentTracking />
          </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageCustomizer>
  );
};

export default Collections;

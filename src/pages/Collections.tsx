/**
 * Collections Page
 * 
 * Displays the Collections Command Center dashboard
 */

import React, { useEffect, useState } from 'react';
import { CollectionsDashboard, PaymentCalendar, ReminderTemplatesManager, CustomerPaymentIntelligence, PaymentPlansManager } from '@/components/payments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Calendar, Mail, Target, CreditCard } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-5xl grid-cols-5">
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
        </Tabs>
      </div>
    </div>
  );
};

export default Collections;

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaveRequestForm } from "@/components/hr/LeaveRequestForm";
import { LeaveRequestsList } from "@/components/hr/LeaveRequestsList";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePermissionCheck } from "@/hooks/usePermissionCheck";

export default function LeaveManagement() {
  const { user } = useAuth();
  const [canReview] = useState(true); // Simplified for now

  // Get current user's employee record
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">إدارة الإجازات</h1>
          <p className="text-muted-foreground">
            إدارة طلبات الإجازات وأرصدة الموظفين
          </p>
        </div>
        
        {currentEmployee && (
          <LeaveRequestForm 
            employeeId={currentEmployee.id} 
            onSuccess={() => window.location.reload()}
          />
        )}
      </div>

      <Tabs defaultValue="my-requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-requests">طلباتي</TabsTrigger>
          {canReview && (
            <>
              <TabsTrigger value="pending-review">قيد المراجعة</TabsTrigger>
              <TabsTrigger value="all-requests">جميع الطلبات</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="my-requests">
          <Card>
            <CardHeader>
              <CardTitle>طلبات الإجازة الخاصة بي</CardTitle>
              <CardDescription>
                عرض جميع طلبات الإجازة التي قدمتها
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentEmployee ? (
                <LeaveRequestsList 
                  employeeId={currentEmployee.id}
                  showActions={false}
                  canReview={false}
                />
              ) : (
                <p className="text-center text-muted-foreground">
                  لا يمكن العثور على بيانات الموظف
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canReview && (
          <>
            <TabsContent value="pending-review">
              <Card>
                <CardHeader>
                  <CardTitle>الطلبات قيد المراجعة</CardTitle>
                  <CardDescription>
                    طلبات الإجازة التي تحتاج إلى مراجعة واتخاذ قرار
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveRequestsList 
                    showActions={true}
                    canReview={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all-requests">
              <Card>
                <CardHeader>
                  <CardTitle>جميع طلبات الإجازة</CardTitle>
                  <CardDescription>
                    عرض جميع طلبات الإجازة في الشركة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveRequestsList 
                    showActions={true}
                    canReview={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
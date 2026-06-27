import { useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Clock, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LeaveRequestForm } from "@/components/hr/LeaveRequestForm";
import { LeaveRequestsList } from "@/components/hr/LeaveRequestsList";
import { HRMetricCard, HRPageHeader, HRPageShell, HRSectionCard } from "@/components/hr/HRDesignSystem";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LeaveManagement() {
  const { user } = useAuth();
  const [canReview] = useState(true);

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
    <HRPageShell>
      <HRPageHeader
        title="إدارة الإجازات"
        description="مسار واضح لتقديم الإجازات ومراجعتها ومتابعة الطلبات الحالية والسابقة."
        icon={CalendarDays}
        badge="الإجازات"
        action={
          currentEmployee && (
            <LeaveRequestForm
              employeeId={currentEmployee.id}
              onSuccess={() => window.location.reload()}
            />
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HRMetricCard title="طلباتي" value="نشطة" icon={FileText} tone="info" />
        <HRMetricCard title="قيد المراجعة" value={canReview ? "متاحة" : "غير متاحة"} icon={Clock} tone="focus" />
        <HRMetricCard title="الاعتماد" value="مراقب" icon={CheckCircle2} tone="success" />
        <HRMetricCard title="أرشيف الطلبات" value="كامل" icon={ClipboardList} tone="neutral" />
      </div>

      <Tabs defaultValue="my-requests" className="space-y-5">
        <TabsList className="h-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <TabsTrigger value="my-requests" className="h-11 rounded-xl px-4 text-[#94A3B8] data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white">
            طلباتي
          </TabsTrigger>
          {canReview && (
            <>
              <TabsTrigger value="pending-review" className="h-11 rounded-xl px-4 text-[#94A3B8] data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white">
                قيد المراجعة
              </TabsTrigger>
              <TabsTrigger value="all-requests" className="h-11 rounded-xl px-4 text-[#94A3B8] data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white">
                جميع الطلبات
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="my-requests" className="mt-0">
          <HRSectionCard>
            <CardHeader>
              <CardTitle className="text-lg font-black text-[#020617]">طلبات الإجازة الخاصة بي</CardTitle>
              <CardDescription>عرض جميع طلبات الإجازة التي قدمتها</CardDescription>
            </CardHeader>
            <CardContent>
              {currentEmployee ? (
                <LeaveRequestsList employeeId={currentEmployee.id} showActions={false} canReview={false} />
              ) : (
                <p className="rounded-2xl bg-[#F6F8FB] p-6 text-center font-bold text-[#94A3B8]">
                  لا يمكن العثور على بيانات الموظف
                </p>
              )}
            </CardContent>
          </HRSectionCard>
        </TabsContent>

        {canReview && (
          <>
            <TabsContent value="pending-review" className="mt-0">
              <HRSectionCard>
                <CardHeader>
                  <CardTitle className="text-lg font-black text-[#020617]">الطلبات قيد المراجعة</CardTitle>
                  <CardDescription>طلبات الإجازة التي تحتاج إلى مراجعة واتخاذ قرار</CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveRequestsList showActions={true} canReview={true} />
                </CardContent>
              </HRSectionCard>
            </TabsContent>

            <TabsContent value="all-requests" className="mt-0">
              <HRSectionCard>
                <CardHeader>
                  <CardTitle className="text-lg font-black text-[#020617]">جميع طلبات الإجازة</CardTitle>
                  <CardDescription>عرض جميع طلبات الإجازة في الشركة</CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveRequestsList showActions={true} canReview={true} />
                </CardContent>
              </HRSectionCard>
            </TabsContent>
          </>
        )}
      </Tabs>
    </HRPageShell>
  );
}

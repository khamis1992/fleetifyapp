import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useReviewLeaveRequest } from "@/hooks/useLeaveManagement";

const formSchema = z.object({
  action: z.enum(["approved", "rejected"], {
    required_error: "يجب اختيار إجراء",
  }),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LeaveRequestReviewDialogProps {
  request: any;
  children: React.ReactNode;
  onSuccess?: () => void;
}

export const LeaveRequestReviewDialog = ({ 
  request, 
  children, 
  onSuccess 
}: LeaveRequestReviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"approved" | "rejected" | null>(null);
  
  const reviewRequest = useReviewLeaveRequest();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await reviewRequest.mutateAsync({
        requestId: request.id,
        action: data.action,
        notes: data.notes,
      });

      setOpen(false);
      form.reset();
      setSelectedAction(null);
      onSuccess?.();
    } catch (error) {
      console.error("Error reviewing leave request:", error);
    }
  };

  const handleActionSelect = (action: "approved" | "rejected") => {
    setSelectedAction(action);
    form.setValue("action", action);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>مراجعة طلب الإجازة</DialogTitle>
          <DialogDescription>
            راجع تفاصيل الطلب واتخذ القرار المناسب
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">الموظف</p>
                  <p className="font-medium">
                    {request.employees?.first_name_ar || request.employees?.first_name} {" "}
                    {request.employees?.last_name_ar || request.employees?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({request.employees?.employee_number})
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">نوع الإجازة</p>
                  <p className="font-medium">
                    {request.leave_types?.type_name_ar || request.leave_types?.type_name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">الفترة</p>
                  <p className="font-medium">
                    {format(new Date(request.start_date), "dd/MM/yyyy", { locale: ar })} - {" "}
                    {format(new Date(request.end_date), "dd/MM/yyyy", { locale: ar })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">عدد الأيام</p>
                  <p className="font-medium">{request.total_days} يوم</p>
                </div>
              </div>

              {request.reason && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">السبب</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{request.reason}</p>
                </div>
              )}

              {request.covering_employee && (
                <div>
                  <p className="text-sm text-muted-foreground">الموظف البديل</p>
                  <p className="font-medium">
                    {request.covering_employee.first_name_ar || request.covering_employee.first_name} {" "}
                    {request.covering_employee.last_name_ar || request.covering_employee.last_name}
                  </p>
                </div>
              )}

              {request.emergency_contact && (
                <div>
                  <p className="text-sm text-muted-foreground">رقم الطوارئ</p>
                  <p className="font-medium">{request.emergency_contact}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">تاريخ التقديم</p>
                <p className="font-medium">
                  {format(new Date(request.applied_date), "dd/MM/yyyy HH:mm", { locale: ar })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Review Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">اتخاذ القرار</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={selectedAction === "approved" ? "default" : "outline"}
                    className={`h-20 flex flex-col items-center justify-center gap-2 ${
                      selectedAction === "approved" ? "bg-green-600 hover:bg-green-700" : ""
                    }`}
                    onClick={() => handleActionSelect("approved")}
                  >
                    <CheckCircle className="h-6 w-6" />
                    <span>الموافقة على الطلب</span>
                  </Button>

                  <Button
                    type="button"
                    variant={selectedAction === "rejected" ? "destructive" : "outline"}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    onClick={() => handleActionSelect("rejected")}
                  >
                    <XCircle className="h-6 w-6" />
                    <span>رفض الطلب</span>
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ملاحظات المراجعة {selectedAction === "rejected" && "(مطلوب في حالة الرفض)"}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          selectedAction === "approved" 
                            ? "أضف أي ملاحظات إضافية (اختياري)..." 
                            : "اكتب سبب الرفض..."
                        }
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedAction === "rejected" && !form.watch("notes") && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-md">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">يجب كتابة سبب الرفض</span>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    !selectedAction || 
                    reviewRequest.isPending ||
                    (selectedAction === "rejected" && !form.watch("notes"))
                  }
                >
                  {reviewRequest.isPending ? "جارٍ الحفظ..." : "تأكيد القرار"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
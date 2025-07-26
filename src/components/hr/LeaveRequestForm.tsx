import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInDays, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLeaveTypes, useSubmitLeaveRequest, useLeaveBalances } from "@/hooks/useLeaveManagement";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  leave_type_id: z.string().min(1, "يجب اختيار نوع الإجازة"),
  start_date: z.date({ required_error: "يجب تحديد تاريخ البداية" }),
  end_date: z.date({ required_error: "يجب تحديد تاريخ النهاية" }),
  reason: z.string().min(10, "السبب يجب أن يكون 10 أحرف على الأقل"),
  emergency_contact: z.string().optional(),
  covering_employee_id: z.string().optional(),
}).refine((data) => data.end_date >= data.start_date, {
  message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
  path: ["end_date"],
});

type FormData = z.infer<typeof formSchema>;

interface LeaveRequestFormProps {
  employeeId: string;
  onSuccess?: () => void;
}

export const LeaveRequestForm = ({ employeeId, onSuccess }: LeaveRequestFormProps) => {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const { toast } = useToast();

  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: leaveBalances = [] } = useLeaveBalances(employeeId);
  const submitRequest = useSubmitLeaveRequest();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
      emergency_contact: "",
    },
  });

  // Fetch employees for covering employee selection
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, first_name_ar, last_name_ar, department")
        .eq("is_active", true)
        .neq("id", employeeId);

      if (!error && data) {
        setEmployees(data);
      }
    };

    fetchEmployees();
  }, [employeeId]);

  const watchedStartDate = form.watch("start_date");
  const watchedEndDate = form.watch("end_date");
  const watchedLeaveTypeId = form.watch("leave_type_id");

  const totalDays = watchedStartDate && watchedEndDate 
    ? differenceInDays(watchedEndDate, watchedStartDate) + 1 
    : 0;

  const selectedLeaveBalance = leaveBalances.find(
    (balance) => balance.leave_type_id === watchedLeaveTypeId
  );

  const onSubmit = async (data: FormData) => {
    try {
      await submitRequest.mutateAsync({
        employee_id: employeeId,
        leave_type_id: data.leave_type_id,
        start_date: format(data.start_date, "yyyy-MM-dd"),
        end_date: format(data.end_date, "yyyy-MM-dd"),
        total_days: totalDays,
        reason: data.reason,
        emergency_contact: data.emergency_contact,
        covering_employee_id: data.covering_employee_id,
      });

      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting leave request:", error);
    }
  };

  const getAvailableDays = (leaveTypeId: string) => {
    const balance = leaveBalances.find(b => b.leave_type_id === leaveTypeId);
    return balance?.remaining_days || 0;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>طلب إجازة جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>طلب إجازة جديد</DialogTitle>
          <DialogDescription>
            قم بملء جميع البيانات المطلوبة لتقديم طلب الإجازة
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leave_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الإجازة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الإجازة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leaveTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{type.type_name_ar || type.type_name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({getAvailableDays(type.id)} يوم متاح)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="covering_employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموظف البديل (اختياري)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الموظف البديل" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.first_name_ar || employee.first_name} {employee.last_name_ar || employee.last_name}
                            {employee.department && ` - ${employee.department}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ البداية</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ النهاية</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < (watchedStartDate || new Date())}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {totalDays > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{totalDays}</div>
                      <div className="text-sm text-muted-foreground">إجمالي الأيام</div>
                    </div>
                    {selectedLeaveBalance && (
                      <div>
                        <div className="text-2xl font-bold text-secondary">
                          {selectedLeaveBalance.remaining_days}
                        </div>
                        <div className="text-sm text-muted-foreground">الأيام المتاحة</div>
                      </div>
                    )}
                  </div>
                  {selectedLeaveBalance && totalDays > selectedLeaveBalance.remaining_days && (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                      تحذير: عدد الأيام المطلوبة أكبر من الرصيد المتاح
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سبب الإجازة</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="اكتب سبب طلب الإجازة..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergency_contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الاتصال في حالة الطوارئ (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="رقم الهاتف للتواصل في حالة الطوارئ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={submitRequest.isPending || (selectedLeaveBalance && totalDays > selectedLeaveBalance.remaining_days)}
              >
                {submitRequest.isPending ? "جارٍ التقديم..." : "تقديم الطلب"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
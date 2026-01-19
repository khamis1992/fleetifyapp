import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateVehicle } from "@/hooks/useVehicles";
import { useToast } from "@/components/ui/use-toast"; // Corrected import path
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const formSchema = z.object({
  status: z.string().min(1, "الحالة مطلوبة"),
  notes: z.string().optional(),
});

interface VehicleStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  currentStatus?: string;
  currentNotes?: string;
  onSuccess?: () => void;
}

export function VehicleStatusChangeDialog({
  open,
  onOpenChange,
  vehicleId,
  currentStatus,
  currentNotes,
  onSuccess,
}: VehicleStatusChangeDialogProps) {
  const updateVehicle = useUpdateVehicle();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: currentStatus || "available",
      notes: currentNotes || "",
    },
  });

  // Update default values when props change
  useEffect(() => {
    if (open) {
      form.reset({
        status: currentStatus || "available",
        notes: currentNotes || "",
      });
    }
  }, [open, currentStatus, currentNotes, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await updateVehicle.mutateAsync({
        id: vehicleId,
        status: values.status as any,
        notes: values.notes,
      });
      
      toast({
        title: "تم بنجاح",
        description: "تم تحديث حالة المركبة بنجاح",
      });
      
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error updating vehicle status:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة المركبة",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">تغيير حالة المركبة</DialogTitle>
          <DialogDescription className="text-right">
            قم باختيار الحالة الجديدة للمركبة.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-right block">الحالة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-right" dir="rtl">
                        <SelectValue placeholder="اختر الحالة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent dir="rtl">
                      <SelectItem value="available">متاحة</SelectItem>
                      <SelectItem value="rented">مؤجرة</SelectItem>
                      <SelectItem value="maintenance">قيد الصيانة</SelectItem>
                      <SelectItem value="out_of_service">خارج الخدمة</SelectItem>
                      <SelectItem value="reserved">محجوزة</SelectItem>
                      <SelectItem value="reserved_employee">محجوزة لموظف</SelectItem>
                      <SelectItem value="accident">حادث</SelectItem>
                      <SelectItem value="stolen">مسروقة</SelectItem>
                      <SelectItem value="police_station">في مركز الشرطة</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-right block">ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ملاحظات إضافية..."
                      className="resize-none text-right"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={updateVehicle.isPending}>
                {updateVehicle.isPending && <LoadingSpinner className="ml-2 h-4 w-4" />}
                حفظ
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

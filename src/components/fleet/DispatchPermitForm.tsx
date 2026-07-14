import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { CalendarIcon, Clock, FileText, MapPin, Car, User, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateDispatchPermit, useUpdateDispatchPermit, type CreateDispatchPermitData } from "@/hooks/useDispatchPermits";
import { useDispatchPermits } from "@/hooks/useDispatchPermits";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { useCreateConditionReportForPermit, useVehicleConditionReports } from "@/hooks/useVehicleCondition";
import { VehicleConditionReportDialog } from "./VehicleConditionReportDialog";

interface DispatchPermitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPermitId?: string | null;
}

export function DispatchPermitForm({ open, onOpenChange, editingPermitId }: DispatchPermitFormProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [activeTab, setActiveTab] = useState("details");
  const [conditionReportCompleted, setConditionReportCompleted] = useState(false);
  const [createdPermitId, setCreatedPermitId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [conditionReportDialogOpen, setConditionReportDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { data: permits } = useDispatchPermits();
  const editingPermit = editingPermitId ? permits?.find(p => p.id === editingPermitId) : null;
  const isEditMode = !!editingPermit;

  const form = useForm<CreateDispatchPermitData>();
  const createPermit = useCreateDispatchPermit();
  const updatePermit = useUpdateDispatchPermit();
  const createConditionReport = useCreateConditionReportForPermit();
  const { data: vehicles } = useVehicles();
  const { data: conditionReports } = useVehicleConditionReports(createdPermitId || editingPermitId || undefined);

  const availableVehicles = vehicles?.filter(v => v.status === 'available') || [];
  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);

  // Populate form when editing
  useEffect(() => {
    if (editingPermit && open) {
      form.reset({
        vehicle_id: editingPermit.vehicle_id,
        request_type: editingPermit.request_type,
        purpose: editingPermit.purpose,
        purpose_ar: editingPermit.purpose_ar || '',
        destination: editingPermit.destination,
        destination_ar: editingPermit.destination_ar || '',
        start_date: editingPermit.start_date,
        end_date: editingPermit.end_date,
        start_time: editingPermit.start_time || '',
        end_time: editingPermit.end_time || '',
        estimated_km: editingPermit.estimated_km || undefined,
        fuel_allowance: editingPermit.fuel_allowance || undefined,
        driver_name: editingPermit.driver_name || '',
        driver_phone: editingPermit.driver_phone || '',
        driver_license: editingPermit.driver_license || '',
        priority: editingPermit.priority || 'normal',
        notes: editingPermit.notes || '',
      });
      setStartDate(new Date(editingPermit.start_date));
      setEndDate(new Date(editingPermit.end_date));
      setSelectedVehicleId(editingPermit.vehicle_id);
      setCreatedPermitId(editingPermit.id);
    } else if (!editingPermit && open) {
      // Reset form for new permit
      form.reset();
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedVehicleId("");
      setCreatedPermitId(null);
      setActiveTab("details");
      setConditionReportCompleted(false);
    }
  }, [editingPermit, open, form]);

  const onSubmitPermitDetails = async (data: CreateDispatchPermitData) => {
    try {
      if (isEditMode && editingPermit) {
        // Update existing permit
        await updatePermit.mutateAsync({
          id: editingPermit.id,
          updates: {
            vehicle_id: data.vehicle_id,
            request_type: data.request_type,
            purpose: data.purpose,
            purpose_ar: data.purpose_ar || null,
            destination: data.destination,
            destination_ar: data.destination_ar || null,
            start_date: startDate ? format(startDate, 'yyyy-MM-dd') : data.start_date,
            end_date: endDate ? format(endDate, 'yyyy-MM-dd') : data.end_date,
            start_time: data.start_time || null,
            end_time: data.end_time || null,
            estimated_km: data.estimated_km || null,
            fuel_allowance: data.fuel_allowance || null,
            driver_name: data.driver_name || null,
            driver_phone: data.driver_phone || null,
            driver_license: data.driver_license || null,
            priority: data.priority || 'normal',
            notes: data.notes || null,
          }
        });
        
        toast({
          title: "تم تحديث التصريح بنجاح",
          description: "تم تحديث تصريح الحركة بنجاح",
        });
        
        onOpenChange(false);
        form.reset();
        setStartDate(undefined);
        setEndDate(undefined);
        setActiveTab("details");
        setCreatedPermitId(null);
        setSelectedVehicleId("");
      } else {
        // Create new permit
        const result = await createPermit.mutateAsync({
          ...data,
          start_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : '',
        });
        
        // Store the created permit ID and vehicle ID
        setCreatedPermitId(result.id);
        setSelectedVehicleId(data.vehicle_id);
        
        // Create pre-dispatch condition report
        await createConditionReport.mutateAsync({
          permitId: result.id,
          inspectionType: 'pre_dispatch'
        });
        
        // Move to condition report tab
        setActiveTab("condition");
        
        toast({
          title: "تم إنشاء تصريح الحركة بنجاح",
          description: "يرجى إكمال فحص حالة المركبة قبل التشغيل",
        });
      }
      
    } catch (error) {
      toast({
        title: isEditMode ? "خطأ في تحديث التصريح" : "خطأ في إنشاء التصريح",
        description: `حدث خطأ أثناء ${isEditMode ? 'تحديث' : 'إنشاء'} تصريح الحركة`,
        variant: "destructive",
      });
    }
  };

  const onCompleteProcess = () => {
    toast({
      title: "تم إكمال طلب التصريح بنجاح",
      description: "تم إرسال الطلب مع فحص حالة المركبة للموافقة",
    });
    
    onOpenChange(false);
    form.reset();
    setStartDate(undefined);
    setEndDate(undefined);
    setActiveTab("details");
    setConditionReportCompleted(false);
    setCreatedPermitId(null);
    setSelectedVehicleId("");
  };

  // Check if condition report is completed
  const preDispatchReport = conditionReports?.find(r => r.inspection_type === 'pre_dispatch');
  
  // Check if report exists and has essential data (regardless of approval status)
  // Note: mileage_reading can be 0, so we check for !== null and !== undefined
  const hasEssentialReportData = preDispatchReport && 
    preDispatchReport.overall_condition && 
    (preDispatchReport.mileage_reading !== null && preDispatchReport.mileage_reading !== undefined) && 
    preDispatchReport.fuel_level;
    
  const isConditionReportCompleted = hasEssentialReportData;
  
  // Add detailed logging for debugging
  console.log('🔍 Condition Report Status:', {
    preDispatchReport: !!preDispatchReport,
    overall_condition: preDispatchReport?.overall_condition,
    mileage_reading: preDispatchReport?.mileage_reading,
    fuel_level: preDispatchReport?.fuel_level,
    hasEssentialReportData,
    isConditionReportCompleted
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEditMode ? 'تعديل تصريح الحركة' : 'طلب تصريح حركة داخلية للمركبة'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                تفاصيل التصريح
              </TabsTrigger>
              <TabsTrigger 
                value="condition" 
                disabled={!createdPermitId && !isEditMode}
                className="flex items-center gap-2"
              >
                <ClipboardCheck className="h-4 w-4" />
                فحص حالة المركبة
                {isConditionReportCompleted && <span className="text-green-500">✓</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitPermitDetails)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vehicle Selection */}
                    <FormField
                      control={form.control}
                      name="vehicle_id"
                      rules={{ required: "يجب اختيار المركبة" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            المركبة المطلوبة
                          </FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedVehicleId(value);
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger dir="rtl">
                                <SelectValue placeholder="اختر المركبة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableVehicles.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                  {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Request Type */}
                    <FormField
                      control={form.control}
                      name="request_type"
                      rules={{ required: "يجب اختيار نوع الطلب" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع الطلب</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger dir="rtl">
                                <SelectValue placeholder="اختر نوع الطلب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="maintenance">صيانة</SelectItem>
                              <SelectItem value="employee_use">استخدام موظف</SelectItem>
                              <SelectItem value="delivery">توصيل</SelectItem>
                              <SelectItem value="inspection">فحص</SelectItem>
                              <SelectItem value="other">أخرى</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Purpose */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purpose"
                      rules={{ required: "يجب كتابة الغرض" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الغرض من الاستخدام</FormLabel>
                           <FormControl>
                             <Textarea 
                               placeholder="اكتب الغرض من استخدام المركبة..."
                               dir="rtl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purpose_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الغرض (عربي)</FormLabel>
                           <FormControl>
                             <Textarea 
                               placeholder="الغرض بالعربي..."
                               dir="rtl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Destination */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="destination"
                      rules={{ required: "يجب كتابة الوجهة" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            الوجهة
                          </FormLabel>
                           <FormControl>
                             <Input placeholder="الوجهة المطلوبة..." {...field} dir="rtl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="destination_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الوجهة (عربي)</FormLabel>
                           <FormControl>
                             <Input placeholder="الوجهة بالعربي..." {...field} dir="rtl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        تاريخ البداية
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-right font-normal"
                            dir="rtl"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "dd/MM/yyyy") : "اختر التاريخ"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        تاريخ النهاية
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-right font-normal"
                            dir="rtl"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "dd/MM/yyyy") : "اختر التاريخ"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            وقت البداية
                          </FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            وقت النهاية
                          </FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Driver Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        بيانات السائق
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="driver_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>اسم السائق</FormLabel>
                               <FormControl>
                                 <Input placeholder="اسم السائق..." {...field} dir="rtl" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="driver_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>رقم الهاتف</FormLabel>
                              <FormControl>
                                <Input placeholder="رقم هاتف السائق..." {...field} dir="ltr" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="driver_license"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>رقم الرخصة</FormLabel>
                               <FormControl>
                                 <Input placeholder="رقم رخصة القيادة..." {...field} dir="rtl" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="estimated_km"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المسافة المتوقعة (كم)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fuel_allowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>بدل الوقود (ر.ق)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الأولوية</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger dir="rtl">
                                <SelectValue placeholder="اختر الأولوية" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">منخفضة</SelectItem>
                              <SelectItem value="normal">عادية</SelectItem>
                              <SelectItem value="high">عالية</SelectItem>
                              <SelectItem value="urgent">عاجل</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ملاحظات إضافية</FormLabel>
                         <FormControl>
                           <Textarea 
                             placeholder="أي ملاحظات أو تفاصيل إضافية..."
                             dir="rtl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4 pt-4">
                    <Button 
                      type="submit" 
                      disabled={(createPermit.isPending || updatePermit.isPending) || (!selectedVehicleId && !isEditMode)}
                      className="flex-1"
                    >
                      {isEditMode 
                        ? (updatePermit.isPending ? "جاري التحديث..." : "حفظ التغييرات") 
                        : (createPermit.isPending ? "جاري الإرسال..." : "التالي - فحص المركبة")
                      }
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      className="flex-1"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="condition" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    فحص حالة المركبة قبل التشغيل
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    أكمل فحص حالة المركبة مع البيانات الأساسية (الحالة العامة، قراءة العداد، مستوى الوقود) لتمكين إرسال الطلب النهائي.
                  </div>
                  
                  {selectedVehicle && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <Car className="h-8 w-8" />
                      <div>
                        <div className="font-medium">
                          {selectedVehicle.plate_number} - {selectedVehicle.make} {selectedVehicle.model}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          سنة الصنع: {selectedVehicle.year}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button 
                      onClick={() => {
                        console.log('Button clicked!', { createdPermitId, selectedVehicleId, selectedVehicle });
                        if (createdPermitId && selectedVehicleId && selectedVehicle) {
                          console.log('Opening condition report dialog...');
                          setConditionReportDialogOpen(true);
                        } else {
                          console.log('Missing required data:', { createdPermitId, selectedVehicleId, selectedVehicle });
                        }
                      }}
                      className="flex-1"
                      disabled={!createdPermitId}
                    >
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      بدء فحص حالة المركبة
                    </Button>
                  </div>

                  {preDispatchReport && (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">حالة الفحص:</span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          isConditionReportCompleted ? 'bg-green-100 text-green-800' :
                          preDispatchReport.status === 'requires_attention' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isConditionReportCompleted ? 'جاهز للإرسال' :
                           preDispatchReport.status === 'requires_attention' ? 'يتطلب انتباه' :
                           'يحتاج بيانات إضافية'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        تم الفحص في: {new Date(preDispatchReport.inspection_date).toLocaleDateString('ar')}
                      </div>
                      {!isConditionReportCompleted && (
                        <div className="text-sm text-amber-600 mt-2">
                          <div className="font-medium">البيانات المطلوبة للمتابعة:</div>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {!preDispatchReport?.overall_condition && <li>الحالة العامة للمركبة</li>}
                            {(preDispatchReport?.mileage_reading === null || preDispatchReport?.mileage_reading === undefined) && <li>قراءة عداد المسافات (يمكن أن تكون صفر)</li>}
                            {!preDispatchReport?.fuel_level && <li>مستوى الوقود</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button 
                      onClick={onCompleteProcess}
                      disabled={!isConditionReportCompleted}
                      className="flex-1"
                    >
                      إرسال الطلب النهائي للموافقة
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setActiveTab("details")}
                      className="flex-1"
                    >
                      العودة للتفاصيل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Vehicle Condition Report Dialog */}
      {createdPermitId && selectedVehicleId && selectedVehicle && (
        <VehicleConditionReportDialog
          open={conditionReportDialogOpen}
          onOpenChange={setConditionReportDialogOpen}
          permitId={createdPermitId}
          vehicleId={selectedVehicleId}
          vehicleName={`${selectedVehicle.plate_number} - ${selectedVehicle.make} ${selectedVehicle.model}`}
        />
      )}
    </>
  );
}

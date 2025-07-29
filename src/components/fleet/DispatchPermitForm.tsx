import { useState } from "react";
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
import { useCreateDispatchPermit, type CreateDispatchPermitData } from "@/hooks/useDispatchPermits";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { useCreateConditionReportForPermit, useVehicleConditionReports } from "@/hooks/useVehicleCondition";
import { VehicleConditionReportDialog } from "./VehicleConditionReportDialog";

interface DispatchPermitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DispatchPermitForm({ open, onOpenChange }: DispatchPermitFormProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [activeTab, setActiveTab] = useState("details");
  const [conditionReportCompleted, setConditionReportCompleted] = useState(false);
  const [createdPermitId, setCreatedPermitId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [showConditionReportDialog, setShowConditionReportDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateDispatchPermitData>();
  const createPermit = useCreateDispatchPermit();
  const createConditionReport = useCreateConditionReportForPermit();
  const { data: vehicles } = useVehicles();
  const { data: conditionReports } = useVehicleConditionReports(createdPermitId || undefined);

  const availableVehicles = vehicles?.filter(v => v.status === 'available') || [];
  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);

  const onSubmitPermitDetails = async (data: CreateDispatchPermitData) => {
    try {
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
      
    } catch (error) {
      toast({
        title: "خطأ في إنشاء التصريح",
        description: "حدث خطأ أثناء إنشاء تصريح الحركة",
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
  const isConditionReportCompleted = preDispatchReport?.status === 'approved';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              طلب تصريح حركة داخلية للمركبة
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
                disabled={!createdPermitId}
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
                              <SelectTrigger>
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
                              <SelectTrigger>
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
                            <Input placeholder="الوجهة المطلوبة..." {...field} />
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
                            <Input placeholder="الوجهة بالعربي..." {...field} />
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
                            className="w-full justify-start text-left font-normal"
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
                            className="w-full justify-start text-left font-normal"
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
                                <Input placeholder="اسم السائق..." {...field} />
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
                                <Input placeholder="رقم رخصة القيادة..." {...field} />
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
                          <FormLabel>بدل الوقود (د.ك)</FormLabel>
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
                              <SelectTrigger>
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
                      disabled={createPermit.isPending || !selectedVehicleId}
                      className="flex-1"
                    >
                      {createPermit.isPending ? "جاري الإرسال..." : "التالي - فحص المركبة"}
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
                    يجب إكمال فحص حالة المركبة والموافقة عليه قبل إرسال الطلب النهائي للموافقة.
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
                      onClick={() => setShowConditionReportDialog(true)}
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
                          preDispatchReport.status === 'approved' ? 'bg-green-100 text-green-800' :
                          preDispatchReport.status === 'requires_attention' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {preDispatchReport.status === 'approved' ? 'تمت الموافقة' :
                           preDispatchReport.status === 'requires_attention' ? 'يتطلب انتباه' :
                           'في انتظار المراجعة'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        تم الفحص في: {new Date(preDispatchReport.inspection_date).toLocaleDateString('ar')}
                      </div>
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
      {showConditionReportDialog && createdPermitId && selectedVehicleId && selectedVehicle && (
        <VehicleConditionReportDialog
          open={showConditionReportDialog}
          onOpenChange={setShowConditionReportDialog}
          permitId={createdPermitId}
          vehicleId={selectedVehicleId}
          vehicleName={`${selectedVehicle.plate_number} - ${selectedVehicle.make} ${selectedVehicle.model}`}
        />
      )}
    </>
  );
}

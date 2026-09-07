import { useState, useMemo } from "react";
import { 
  FileText, 
  Car, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { OperationsPanel } from '@/components/operations/OperationsWorkspace';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDispatchPermits, useDeleteDispatchPermit } from "@/hooks/useDispatchPermits";
import { DispatchPermitDetailsDialog } from "./DispatchPermitDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusConfig = {
  pending: {
    label: "قيد الانتظار",
    color: "bg-yellow-500",
    icon: AlertCircle,
    variant: "secondary" as const
  },
  approved: {
    label: "موافق عليه",
    color: "bg-green-500",
    icon: CheckCircle,
    variant: "default" as const
  },
  rejected: {
    label: "مرفوض",
    color: "bg-red-500",
    icon: XCircle,
    variant: "destructive" as const
  },
  in_progress: {
    label: "قيد التنفيذ",
    color: "bg-blue-500",
    icon: Clock,
    variant: "default" as const
  },
  completed: {
    label: "مكتمل",
    color: "bg-green-600",
    icon: CheckCircle,
    variant: "default" as const
  },
  cancelled: {
    label: "ملغى",
    color: "bg-slate-500",
    icon: XCircle,
    variant: "secondary" as const
  }
};

const priorityConfig = {
  low: { label: "منخفضة", color: "bg-slate-500" },
  normal: { label: "عادية", color: "bg-blue-500" },
  high: { label: "عالية", color: "bg-orange-500" },
  urgent: { label: "عاجل", color: "bg-red-500" }
};

const requestTypeConfig = {
  maintenance: "صيانة",
  employee_use: "استخدام موظف",
  delivery: "توصيل",
  inspection: "فحص",
  other: "أخرى"
};

export function DispatchPermitsList({ onEditPermit }: { onEditPermit: (permitId: string) => void }) {
  const [selectedPermit, setSelectedPermit] = useState<string | null>(null);
  const [permitToDelete, setPermitToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: permits, isLoading } = useDispatchPermits();
  const deletePermit = useDeleteDispatchPermit();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!permitToDelete) return;

    try {
      await deletePermit.mutateAsync(permitToDelete);
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف تصريح الحركة بنجاح",
      });
      setPermitToDelete(null);
    } catch {
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف تصريح الحركة",
        variant: "destructive",
      });
    }
  };

  const canEdit = (permit: { status: string }) => {
    // يمكن التعديل فقط إذا كان التصريح في حالة pending أو rejected
    return permit.status === 'pending' || permit.status === 'rejected';
  };

  const canDelete = (permit: { status: string }) => {
    // يمكن الحذف فقط إذا لم يكن التصريح مكتملاً أو قيد التنفيذ
    return permit.status !== 'completed' && permit.status !== 'in_progress';
  };

  // Filter permits based on search term, status, and priority
  const filteredPermits = useMemo(() => {
    if (!permits) return [];

    return permits.filter((permit) => {
      // Search filter
      const matchesSearch = 
        !searchTerm ||
        permit.permit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permit.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permit.vehicle?.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permit.vehicle?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permit.vehicle?.model?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || permit.status === statusFilter;

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || permit.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [permits, searchTerm, statusFilter, priorityFilter]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <OperationsPanel title="سجل تصاريح الحركة" description="ابحث عن تصريح أو مركبة، وصفِّ السجل حسب الحالة والأولوية.">
          <div className="ad-dispatch-filters">
            <div className="opw-search">
              <Search className="h-4 w-4" />
              <Input
                aria-label="البحث في تصاريح الحركة" placeholder="رقم التصريح، الغرض، المركبة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="حالة التصريح">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger aria-label="أولوية التصريح">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground" role="status">{filteredPermits.length} تصريح</p>
          </div>
      </OperationsPanel>

      {/* Permits List */}
      <div className="ad-dispatch-grid">
        {filteredPermits.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد تصاريح</h3>
              <p className="text-muted-foreground text-center">
                لم يتم العثور على تصاريح حركة مطابقة لمعايير البحث
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPermits.map((permit) => {
            const statusInfo = statusConfig[permit.status as keyof typeof statusConfig];
            const priorityInfo = priorityConfig[permit.priority as keyof typeof priorityConfig];
            const StatusIcon = statusInfo?.icon || AlertCircle;

            return (
              <Card key={permit.id} className="ad-permit-card">
                <CardContent className="p-6">
                  <div className="ad-permit-heading">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <button className="ad-permit-number" onClick={() => setSelectedPermit(permit.id)} aria-label={`فتح التصريح ${permit.permit_number}`}><bdi>{permit.permit_number}</bdi></button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(permit.created_at), 'dd MMM yyyy', { locale: ar })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo?.variant || "secondary"}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo?.label || permit.status}
                      </Badge>
                      
                      <Badge variant="outline" className={`${priorityInfo?.color} text-white`}>
                        {priorityInfo?.label || permit.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="ad-permit-details">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {permit.vehicle?.plate_number || 'غير محدد'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {permit.vehicle?.make} {permit.vehicle?.model}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">الوجهة</p>
                        <p className="text-xs text-muted-foreground">
                          {permit.destination}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">مقدم الطلب</p>
                        <p className="text-xs text-muted-foreground">
                          {permit.requester?.first_name} {permit.requester?.last_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">نوع الطلب</p>
                        <p className="text-xs text-muted-foreground">
                          {requestTypeConfig[permit.request_type as keyof typeof requestTypeConfig] || permit.request_type}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="ad-permit-footer">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(permit.start_date), 'dd/MM')} - {format(new Date(permit.end_date), 'dd/MM')}
                      </div>
                      
                      {permit.start_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {permit.start_time} - {permit.end_time}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`عرض تفاصيل التصريح ${permit.permit_number}`}
                        onClick={() => setSelectedPermit(permit.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        عرض التفاصيل
                      </Button>
                      
                      {canEdit(permit) && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`تعديل التصريح ${permit.permit_number}`}
                          onClick={() => onEditPermit(permit.id)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          تعديل
                        </Button>
                      )}
                      
                      {canDelete(permit) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          aria-label={`حذف التصريح ${permit.permit_number}`} onClick={() => setPermitToDelete(permit.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          حذف
                        </Button>
                      )}
                    </div>
                  </div>

                  {permit.purpose && (
                    <>
                      <Separator className="my-3" />
                      <div>
                        <p className="text-sm font-medium mb-1">الغرض:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {permit.purpose}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Permit Details Dialog */}
      {selectedPermit && (
        <DispatchPermitDetailsDialog
          permitId={selectedPermit}
          open={!!selectedPermit}
          onOpenChange={() => setSelectedPermit(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!permitToDelete} onOpenChange={(open) => !open && setPermitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا التصريح؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

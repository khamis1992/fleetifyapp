import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Plus, FileText, Download, Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface VehicleDocumentsPanelProps {
  vehicleId: string;
  documents?: any[];
  onDocumentAdd?: (document: any) => void;
}

interface DocumentFormData {
  document_type: string;
  document_name: string;
  document_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuer?: string;
  notes?: string;
}

const documentTypes = [
  { value: 'registration', label: 'الترخيص', label_ar: 'الترخيص' },
  { value: 'insurance', label: 'التأمين', label_ar: 'التأمين' },
  { value: 'inspection', label: 'الفحص الدوري', label_ar: 'الفحص الدوري' },
  { value: 'purchase_invoice', label: 'فاتورة الشراء', label_ar: 'فاتورة الشراء' },
  { value: 'warranty', label: 'الضمان', label_ar: 'الضمان' },
  { value: 'maintenance_contract', label: 'عقد الصيانة', label_ar: 'عقد الصيانة' },
  { value: 'other', label: 'أخرى', label_ar: 'أخرى' },
];

export function VehicleDocumentsPanel({ vehicleId, documents = [], onDocumentAdd }: VehicleDocumentsPanelProps) {
  const [showForm, setShowForm] = useState(false);

  const form = useForm<DocumentFormData>({
    defaultValues: {
      document_type: "registration",
      document_name: "",
      document_number: "",
      issue_date: "",
      expiry_date: "",
      issuer: "",
      notes: "",
    }
  });

  const onSubmit = async (data: DocumentFormData) => {
    const newDocument = {
      id: Date.now().toString(),
      vehicle_id: vehicleId,
      ...data,
      created_at: new Date().toISOString(),
    };
    
    if (onDocumentAdd) {
      onDocumentAdd(newDocument);
    }
    
    setShowForm(false);
    form.reset();
  };

  const getDocumentTypeLabel = (type: string) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType?.label_ar || type;
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return expiry <= thirtyDaysFromNow;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">وثائق المركبة</CardTitle>
            <CardDescription>إدارة جميع وثائق ومستندات المركبة</CardDescription>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#00A896] hover:bg-[#007D6D]">
                <Plus className="h-4 w-4 mr-2" />
                إضافة وثيقة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة وثيقة جديدة</DialogTitle>
                <DialogDescription>
                  تسجيل وثيقة أو مستند خاص بالمركبة
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="document_type">نوع الوثيقة</Label>
                  <select
                    id="document_type"
                    className="w-full p-2 border rounded"
                    {...form.register("document_type")}
                  >
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label_ar}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="document_name">اسم الوثيقة</Label>
                  <Input
                    id="document_name"
                    {...form.register("document_name", { required: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="document_number">رقم الوثيقة</Label>
                  <Input
                    id="document_number"
                    {...form.register("document_number")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="issue_date">تاريخ الإصدار</Label>
                    <Input
                      id="issue_date"
                      type="date"
                      {...form.register("issue_date")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry_date">تاريخ الانتهاء</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      {...form.register("expiry_date")}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="issuer">الجهة المصدرة</Label>
                  <Input
                    id="issuer"
                    {...form.register("issuer")}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">ملاحظات</Label>
                  <textarea
                    id="notes"
                    className="w-full p-2 border rounded"
                    rows={3}
                    {...form.register("notes")}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit">
                    حفظ الوثيقة
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{doc.document_name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">
                        {getDocumentTypeLabel(doc.document_type)}
                      </Badge>
                      {doc.document_number && (
                        <span className="text-sm text-muted-foreground">
                          رقم: {doc.document_number}
                        </span>
                      )}
                    </div>
                    {doc.expiry_date && (
                      <div className="flex items-center mt-2 text-sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className={isExpiringSoon(doc.expiry_date) ? "text-destructive" : "text-muted-foreground"}>
                          ينتهي في: {format(new Date(doc.expiry_date), 'dd/MM/yyyy')}
                        </span>
                        {isExpiringSoon(doc.expiry_date) && (
                          <AlertTriangle className="h-4 w-4 mr-1 text-destructive" />
                        )}
                      </div>
                    )}
                    {doc.issuer && (
                      <p className="text-sm text-muted-foreground mt-1">
                        الجهة المصدرة: {doc.issuer}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد وثائق مسجلة لهذه المركبة</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة وثيقة جديدة
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
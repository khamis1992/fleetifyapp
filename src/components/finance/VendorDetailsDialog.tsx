import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Building, Mail, Phone, MapPin, CreditCard, Clock, FileText } from "lucide-react"
import { type Vendor } from "@/hooks/useFinance"

interface VendorDetailsDialogProps {
  vendor: Vendor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const VendorDetailsDialog = ({ vendor, open, onOpenChange }: VendorDetailsDialogProps) => {
  if (!vendor) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            تفاصيل المورد
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">كود المورد</label>
                  <p className="font-medium">{vendor.vendor_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">الحالة</label>
                  <div className="mt-1">
                    <Badge variant={vendor.is_active ? "default" : "secondary"}>
                      {vendor.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">اسم المورد (بالإنجليزية)</label>
                  <p className="font-medium">{vendor.vendor_name}</p>
                </div>
                {vendor.vendor_name_ar && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">اسم المورد (بالعربية)</label>
                    <p className="font-medium">{vendor.vendor_name_ar}</p>
                  </div>
                )}
                {vendor.contact_person && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">جهة الاتصال</label>
                    <p className="font-medium">{vendor.contact_person}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-4 w-4" />
                معلومات الاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</label>
                      <p className="font-medium">{vendor.email}</p>
                    </div>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">رقم الهاتف</label>
                      <p className="font-medium">{vendor.phone}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {(vendor.address || vendor.address_ar) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium text-muted-foreground">العنوان</label>
                    </div>
                    {vendor.address && (
                      <p className="text-sm bg-muted/50 p-2 rounded">{vendor.address}</p>
                    )}
                    {vendor.address_ar && (
                      <p className="text-sm bg-muted/50 p-2 rounded">{vendor.address_ar}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                المعلومات المالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">الرصيد الحالي</label>
                  <p className="text-lg font-bold text-primary">
                    {vendor.current_balance.toFixed(3)} د.ك
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">حد الائتمان</label>
                  <p className="font-medium">{vendor.credit_limit.toFixed(3)} د.ك</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">مدة الدفع</label>
                    <p className="font-medium">{vendor.payment_terms} يوم</p>
                  </div>
                </div>
              </div>

              {vendor.tax_number && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">الرقم الضريبي</label>
                    <p className="font-medium">{vendor.tax_number}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {vendor.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  ملاحظات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm bg-muted/50 p-3 rounded whitespace-pre-wrap">
                  {vendor.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <label>تاريخ الإنشاء</label>
                  <p>{new Date(vendor.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <label>آخر تحديث</label>
                  <p>{new Date(vendor.updated_at).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
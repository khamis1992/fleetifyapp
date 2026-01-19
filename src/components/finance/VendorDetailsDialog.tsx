import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building, Mail, Phone, MapPin, CreditCard, Clock, FileText, Building2, User, Plus, Edit, Trash2, Upload, Download, Star, TrendingUp, Award } from "lucide-react"
import { type Vendor, useVendorContacts, useVendorDocuments, useVendorPerformance } from "@/hooks/useFinance"
import { VendorAccountManager } from "./VendorAccountManager"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface VendorDetailsDialogProps {
  vendor: Vendor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const VendorDetailsDialog = ({ vendor, open, onOpenChange }: VendorDetailsDialogProps) => {
  const { data: contacts, isLoading: contactsLoading } = useVendorContacts(vendor?.id || "");
  const { data: documents, isLoading: documentsLoading } = useVendorDocuments(vendor?.id || "");
  const { data: performance, isLoading: performanceLoading } = useVendorPerformance(vendor?.id || "");

  if (!vendor) return null;

  const latestPerformance = performance?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            تفاصيل المورد
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">نظرة عامة</TabsTrigger>
            <TabsTrigger value="contacts">جهات الاتصال</TabsTrigger>
            <TabsTrigger value="documents">المستندات</TabsTrigger>
            <TabsTrigger value="performance">الأداء</TabsTrigger>
            <TabsTrigger value="accounting">الحسابات</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
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
                        <p className="font-medium" dir="ltr">{vendor.phone}</p>
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
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    جهات الاتصال
                  </CardTitle>
                  <Button size="sm" disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة جهة اتصال
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : contacts && contacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>المنصب</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>البريد الإلكتروني</TableHead>
                        <TableHead>رئيسي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.contact_name}</TableCell>
                          <TableCell>{contact.position || '-'}</TableCell>
                          <TableCell>{contact.phone || '-'}</TableCell>
                          <TableCell>{contact.email || '-'}</TableCell>
                          <TableCell>
                            {contact.is_primary && <Badge>رئيسي</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد جهات اتصال مسجلة
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    المستندات
                  </CardTitle>
                  <Button size="sm" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    رفع مستند
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : documents && documents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم المستند</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>تاريخ الانتهاء</TableHead>
                        <TableHead>الحجم</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.document_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.document_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {doc.expiry_date
                              ? new Date(doc.expiry_date).toLocaleDateString('en-GB')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {doc.file_size
                              ? `${(doc.file_size / 1024).toFixed(1)} KB`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" disabled>
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد مستندات مرفوعة
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    التقييم
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {latestPerformance?.rating ? `${latestPerformance.rating.toFixed(2)}/5` : '-'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    التسليم في الوقت المحدد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {latestPerformance?.on_time_delivery_rate
                      ? `${latestPerformance.on_time_delivery_rate.toFixed(0)}%`
                      : '-'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-500" />
                    جودة المنتجات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {latestPerformance?.quality_score
                      ? `${latestPerformance.quality_score.toFixed(0)}%`
                      : '-'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>سجل الأداء</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : performance && performance.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>تاريخ القياس</TableHead>
                        <TableHead>التقييم</TableHead>
                        <TableHead>التسليم في الوقت</TableHead>
                        <TableHead>الجودة</TableHead>
                        <TableHead>وقت الاستجابة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performance.map((perf) => (
                        <TableRow key={perf.id}>
                          <TableCell>
                            {new Date(perf.measured_at).toLocaleDateString('en-GB')}
                          </TableCell>
                          <TableCell>
                            {perf.rating ? `${perf.rating.toFixed(2)}/5` : '-'}
                          </TableCell>
                          <TableCell>
                            {perf.on_time_delivery_rate
                              ? `${perf.on_time_delivery_rate.toFixed(0)}%`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {perf.quality_score ? `${perf.quality_score.toFixed(0)}%` : '-'}
                          </TableCell>
                          <TableCell>
                            {perf.response_time_hours
                              ? `${perf.response_time_hours.toFixed(1)} ساعة`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات أداء مسجلة
                    <div className="mt-4">
                      <Button size="sm" disabled>
                        <Plus className="h-4 w-4 mr-2" />
                        تحديث الأداء
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounting" className="space-y-6">
            <VendorAccountManager
              vendorId={vendor.id}
              vendorName={vendor.vendor_name}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, Users, FileText, Target } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"

interface Customer {
  id: string
  customer_type: 'individual' | 'corporate'
  company_name?: string
  company_name_ar?: string
  first_name?: string
  last_name?: string
  first_name_ar?: string
  last_name_ar?: string
  national_id?: string
  phone?: string
}

interface PreviewData {
  row: any
  rowNumber: number
  status: 'found' | 'not_found' | 'multiple' | 'created'
  matchedCustomer?: Customer
  possibleMatches?: Customer[]
  searchMethod?: string
  confidence?: number
}

interface ContractUploadPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  csvData: any[]
  onConfirm: (data: any[], options: { autoCreateCustomers: boolean; replaceDuplicates: boolean }) => void
  onCancel: () => void
}

export function ContractUploadPreview({
  open,
  onOpenChange,
  csvData,
  onConfirm,
  onCancel
}: ContractUploadPreviewProps) {
  const { companyId } = useUnifiedCompanyAccess()
  const [previewData, setPreviewData] = useState<PreviewData[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    found: 0,
    notFound: 0,
    multiple: 0,
    needsCreation: 0
  })
  const [options, setOptions] = useState({
    autoCreateCustomers: true,
    replaceDuplicates: false
  })

  // تحليل البيانات عند الفتح
  useEffect(() => {
    if (open && csvData.length > 0 && companyId) {
      analyzeCustomers()
    }
  }, [open, csvData, companyId])

  const analyzeCustomers = async () => {
    if (!companyId) return
    
    setIsAnalyzing(true)
    const results: PreviewData[] = []
    
    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i]
        const rowNumber = row.rowNumber || i + 2
        
        // تحضير بيانات البحث
        const searchData = {
          customerName: row.customer_name?.trim(),
          nationalId: row.national_id?.trim() || row.customer_national_id?.trim(),
          phone: row.phone?.trim() || row.customer_phone?.trim()
        }

        if (!searchData.customerName && !searchData.nationalId && !searchData.phone) {
          results.push({
            row,
            rowNumber,
            status: 'not_found'
          })
          continue
        }

        // البحث بالرقم الشخصي أولاً
        let customer = null
        let searchMethod = ''
        let confidence = 0

        if (searchData.nationalId) {
          const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .eq('national_id', searchData.nationalId)
            .limit(1)

          if (data && data.length > 0) {
            customer = data[0]
            searchMethod = 'national_id'
            confidence = 100
          }
        }

        // البحث برقم الهاتف
        if (!customer && searchData.phone) {
          const normalizedPhone = searchData.phone.replace(/\D/g, '').replace(/^00965|^\+965|^965/, '')
          if (normalizedPhone.length >= 8) {
            const { data } = await supabase
              .from('customers')
              .select('*')
              .eq('company_id', companyId)
              .eq('is_active', true)
              .like('phone', `%${normalizedPhone}%`)
              .limit(5)

            if (data && data.length > 0) {
              const phoneMatch = data.find(c => 
                c.phone?.replace(/\D/g, '').replace(/^00965|^\+965|^965/, '') === normalizedPhone
              )
              if (phoneMatch) {
                customer = phoneMatch
                searchMethod = 'phone'
                confidence = 95
              }
            }
          }
        }

        // البحث بالاسم
        if (!customer && searchData.customerName) {
          const like = `%${searchData.customerName}%`
          const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .or(`company_name.ilike.${like},company_name_ar.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},first_name_ar.ilike.${like},last_name_ar.ilike.${like}`)
            .limit(10)

          if (data && data.length > 0) {
            // البحث عن تطابق دقيق
            const normalizedSearchName = searchData.customerName.toLowerCase().trim()
            const exactMatch = data.find(c => {
              const names = [
                c.company_name?.toLowerCase(),
                c.company_name_ar?.toLowerCase(),
                `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().trim(),
                `${c.first_name_ar || ''} ${c.last_name_ar || ''}`.toLowerCase().trim()
              ].filter(Boolean)
              return names.some(name => name === normalizedSearchName)
            })

            if (exactMatch) {
              customer = exactMatch
              searchMethod = 'name_exact'
              confidence = 90
            } else if (data.length === 1) {
              customer = data[0]
              searchMethod = 'name_single'
              confidence = 75
            } else {
              // عدة نتائج محتملة
              results.push({
                row,
                rowNumber,
                status: 'multiple',
                possibleMatches: data,
                searchMethod: 'name_multiple'
              })
              continue
            }
          }
        }

        if (customer) {
          results.push({
            row,
            rowNumber,
            status: 'found',
            matchedCustomer: customer,
            searchMethod,
            confidence
          })
        } else {
          results.push({
            row,
            rowNumber,
            status: 'not_found'
          })
        }
      }

      setPreviewData(results)
      
      // حساب الإحصائيات
      const newStats = {
        total: results.length,
        found: results.filter(r => r.status === 'found').length,
        notFound: results.filter(r => r.status === 'not_found').length,
        multiple: results.filter(r => r.status === 'multiple').length,
        needsCreation: results.filter(r => r.status === 'not_found').length
      }
      setStats(newStats)

    } catch (error) {
      console.error('خطأ في تحليل العملاء:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getCustomerDisplayName = (customer: Customer) => {
    if (customer.customer_type === 'corporate') {
      return customer.company_name || customer.company_name_ar || 'شركة غير محددة'
    }
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
           `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 
           'عميل غير محدد'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'found':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'not_found':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'multiple':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'found':
        return <Badge variant="default" className="bg-green-100 text-green-800">موجود</Badge>
      case 'not_found':
        return <Badge variant="destructive">غير موجود</Badge>
      case 'multiple':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">متعدد</Badge>
      default:
        return null
    }
  }

  const handleConfirm = () => {
    onConfirm(csvData, options)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            معاينة مطابقة العملاء
          </DialogTitle>
          <DialogDescription>
            مراجعة تطابق بيانات العملاء قبل رفع العقود
          </DialogDescription>
        </DialogHeader>

        {isAnalyzing ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>جاري تحليل بيانات العملاء...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">موجود</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.found}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">غير موجود</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.notFound}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">متعدد</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.multiple}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">سيتم إنشاؤه</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.needsCreation}</div>
                </CardContent>
              </Card>
            </div>

            {/* خيارات المعالجة */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">خيارات المعالجة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoCreate"
                    checked={options.autoCreateCustomers}
                    onChange={(e) => setOptions(prev => ({ ...prev, autoCreateCustomers: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="autoCreate" className="text-sm">
                    إنشاء العملاء الجدد تلقائياً ({stats.needsCreation} عميل)
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="replaceDuplicates"
                    checked={options.replaceDuplicates}
                    onChange={(e) => setOptions(prev => ({ ...prev, replaceDuplicates: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="replaceDuplicates" className="text-sm">
                    استبدال العقود المكررة
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* تفاصيل المطابقة */}
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">ملخص</TabsTrigger>
                <TabsTrigger value="found">موجود ({stats.found})</TabsTrigger>
                <TabsTrigger value="not_found">غير موجود ({stats.notFound})</TabsTrigger>
                <TabsTrigger value="multiple">متعدد ({stats.multiple})</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    تم العثور على {stats.found} عميل من أصل {stats.total} عقد. 
                    {stats.notFound > 0 && ` سيتم إنشاء ${stats.needsCreation} عميل جديد.`}
                    {stats.multiple > 0 && ` يحتاج ${stats.multiple} عقد لتوضيح إضافي.`}
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="found" className="space-y-4">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الصف</TableHead>
                        <TableHead>اسم العميل (CSV)</TableHead>
                        <TableHead>العميل الموجود</TableHead>
                        <TableHead>طريقة البحث</TableHead>
                        <TableHead>الثقة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.filter(p => p.status === 'found').map((preview, index) => (
                        <TableRow key={index}>
                          <TableCell>{preview.rowNumber}</TableCell>
                          <TableCell>{preview.row.customer_name || 'غير محدد'}</TableCell>
                          <TableCell>
                            {preview.matchedCustomer && getCustomerDisplayName(preview.matchedCustomer)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {preview.searchMethod === 'national_id' && 'رقم شخصي'}
                              {preview.searchMethod === 'phone' && 'هاتف'}
                              {preview.searchMethod === 'name_exact' && 'اسم دقيق'}
                              {preview.searchMethod === 'name_single' && 'اسم وحيد'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={preview.confidence! >= 90 ? 'default' : 'secondary'}>
                              {preview.confidence}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="not_found" className="space-y-4">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الصف</TableHead>
                        <TableHead>اسم العميل</TableHead>
                        <TableHead>الرقم الشخصي</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.filter(p => p.status === 'not_found').map((preview, index) => (
                        <TableRow key={index}>
                          <TableCell>{preview.rowNumber}</TableCell>
                          <TableCell>{preview.row.customer_name || 'غير محدد'}</TableCell>
                          <TableCell>{preview.row.national_id || preview.row.customer_national_id || '-'}</TableCell>
                          <TableCell>{preview.row.phone || preview.row.customer_phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {options.autoCreateCustomers ? 'سيتم إنشاؤه' : 'مفقود'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="multiple" className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    العقود التالية تحتوي على عدة عملاء محتملين. يرجى المراجعة اليدوية أو تحديد بيانات أكثر دقة.
                  </AlertDescription>
                </Alert>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الصف</TableHead>
                        <TableHead>اسم العميل</TableHead>
                        <TableHead>العملاء المحتملين</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.filter(p => p.status === 'multiple').map((preview, index) => (
                        <TableRow key={index}>
                          <TableCell>{preview.rowNumber}</TableCell>
                          <TableCell>{preview.row.customer_name || 'غير محدد'}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {preview.possibleMatches?.map((customer, idx) => (
                                <div key={idx} className="text-xs p-1 bg-gray-50 rounded">
                                  {getCustomerDisplayName(customer)}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* أزرار الإجراءات */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onCancel}>
                إلغاء
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={analyzeCustomers} disabled={isAnalyzing}>
                  إعادة تحليل
                </Button>
                <Button onClick={handleConfirm}>
                  متابعة الرفع ({stats.found + (options.autoCreateCustomers ? stats.needsCreation : 0)} عقد)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
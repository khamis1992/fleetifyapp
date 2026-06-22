import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type CSVTemplate } from "@/hooks/useCSVTemplates"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface CSVTemplatePreviewProps {
  template: CSVTemplate
}

export const CSVTemplatePreview = ({ template }: CSVTemplatePreviewProps) => {
  return (
    <div className="space-y-4">
      {/* معلومات القالب */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{template.template_name_ar || template.template_name}</CardTitle>
            <div className="flex gap-2">
              {template.is_default && <Badge variant="secondary">افتراضي</Badge>}
              {template.is_active && <Badge variant="outline" className="text-green-600">نشط</Badge>}
            </div>
          </div>
          <CardDescription>
            {template.description_ar || template.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">نوع الكيان:</span>
              <span className="mr-2">{template.entity_type}</span>
            </div>
            <div>
              <span className="font-medium">عدد الأعمدة:</span>
              <span className="mr-2">{template.headers.length}</span>
            </div>
            <div>
              <span className="font-medium">مرات الاستخدام:</span>
              <span className="mr-2">{template.usage_count}</span>
            </div>
            <div>
              <span className="font-medium">آخر استخدام:</span>
              <span className="mr-2">
                {template.last_used_at 
                  ? format(new Date(template.last_used_at), 'dd/MM/yyyy', { locale: ar })
                  : 'لم يُستخدم بعد'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* أعمدة الجدول */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">أعمدة الجدول</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {template.headers.map((header, index) => (
              <Badge key={index} variant="outline">
                {header}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* البيانات النموذجية */}
      {template.sample_data && template.sample_data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">البيانات النموذجية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {template.headers.map((header, index) => (
                      <TableHead key={index} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {template.sample_data.slice(0, 5).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {template.headers.map((header, colIndex) => (
                        <TableCell key={colIndex} className="whitespace-nowrap">
                          {row[header] || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {template.sample_data.length > 5 && (
                <div className="text-center text-sm text-muted-foreground mt-2">
                  ... وعرض {template.sample_data.length - 5} صف إضافي
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* قواعد التحقق */}
      {template.validation_rules && Object.keys(template.validation_rules).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">قواعد التحقق</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(template.validation_rules).map(([field, rules]: [string, any]) => (
                <div key={field} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{field}</Badge>
                  <span className="text-muted-foreground">
                    {rules.required && 'مطلوب'} 
                    {rules.type && ` • نوع: ${rules.type}`}
                    {rules.values && ` • القيم: ${rules.values.join(', ')}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
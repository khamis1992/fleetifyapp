import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Eye, Trash2, Plus } from "lucide-react"
import { useCSVTemplates, type CSVTemplate } from "@/hooks/useCSVTemplates"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CreateCSVTemplateDialog } from "./CreateCSVTemplateDialog"
import { CSVTemplatePreview } from "./CSVTemplatePreview"

interface CSVTemplateSelectorProps {
  entityType: 'contracts' | 'customers' | 'vehicles' | 'invoices' | 'payments'
  onTemplateSelect?: (template: CSVTemplate) => void
  selectedTemplateId?: string
}

export const CSVTemplateSelector = ({ 
  entityType, 
  onTemplateSelect, 
  selectedTemplateId 
}: CSVTemplateSelectorProps) => {
  const { templates, isLoading, generateCSVFromTemplate, deleteTemplate } = useCSVTemplates(entityType)
  const [selectedTemplate, setSelectedTemplate] = useState<CSVTemplate | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(template)
      onTemplateSelect?.(template)
    }
  }

  const handleDownload = (template: CSVTemplate) => {
    generateCSVFromTemplate(template)
  }

  const handlePreview = (template: CSVTemplate) => {
    setSelectedTemplate(template)
    setShowPreviewDialog(true)
  }

  const handleDelete = (template: CSVTemplate) => {
    if (confirm(`هل تريد حذف القالب "${template.template_name_ar || template.template_name}"؟`)) {
      deleteTemplate.mutate(template.id)
    }
  }

  if (isLoading) {
    return <div className="text-center py-4">جاري تحميل القوالب...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">قوالب CSV المحفوظة</h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 ml-2" />
              قالب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء قالب CSV جديد</DialogTitle>
            </DialogHeader>
            <CreateCSVTemplateDialog 
              entityType={entityType}
              onSuccess={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              لا توجد قوالب محفوظة. أنشئ قالباً جديداً للبدء.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="اختر قالباً محفوظاً" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <span>{template.template_name_ar || template.template_name}</span>
                    {template.is_default && (
                      <Badge variant="secondary" className="text-xs">افتراضي</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid gap-3">
            {templates.map((template) => (
              <Card key={template.id} className={`transition-colors ${selectedTemplateId === template.id ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">
                        {template.template_name_ar || template.template_name}
                      </CardTitle>
                      {template.is_default && (
                        <Badge variant="secondary">افتراضي</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(template)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {!template.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs mb-2">
                    {template.description_ar || template.description}
                  </CardDescription>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{template.headers.length} عمود</span>
                    <span>استُخدم {template.usage_count} مرة</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* معاينة القالب */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة القالب</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <CSVTemplatePreview template={selectedTemplate} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
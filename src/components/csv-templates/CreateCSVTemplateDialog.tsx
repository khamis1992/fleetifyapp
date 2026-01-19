import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"
import { useCSVTemplates, type CreateCSVTemplateData } from "@/hooks/useCSVTemplates"

interface CreateCSVTemplateDialogProps {
  entityType: 'contracts' | 'customers' | 'vehicles' | 'invoices' | 'payments'
  onSuccess?: () => void
  initialData?: {
    headers: string[]
    sampleData?: any[]
  }
}

export const CreateCSVTemplateDialog = ({ 
  entityType, 
  onSuccess,
  initialData 
}: CreateCSVTemplateDialogProps) => {
  const { createTemplate } = useCSVTemplates()
  
  const [formData, setFormData] = useState<CreateCSVTemplateData>({
    template_name: '',
    template_name_ar: '',
    entity_type: entityType,
    description: '',
    description_ar: '',
    headers: initialData?.headers || [''],
    sample_data: initialData?.sampleData || [{}],
    field_mappings: {},
    validation_rules: {},
    is_default: false
  })

  const [newHeader, setNewHeader] = useState('')

  const handleAddHeader = () => {
    if (newHeader.trim()) {
      setFormData(prev => ({
        ...prev,
        headers: [...prev.headers.filter(h => h), newHeader.trim()]
      }))
      setNewHeader('')
    }
  }

  const handleRemoveHeader = (index: number) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanHeaders = formData.headers.filter(h => h.trim())
    if (cleanHeaders.length === 0) {
      return
    }

    try {
      await createTemplate.mutateAsync({
        ...formData,
        headers: cleanHeaders
      })
      onSuccess?.()
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="template_name">اسم القالب (إنجليزي)</Label>
          <Input
            id="template_name"
            value={formData.template_name}
            onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
            placeholder="Contract Upload Template"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="template_name_ar">اسم القالب (عربي)</Label>
          <Input
            id="template_name_ar"
            value={formData.template_name_ar}
            onChange={(e) => setFormData(prev => ({ ...prev, template_name_ar: e.target.value }))}
            placeholder="قالب رفع العقود"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="description">الوصف (إنجليزي)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Template for uploading contracts..."
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description_ar">الوصف (عربي)</Label>
          <Textarea
            id="description_ar"
            value={formData.description_ar}
            onChange={(e) => setFormData(prev => ({ ...prev, description_ar: e.target.value }))}
            placeholder="قالب لرفع العقود..."
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>أعمدة الجدول</Label>
        <div className="flex gap-2">
          <Input
            value={newHeader}
            onChange={(e) => setNewHeader(e.target.value)}
            placeholder="اسم العمود"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHeader())}
          />
          <Button type="button" onClick={handleAddHeader} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.headers.filter(h => h).map((header, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {header}
              <button
                type="button"
                onClick={() => handleRemoveHeader(index)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_default"
          checked={formData.is_default}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
        />
        <Label htmlFor="is_default">قالب افتراضي</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          إلغاء
        </Button>
        <Button 
          type="submit" 
          disabled={createTemplate.isPending || !formData.template_name || formData.headers.filter(h => h).length === 0}
        >
          {createTemplate.isPending ? 'جاري الإنشاء...' : 'إنشاء القالب'}
        </Button>
      </div>
    </form>
  )
}
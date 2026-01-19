import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSalesOpportunity } from "@/hooks/useSalesOpportunities";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: 'lead', name: 'عميل محتمل' },
  { id: 'qualified', name: 'مؤهل' },
  { id: 'proposal', name: 'عرض سعر' },
  { id: 'negotiation', name: 'تفاوض' },
];

interface AddOpportunityFormProps {
  onSuccess?: () => void;
}

export const AddOpportunityForm = ({ onSuccess }: AddOpportunityFormProps) => {
  const [formData, setFormData] = useState({
    opportunity_name: '',
    stage: 'lead',
    estimated_value: '',
    probability: '50',
    expected_close_date: undefined as Date | undefined,
    notes: '',
  });

  const createOpportunity = useCreateSalesOpportunity();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createOpportunity.mutateAsync({
        opportunity_name: formData.opportunity_name,
        stage: formData.stage,
        estimated_value: parseFloat(formData.estimated_value) || 0,
        probability: parseInt(formData.probability) || 0,
        expected_close_date: formData.expected_close_date?.toISOString(),
        notes: formData.notes || undefined,
        is_active: true,
      });

      // Reset form
      setFormData({
        opportunity_name: '',
        stage: 'lead',
        estimated_value: '',
        probability: '50',
        expected_close_date: undefined,
        notes: '',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Opportunity Name */}
        <div className="space-y-2">
          <Label htmlFor="opportunity_name">
            اسم الفرصة <span className="text-destructive">*</span>
          </Label>
          <Input
            id="opportunity_name"
            value={formData.opportunity_name}
            onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })}
            placeholder="مثال: عقد إيجار شاحنات"
            required
          />
        </div>

        {/* Stage */}
        <div className="space-y-2">
          <Label htmlFor="stage">
            المرحلة <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.stage}
            onValueChange={(value) => setFormData({ ...formData, stage: value })}
          >
            <SelectTrigger id="stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estimated Value */}
        <div className="space-y-2">
          <Label htmlFor="estimated_value">
            القيمة المتوقعة (ريال قطري) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="estimated_value"
            type="number"
            step="0.01"
            min="0"
            value={formData.estimated_value}
            onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        {/* Probability */}
        <div className="space-y-2">
          <Label htmlFor="probability">
            نسبة النجاح (%) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="probability"
            type="number"
            min="0"
            max="100"
            value={formData.probability}
            onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
            placeholder="50"
            required
          />
        </div>

        {/* Expected Close Date */}
        <div className="space-y-2">
          <Label htmlFor="expected_close_date">
            تاريخ الإغلاق المتوقع
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="expected_close_date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !formData.expected_close_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {formData.expected_close_date ? (
                  format(formData.expected_close_date, "PPP", { locale: ar })
                ) : (
                  <span>اختر التاريخ</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.expected_close_date}
                onSelect={(date) => setFormData({ ...formData, expected_close_date: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="أضف أي ملاحظات إضافية..."
          rows={4}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={createOpportunity.isPending || !formData.opportunity_name || !formData.estimated_value}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
        >
          {createOpportunity.isPending ? (
            <>
              <LoadingSpinner className="ml-2 h-4 w-4" />
              جاري الإضافة...
            </>
          ) : (
            'إضافة الفرصة'
          )}
        </Button>
      </div>
    </form>
  );
};

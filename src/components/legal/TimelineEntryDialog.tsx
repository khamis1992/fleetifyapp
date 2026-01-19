import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface TimelineEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: TimelineEntryFormData) => Promise<void>;
  caseId: string;
}

interface TimelineEntryFormData {
  category: 'court_hearing' | 'lawyer_call' | 'customer_meeting';
  title: string;
  description: string;
  date: string;
  time: string;
  notes: string;
}

const MANUAL_ENTRY_TYPES = [
  {
    value: 'court_hearing',
    label: 'Court Hearing',
    placeholder: 'E.g., First hearing at circuit court',
  },
  {
    value: 'lawyer_call',
    label: 'Lawyer Call',
    placeholder: 'E.g., Discussed settlement options',
  },
  {
    value: 'customer_meeting',
    label: 'Customer Meeting',
    placeholder: 'E.g., Met with customer to discuss case',
  },
];

const TimelineEntryDialog: React.FC<TimelineEntryDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  caseId,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<TimelineEntryFormData>({
    category: 'court_hearing',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const selectedType = MANUAL_ENTRY_TYPES.find((t) => t.value === formData.category);

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Description is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.date) {
      toast({
        title: 'Error',
        description: 'Date is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      if (onSubmit) {
        await onSubmit(formData);
      }

      toast({
        title: 'Success',
        description: 'Timeline entry added successfully',
      });

      // Reset form
      setFormData({
        category: 'court_hearing',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        notes: '',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add timeline entry',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Timeline Entry</DialogTitle>
          <DialogDescription>
            Record a new event, action, or milestone in this case
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entry Type */}
          <div>
            <Label htmlFor="entry_type" className="text-sm font-semibold mb-2 block">
              Entry Type <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.category} onValueChange={(value) =>
              setFormData({ ...formData, category: value as any })
            }>
              <SelectTrigger id="entry_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_ENTRY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedType?.placeholder}
            </p>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="entry_title" className="text-sm font-semibold mb-2 block">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="entry_title"
              placeholder="What happened? (e.g., First court hearing scheduled)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="entry_description" className="text-sm font-semibold mb-2 block">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="entry_description"
              placeholder="Provide more details about this event..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="entry_date" className="text-sm font-semibold mb-2 block">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="entry_date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="entry_time" className="text-sm font-semibold mb-2 block">
                Time
              </Label>
              <Input
                id="entry_time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="entry_notes" className="text-sm font-semibold mb-2 block">
              Additional Notes
            </Label>
            <Textarea
              id="entry_notes"
              placeholder="Any additional information or comments (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Preview */}
          <div className="bg-muted p-3 rounded">
            <p className="text-xs font-semibold mb-2">Preview:</p>
            <div className="text-sm space-y-1">
              <p>
                <strong>{formData.title || '(Title)'}</strong>
              </p>
              <p className="text-muted-foreground">{formData.description || '(Description)'}</p>
              <p className="text-xs text-muted-foreground">
                {formData.date && formData.time ? `${formData.date} at ${formData.time}` : 'Date and time'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimelineEntryDialog;
export type { TimelineEntryFormData };

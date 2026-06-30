import { HelpCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type FeatureTourContent = {
  title: string;
  description: string;
  steps: string[];
};

interface FeatureTourButtonProps {
  tour: FeatureTourContent;
  onStart: (tour: FeatureTourContent) => void;
  className?: string;
}

export function FeatureTourButton({ tour, onStart, className }: FeatureTourButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onStart(tour)}
      className={className || 'h-9 gap-2 rounded-[8px] border bg-white'}
    >
      <PlayCircle className="h-4 w-4 text-emerald-600" />
      ابدأ الجولة التعريفية
    </Button>
  );
}

interface FeatureTourDialogProps {
  tour: FeatureTourContent | null;
  onOpenChange: (open: boolean) => void;
}

export function FeatureTourDialog({ tour, onOpenChange }: FeatureTourDialogProps) {
  return (
    <Dialog open={!!tour} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[8px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-5 w-5 text-emerald-600" />
            {tour?.title}
          </DialogTitle>
          <DialogDescription>{tour?.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {tour?.steps.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-[8px] border border-slate-200 bg-white p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm leading-7 text-slate-700">{step}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, MousePointerClick, PlayCircle } from 'lucide-react';
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
  const [activeStep, setActiveStep] = useState(0);
  const steps = tour?.steps || [];
  const activeStepText = steps[activeStep] || '';
  const progress = steps.length > 0 ? Math.round(((activeStep + 1) / steps.length) * 100) : 0;
  const canGoBack = activeStep > 0;
  const canGoNext = activeStep < steps.length - 1;

  const previewRows = useMemo(() => {
    const previous = steps[activeStep - 1];
    const current = steps[activeStep];
    const next = steps[activeStep + 1];

    return [
      { label: 'تمت مراجعتها', value: previous || 'ابدأ من الخطوة الأولى', state: previous ? 'done' : 'muted' },
      { label: 'الخطوة الحالية', value: current || 'لا توجد خطوات متاحة', state: 'active' },
      { label: 'التالي', value: next || 'آخر خطوة في الجولة', state: next ? 'next' : 'muted' },
    ];
  }, [activeStep, steps]);

  useEffect(() => {
    setActiveStep(0);
  }, [tour]);

  return (
    <Dialog open={!!tour} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-[8px] border-slate-200 p-0 shadow-2xl" dir="rtl">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-emerald-600 text-white">
              <HelpCircle className="h-5 w-5" />
            </span>
            {tour?.title}
          </DialogTitle>
          <DialogDescription className="pt-1 text-slate-600">{tour?.description}</DialogDescription>
        </DialogHeader>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-[1fr_1.15fr]">
          <aside className="border-l border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-500">الخطوات</span>
              <span className="rounded-[8px] bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                {activeStep + 1} / {Math.max(steps.length, 1)}
              </span>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isActive = index === activeStep;
                const isDone = index < activeStep;

                return (
                  <button
                    key={`${index}-${step}`}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`flex w-full gap-3 rounded-[8px] border p-3 text-right transition-all ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-sm font-bold ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : isDone
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className={`line-clamp-2 text-sm leading-6 ${isActive ? 'font-bold text-slate-950' : 'text-slate-600'}`}>
                      {step}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="bg-slate-50 p-5">
            <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-white">
                  <MousePointerClick className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-black text-emerald-700">الخطوة الحالية</p>
                  <h3 className="mt-1 text-lg font-black leading-8 text-slate-950">{activeStepText || 'لا توجد خطوات متاحة'}</h3>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {previewRows.map((row) => (
                  <div
                    key={row.label}
                    className={`rounded-[8px] border p-3 ${
                      row.state === 'active'
                        ? 'border-emerald-200 bg-emerald-50'
                        : row.state === 'done'
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <p className="text-xs font-black text-slate-500">{row.label}</p>
                    <p className={`mt-1 text-sm leading-6 ${row.state === 'active' ? 'font-bold text-slate-950' : 'text-slate-600'}`}>
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveStep((step) => Math.max(step - 1, 0))}
                  disabled={!canGoBack}
                  className="gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (canGoNext) {
                      setActiveStep((step) => Math.min(step + 1, steps.length - 1));
                    } else {
                      onOpenChange(false);
                    }
                  }}
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {canGoNext ? 'التالي' : 'إنهاء الجولة'}
                  {canGoNext && <ChevronLeft className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

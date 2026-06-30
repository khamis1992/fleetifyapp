import React, { useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DepositForm } from "./DepositForm";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { FeatureTourButton, FeatureTourDialog, type FeatureTourContent } from "@/components/common/FeatureTourGuide";

const depositDialogTour = {
  title: "جولة إضافة أو تعديل وديعة",
  description: "شرح طريقة تسجيل ضمان العميل وربطه بالسجل الصحيح.",
  steps: [
    "ابحث عن العميل المرتبط بالوديعة قبل إدخال المبلغ.",
    "حدد نوع الوديعة والمبلغ وتاريخ الاستلام أو الاستحقاق.",
    "اختر الحالة المناسبة: نشطة، معلقة، مستردة، أو مستردة جزئياً.",
    "اكتب الملاحظات عند وجود شرط خاص لإرجاع الوديعة أو خصم جزء منها.",
    "بعد الحفظ ستظهر الوديعة في تبويب الودائع ويمكن عرض تفاصيلها لاحقاً.",
  ],
} satisfies FeatureTourContent;

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposit?: any;
}

export function DepositDialog({ open, onOpenChange, deposit }: DepositDialogProps) {
  const [activeTour, setActiveTour] = useState<FeatureTourContent | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="deposit-dialog-redesign max-h-[88dvh] max-w-4xl overflow-hidden rounded-lg border-0 p-0"
        dir="rtl"
        style={
          {
            "--deposit-dialog-text": systemColorPattern.colors.text,
            "--deposit-dialog-inner": systemColorPattern.colors.innerSurface,
            "--deposit-dialog-muted": systemColorPattern.colors.secondaryText,
            "--deposit-dialog-border": systemColorPattern.colors.border,
            "--deposit-dialog-success": systemColorPattern.colors.success,
            "--deposit-dialog-info": systemColorPattern.colors.info,
          } as React.CSSProperties
        }
      >
        <DialogHeader className="deposit-dialog-header">
          <div className="flex min-w-0 items-start gap-3">
            <span className="deposit-dialog-icon">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-black text-[#020617]">
                {deposit ? "تعديل الوديعة" : "إضافة وديعة جديدة"}
              </DialogTitle>
              <p className="mt-1 text-sm font-bold text-[#94A3B8]">
                {deposit ? "تحديث بيانات الوديعة ومراجعة العميل المرتبط بها" : "ابحث عن العميل ثم سجل نوع الوديعة والمبلغ"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <FeatureTourButton tour={depositDialogTour} onStart={setActiveTour} />
            <Badge className="deposit-dialog-badge">
              <Sparkles className="h-3.5 w-3.5" />
              بحث سريع
            </Badge>
          </div>
        </DialogHeader>

        <div className="deposit-dialog-body">
          <DepositForm deposit={deposit} onSuccess={() => onOpenChange(false)} />
        </div>

        <style>{`
          .deposit-dialog-redesign {
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            color: var(--deposit-dialog-text);
            background: white;
          }

          .deposit-dialog-header {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            border-bottom: 1px solid var(--deposit-dialog-border);
            background: linear-gradient(180deg, var(--deposit-dialog-inner), white);
            padding: 16px 18px;
          }

          .deposit-dialog-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: 8px;
          }

          .deposit-dialog-icon {
            width: 42px;
            height: 42px;
            color: var(--deposit-dialog-success);
            background: color-mix(in srgb, var(--deposit-dialog-success) 12%, white);
            border: 1px solid color-mix(in srgb, var(--deposit-dialog-success) 24%, white);
          }

          .deposit-dialog-badge {
            gap: 6px;
            border: 0;
            border-radius: 8px;
            background: color-mix(in srgb, var(--deposit-dialog-info) 12%, white);
            color: var(--deposit-dialog-info);
            padding: 8px 10px;
          }

          .deposit-dialog-body {
            min-height: 0;
            overflow-y: auto;
            background: var(--deposit-dialog-inner);
            padding: 14px;
          }

          @media (max-width: 760px) {
            .deposit-dialog-header {
              flex-direction: column;
            }
          }
        `}</style>
        <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />
      </DialogContent>
    </Dialog>
  );
}

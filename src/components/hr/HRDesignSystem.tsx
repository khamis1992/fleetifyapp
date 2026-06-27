import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const hrColors = {
  text: "#020617",
  muted: "#94A3B8",
  surface: "#F6F8FB",
  success: "#22C7A1",
  info: "#38BDF8",
  focus: "#7C83F6",
  danger: "#FB6B7A",
};

interface HRPageShellProps {
  children: ReactNode;
  className?: string;
}

export function HRPageShell({ children, className }: HRPageShellProps) {
  return (
    <div className={cn("min-h-screen bg-[#F6F8FB] px-4 py-5 sm:px-6", className)} dir="rtl">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">{children}</div>
    </div>
  );
}

interface HRPageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  action?: ReactNode;
}

export function HRPageHeader({ title, description, icon: Icon, badge = "الموارد البشرية", action }: HRPageHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8FBF6] text-[#22C7A1]">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#E8FBF6] px-3 py-1 text-xs font-black text-[#22C7A1]">{badge}</span>
              <span className="rounded-full bg-[#ECFEFF] px-3 py-1 text-xs font-black text-[#38BDF8]">People Ops</span>
            </div>
            <h1 className="text-2xl font-black text-[#020617]">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#94A3B8]">{description}</p>
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

interface HRMetricCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon: LucideIcon;
  tone?: "success" | "info" | "focus" | "danger" | "neutral";
}

const toneMap = {
  success: { bg: "#E8FBF6", color: "#22C7A1" },
  info: { bg: "#EAF8FE", color: "#38BDF8" },
  focus: { bg: "#ECEEFE", color: "#7C83F6" },
  danger: { bg: "#FFF0F2", color: "#FB6B7A" },
  neutral: { bg: "#F6F8FB", color: "#94A3B8" },
};

export function HRMetricCard({ title, value, subtitle, icon: Icon, tone = "neutral" }: HRMetricCardProps) {
  const colors = toneMap[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#94A3B8]">{title}</p>
          <div className="mt-2 text-xl font-black text-[#020617]">{value}</div>
          {subtitle && <p className="mt-1 text-xs font-bold text-[#94A3B8]">{subtitle}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.bg, color: colors.color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function HRSectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

export const hrFieldClassName =
  "h-11 rounded-xl border-slate-200 bg-[#F6F8FB] text-[#020617] shadow-none focus-visible:ring-[#22C7A1]";

export const hrButtonClassName = "h-11 rounded-xl bg-[#22C7A1] font-black text-white hover:bg-[#1DAE8D]";

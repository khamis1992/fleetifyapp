import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Download,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAdvancedFinancialRatios } from "@/hooks/useAdvancedFinancialRatios";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const colors = systemColorPattern.colors;

type RatioTone = "excellent" | "good" | "watch" | "risk";

interface RatioDefinition {
  key: string;
  title: string;
  group: "profitability" | "liquidity" | "activity" | "leverage";
  value: number;
  format: "percentage" | "ratio" | "days" | "currency";
  benchmark: string;
  description: string;
  tone: RatioTone;
  icon: React.ElementType;
}

const toneMeta: Record<RatioTone, { label: string; color: string; bg: string }> = {
  excellent: { label: "ممتاز", color: colors.success, bg: `${colors.success}14` },
  good: { label: "جيد", color: colors.info, bg: `${colors.info}14` },
  watch: { label: "مراقبة", color: colors.focus, bg: `${colors.focus}14` },
  risk: { label: "مخاطرة", color: colors.alert, bg: `${colors.alert}14` },
};

const assess = (value: number, thresholds: { excellent: number; good: number; watch: number }, lowerIsBetter = false): RatioTone => {
  if (lowerIsBetter) {
    if (value <= thresholds.excellent) return "excellent";
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.watch) return "watch";
    return "risk";
  }

  if (value >= thresholds.excellent) return "excellent";
  if (value >= thresholds.good) return "good";
  if (value >= thresholds.watch) return "watch";
  return "risk";
};

export function AdvancedFinancialRatios() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const { formatCurrency } = useCurrencyFormatter();

  const today = new Date();
  const startDate = format(
    period === "month" ? subMonths(today, 1) : period === "quarter" ? subMonths(today, 3) : subMonths(today, 12),
    "yyyy-MM-dd",
  );
  const endDate = format(today, "yyyy-MM-dd");
  const { data: ratios, isLoading } = useAdvancedFinancialRatios(startDate, endDate);

  const ratioCards = useMemo<RatioDefinition[]>(() => {
    if (!ratios) return [];

    return [
      {
        key: "netProfitMargin",
        title: "هامش الربح الصافي",
        group: "profitability",
        value: ratios.profitability.netProfitMargin,
        format: "percentage",
        benchmark: "5% أو أكثر",
        description: "صافي الربح كنسبة من الإيرادات",
        tone: assess(ratios.profitability.netProfitMargin, { excellent: 20, good: 10, watch: 5 }),
        icon: TrendingUp,
      },
      {
        key: "returnOnAssets",
        title: "العائد على الأصول",
        group: "profitability",
        value: ratios.profitability.returnOnAssets,
        format: "percentage",
        benchmark: "5% أو أكثر",
        description: "كفاءة استخدام الأصول لتوليد الربح",
        tone: assess(ratios.profitability.returnOnAssets, { excellent: 15, good: 10, watch: 5 }),
        icon: Shield,
      },
      {
        key: "currentRatio",
        title: "نسبة التداول",
        group: "liquidity",
        value: ratios.liquidity.currentRatio,
        format: "ratio",
        benchmark: "1.5 - 2.0",
        description: "قدرة تغطية الالتزامات قصيرة الأجل",
        tone: assess(ratios.liquidity.currentRatio, { excellent: 2, good: 1.5, watch: 1 }),
        icon: Wallet,
      },
      {
        key: "quickRatio",
        title: "النسبة السريعة",
        group: "liquidity",
        value: ratios.liquidity.quickRatio,
        format: "ratio",
        benchmark: "1.0 أو أكثر",
        description: "السيولة المتاحة دون الاعتماد على المخزون",
        tone: assess(ratios.liquidity.quickRatio, { excellent: 1.5, good: 1, watch: 0.75 }),
        icon: Sparkles,
      },
      {
        key: "assetTurnover",
        title: "دوران الأصول",
        group: "activity",
        value: ratios.activity.assetTurnover,
        format: "ratio",
        benchmark: "1.0 أو أكثر",
        description: "كفاءة الأصول في توليد الإيرادات",
        tone: assess(ratios.activity.assetTurnover, { excellent: 2, good: 1, watch: 0.5 }),
        icon: Activity,
      },
      {
        key: "daysSalesOutstanding",
        title: "متوسط التحصيل",
        group: "activity",
        value: ratios.activity.daysSalesOutstanding,
        format: "days",
        benchmark: "30 - 45 يوم",
        description: "متوسط أيام تحصيل الذمم المدينة",
        tone: assess(ratios.activity.daysSalesOutstanding, { excellent: 30, good: 45, watch: 60 }, true),
        icon: BarChart3,
      },
      {
        key: "debtToAssets",
        title: "الدين إلى الأصول",
        group: "leverage",
        value: ratios.leverage.debtToAssets,
        format: "percentage",
        benchmark: "أقل من 50%",
        description: "نسبة الأصول الممولة بالالتزامات",
        tone: assess(ratios.leverage.debtToAssets, { excellent: 30, good: 50, watch: 70 }, true),
        icon: TrendingDown,
      },
      {
        key: "equityRatio",
        title: "نسبة حقوق الملكية",
        group: "leverage",
        value: ratios.leverage.equityRatio,
        format: "percentage",
        benchmark: "50% أو أكثر",
        description: "حصة حقوق الملكية من إجمالي الأصول",
        tone: assess(ratios.leverage.equityRatio, { excellent: 70, good: 50, watch: 30 }),
        icon: Shield,
      },
    ];
  }, [ratios]);

  const score = useMemo(() => {
    if (!ratioCards.length) return 0;
    const points = { excellent: 100, good: 78, watch: 55, risk: 25 };
    return Math.round(ratioCards.reduce((sum, ratio) => sum + points[ratio.tone], 0) / ratioCards.length);
  }, [ratioCards]);

  const radarData = ratios
    ? [
        { category: "الربحية", value: clamp((ratios.profitability.netProfitMargin + ratios.profitability.returnOnEquity) / 2) },
        { category: "السيولة", value: clamp(ratios.liquidity.currentRatio * 45) },
        { category: "النشاط", value: clamp(ratios.activity.assetTurnover * 50) },
        { category: "الاستقرار", value: clamp(100 - ratios.leverage.debtToAssets) },
      ]
    : [];

  const comparisonData = ratios
    ? [
        { name: "هامش صافي", value: ratios.profitability.netProfitMargin, benchmark: 10 },
        { name: "عائد الأصول", value: ratios.profitability.returnOnAssets, benchmark: 5 },
        { name: "حقوق الملكية", value: ratios.leverage.equityRatio, benchmark: 50 },
      ]
    : [];

  const formatRatioValue = (ratio: RatioDefinition) => {
    if (ratio.format === "percentage") return `${ratio.value.toFixed(1)}%`;
    if (ratio.format === "ratio") return ratio.value.toFixed(2);
    if (ratio.format === "days") return `${Math.round(ratio.value)} يوم`;
    return formatCurrency(ratio.value);
  };

  const handleExport = () => {
    if (!ratios) return;
    const blob = new Blob([JSON.stringify({ period, startDate, endDate, ratios }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-ratios-${endDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير بيانات النسب");
  };

  if (isLoading) {
    return (
      <Card className="border-[#E5EAF1] shadow-sm">
        <CardContent className="flex min-h-[220px] items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!ratios) {
    return (
      <Card className="border-[#E5EAF1] shadow-sm">
        <CardContent className="p-8 text-center text-[#94A3B8]">لا توجد بيانات مالية كافية لاحتساب النسب.</CardContent>
      </Card>
    );
  }

  return (
    <div className="ratios-redesign space-y-5" dir="rtl">
      <section className="ratio-command">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="ratio-command-icon">
              <PercentIcon />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#94A3B8]">Financial Health</p>
              <h3 className="mt-1 text-xl font-black text-[#020617]">لوحة النسب المالية</h3>
              <p className="mt-1 text-sm leading-7 text-[#94A3B8]">
                قراءة مركزة للربحية، السيولة، النشاط، والمديونية خلال الفترة المحددة.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["month", "شهري"],
              ["quarter", "ربع سنوي"],
              ["year", "سنوي"],
            ].map(([value, label]) => (
              <Button
                key={value}
                variant={period === value ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(value as "month" | "quarter" | "year")}
                className={cn(period === value ? "bg-[#020617] text-white" : "border-[#E5EAF1] bg-white text-[#020617]")}
              >
                {label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 border-[#E5EAF1] bg-white text-[#020617]">
              <Download className="h-4 w-4" />
              تصدير
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="ratio-score-card">
            <span>مؤشر الصحة</span>
            <strong>{score}%</strong>
            <div className="ratio-score-track">
              <i style={{ width: `${score}%` }} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryTile title="الإيرادات" value={formatCurrency(ratios.rawData.revenue)} accent={colors.success} />
            <SummaryTile title="صافي الربح" value={formatCurrency(ratios.rawData.netIncome)} accent={colors.focus} />
            <SummaryTile title="الأصول" value={formatCurrency(ratios.rawData.totalAssets)} accent={colors.info} />
            <SummaryTile title="حقوق الملكية" value={formatCurrency(ratios.rawData.totalEquity)} accent={colors.alert} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="ratio-chart-card">
          <CardContent className="p-4">
            <div className="mb-3">
              <h4 className="font-black text-[#020617]">خريطة الأداء</h4>
              <p className="text-xs text-[#94A3B8]">مؤشر بصري سريع لأربع مناطق مالية</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5EAF1" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "#64748B", fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={colors.focus} fill={colors.focus} fillOpacity={0.22} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="ratio-chart-card">
          <CardContent className="p-4">
            <div className="mb-3">
              <h4 className="font-black text-[#020617]">مقارنة مع المعايير</h4>
              <p className="text-xs text-[#94A3B8]">أهم النسب مقابل معيار داخلي مقترح</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" />
                <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="القيمة" fill={colors.focus} radius={[8, 8, 0, 0]} />
                <Bar dataKey="benchmark" name="المعيار" fill={colors.success} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ratioCards.map((ratio) => {
          const Icon = ratio.icon;
          const meta = toneMeta[ratio.tone];
          return (
            <Card key={ratio.key} className="ratio-card">
              <CardContent className="p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="ratio-card-icon" style={{ color: meta.color, backgroundColor: meta.bg }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="ratio-badge" style={{ color: meta.color, backgroundColor: meta.bg }}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-sm font-bold text-[#94A3B8]">{ratio.title}</p>
                <p className="mt-2 text-2xl font-black text-[#020617]">{formatRatioValue(ratio)}</p>
                <p className="mt-2 min-h-10 text-xs leading-5 text-[#64748B]">{ratio.description}</p>
                <div className="mt-4 border-t border-[#E5EAF1] pt-3 text-xs font-bold text-[#94A3B8]">
                  المعيار: {ratio.benchmark}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <style>{`
        .ratios-redesign .ratio-command,
        .ratios-redesign .ratio-chart-card,
        .ratios-redesign .ratio-card {
          border: 1px solid #E5EAF1;
          background: #FFFFFF;
          border-radius: 8px;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
        }

        .ratios-redesign .ratio-command {
          padding: 18px;
          position: relative;
          overflow: hidden;
        }

        .ratios-redesign .ratio-command::before {
          content: "";
          position: absolute;
          inset-inline-start: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: linear-gradient(180deg, #7C83F6, #22C7A1, #38BDF8, #FB6B7A);
        }

        .ratios-redesign .ratio-command-icon,
        .ratios-redesign .ratio-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 8px;
        }

        .ratios-redesign .ratio-command-icon {
          width: 46px;
          height: 46px;
          color: #7C83F6;
          background: rgba(124, 131, 246, 0.12);
          border: 1px solid rgba(124, 131, 246, 0.22);
        }

        .ratios-redesign .ratio-score-card,
        .ratios-redesign .ratio-summary-tile {
          border: 1px solid #E5EAF1;
          background: #F6F8FB;
          border-radius: 8px;
          padding: 14px;
        }

        .ratios-redesign .ratio-score-card span,
        .ratios-redesign .ratio-summary-tile span {
          display: block;
          font-size: 12px;
          font-weight: 900;
          color: #94A3B8;
        }

        .ratios-redesign .ratio-score-card strong,
        .ratios-redesign .ratio-summary-tile strong {
          display: block;
          margin-top: 8px;
          color: #020617;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: 0;
        }

        .ratios-redesign .ratio-score-card strong {
          font-size: 32px;
        }

        .ratios-redesign .ratio-score-track {
          height: 8px;
          overflow: hidden;
          margin-top: 12px;
          border-radius: 999px;
          background: #E5EAF1;
        }

        .ratios-redesign .ratio-score-track i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #22C7A1;
        }

        .ratios-redesign .ratio-card {
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .ratios-redesign .ratio-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px rgba(2, 6, 23, 0.08);
        }

        .ratios-redesign .ratio-card-icon {
          width: 40px;
          height: 40px;
        }

        .ratios-redesign .ratio-badge {
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .ratios-redesign button {
          border-radius: 8px !important;
        }
      `}</style>
    </div>
  );
}

function SummaryTile({ title, value, accent }: { title: string; value: string; accent: string }) {
  return (
    <div className="ratio-summary-tile">
      <span style={{ color: accent }}>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PercentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </svg>
  );
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

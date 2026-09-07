import { useId, useMemo, useState } from "react";
import { Calculator, PieChart, Target, TrendingDown } from "lucide-react";
const analyticsColors = { alert: "#14675e" };
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FinanceSectionTabs } from "@/components/finance/workspace/FinanceSectionTabs";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { getCurrencyConfig } from "@/utils/currencyConfig";
const CalculatorWorkspace = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const { currency } = useCompanyCurrency();
  const currencyLabel = getCurrencyConfig(currency).symbol;
  const [loan, setLoan] = useState({ principal: 0, rate: 0, years: 0 });
  const [profit, setProfit] = useState({ revenue: 0, costs: 0, expenses: 0 });
  const [roi, setRoi] = useState({ initial: 0, final: 0, years: 1 });
  const [depreciation, setDepreciation] = useState({
    cost: 0,
    salvage: 0,
    years: 1,
    method: "straight-line",
  });

  const loanResult = useMemo(() => {
    if (loan.principal <= 0 || loan.rate < 0 || loan.years <= 0)
      return { monthly: 0, total: 0, interest: 0 };
    const monthlyRate = loan.rate / 100 / 12;
    const payments = loan.years * 12;
    const monthly =
      monthlyRate === 0
        ? loan.principal / payments
        : (loan.principal *
            (monthlyRate * Math.pow(1 + monthlyRate, payments))) /
          (Math.pow(1 + monthlyRate, payments) - 1);
    return {
      monthly,
      total: monthly * payments,
      interest: monthly * payments - loan.principal,
    };
  }, [loan]);

  const profitResult = useMemo(() => {
    const gross = profit.revenue - profit.costs;
    const net = gross - profit.expenses;
    return {
      gross,
      net,
      margin: profit.revenue > 0 ? (net / profit.revenue) * 100 : 0,
    };
  }, [profit]);

  const roiResult = useMemo(() => {
    const total = roi.final - roi.initial;
    const roiPercent = roi.initial > 0 ? (total / roi.initial) * 100 : 0;
    const annual =
      roi.initial > 0 && roi.final > 0 && roi.years > 0
        ? (Math.pow(roi.final / roi.initial, 1 / roi.years) - 1) * 100
        : 0;
    return { total, roiPercent, annual };
  }, [roi]);

  const depreciationResult = useMemo(() => {
    if (depreciation.cost <= 0 || depreciation.years <= 0)
      return { annual: 0, monthly: 0, book: 0 };
    const available = Math.max(
      0,
      depreciation.cost - Math.max(0, depreciation.salvage)
    );
    const annual = Math.min(
      available,
      depreciation.method === "double-declining"
        ? depreciation.cost * (2 / depreciation.years)
        : available / depreciation.years
    );
    return { annual, monthly: annual / 12, book: depreciation.cost - annual };
  }, [depreciation]);

  return (
    <div className="p-4">
      <Tabs defaultValue="loan" className="space-y-4">
        <FinanceSectionTabs
          items={[
            { id: "loan", label: "القروض" },
            { id: "profit", label: "الأرباح" },
            { id: "roi", label: "العائد على الاستثمار" },
            { id: "depreciation", label: "الإهلاك" },
          ]}
        />

        <TabsContent value="loan">
          <CalculatorPanel
            title="حاسبة القروض"
            icon={Calculator}
            inputs={
              <>
                <NumberField
                  label={`مبلغ القرض (${currencyLabel})`}
                  value={loan.principal}
                  onChange={(value) =>
                    setLoan((prev) => ({ ...prev, principal: value }))
                  }
                />
                <NumberField
                  label="معدل الفائدة السنوي (%)"
                  value={loan.rate}
                  onChange={(value) =>
                    setLoan((prev) => ({ ...prev, rate: value }))
                  }
                />
                <NumberField
                  label="مدة القرض (سنوات)"
                  value={loan.years}
                  onChange={(value) =>
                    setLoan((prev) => ({ ...prev, years: value }))
                  }
                />
              </>
            }
            results={[
              ["القسط الشهري", formatCurrency(loanResult.monthly)],
              ["إجمالي المدفوعات", formatCurrency(loanResult.total)],
              ["إجمالي الفوائد", formatCurrency(loanResult.interest)],
            ]}
          />
        </TabsContent>

        <TabsContent value="profit">
          <CalculatorPanel
            title="حاسبة الربحية"
            icon={PieChart}
            inputs={
              <>
                <NumberField
                  label={`الإيرادات (${currencyLabel})`}
                  value={profit.revenue}
                  onChange={(value) =>
                    setProfit((prev) => ({ ...prev, revenue: value }))
                  }
                />
                <NumberField
                  label={`تكلفة المبيعات (${currencyLabel})`}
                  value={profit.costs}
                  onChange={(value) =>
                    setProfit((prev) => ({ ...prev, costs: value }))
                  }
                />
                <NumberField
                  label={`المصروفات التشغيلية (${currencyLabel})`}
                  value={profit.expenses}
                  onChange={(value) =>
                    setProfit((prev) => ({ ...prev, expenses: value }))
                  }
                />
              </>
            }
            results={[
              ["الربح الإجمالي", formatCurrency(profitResult.gross)],
              ["صافي الربح", formatCurrency(profitResult.net)],
              ["هامش الربح", `${profitResult.margin.toFixed(2)}%`],
            ]}
          />
        </TabsContent>

        <TabsContent value="roi">
          <CalculatorPanel
            title="حاسبة عائد الاستثمار"
            icon={Target}
            inputs={
              <>
                <NumberField
                  label={`الاستثمار الأولي (${currencyLabel})`}
                  value={roi.initial}
                  onChange={(value) =>
                    setRoi((prev) => ({ ...prev, initial: value }))
                  }
                />
                <NumberField
                  label={`القيمة النهائية (${currencyLabel})`}
                  value={roi.final}
                  onChange={(value) =>
                    setRoi((prev) => ({ ...prev, final: value }))
                  }
                />
                <NumberField
                  label="المدة (سنوات)"
                  value={roi.years}
                  onChange={(value) =>
                    setRoi((prev) => ({ ...prev, years: value }))
                  }
                />
              </>
            }
            results={[
              ["إجمالي العائد", formatCurrency(roiResult.total)],
              ["ROI", `${roiResult.roiPercent.toFixed(2)}%`],
              ["العائد السنوي", `${roiResult.annual.toFixed(2)}%`],
            ]}
          />
        </TabsContent>

        <TabsContent value="depreciation">
          <CalculatorPanel
            title="حاسبة الإهلاك"
            icon={TrendingDown}
            inputs={
              <>
                <NumberField
                  label={`تكلفة الأصل (${currencyLabel})`}
                  value={depreciation.cost}
                  onChange={(value) =>
                    setDepreciation((prev) => ({ ...prev, cost: value }))
                  }
                />
                <NumberField
                  label={`القيمة المتبقية (${currencyLabel})`}
                  value={depreciation.salvage}
                  onChange={(value) =>
                    setDepreciation((prev) => ({ ...prev, salvage: value }))
                  }
                />
                <NumberField
                  label="العمر الإنتاجي (سنوات)"
                  value={depreciation.years}
                  onChange={(value) =>
                    setDepreciation((prev) => ({ ...prev, years: value }))
                  }
                />
                <div className="space-y-2">
                  <Label id="depreciation-method-label">طريقة الإهلاك</Label>
                  <Select
                    value={depreciation.method}
                    onValueChange={(value) =>
                      setDepreciation((prev) => ({ ...prev, method: value }))
                    }
                  >
                    <SelectTrigger aria-labelledby="depreciation-method-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight-line">
                        القسط الثابت
                      </SelectItem>
                      <SelectItem value="double-declining">
                        القسط المتناقص المضاعف
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            }
            results={[
              ["إهلاك السنة الأولى", formatCurrency(depreciationResult.annual)],
              [
                "متوسط الإهلاك الشهري",
                formatCurrency(depreciationResult.monthly),
              ],
              [
                "القيمة بعد السنة الأولى",
                formatCurrency(depreciationResult.book),
              ],
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const NumberField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        placeholder="0"
      />
    </div>
  );
};

const CalculatorPanel = ({
  title,
  icon: Icon,
  inputs,
  results,
}: {
  title: string;
  icon: React.ElementType;
  inputs: React.ReactNode;
  results: Array<[string, string]>;
}) => (
  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
    <Card className="analytics-tool-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className="analytics-icon"
            style={{
              color: analyticsColors.alert,
              backgroundColor: `${analyticsColors.alert}14`,
            }}
          >
            <Icon className="h-5 w-5" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{inputs}</CardContent>
    </Card>

    <Card className="analytics-tool-card">
      <CardHeader>
        <CardTitle className="text-base">النتائج</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {results.map(([label, value]) => (
          <div key={label} className="analytics-result-tile">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

export default CalculatorWorkspace;

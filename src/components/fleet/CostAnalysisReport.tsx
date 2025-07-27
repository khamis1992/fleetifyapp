import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CostAnalysisReportProps {
  analytics: any
  fuelRecords: any[]
  period: string
}

export function CostAnalysisReport({ analytics, fuelRecords, period }: CostAnalysisReportProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>تحليل التكاليف</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          سيتم إضافة تحليل التكاليف التفصيلي قريباً
        </p>
      </CardContent>
    </Card>
  )
}
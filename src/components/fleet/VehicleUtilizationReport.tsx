import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface VehicleUtilizationReportProps {
  analytics: any
  period: string
}

export function VehicleUtilizationReport({ analytics, period }: VehicleUtilizationReportProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>تقرير استخدام المركبات</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          سيتم إضافة تقرير الاستخدام التفصيلي قريباً
        </p>
      </CardContent>
    </Card>
  )
}
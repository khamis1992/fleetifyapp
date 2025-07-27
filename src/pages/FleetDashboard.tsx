import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FleetOverviewPanel } from "@/components/fleet/FleetOverviewPanel"
import { FleetAnalyticsDashboard } from "@/components/fleet/FleetAnalyticsDashboard"
import { FleetMaintenancePanel } from "@/components/fleet/FleetMaintenancePanel"
import { FleetFinancialPanel } from "@/components/fleet/FleetFinancialPanel"
import { VehicleManagementPanel } from "@/components/fleet/VehicleManagementPanel"

export default function FleetDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الأسطول المتقدمة</h1>
          <p className="text-muted-foreground">
            لوحة تحكم شاملة لإدارة أسطول المركبات والعمليات والتحليلات
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="vehicles">إدارة المركبات</TabsTrigger>
          <TabsTrigger value="maintenance">الصيانة</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          <TabsTrigger value="financial">المالية</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <FleetOverviewPanel />
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-6">
          <VehicleManagementPanel />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <FleetMaintenancePanel />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <FleetAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FleetFinancialPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
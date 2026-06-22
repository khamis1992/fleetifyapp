import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EssentialAccountMappingsManager } from '@/components/finance/EssentialAccountMappingsManager'
import { ContractRecoveryManager } from '@/components/contracts/ContractRecoveryManager'

export default function AccountRecoveryManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إدارة الاسترداد والربط</h1>
        <p className="text-muted-foreground">
          إعداد الحسابات الأساسية واسترداد القيود المحاسبية المفقودة
        </p>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">ربط الحسابات الأساسية</TabsTrigger>
          <TabsTrigger value="recovery">استرداد القيود المحاسبية</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <EssentialAccountMappingsManager />
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <ContractRecoveryManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
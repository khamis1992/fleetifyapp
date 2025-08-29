import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ElectronicSignatureSettings as ElectronicSignatureSettingsComponent } from '@/components/settings/ElectronicSignatureSettings'
import { ElectronicSignatureStatus } from '@/components/contracts/ElectronicSignatureStatus'
import { FileSignature } from 'lucide-react'

const ElectronicSignatureSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSignature className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">إعدادات التوقيع الإلكتروني</h1>
          <p className="text-muted-foreground">
            إدارة إعدادات التوقيع الإلكتروني للعقود
          </p>
        </div>
      </div>

      {/* Current Status */}
      <ElectronicSignatureStatus showDetails={true} />

      {/* Settings Configuration */}
      <ElectronicSignatureSettingsComponent />
    </div>
  )
}

export default ElectronicSignatureSettings
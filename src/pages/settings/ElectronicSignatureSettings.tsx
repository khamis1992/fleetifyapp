import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ElectronicSignatureSettings as ElectronicSignatureSettingsComponent } from '@/components/settings/ElectronicSignatureSettings'
import { ElectronicSignatureStatus } from '@/components/contracts/ElectronicSignatureStatus'
import { FileSignature } from 'lucide-react'

const ElectronicSignatureSettings: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-teal-500 rounded-xl shadow-sm">
          <FileSignature className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">إعدادات التوقيع الإلكتروني</h1>
          <p className="text-slate-600">
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
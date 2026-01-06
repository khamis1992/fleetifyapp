import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ElectronicSignatureSettings as ElectronicSignatureSettingsComponent } from '@/components/settings/ElectronicSignatureSettings'
import { ElectronicSignatureStatus } from '@/components/contracts/ElectronicSignatureStatus'
import { FileSignature } from 'lucide-react'

const ElectronicSignatureSettings: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg shadow-teal-500/20">
          <FileSignature className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إعدادات التوقيع الإلكتروني</h1>
          <p className="text-gray-600">
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
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { ContractSignature } from './ContractSignature'
import { useContractWizard } from './ContractWizardProvider'
import { useAuth } from '@/contexts/AuthContext'
import { Users, FileText, CheckCircle, Settings } from 'lucide-react'

export const ContractSignatureSection: React.FC = () => {
  const { user } = useAuth()
  const { data, updateData } = useContractWizard()
  const [customerSignature, setCustomerSignature] = useState(data.customer_signature || '')
  const [companySignature, setCompanySignature] = useState(data.company_signature || '')
  const [signatureEnabled, setSignatureEnabled] = useState(data.signature_enabled ?? true)

  const handleCustomerSignature = (signatureData: string) => {
    setCustomerSignature(signatureData)
    updateData({ customer_signature: signatureData })
  }

  const handleCompanySignature = (signatureData: string) => {
    setCompanySignature(signatureData)
    updateData({ company_signature: signatureData })
  }

  const handleSignatureToggle = (enabled: boolean) => {
    setSignatureEnabled(enabled)
    updateData({ signature_enabled: enabled })
    
    // Clear signatures if disabled
    if (!enabled) {
      setCustomerSignature('')
      setCompanySignature('')
      updateData({ customer_signature: '', company_signature: '' })
    }
  }

  const allSignaturesComplete = signatureEnabled && customerSignature && companySignature

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          توقيع العقد
          {allSignaturesComplete && <CheckCircle className="h-5 w-5 text-green-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Signature Toggle */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <h4 className="font-medium text-sm">تفعيل خاصية التوقيع</h4>
              <p className="text-xs text-muted-foreground">
                {signatureEnabled ? 'خاصية التوقيع مفعلة - يمكن التوقيع على العقد' : 'خاصية التوقيع معطلة - لن يتطلب العقد التوقيع'}
              </p>
            </div>
          </div>
          <Switch
            checked={signatureEnabled}
            onCheckedChange={handleSignatureToggle}
          />
        </div>

        {!signatureEnabled && (
          <Alert className="border-amber-200 bg-amber-50">
            <Settings className="h-4 w-4" />
            <AlertDescription>
              خاصية التوقيع معطلة. العقد لن يتطلب توقيع الأطراف.
            </AlertDescription>
          </Alert>
        )}

        {signatureEnabled && !allSignaturesComplete && (
          <Alert className="border-blue-200 bg-blue-50">
            <Users className="h-4 w-4" />
            <AlertDescription>
              يتطلب إتمام العقد توقيع كل من الطرفين. يرجى التوقيع في المربعات أدناه.
            </AlertDescription>
          </Alert>
        )}

        {signatureEnabled && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Customer Signature */}
            <ContractSignature
              title="توقيع العميل"
              signerName={data.customer_name || 'العميل'}
              signerRole="الطرف الأول"
              onSignature={handleCustomerSignature}
              signature={customerSignature}
              required={true}
            />

            {/* Company Representative Signature */}
            <ContractSignature
              title="توقيع الشركة"
              signerName={user?.profile?.first_name && user?.profile?.last_name 
                ? `${user.profile.first_name} ${user.profile.last_name}` 
                : 'ممثل الشركة'}
              signerRole="الطرف الثاني"
              onSignature={handleCompanySignature}
              signature={companySignature}
              required={true}
            />
          </div>
        )}

        {allSignaturesComplete && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              تم إكمال جميع التواقيع المطلوبة. العقد جاهز للحفظ والإرسال.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
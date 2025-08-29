import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { ContractSignature } from './ContractSignature'
import { useContractWizard } from './ContractWizardProvider'
import { useAuth } from '@/contexts/AuthContext'
import { useSignatureSettings } from '@/hooks/useSignatureSettings'
import { ElectronicSignatureStatus } from './ElectronicSignatureStatus'
import { Users, FileText, CheckCircle, Settings } from 'lucide-react'

export const ContractSignatureSection: React.FC = () => {
  const { user } = useAuth()
  const { data, updateData } = useContractWizard()
  const { data: signatureSettings, isLoading: settingsLoading } = useSignatureSettings()
  const [customerSignature, setCustomerSignature] = useState(data.customer_signature || '')
  const [companySignature, setCompanySignature] = useState(data.company_signature || '')
  
  // Use company settings instead of local state
  const signatureEnabled = signatureSettings?.electronic_signature_enabled ?? true
  const requireCustomerSignature = signatureSettings?.require_customer_signature ?? true
  const requireCompanySignature = signatureSettings?.require_company_signature ?? true

  // Update wizard data when settings change
  useEffect(() => {
    updateData({ signature_enabled: signatureEnabled })
  }, [signatureEnabled, updateData])

  const handleCustomerSignature = (signatureData: string) => {
    setCustomerSignature(signatureData)
    updateData({ customer_signature: signatureData })
  }

  const handleCompanySignature = (signatureData: string) => {
    setCompanySignature(signatureData)
    updateData({ company_signature: signatureData })
  }

  const allSignaturesComplete = signatureEnabled && 
    (!requireCustomerSignature || customerSignature) && 
    (!requireCompanySignature || companySignature)

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
        {/* Electronic Signature Status */}
        <ElectronicSignatureStatus showDetails={true} />

        {settingsLoading && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              جار تحميل إعدادات التوقيع الإلكتروني...
            </AlertDescription>
          </Alert>
        )}

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
            {requireCustomerSignature && (
              <ContractSignature
                title="توقيع العميل"
                signerName={data.customer_name || 'العميل'}
                signerRole="الطرف الأول"
                onSignature={handleCustomerSignature}
                signature={customerSignature}
                required={requireCustomerSignature}
              />
            )}

            {/* Company Representative Signature */}
            {requireCompanySignature && (
              <ContractSignature
                title="توقيع الشركة"
                signerName={user?.profile?.first_name && user?.profile?.last_name 
                  ? `${user.profile.first_name} ${user.profile.last_name}` 
                  : 'ممثل الشركة'}
                signerRole="الطرف الثاني"
                onSignature={handleCompanySignature}
                signature={companySignature}
                required={requireCompanySignature}
              />
            )}
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
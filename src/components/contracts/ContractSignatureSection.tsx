import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ContractSignature } from './ContractSignature'
import { useContractWizard } from './ContractWizardProvider_fixed'
import { useAuth } from '@/contexts/AuthContext'
import { Users, FileText, CheckCircle } from 'lucide-react'

export const ContractSignatureSection: React.FC = () => {
  const { user } = useAuth()
  const { data, updateData } = useContractWizard()
  const [customerSignature, setCustomerSignature] = useState(data.customer_signature || '')
  const [companySignature, setCompanySignature] = useState(data.company_signature || '')

  const handleCustomerSignature = (signatureData: string) => {
    setCustomerSignature(signatureData)
    updateData({ customer_signature: signatureData })
  }

  const handleCompanySignature = (signatureData: string) => {
    setCompanySignature(signatureData)
    updateData({ company_signature: signatureData })
  }

  const allSignaturesComplete = customerSignature && companySignature

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
        {!allSignaturesComplete && (
          <Alert className="border-blue-200 bg-blue-50">
            <Users className="h-4 w-4" />
            <AlertDescription>
              يتطلب إتمام العقد توقيع كل من الطرفين. يرجى التوقيع في المربعات أدناه.
            </AlertDescription>
          </Alert>
        )}

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
import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"
import { toast } from "sonner"
import { cleanPhone } from "@/lib/phone"

interface CSVUploadResults {
  total: number
  successful: number
  failed: number
  customersCreated?: number
  contractsCreated?: number
  errors: Array<{ row: number; message: string; customerName?: string }>
  warnings?: Array<{ row: number; message: string; customerName?: string }>
}

export function useContractCSVUploadFixed() {
  const { user, companyId } = useUnifiedCompanyAccess()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CSVUploadResults | null>(null)

  // دالة بسيطة للبحث عن العميل أو إنشاؤه
  const findOrCreateCustomer = async (customerName: string, targetCompanyId: string, phoneNumber?: string) => {
    try {
      const cleanName = customerName.trim()
      if (!cleanName) {
        return { id: '', created: false, error: 'اسم العميل فارغ' }
      }

      // البحث عن العميل الموجود
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', targetCompanyId)
        .or(`first_name.ilike.%${cleanName}%,last_name.ilike.%${cleanName}%,company_name.ilike.%${cleanName}%`)
        .limit(1)
        .maybeSingle()

      if (existingCustomer) {
        return { id: existingCustomer.id, created: false }
      }

      // إنشاء عميل جديد
      const isCompany = cleanName.includes('شركة') || cleanName.includes('Company')
      
      let cleanedPhone = phoneNumber ? cleanPhone(phoneNumber) : null
      if (!cleanedPhone || cleanedPhone.length < 8) {
        const timestamp = Date.now()
        cleanedPhone = `+965${timestamp.toString().slice(-8)}`
      }

      const customerData: any = {
        company_id: targetCompanyId,
        is_active: true,
        phone: cleanedPhone,
        created_by: user?.id
      }

      if (isCompany) {
        customerData.customer_type = 'corporate'
        customerData.company_name = cleanName
      } else {
        const nameParts = cleanName.split(' ')
        customerData.customer_type = 'individual'
        customerData.first_name = nameParts[0] || cleanName
        customerData.last_name = nameParts.slice(1).join(' ') || 'غير محدد'
      }

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select('id')
        .single()

      if (error) {
        return { id: '', created: false, error: error.message }
      }

      return { id: newCustomer.id, created: true }
    } catch (error: any) {
      return { id: '', created: false, error: error.message }
    }
  }

  return {
    isUploading,
    progress,
    results,
    findOrCreateCustomer
  }
}
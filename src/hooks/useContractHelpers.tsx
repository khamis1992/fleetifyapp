import { CheckCircle, Clock, AlertCircle, Pause, XCircle, RefreshCw, FileText } from 'lucide-react';

export const useContractHelpers = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'suspended': return 'bg-orange-100 text-orange-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'renewed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'draft': return <Clock className="h-4 w-4" />
      case 'expired': return <AlertCircle className="h-4 w-4" />
      case 'suspended': return <Pause className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      case 'renewed': return <RefreshCw className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  };

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'rent_to_own': return 'إيجار حتى التملك'
      case 'rental': return 'إيجار'
      case 'daily_rental': return 'إيجار يومي'
      case 'weekly_rental': return 'إيجار أسبوعي'
      case 'monthly_rental': return 'إيجار شهري'
      case 'yearly_rental': return 'إيجار سنوي'
      default: return 'إيجار'
    }
  };

  const getCustomerName = (customerData: any) => {
    if (!customerData) {
      return 'عميل غير محدد';
    }
    
    if (customerData.customer_type === 'individual') {
      const fullName = `${customerData.first_name_ar || ''} ${customerData.last_name_ar || ''}`.trim();
      return fullName || 'عميل غير محدد';
    } else {
      return customerData.company_name_ar || 'عميل غير محدد';
    }
  };

  return {
    getStatusColor,
    getStatusIcon,
    getContractTypeLabel,
    getCustomerName
  };
};
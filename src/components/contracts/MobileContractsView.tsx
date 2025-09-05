import React, { useState } from 'react';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { SwipeableCard } from '@/components/ui/swipeable-components';
import { ResponsiveCard, ResponsiveCardContent, ResponsiveCardHeader, ResponsiveCardTitle } from '@/components/ui/responsive-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  FileText,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  MoreVertical,
  ChevronLeft,
  Share2,
  Download,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileContractsViewProps {
  contracts: any[];
  onRenewContract: (contract: any) => void;
  onManageStatus: (contract: any) => void;
  onViewDetails: (contract: any) => void;
  onCancelContract: (contract: any) => void;
  onDeleteContract: (contract: any) => void;
  onCreateContract: () => void;
  onClearFilters: () => void;
  hasFilters: boolean;
  hasContracts: boolean;
}

export const MobileContractsView: React.FC<MobileContractsViewProps> = ({
  contracts,
  onRenewContract,
  onManageStatus,
  onViewDetails,
  onCancelContract,
  onDeleteContract,
  onCreateContract,
  onClearFilters,
  hasFilters,
  hasContracts
}) => {
  const { isMobile } = useSimpleBreakpoint();
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  if (!isMobile) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'نشط':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended':
      case 'معلق':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
      case 'منتهي':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
      case 'مسودة':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'نشط':
        return <CheckCircle className="h-3 w-3" />;
      case 'suspended':
      case 'معلق':
        return <AlertTriangle className="h-3 w-3" />;
      case 'expired':
      case 'منتهي':
        return <XCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '0 ريال';
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleSwipeLeft = (contract: any) => {
    // Quick actions on swipe left
    setSelectedContract(contract);
    setShowQuickActions(true);
  };

  const handleSwipeRight = (contract: any) => {
    // View details on swipe right
    onViewDetails(contract);
  };

  if (!hasContracts) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-6"
      >
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <FileText className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          لا توجد عقود
        </h3>
        <p className="text-gray-500 mb-6 max-w-sm">
          {hasFilters 
            ? "لم يتم العثور على عقود تطابق الفلاتر المحددة" 
            : "ابدأ بإنشاء عقدك الأول لإدارة أعمالك"
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {hasFilters && (
            <Button variant="outline" onClick={onClearFilters}>
              مسح الفلاتر
            </Button>
          )}
          <Button onClick={onCreateContract}>
            <Plus className="h-4 w-4 mr-2" />
            إنشاء عقد جديد
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {contracts.map((contract, index) => (
          <motion.div
            key={contract.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
          >
            <SwipeableCard
              onSwipeLeft={() => handleSwipeLeft(contract)}
              onSwipeRight={() => handleSwipeRight(contract)}
              leftActionIcon={<MoreVertical className="h-5 w-5" />}
              rightActionIcon={<Eye className="h-5 w-5" />}
              leftActionLabel="الإجراءات"
              rightActionLabel="عرض التفاصيل"
              leftActionColor="bg-blue-500"
              rightActionColor="bg-green-500"
              className="transition-all duration-200 hover:shadow-md active:scale-[0.98]"
            >
              <ResponsiveCard variant="outlined" className="border-l-4 border-l-primary">
                <ResponsiveCardContent className="p-4">
                  {/* Contract Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {contract.contract_number || `عقد #${contract.id}`}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getStatusColor(contract.status))}
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(contract.status)}
                            {contract.status === 'active' ? 'نشط' : 
                             contract.status === 'suspended' ? 'معلق' : 
                             contract.status === 'expired' ? 'منتهي' : 
                             contract.status || 'غير محدد'}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {contract.contract_type || 'نوع العقد غير محدد'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowQuickActions(true);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-3 mb-3 p-2 bg-gray-50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {contract.customer?.name_ar?.charAt(0) || 
                         contract.customer?.name?.charAt(0) || 'ع'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {contract.customer?.name_ar || contract.customer?.name || 'عميل غير محدد'}
                      </p>
                      {contract.customer?.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contract.customer.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contract Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">القيمة</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(contract.total_amount)}
                      </p>
                    </div>

                    <div className="bg-green-50 p-2 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600">تاريخ البداية</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(contract.start_date)}
                      </p>
                    </div>

                    <div className="bg-orange-50 p-2 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="h-3 w-3 text-orange-600" />
                        <span className="text-xs font-medium text-orange-600">تاريخ الانتهاء</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(contract.end_date)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-2 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <FileText className="h-3 w-3 text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">المدة</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {contract.duration_months || 0} شهر
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(contract)}
                      className="flex-1 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      عرض
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onManageStatus(contract)}
                      className="flex-1 text-xs"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      تحديث
                    </Button>
                  </div>
                </ResponsiveCardContent>
              </ResponsiveCard>
            </SwipeableCard>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Quick Actions Sheet */}
      <Sheet open={showQuickActions} onOpenChange={setShowQuickActions}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh]">
          <SheetHeader className="text-right">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              إجراءات العقد
              {selectedContract && (
                <Badge variant="outline" className="mr-auto">
                  {selectedContract.contract_number || `#${selectedContract.id}`}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          
          {selectedContract && (
            <div className="grid grid-cols-2 gap-3 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  onViewDetails(selectedContract);
                  setShowQuickActions(false);
                }}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <Eye className="h-5 w-5" />
                <span className="text-xs">عرض التفاصيل</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onManageStatus(selectedContract);
                  setShowQuickActions(false);
                }}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <Edit3 className="h-5 w-5" />
                <span className="text-xs">تعديل الحالة</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onRenewContract(selectedContract);
                  setShowQuickActions(false);
                }}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <CheckCircle className="h-5 w-5" />
                <span className="text-xs">تجديد العقد</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <Share2 className="h-5 w-5" />
                <span className="text-xs">مشاركة</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <Download className="h-5 w-5" />
                <span className="text-xs">تحميل PDF</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onCancelContract(selectedContract);
                  setShowQuickActions(false);
                }}
                className="flex flex-col items-center gap-2 h-auto py-4 text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <XCircle className="h-5 w-5" />
                <span className="text-xs">إلغاء العقد</span>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
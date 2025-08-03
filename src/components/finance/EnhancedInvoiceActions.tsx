import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Edit, 
  Trash2, 
  Package, 
  Car, 
  Users, 
  Scale,
  FileText,
  DollarSign,
  Building2,
  Wrench,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface EnhancedInvoiceActionsProps {
  invoice: any;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPay?: () => void;
}

export function EnhancedInvoiceActions({ 
  invoice, 
  onPreview, 
  onEdit, 
  onDelete,
  onPay 
}: EnhancedInvoiceActionsProps) {
  const navigate = useNavigate();

  const getRelatedBadges = () => {
    const badges = [];
    
    if (invoice.contract_id) {
      badges.push(
        <Badge key="contract" variant="outline" className="text-purple-600 border-purple-200">
          <Scale className="h-3 w-3 mr-1" />
          عقد
        </Badge>
      );
    }
    
    if (invoice.vehicle_id) {
      badges.push(
        <Badge key="vehicle" variant="outline" className="text-blue-600 border-blue-200">
          <Car className="h-3 w-3 mr-1" />
          مركبة
        </Badge>
      );
    }
    
    if (invoice.customer_id) {
      badges.push(
        <Badge key="customer" variant="outline" className="text-green-600 border-green-200">
          <Users className="h-3 w-3 mr-1" />
          عميل
        </Badge>
      );
    }
    
    if (invoice.fixed_asset_id) {
      badges.push(
        <Badge key="asset" variant="outline" className="text-orange-600 border-orange-200">
          <Package className="h-3 w-3 mr-1" />
          أصل ثابت
        </Badge>
      );
    }
    
    if (invoice.maintenance_id) {
      badges.push(
        <Badge key="maintenance" variant="outline" className="text-red-600 border-red-200">
          <Wrench className="h-3 w-3 mr-1" />
          صيانة
        </Badge>
      );
    }

    return badges;
  };

  const handleQuickNavigation = (type: string) => {
    switch (type) {
      case 'contract':
        if (invoice.contract_id) {
          navigate(`/contracts?contract=${invoice.contract_id}`);
        }
        break;
      case 'vehicle':
        if (invoice.vehicle_id) {
          navigate(`/fleet?vehicle=${invoice.vehicle_id}`);
        }
        break;
      case 'customer':
        if (invoice.customer_id) {
          navigate(`/customers?customer=${invoice.customer_id}`);
        }
        break;
      case 'maintenance':
        if (invoice.maintenance_id) {
          navigate(`/fleet/maintenance?maintenance=${invoice.maintenance_id}`);
        }
        break;
      case 'asset':
        if (invoice.fixed_asset_id) {
          navigate(`/finance/fixed-assets?asset=${invoice.fixed_asset_id}`);
        }
        break;
      case 'payments':
        navigate(`/finance/payments?invoice=${invoice.id}`);
        break;
      case 'journal':
        if (invoice.journal_entry_id) {
          navigate(`/finance/general-ledger?entry=${invoice.journal_entry_id}`);
        }
        break;
      case 'pay':
        onPay?.();
        break;
    }
  };

  return (
    <div className="space-y-2">
      {/* Related Data Badges */}
      {getRelatedBadges().length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getRelatedBadges()}
        </div>
      )}
      
      {/* Pay Button - Show for unpaid and partially paid invoices */}
      {onPay && invoice.payment_status !== 'paid' && (
        <Button 
          variant="default" 
          size="sm"
          onClick={() => handleQuickNavigation('pay')}
          title="دفع الفاتورة"
          className="bg-green-600 hover:bg-green-700 text-white mr-2"
        >
          <DollarSign className="h-4 w-4 ml-1" />
          دفع
        </Button>
      )}

      {/* Main Actions */}
      <div className="flex gap-2">        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onPreview}
          title="معاينة الفاتورة"
        >
          <Eye className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onEdit}
          title="تعديل الفاتورة"
        >
          <Edit className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onDelete}
          title="حذف الفاتورة"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Navigation Actions */}
      <div className="flex flex-wrap gap-1">
        {invoice.contract_id && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleQuickNavigation('contract')}
            title="عرض العقد المرتبط"
            className="text-purple-600 hover:text-purple-700"
          >
            <Scale className="h-3 w-3" />
          </Button>
        )}
        
        {invoice.vehicle_id && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleQuickNavigation('vehicle')}
            title="عرض المركبة المرتبطة"
            className="text-blue-600 hover:text-blue-700"
          >
            <Car className="h-3 w-3" />
          </Button>
        )}
        
        {invoice.customer_id && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleQuickNavigation('customer')}
            title="عرض العميل المرتبط"
            className="text-green-600 hover:text-green-700"
          >
            <Users className="h-3 w-3" />
          </Button>
        )}
        
        {invoice.maintenance_id && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleQuickNavigation('maintenance')}
            title="عرض الصيانة المرتبطة"
            className="text-red-600 hover:text-red-700"
          >
            <Wrench className="h-3 w-3" />
          </Button>
        )}
        
        {invoice.fixed_asset_id && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleQuickNavigation('asset')}
            title="عرض الأصل الثابت المرتبط"
            className="text-orange-600 hover:text-orange-700"
          >
            <Package className="h-3 w-3" />
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleQuickNavigation('payments')}
          title="عرض المدفوعات المرتبطة"
          className="text-yellow-600 hover:text-yellow-700"
        >
          <DollarSign className="h-3 w-3" />
        </Button>
        
        {invoice.journal_entry_id && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleQuickNavigation('journal')}
            title="عرض القيد المحاسبي"
            className="text-indigo-600 hover:text-indigo-700"
          >
            <FileText className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
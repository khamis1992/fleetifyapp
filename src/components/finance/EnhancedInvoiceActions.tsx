
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Edit, 
  Trash2, 
  Package, 
  Car, 
  FileText,
  DollarSign,
  Building2,
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
    
    
    if (invoice.vehicle_id) {
      badges.push(
        <Badge key="vehicle" variant="outline" className="text-blue-600 border-blue-200">
          <Car className="h-3 w-3 mr-1" />
          مركبة
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

    return badges;
  };

  const handleQuickNavigation = (type: string) => {
    switch (type) {
      case 'vehicle':
        if (invoice.vehicle_id) {
          navigate(`/fleet?vehicle=${invoice.vehicle_id}`);
        }
        break;
      case 'asset':
        if (invoice.fixed_asset_id) {
          navigate(`/finance/fixed-assets?asset=${invoice.fixed_asset_id}`);
        }
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
      
      {/* Pay Button - Show for unpaid and partially paid invoices that are sent */}
      {(() => {
        console.log('Pay button conditions:', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          hasOnPay: !!onPay,
          paymentStatus: invoice.payment_status,
          status: invoice.status,
          balanceDue: invoice.balance_due,
          shouldShow: onPay && invoice.payment_status !== 'paid' && invoice.status !== 'draft' && invoice.status !== 'cancelled'
        });
        return null;
      })()}
      {onPay && (
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

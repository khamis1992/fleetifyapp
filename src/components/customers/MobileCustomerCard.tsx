import React from "react";
import { Building, Users, Phone, Mail, MapPin, UserX, Edit, Eye, ShieldX, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CustomerDisplayName } from "./CustomerDisplayName";
import { Customer } from "@/types/customer";

interface MobileCustomerCardProps {
  customer: Customer;
  onView: (id: string) => void;
  onEdit: (customer: Customer) => void;
  onToggleBlacklist: (id: string, isBlacklisted: boolean) => void;
  onDelete: (customer: Customer) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const MobileCustomerCard: React.FC<MobileCustomerCardProps> = ({
  customer,
  onView,
  onEdit,
  onToggleBlacklist,
  onDelete,
  canEdit = true,
  canDelete = false
}) => {
  return (
    <Card className="mobile-customer-card hover:shadow-lg transition-all duration-200 border-border/50 active:scale-[0.98] touch-manipulation bg-white rounded-xl shadow-sm mb-3">
      <CardContent className="p-4 space-y-3">
        {/* Header with customer info and actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0 mt-1">
              {customer.customer_type === 'corporate' ? (
                <Building className="h-5 w-5 text-primary" />
              ) : (
                <Users className="h-5 w-5 text-secondary" />
              )}
            </div>
            
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CustomerDisplayName 
                  customer={customer} 
                  showBadges={false}
                  className="customer-name font-semibold text-base leading-tight"
                />
                {customer.is_blacklisted && (
                  <Badge variant="destructive" className="text-xs">
                    <UserX className="h-3 w-3 mr-1" />
                    محظور
                  </Badge>
                )}
              </div>
              
              {customer.customer_code && (
                <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded inline-block">
                  {customer.customer_code}
                </div>
              )}
            </div>
          </div>
          
          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 w-10 p-0 rounded-xl touch-manipulation active:scale-95 transition-transform"
              >
                <MoreVertical className="h-5 w-5" />
                <span className="sr-only">المزيد من الإجراءات</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2">
              <DropdownMenuItem 
                onClick={() => onView(customer.id)}
                className="h-11 rounded-lg font-medium gap-3 cursor-pointer touch-manipulation"
              >
                <Eye className="h-4 w-4" />
                عرض التفاصيل
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem 
                  onClick={() => onEdit(customer)}
                  className="h-11 rounded-lg font-medium gap-3 cursor-pointer touch-manipulation"
                >
                  <Edit className="h-4 w-4" />
                  تعديل البيانات
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem 
                  onClick={() => onToggleBlacklist(customer.id, !customer.is_blacklisted)}
                  className="h-11 rounded-lg font-medium gap-3 cursor-pointer touch-manipulation"
                >
                  <ShieldX className="h-4 w-4" />
                  {customer.is_blacklisted ? 'إلغاء الحظر' : 'إضافة للحظر'}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(customer)}
                  className="h-11 rounded-lg font-medium gap-3 cursor-pointer touch-manipulation text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف العميل
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Contact information */}
        <div className="space-y-2">
          {/* Phone */}
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span dir="ltr" className="font-medium">{customer.phone}</span>
          </div>
          
          {/* Email */}
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          
          {/* Location */}
          {customer.city && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{customer.city}</span>
            </div>
          )}
        </div>
        
        {/* Notes */}
        {customer.notes && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {customer.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
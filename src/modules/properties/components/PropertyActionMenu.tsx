import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Download,
  Share,
  FileText,
  Camera,
} from 'lucide-react';
import { Property } from '../types';

interface PropertyActionMenuProps {
  property: Property;
  onView?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onDuplicate?: (property: Property) => void;
  onExport?: (property: Property) => void;
  onShare?: (property: Property) => void;
  onGenerateReport?: (property: Property) => void;
  onManageImages?: (property: Property) => void;
  isLoading?: boolean;
}

export const PropertyActionMenu: React.FC<PropertyActionMenuProps> = ({
  property,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onShare,
  onGenerateReport,
  onManageImages,
  isLoading = false,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-8 w-8 p-0"
          disabled={isLoading}
        >
          <span className="sr-only">فتح قائمة الإجراءات</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* إجراءات العرض */}
        {onView && (
          <DropdownMenuItem onClick={() => onView(property)}>
            <Eye className="mr-2 h-4 w-4" />
            عرض التفاصيل
          </DropdownMenuItem>
        )}

        {/* إجراءات التعديل */}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(property)}>
            <Edit className="mr-2 h-4 w-4" />
            تعديل العقار
          </DropdownMenuItem>
        )}

        {/* إدارة الصور */}
        {onManageImages && (
          <DropdownMenuItem onClick={() => onManageImages(property)}>
            <Camera className="mr-2 h-4 w-4" />
            إدارة الصور
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* إجراءات النسخ والتصدير */}
        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(property)}>
            <Copy className="mr-2 h-4 w-4" />
            نسخ العقار
          </DropdownMenuItem>
        )}

        {onExport && (
          <DropdownMenuItem onClick={() => onExport(property)}>
            <Download className="mr-2 h-4 w-4" />
            تصدير البيانات
          </DropdownMenuItem>
        )}

        {onShare && (
          <DropdownMenuItem onClick={() => onShare(property)}>
            <Share className="mr-2 h-4 w-4" />
            مشاركة العقار
          </DropdownMenuItem>
        )}

        {onGenerateReport && (
          <DropdownMenuItem onClick={() => onGenerateReport(property)}>
            <FileText className="mr-2 h-4 w-4" />
            تقرير العقار
          </DropdownMenuItem>
        )}

        {/* إجراء الحذف */}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  حذف العقار
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد حذف العقار</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف العقار "{property.property_name}"؟
                    <br />
                    <span className="text-sm text-muted-foreground mt-2 block">
                      رقم العقار: {property.property_code}
                    </span>
                    <br />
                    <strong className="text-red-600">
                      هذا الإجراء لا يمكن التراجع عنه وسيتم حذف العقار نهائياً من النظام.
                    </strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(property)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    حذف العقار
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
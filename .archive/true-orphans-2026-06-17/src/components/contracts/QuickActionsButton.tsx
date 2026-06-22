/**
 * مكون زر الإجراءات السريعة العائم
 * توفير اختصارات للإجراءات المتكررة
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  AlertCircle,
  DollarSign,
  FileText,
  Printer,
  Edit,
  Download,
} from 'lucide-react';

interface QuickActionsButtonProps {
  onAddViolation?: () => void;
  onRecordPayment?: () => void;
  onPrintStatement?: () => void;
  onCreateInvoice?: () => void;
  onEditContract?: () => void;
  onDownloadContract?: () => void;
}

export const QuickActionsButton = ({
  onAddViolation,
  onRecordPayment,
  onPrintStatement,
  onCreateInvoice,
  onEditContract,
  onDownloadContract,
}: QuickActionsButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      icon: <DollarSign className="w-4 h-4" />,
      label: 'تسجيل دفعة',
      onClick: onRecordPayment,
      color: 'text-green-600',
    },
    {
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'إضافة مخالفة',
      onClick: onAddViolation,
      color: 'text-red-600',
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: 'إنشاء فاتورة',
      onClick: onCreateInvoice,
      color: 'text-blue-600',
    },
    {
      icon: <Printer className="w-4 h-4" />,
      label: 'طباعة كشف حساب',
      onClick: onPrintStatement,
      color: 'text-purple-600',
    },
    {
      icon: <Edit className="w-4 h-4" />,
      label: 'تعديل العقد',
      onClick: onEditContract,
      color: 'text-orange-600',
    },
    {
      icon: <Download className="w-4 h-4" />,
      label: 'تحميل العقد',
      onClick: onDownloadContract,
      color: 'text-indigo-600',
    },
  ].filter(action => action.onClick);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-right">الإجراءات السريعة</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => {
                action.onClick?.();
                setIsOpen(false);
              }}
              className="cursor-pointer flex items-center gap-3 py-2"
            >
              <span className={action.color}>{action.icon}</span>
              <span className="text-right flex-1">{action.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

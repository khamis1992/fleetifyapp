import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Command } from 'lucide-react';
import { toast } from 'sonner';

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
    action?: () => void;
  }[];
}

export const KeyboardShortcuts: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'التنقل العام',
      shortcuts: [
        {
          keys: ['Ctrl', 'K'],
          description: 'البحث السريع',
        },
        {
          keys: ['Alt', 'H'],
          description: 'الصفحة الرئيسية',
          action: () => navigate('/dashboard')
        },
        {
          keys: ['Alt', 'S'],
          description: 'الإعدادات',
          action: () => navigate('/settings')
        },
        {
          keys: ['Alt', 'P'],
          description: 'الملف الشخصي',
          action: () => navigate('/profile')
        },
        {
          keys: ['?'],
          description: 'عرض اختصارات لوحة المفاتيح',
          action: () => setShowHelp(true)
        }
      ]
    },
    {
      title: 'إدارة الأسطول',
      shortcuts: [
        {
          keys: ['Alt', 'F'],
          description: 'إدارة الأسطول',
          action: () => navigate('/fleet')
        },
        {
          keys: ['Alt', 'M'],
          description: 'الصيانة',
          action: () => navigate('/fleet/maintenance')
        },
        {
          keys: ['Alt', 'V'],
          description: 'المخالفات المرورية',
          action: () => navigate('/fleet/traffic-violations')
        }
      ]
    },
    {
      title: 'العملاء والعقود',
      shortcuts: [
        {
          keys: ['Alt', 'C'],
          description: 'العملاء',
          action: () => navigate('/customers')
        },
        {
          keys: ['Alt', 'O'],
          description: 'العقود',
          action: () => navigate('/contracts')
        },
        {
          keys: ['Alt', 'Q'],
          description: 'عروض الأسعار',
          action: () => navigate('/quotations')
        }
      ]
    },
    {
      title: 'المالية',
      shortcuts: [
        {
          keys: ['Alt', 'F', 'I'],
          description: 'الفواتير',
          action: () => navigate('/finance/invoices')
        },
        {
          keys: ['Alt', 'F', 'P'],
          description: 'المدفوعات',
          action: () => navigate('/finance/payments')
        },
        {
          keys: ['Alt', 'F', 'R'],
          description: 'التقارير المالية',
          action: () => navigate('/finance/reports')
        }
      ]
    },
    {
      title: 'الموارد البشرية',
      shortcuts: [
        {
          keys: ['Alt', 'E'],
          description: 'الموظفون',
          action: () => navigate('/hr/employees')
        },
        {
          keys: ['Alt', 'A'],
          description: 'الحضور والانصراف',
          action: () => navigate('/hr/attendance')
        },
        {
          keys: ['Alt', 'R'],
          description: 'الرواتب',
          action: () => navigate('/hr/payroll')
        }
      ]
    },
    {
      title: 'اختصارات عامة',
      shortcuts: [
        {
          keys: ['Esc'],
          description: 'إغلاق النوافذ المنبثقة'
        },
        {
          keys: ['Ctrl', 'S'],
          description: 'حفظ (في النماذج)'
        },
        {
          keys: ['Ctrl', 'N'],
          description: 'إنشاء جديد (حسب السياق)'
        },
        {
          keys: ['Ctrl', 'E'],
          description: 'تعديل (حسب السياق)'
        },
        {
          keys: ['Del'],
          description: 'حذف العنصر المحدد'
        }
      ]
    }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show help with ?
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Navigation shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        
        switch (e.key.toLowerCase()) {
          case 'h':
            navigate('/dashboard');
            toast.success('انتقل إلى الصفحة الرئيسية');
            break;
          case 's':
            navigate('/settings');
            toast.success('انتقل إلى الإعدادات');
            break;
          case 'p':
            navigate('/profile');
            toast.success('انتقل إلى الملف الشخصي');
            break;
          case 'f':
            navigate('/fleet');
            toast.success('انتقل إلى إدارة الأسطول');
            break;
          case 'm':
            navigate('/fleet/maintenance');
            toast.success('انتقل إلى الصيانة');
            break;
          case 'v':
            navigate('/fleet/traffic-violations');
            toast.success('انتقل إلى المخالفات المرورية');
            break;
          case 'c':
            navigate('/customers');
            toast.success('انتقل إلى العملاء');
            break;
          case 'o':
            navigate('/contracts');
            toast.success('انتقل إلى العقود');
            break;
          case 'q':
            navigate('/quotations');
            toast.success('انتقل إلى عروض الأسعار');
            break;
          case 'e':
            navigate('/hr/employees');
            toast.success('انتقل إلى الموظفون');
            break;
          case 'a':
            navigate('/hr/attendance');
            toast.success('انتقل إلى الحضور والانصراف');
            break;
          case 'r':
            navigate('/hr/payroll');
            toast.success('انتقل إلى الرواتب');
            break;
        }
      }

      // Close dialogs with Escape
      if (e.key === 'Escape') {
        setShowHelp(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const KeyBadge: React.FC<{ keys: string[] }> = ({ keys }) => (
    <div className="flex gap-1 items-center">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">
            {key}
          </Badge>
          {index < keys.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            اختصارات لوحة المفاتيح
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <KeyBadge keys={shortcut.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Command className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-2">نصائح للاستخدام:</p>
              <ul className="space-y-1 text-xs">
                <li>• استخدم <Badge variant="outline" className="mx-1">Ctrl + K</Badge> للبحث السريع في أي وقت</li>
                <li>• اضغط <Badge variant="outline" className="mx-1">?</Badge> لعرض هذه القائمة</li>
                <li>• اضغط <Badge variant="outline" className="mx-1">Esc</Badge> لإغلاق أي نافذة منبثقة</li>
                <li>• استخدم <Badge variant="outline" className="mx-1">Alt</Badge> مع الحروف للتنقل السريع</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
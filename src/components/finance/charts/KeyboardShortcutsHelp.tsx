import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Keyboard, 
  Search, 
  Maximize2, 
  Minimize2, 
  BarChart3, 
  X,
  Command,
  Option
} from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ onClose }) => {
  const shortcuts = [
    {
      category: 'التنقل والبحث',
      items: [
        { keys: ['Ctrl', 'F'], description: 'التركيز على حقل البحث', icon: Search },
        { keys: ['Esc'], description: 'إلغاء التحديد/إغلاق النوافذ', icon: X },
      ]
    },
    {
      category: 'إدارة العرض',
      items: [
        { keys: ['Ctrl', 'E'], description: 'توسيع جميع العقد', icon: Maximize2 },
        { keys: ['Ctrl', 'W'], description: 'طي جميع العقد', icon: Minimize2 },
        { keys: ['Ctrl', 'S'], description: 'إظهار/إخفاء لوحة الإحصائيات', icon: BarChart3 },
      ]
    },
    {
      category: 'المساعدة',
      items: [
        { keys: ['Ctrl', '?'], description: 'إظهار/إخفاء هذه المساعدة', icon: Keyboard },
      ]
    }
  ];

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'Cmd' : 'Ctrl';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2" dir="rtl">
            <Keyboard className="h-5 w-5" />
            اختصارات لوحة المفاتيح
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6" dir="rtl">
          {shortcuts.map((category, index) => (
            <div key={index} className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, itemIndex) => (
                  <div 
                    key={itemIndex}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <Badge variant="outline" className="font-mono text-xs px-2">
                            {key === 'Ctrl' ? modifierKey : key}
                          </Badge>
                          {keyIndex < item.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs mx-1">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {index < shortcuts.length - 1 && <Separator />}
            </div>
          ))}
          
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {isMac ? <Command className="h-4 w-4" /> : <span className="font-mono">Ctrl</span>}
              <span>
                {isMac 
                  ? 'استخدم مفتاح Command (⌘) بدلاً من Ctrl على نظام Mac'
                  : 'استخدم مفتاح Ctrl مع المفاتيح المذكورة'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface PageHelpProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * مكون المساعدة العام للصفحات
 * يعرض زر مساعدة ثابت في الزاوية السفلية اليسرى من الصفحة
 * عند الضغط عليه يفتح لوحة جانبية بمحتوى المساعدة
 */
export const PageHelp: React.FC<PageHelpProps> = ({ title, description, children }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 text-white z-50 flex items-center justify-center transition-all duration-200 hover:scale-110"
          size="icon"
        >
          <HelpCircle className="h-7 w-7" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="text-right">
          <SheetTitle className="text-2xl font-bold flex items-center justify-end gap-2">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="text-right text-base">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
};

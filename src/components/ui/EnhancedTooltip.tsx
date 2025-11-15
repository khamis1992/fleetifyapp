import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Info, ExternalLink, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPIDefinition {
  title: string;
  formula?: string;
  example?: string;
  description?: string;
  learnMoreUrl?: string;
}

interface EnhancedTooltipProps {
  children: React.ReactNode;
  kpi?: KPIDefinition;
  content?: React.ReactNode;
  title?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  icon?: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export const EnhancedTooltip: React.FC<EnhancedTooltipProps> = ({
  children,
  kpi,
  content,
  title,
  side = 'top',
  align = 'center',
  icon,
  className,
  interactive = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // If KPI definition is provided, render enhanced KPI tooltip
  if (kpi) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip open={isOpen} onOpenChange={setIsOpen}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 cursor-help group"
              onClick={(e) => {
                if (interactive) {
                  e.preventDefault();
                  setIsOpen(!isOpen);
                }
              }}
            >
              {children}
              {icon || (
                <HelpCircle className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side={side}
            align={align}
            className={cn('max-w-sm p-0 overflow-hidden', className)}
            sideOffset={8}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-3"
            >
              {/* Title */}
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{kpi.title}</h4>
                  {kpi.description && (
                    <p className="text-xs text-muted-foreground">{kpi.description}</p>
                  )}
                </div>
              </div>

              {/* Formula */}
              {kpi.formula && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">الصيغة:</p>
                    <code className="block text-xs bg-muted/50 p-2 rounded-md font-mono text-foreground">
                      {kpi.formula}
                    </code>
                  </div>
                </>
              )}

              {/* Example */}
              {kpi.example && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">مثال:</p>
                    <p className="text-xs bg-muted/30 p-2 rounded-md text-foreground">
                      {kpi.example}
                    </p>
                  </div>
                </>
              )}

              {/* Learn More Link */}
              {kpi.learnMoreUrl && (
                <>
                  <Separator />
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => window.open(kpi.learnMoreUrl, '_blank')}
                  >
                    اعرف المزيد
                    <ExternalLink className="h-3 w-3 mr-1" />
                  </Button>
                </>
              )}
            </motion.div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Regular tooltip with optional title
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn('max-w-xs', className)}
          sideOffset={5}
        >
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {title && (
                <>
                  <p className="font-semibold text-sm mb-1">{title}</p>
                  <Separator className="my-2" />
                </>
              )}
              <div className="text-xs">{content}</div>
            </motion.div>
          </AnimatePresence>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Predefined KPI definitions for common metrics
export const kpiDefinitions: Record<string, KPIDefinition> = {
  clv: {
    title: 'القيمة الدائمة للعميل (CLV)',
    description: 'إجمالي الإيرادات المتوقعة من العميل طوال علاقته مع الشركة',
    formula: 'CLV = متوسط قيمة الصفقة × عدد الصفقات × مدة العلاقة',
    example: 'إذا كان متوسط الصفقة 1000 ر.س، والعميل يشتري 5 مرات سنوياً، لمدة 3 سنوات = 15,000 ر.س',
  },
  occupancyRate: {
    title: 'معدل الإشغال',
    description: 'نسبة الوحدات المؤجرة من إجمالي الوحدات المتاحة',
    formula: 'معدل الإشغال = (الوحدات المؤجرة ÷ إجمالي الوحدات) × 100',
    example: 'إذا كان لديك 80 وحدة مؤجرة من أصل 100 وحدة = 80% معدل إشغال',
  },
  roi: {
    title: 'العائد على الاستثمار (ROI)',
    description: 'نسبة الربح مقارنة بالاستثمار الأولي',
    formula: 'ROI = ((الإيرادات - التكاليف) ÷ التكاليف) × 100',
    example: 'إذا كانت التكلفة 100,000 ر.س والإيرادات 150,000 ر.س = 50% عائد',
  },
  grossMargin: {
    title: 'هامش الربح الإجمالي',
    description: 'نسبة الربح من المبيعات بعد خصم تكلفة البضاعة المباعة',
    formula: 'هامش الربح = ((المبيعات - التكلفة) ÷ المبيعات) × 100',
    example: 'مبيعات 100,000 ر.س وتكلفة 60,000 ر.س = 40% هامش ربح',
  },
  conversionRate: {
    title: 'معدل التحويل',
    description: 'نسبة العملاء المحتملين الذين يتحولون إلى عملاء فعليين',
    formula: 'معدل التحويل = (العملاء الجدد ÷ العملاء المحتملين) × 100',
    example: 'إذا كان لديك 200 عميل محتمل و 50 منهم اشتروا = 25% معدل تحويل',
  },
  utilizationRate: {
    title: 'معدل الاستخدام',
    description: 'نسبة استخدام الأصول من إجمالي الوقت المتاح',
    formula: 'معدل الاستخدام = (ساعات الاستخدام ÷ ساعات العمل الكلية) × 100',
    example: 'إذا تم استخدام المركبة 20 يوم من أصل 30 يوم = 67% معدل استخدام',
  },
  churnRate: {
    title: 'معدل فقدان العملاء',
    description: 'نسبة العملاء الذين توقفوا عن التعامل مع الشركة',
    formula: 'معدل الفقدان = (العملاء المفقودين ÷ إجمالي العملاء) × 100',
    example: 'إذا فقدت 5 عملاء من أصل 100 عميل = 5% معدل فقدان',
  },
  averageRevenue: {
    title: 'متوسط الإيرادات',
    description: 'متوسط قيمة الإيرادات لكل صفقة أو عميل',
    formula: 'متوسط الإيرادات = إجمالي الإيرادات ÷ عدد الصفقات',
    example: 'إيرادات 500,000 ر.س من 50 صفقة = 10,000 ر.س متوسط',
  },
};

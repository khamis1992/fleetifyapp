import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Zap, 
  Filter, 
  SortAsc, 
  Eye, 
  Search,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileQuickActionsProps {
  totalContracts: number;
  activeContracts: number;
  draftContracts: number;
  onQuickFilter: (filter: string) => void;
  onSort: (sortBy: string) => void;
  onSearch: () => void;
  activeFilter?: string;
}

export const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({
  totalContracts,
  activeContracts,
  draftContracts,
  onQuickFilter,
  onSort,
  onSearch,
  activeFilter
}) => {
  const [showQuickActions, setShowQuickActions] = useState(false);

  const quickFilters = [
    {
      id: 'all',
      label: 'جميع العقود',
      icon: FileText,
      count: totalContracts,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'active',
      label: 'العقود النشطة',
      icon: CheckCircle,
      count: activeContracts,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'draft',
      label: 'المسودات',
      icon: Clock,
      count: draftContracts,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 'expiring',
      label: 'قاربت على الانتهاء',
      icon: AlertTriangle,
      count: Math.floor(activeContracts * 0.2), // Estimated
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const sortOptions = [
    { id: 'date', label: 'تاريخ الإنشاء', icon: Calendar },
    { id: 'amount', label: 'القيمة', icon: TrendingUp },
    { id: 'status', label: 'الحالة', icon: CheckCircle },
    { id: 'customer', label: 'اسم العميل', icon: Eye }
  ];

  return (
    <>
      {/* Quick Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b"
      >
        <div className="flex items-center gap-2 p-3">
          {/* Quick Filters */}
          <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
            {quickFilters.slice(0, 3).map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilter === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => onQuickFilter(filter.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap text-xs",
                  activeFilter === filter.id && "shadow-sm"
                )}
              >
                <filter.icon className="h-3 w-3" />
                <span>{filter.label}</span>
                <Badge 
                  variant="secondary" 
                  className="h-4 px-1 text-xs"
                >
                  {filter.count}
                </Badge>
              </Button>
            ))}
          </div>

          {/* More Actions Button */}
          <Sheet open={showQuickActions} onOpenChange={setShowQuickActions}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="p-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh]">
              <SheetHeader className="text-right mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  إجراءات سريعة
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {/* All Quick Filters */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-right">فلترة سريعة</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {quickFilters.map((filter) => (
                      <motion.div
                        key={filter.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="outline"
                          onClick={() => {
                            onQuickFilter(filter.id);
                            setShowQuickActions(false);
                          }}
                          className={cn(
                            "w-full h-auto p-3 flex flex-col items-center gap-2",
                            activeFilter === filter.id && "ring-2 ring-primary",
                            filter.bgColor
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-full bg-white/80 flex items-center justify-center",
                          )}>
                            <filter.icon className={cn("h-4 w-4", filter.color)} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-900">
                              {filter.label}
                            </p>
                            <p className="text-lg font-bold text-gray-900">
                              {filter.count}
                            </p>
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Sort Options */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-right">ترتيب حسب</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {sortOptions.map((option) => (
                      <Button
                        key={option.id}
                        variant="outline"
                        onClick={() => {
                          onSort(option.id);
                          setShowQuickActions(false);
                        }}
                        className="flex items-center gap-2 h-auto py-3"
                      >
                        <option.icon className="h-4 w-4" />
                        <span className="text-sm">{option.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Additional Actions */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-right">إجراءات أخرى</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        onSearch();
                        setShowQuickActions(false);
                      }}
                      className="w-full flex items-center gap-2 justify-start"
                    >
                      <Search className="h-4 w-4" />
                      بحث متقدم
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2 justify-start"
                    >
                      <SortAsc className="h-4 w-4" />
                      ترتيب مخصص
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>
    </>
  );
};
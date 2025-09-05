import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MobileTabsNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  showAllTabs?: boolean;
}

export const MobileTabsNavigation: React.FC<MobileTabsNavigationProps> = ({
  activeTab,
  onTabChange,
  showAllTabs = false
}) => {
  const tabs = [
    { value: "all", label: "الكل", shortLabel: "الكل" },
    { value: "active", label: "النشطة", shortLabel: "نشطة" },
    { value: "suspended", label: "المعلقة", shortLabel: "معلقة" },
    ...(showAllTabs ? [
      { value: "expired", label: "المنتهية", shortLabel: "منتهية" },
      { value: "alerts", label: "التنبيهات", shortLabel: "تنبيهات" }
    ] : [])
  ];

  return (
    <div className="w-full overflow-x-auto scrollbar-hide pb-2">
      <TabsList className="grid h-12 w-full min-w-max grid-cols-3 gap-1 p-1 bg-muted/50 rounded-xl">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "h-10 px-6 text-sm font-medium rounded-lg transition-all duration-200",
              "data-[state=active]:bg-background data-[state=active]:shadow-sm",
              "data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground",
              "hover:text-foreground whitespace-nowrap min-w-0"
            )}
          >
            <span className="truncate">{tab.shortLabel}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      
      {/* Swipe Hint */}
      <div className="flex justify-center mt-2">
        <div className="text-xs text-muted-foreground/60">
          اسحب يميناً أو يساراً للتنقل
        </div>
      </div>
    </div>
  );
};
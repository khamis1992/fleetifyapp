import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MobileTabsSwipeProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  className?: string;
}

const tabs = [
  { value: 'all', label: 'الكل' },
  { value: 'active', label: 'النشطة' },
  { value: 'suspended', label: 'المعلقة' }
];

export const MobileTabsSwipe: React.FC<MobileTabsSwipeProps> = ({
  activeTab,
  onTabChange,
  children,
  className
}) => {
  const controls = useAnimation();
  const constraintsRef = useRef(null);
  
  const currentIndex = tabs.findIndex(tab => tab.value === activeTab);
  
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    // Determine swipe direction
    if (Math.abs(velocity) > 500 || Math.abs(offset) > threshold) {
      if (velocity > 0 || offset > 0) {
        // Swipe right - go to previous tab
        if (currentIndex > 0) {
          onTabChange(tabs[currentIndex - 1].value);
        }
      } else {
        // Swipe left - go to next tab
        if (currentIndex < tabs.length - 1) {
          onTabChange(tabs[currentIndex + 1].value);
        }
      }
    }
    
    // Reset position
    controls.start({ x: 0 });
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
        {/* Enhanced Tab List with Swipe Indicator */}
        <div className="relative">
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="grid grid-cols-3 min-w-max gap-1 bg-gray-100/50 backdrop-blur-sm">
              {tabs.map((tab, index) => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "relative text-xs px-4 py-2.5 transition-all duration-200",
                    "data-[state=active]:bg-white data-[state=active]:shadow-sm",
                    "data-[state=active]:text-primary font-medium"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.value && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          {/* Swipe Hint */}
          <div className="flex justify-center mt-2">
            <div className="flex items-center gap-1">
              {tabs.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1 rounded-full transition-all duration-200",
                    index === currentIndex 
                      ? "w-6 bg-primary" 
                      : "w-1 bg-gray-300"
                  )}
                />
              ))}
            </div>
          </div>
          
          <p className="text-center text-xs text-muted-foreground mt-1">
            اسحب يميناً أو يساراً للتنقل
          </p>
        </div>

        {/* Swipeable Content */}
        <div 
          ref={constraintsRef}
          className="relative min-h-[400px] touch-pan-y"
        >
          <AnimatePresence mode="wait" custom={currentIndex}>
            <motion.div
              key={activeTab}
              custom={currentIndex}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              drag="x"
              dragConstraints={constraintsRef}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
};
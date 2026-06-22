/**
 * What's New Modal Component
 * Displays changelog with badges, screenshots, and feature discovery
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, X, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'fix' | 'security';
  image?: string;
  details?: string[];
  badge?: string;
}

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  changelog: ChangelogEntry[];
  unreadCount?: number;
}

const categoryConfig = {
  feature: {
    label: 'ميزة جديدة',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30',
    icon: '✨',
  },
  improvement: {
    label: 'تحسين',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30',
    icon: '⚡',
  },
  fix: {
    label: 'إصلاح',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30',
    icon: '🔧',
  },
  security: {
    label: 'أمان',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30',
    icon: '🔒',
  },
};

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  onClose,
  changelog,
  unreadCount = 0,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<ChangelogEntry | null>(
    changelog[0] || null
  );
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (isOpen && changelog.length > 0) {
      setSelectedEntry(changelog[0]);
    }
  }, [isOpen, changelog]);

  const filteredChangelog =
    activeTab === 'all'
      ? changelog
      : changelog.filter((entry) => entry.category === activeTab);

  const getHighlightColor = (category: string) => {
    const colors = {
      feature: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
      improvement: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
      fix: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20',
      security: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
    };
    return colors[category as keyof typeof colors] || colors.feature;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 px-6 py-6 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-2xl">ما الجديد في Fleetify</DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    اكتشف أحدث الميزات والتحسينات
                  </DialogDescription>
                </div>
              </div>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="w-fit">
                  {unreadCount} تحديث جديد
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(80vh-120px)]">
          {/* Left: Changelog List */}
          <div className="w-1/3 border-l bg-muted/30">
            <div className="p-4 space-y-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-1">
                  <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
                  <TabsTrigger value="feature" className="text-xs">جديد</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="h-[calc(80vh-200px)]">
              <div className="space-y-2 p-4">
                {filteredChangelog.map((entry) => {
                  const config = categoryConfig[entry.category];
                  const isSelected = selectedEntry?.id === entry.id;

                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border-l-4 transition-all hover:shadow-md',
                        getHighlightColor(entry.category),
                        isSelected && 'ring-2 ring-blue-400 dark:ring-blue-600'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {entry.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {entry.version} • {entry.date}
                          </div>
                        </div>
                        {isSelected && (
                          <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      {entry.badge && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {config.icon} {config.label}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Details */}
          <div className="flex-1 bg-background">
            <ScrollArea className="h-full">
              {selectedEntry ? (
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className={categoryConfig[selectedEntry.category].color}>
                        {categoryConfig[selectedEntry.category].icon}{' '}
                        {categoryConfig[selectedEntry.category].label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        v{selectedEntry.version} • {selectedEntry.date}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold">{selectedEntry.title}</h2>
                    <p className="text-muted-foreground">{selectedEntry.description}</p>
                  </div>

                  {/* Image */}
                  {selectedEntry.image && (
                    <div className="bg-muted rounded-lg overflow-hidden border">
                      <img
                        src={selectedEntry.image}
                        alt={selectedEntry.title}
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Details */}
                  {selectedEntry.details && selectedEntry.details.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        الميزات الرئيسية
                      </h3>
                      <ul className="space-y-2">
                        {selectedEntry.details.map((detail, idx) => (
                          <li key={idx} className="flex gap-3 text-sm">
                            <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">
                              ✓
                            </span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Impact */}
                  {selectedEntry.category === 'feature' && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        💡 التأثير: هذه الميزة تساعد على تحسين
                        {selectedEntry.category === 'feature'
                          ? ' اكتشاف المزيد من الوظائف'
                          : ' تجربة المستخدم'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  لا توجد تحديثات
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between items-center bg-muted/50">
          <p className="text-sm text-muted-foreground">
            {changelog.length} تحديث متاح
          </p>
          <Button onClick={onClose}>تم (Done)</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsNewModal;

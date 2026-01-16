/**
 * Vehicle Marking Component
 * Simple free-form marking system for vehicle inspection
 * Click anywhere on the vehicle image to add a mark
 *
 * @component VehicleMarking
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkDialog } from './MarkDialog';
import { cn } from '@/lib/utils';
import {
  VehicleMark,
  ZoneCondition,
  ZoneConditionColors,
  ZoneConditionLabels,
  ZoneSeverityLabels,
} from './types';

// ===== Animation Variants =====
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const popIn = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

// ===== Props =====
interface VehicleMarkingProps {
  vehicleImage: string;
  marks: VehicleMark[];
  onMarkAdd: (mark: Omit<VehicleMark, 'id' | 'created_at' | 'created_by'>) => void;
  onMarkDelete: (markId: string) => void;
  onMarkClick?: (mark: VehicleMark) => void;
  mode?: 'add' | 'view';
  contractId?: string;
  className?: string;
}

// ===== Main Component =====
export function VehicleMarking({
  vehicleImage,
  marks,
  onMarkAdd,
  onMarkDelete,
  onMarkClick,
  mode = 'add',
  contractId = '',
  className,
}: VehicleMarkingProps) {
  const [selectedMark, setSelectedMark] = useState<VehicleMark | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [expandedMark, setExpandedMark] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click on vehicle image
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'add') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPendingPosition({ x, y });
    setIsDialogOpen(true);
  }, [mode]);

  // Save mark from dialog
  const handleSaveMark = useCallback((data: {
    description: string;
    condition?: ZoneCondition;
    severity?: 'minor' | 'moderate' | 'severe';
    photos: string[];
  }) => {
    if (!pendingPosition) return;

    const newMark: Omit<VehicleMark, 'id' | 'created_at' | 'created_by'> = {
      x: pendingPosition.x,
      y: pendingPosition.y,
      description: data.description,
      condition: data.condition,
      severity: data.severity,
      photo_urls: data.photos,
    };

    onMarkAdd(newMark);
    setIsDialogOpen(false);
    setPendingPosition(null);
  }, [pendingPosition, onMarkAdd]);

  // Handle mark click
  const handleMarkClick = useCallback((mark: VehicleMark, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'view' && onMarkClick) {
      onMarkClick(mark);
    } else if (mode === 'add') {
      setSelectedMark(mark);
      setIsDialogOpen(true);
    }
  }, [mode, onMarkClick]);

  // Delete mark
  const handleDeleteMark = useCallback((markId: string) => {
    onMarkDelete(markId);
    setIsDialogOpen(false);
    setSelectedMark(null);
  }, [onMarkDelete]);

  // Get mark color based on condition
  const getMarkColor = useCallback((mark: VehicleMark) => {
    if (mark.condition) {
      return ZoneConditionColors[mark.condition];
    }
    return '#ef4444'; // Default red
  }, []);

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Vehicle Image Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            ref={containerRef}
            className={cn(
              'relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800',
              mode === 'add' && 'cursor-crosshair'
            )}
            onClick={handleImageClick}
          >
            {/* Vehicle Image */}
            <img
              src={vehicleImage}
              alt="Vehicle"
              className="w-full h-auto"
              style={{ maxHeight: '500px', objectFit: 'contain' }}
              draggable={false}
            />

            {/* Marks Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <AnimatePresence>
                {marks.map((mark) => (
                  <motion.div
                    key={mark.id}
                    variants={popIn}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="absolute pointer-events-auto"
                    style={{
                      left: `${mark.x}%`,
                      top: `${mark.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* Mark Dot */}
                    <button
                      onClick={(e) => handleMarkClick(mark, e)}
                      className={cn(
                        'relative group transition-transform hover:scale-110',
                        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2'
                      )}
                      style={{
                        width: '32px',
                        height: '32px',
                      }}
                    >
                      {/* Outer ring */}
                      <div
                        className="absolute inset-0 rounded-full opacity-30 group-hover:opacity-50 transition-opacity"
                        style={{ backgroundColor: getMarkColor(mark) }}
                      />

                      {/* Inner dot */}
                      <div
                        className={cn(
                          'absolute inset-2 rounded-full shadow-lg',
                          'border-2 border-white'
                        )}
                        style={{ backgroundColor: getMarkColor(mark) }}
                      />

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {mark.description}
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Instructions overlay (shows on hover in add mode) */}
            {mode === 'add' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm pointer-events-none">
                انقر في أي مكان على الصورة لإضافة علامة
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Marks List */}
      <AnimatePresence>
        {marks.length > 0 && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">
                    <MapPin className="w-5 h-5 inline ml-2" />
                    العلامات ({marks.length})
                  </h3>
                </div>

                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    {marks.map((mark) => (
                      <div
                        key={mark.id}
                        className={cn(
                          'border rounded-lg overflow-hidden transition-all',
                          expandedMark === mark.id && 'ring-2 ring-primary'
                        )}
                      >
                        {/* Header */}
                        <div
                          className={cn(
                            'flex items-start gap-3 p-3 cursor-pointer',
                            'bg-muted/50 hover:bg-muted transition-colors'
                          )}
                          onClick={() => setExpandedMark(
                            expandedMark === mark.id ? null : mark.id
                          )}
                        >
                          {/* Color indicator */}
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0 mt-1 border-2 border-white shadow-sm"
                            style={{ backgroundColor: getMarkColor(mark) }}
                          />

                          {/* Description */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {mark.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {mark.condition && (
                                <Badge variant="outline" className="text-xs">
                                  {ZoneConditionLabels[mark.condition].ar}
                                </Badge>
                              )}
                              {mark.severity && (
                                <Badge variant="secondary" className="text-xs">
                                  {ZoneSeverityLabels[mark.severity].ar}
                                </Badge>
                              )}
                              {mark.photo_urls.length > 0 && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Camera className="w-3 h-3" />
                                  {mark.photo_urls.length}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Expand/collapse icon */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0"
                          >
                            {expandedMark === mark.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {/* Expanded content */}
                        {expandedMark === mark.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t bg-background"
                          >
                            <div className="p-3 space-y-3">
                              {/* Photos */}
                              {mark.photo_urls.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                  {mark.photo_urls.map((url, idx) => (
                                    <img
                                      key={idx}
                                      src={url}
                                      alt={`Mark ${idx + 1}`}
                                      className="w-full aspect-square object-cover rounded-lg border"
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              {mode === 'add' && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMark(mark);
                                      setIsDialogOpen(true);
                                    }}
                                    className="flex-1"
                                  >
                                    تعديل
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteMark(mark.id)}
                                    className="flex-1"
                                  >
                                    <X className="w-4 h-4 ml-2" />
                                    حذف
                                  </Button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {marks.length === 0 && mode === 'add' && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">لا توجد علامات</p>
            <p className="text-sm text-muted-foreground">
              انقر في أي مكان على صورة المركبة لإضافة علامة
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mark Dialog */}
      <MarkDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedMark(null);
          setPendingPosition(null);
        }}
        onSave={handleSaveMark}
        onDelete={selectedMark ? handleDeleteMark : undefined}
        existingMark={selectedMark}
        contractId={contractId}
      />
    </div>
  );
}

// ===== Export Types =====
export type { VehicleMarkingProps };

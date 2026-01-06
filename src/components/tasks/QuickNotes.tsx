import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useQuickNotes,
  useCreateNote,
  useToggleNotePin,
  useArchiveNote,
  useDeleteNote,
  QuickNote,
  CreateNoteInput,
  noteTypeIcons,
  noteTypeLabels,
  noteColors,
} from '@/hooks/useQuickNotes';
import { cn } from '@/lib/utils';
import {
  Plus,
  StickyNote,
  MoreVertical,
  Trash2,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Loader2,
  Lightbulb,
  AlertCircle,
  Phone,
  Clock,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const noteTypeOptions: { value: QuickNote['note_type']; label: string; icon: React.ReactNode }[] = [
  { value: 'idea', label: 'فكرة', icon: <Lightbulb className="h-4 w-4" /> },
  { value: 'alert', label: 'تنبيه', icon: <AlertCircle className="h-4 w-4" /> },
  { value: 'call', label: 'اتصال', icon: <Phone className="h-4 w-4" /> },
  { value: 'reminder', label: 'تذكير', icon: <Clock className="h-4 w-4" /> },
  { value: 'other', label: 'أخرى', icon: <FileText className="h-4 w-4" /> },
];

interface QuickNotesProps {
  compact?: boolean;
  limit?: number;
  showArchived?: boolean;
}

export const QuickNotes: React.FC<QuickNotesProps> = ({
  compact = false,
  limit,
  showArchived = false,
}) => {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [newNote, setNewNote] = React.useState<CreateNoteInput>({
    content: '',
    note_type: 'other',
  });
  const [selectedColor, setSelectedColor] = React.useState(noteColors[0]);

  const { data: notes = [], isLoading } = useQuickNotes(showArchived);
  const createNote = useCreateNote();
  const togglePin = useToggleNotePin();
  const archiveNote = useArchiveNote();
  const deleteNote = useDeleteNote();

  const displayedNotes = limit ? notes.slice(0, limit) : notes;

  const handleAddNote = async () => {
    if (!newNote.content.trim()) return;

    await createNote.mutateAsync({
      ...newNote,
      color: selectedColor,
    });

    setNewNote({ content: '', note_type: 'other' });
    setSelectedColor(noteColors[0]);
    setShowAddDialog(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-coral-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all', compact && 'border-0 shadow-none')}>
      <CardHeader className={cn('pb-3', compact && 'px-0 pt-0')}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-lg p-1">
              <StickyNote className="h-5 w-5 text-white" />
            </div>
            ملاحظات سريعة
          </CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
                {!compact && 'ملاحظة'}
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-lg p-1">
                    <StickyNote className="h-5 w-5 text-white" />
                  </div>
                  ملاحظة جديدة
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">المحتوى *</label>
                  <Textarea
                    placeholder="اكتب ملاحظتك هنا..."
                    value={newNote.content}
                    onChange={(e) =>
                      setNewNote({ ...newNote, content: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">النوع</label>
                  <Select
                    value={newNote.note_type}
                    onValueChange={(value: QuickNote['note_type']) =>
                      setNewNote({ ...newNote, note_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {noteTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            {opt.icon}
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">اللون</label>
                  <div className="flex flex-wrap gap-2">
                    {noteColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                          selectedColor === color
                            ? 'border-coral-500 scale-110'
                            : 'border-transparent'
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.content.trim() || createNote.isPending}
                    className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                  >
                    {createNote.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    )}
                    حفظ
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && 'px-0 pb-0')}>
        {displayedNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>لا توجد ملاحظات</p>
            <p className="text-sm">سجّل أفكارك وملاحظاتك</p>
          </div>
        ) : (
          <div className={cn(
            'grid gap-3',
            compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          )}>
            <AnimatePresence mode="popLayout">
              {displayedNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(
                    'relative p-4 rounded-2xl border shadow-sm hover:shadow-xl hover:shadow-teal-500/10 transition-all',
                    note.is_archived && 'opacity-60'
                  )}
                  style={{ backgroundColor: note.color }}
                >
                  {/* Pin indicator */}
                  {note.is_pinned && (
                    <div className="absolute top-2 left-2">
                      <Pin className="h-4 w-4 text-teal-500 transform -rotate-45" />
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-xs bg-white/50">
                      {noteTypeIcons[note.note_type]} {noteTypeLabels[note.note_type]}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-white/30 hover:bg-white/50"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            togglePin.mutate({
                              id: note.id,
                              is_pinned: !note.is_pinned,
                            })
                          }
                        >
                          {note.is_pinned ? (
                            <>
                              <PinOff className="h-4 w-4 ml-2" />
                              إلغاء التثبيت
                            </>
                          ) : (
                            <>
                              <Pin className="h-4 w-4 ml-2" />
                              تثبيت
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            archiveNote.mutate({
                              id: note.id,
                              is_archived: !note.is_archived,
                            })
                          }
                        >
                          {note.is_archived ? (
                            <>
                              <ArchiveRestore className="h-4 w-4 ml-2" />
                              إلغاء الأرشفة
                            </>
                          ) : (
                            <>
                              <Archive className="h-4 w-4 ml-2" />
                              أرشفة
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteNote.mutate(note.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3 line-clamp-4">
                    {note.content}
                  </p>

                  {/* Footer */}
                  <div className="text-xs text-gray-500">
                    {format(new Date(note.created_at), 'd MMM HH:mm', { locale: ar })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {limit && notes.length > limit && (
          <p className="text-center text-sm text-gray-500 pt-4">
            +{notes.length - limit} ملاحظات أخرى
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickNotes;







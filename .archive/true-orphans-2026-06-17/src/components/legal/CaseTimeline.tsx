import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Plus,
  Filter,
  Search,
} from 'lucide-react';

interface TimelineEntry {
  id: string;
  type: 'auto' | 'manual';
  category: 'case_created' | 'status_changed' | 'payment_received' | 'court_hearing' | 'lawyer_call' | 'customer_meeting';
  title: string;
  description: string;
  date: string;
  timestamp: string;
  performedBy: string;
  notes?: string;
}

interface CaseTimelineProps {
  caseId: string;
  entries: TimelineEntry[];
  onAddEntry?: () => void;
  isLoading?: boolean;
}

const CATEGORY_CONFIG: Record<TimelineEntry['category'], { icon: React.ReactNode; label: string; color: string }> = {
  case_created: {
    icon: <FileText className="h-4 w-4" />,
    label: 'Case Created',
    color: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
  },
  status_changed: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'Status Changed',
    color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
  },
  payment_received: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Payment Received',
    color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
  },
  court_hearing: {
    icon: <Calendar className="h-4 w-4" />,
    label: 'Court Hearing',
    color: 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700',
  },
  lawyer_call: {
    icon: <Phone className="h-4 w-4" />,
    label: 'Lawyer Call',
    color: 'bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700',
  },
  customer_meeting: {
    icon: <MessageSquare className="h-4 w-4" />,
    label: 'Customer Meeting',
    color: 'bg-pink-100 dark:bg-pink-900 border-pink-300 dark:border-pink-700',
  },
};

const CaseTimeline: React.FC<CaseTimelineProps> = ({ caseId, entries, onAddEntry, isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (entry) =>
          entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.performedBy.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((entry) => entry.category === selectedCategory);
    }

    // Sort
    return filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [entries, searchQuery, selectedCategory, sortOrder]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Case Timeline</CardTitle>
            <CardDescription>All case events and activities</CardDescription>
          </div>
          {onAddEntry && (
            <Button onClick={onAddEntry} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="case_created">Case Created</SelectItem>
              <SelectItem value="status_changed">Status Changed</SelectItem>
              <SelectItem value="payment_received">Payment Received</SelectItem>
              <SelectItem value="court_hearing">Court Hearing</SelectItem>
              <SelectItem value="lawyer_call">Lawyer Call</SelectItem>
              <SelectItem value="customer_meeting">Customer Meeting</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">Loading timeline...</div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">
                {entries.length === 0 ? 'No timeline entries yet' : 'No matching entries'}
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredEntries.map((entry, index) => {
                const config = CATEGORY_CONFIG[entry.category];
                const isLast = index === filteredEntries.length - 1;

                return (
                  <div key={entry.id} className="relative flex gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div className={`p-2.5 rounded-full border-2 ${config.color} bg-white dark:bg-slate-950`}>
                        {config.icon}
                      </div>
                      {!isLast && <div className="w-0.5 h-12 bg-border mt-2 mb-2" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{entry.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {config.label}
                          </Badge>
                          {entry.type === 'manual' && (
                            <Badge variant="outline" className="text-xs">
                              Manual
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">{entry.description}</p>

                        {entry.notes && (
                          <div className="bg-muted p-2.5 rounded text-sm mt-2">
                            <p className="text-muted-foreground italic">"{entry.notes}"</p>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(entry.date)}
                          </span>
                          <span>{formatTime(entry.timestamp)}</span>
                          <span>by {entry.performedBy}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {entries.length > 0 && (
          <div className="pt-4 border-t grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-semibold">{entries.length}</div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </div>
            <div>
              <div className="text-lg font-semibold">
                {entries.filter((e) => e.type === 'auto').length}
              </div>
              <div className="text-xs text-muted-foreground">Automatic</div>
            </div>
            <div>
              <div className="text-lg font-semibold">
                {entries.filter((e) => e.type === 'manual').length}
              </div>
              <div className="text-xs text-muted-foreground">Manual</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{new Set(entries.map((e) => e.performedBy)).size}</div>
              <div className="text-xs text-muted-foreground">Contributors</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CaseTimeline;
export type { TimelineEntry };

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CaseStatusManagerProps {
  caseId: string;
  currentStatus: string;
  caseName: string;
  onStatusChange?: (newStatus: string, notes: string) => Promise<void>;
}

type CaseStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'notice_sent'
  | 'in_negotiation'
  | 'filed'
  | 'hearing_scheduled'
  | 'judgment_received'
  | 'execution'
  | 'settled'
  | 'closed_won'
  | 'closed_lost'
  | 'closed_withdrawn';

interface StatusConfig {
  label: string;
  description: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
  allowedNextStatuses: CaseStatus[];
}

const STATUS_CONFIGS: Record<CaseStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    description: 'Being prepared',
    variant: 'secondary',
    icon: <Clock className="h-4 w-4" />,
    allowedNextStatuses: ['pending_review', 'draft'],
  },
  pending_review: {
    label: 'Pending Review',
    description: 'Waiting for legal team review',
    variant: 'default',
    icon: <AlertCircle className="h-4 w-4" />,
    allowedNextStatuses: ['approved', 'draft', 'pending_review'],
  },
  approved: {
    label: 'Approved',
    description: 'Ready to proceed',
    variant: 'default',
    icon: <CheckCircle className="h-4 w-4" />,
    allowedNextStatuses: ['notice_sent', 'pending_review', 'approved'],
  },
  notice_sent: {
    label: 'Notice Sent',
    description: 'Formal legal notice sent to customer',
    variant: 'default',
    icon: <AlertCircle className="h-4 w-4" />,
    allowedNextStatuses: ['in_negotiation', 'filed', 'notice_sent'],
  },
  in_negotiation: {
    label: 'In Negotiation',
    description: 'Settlement discussions',
    variant: 'default',
    icon: <AlertTriangle className="h-4 w-4" />,
    allowedNextStatuses: ['settled', 'filed', 'in_negotiation'],
  },
  filed: {
    label: 'Filed',
    description: 'Case filed with court',
    variant: 'default',
    icon: <AlertCircle className="h-4 w-4" />,
    allowedNextStatuses: ['hearing_scheduled', 'filed'],
  },
  hearing_scheduled: {
    label: 'Hearing Scheduled',
    description: 'Court date set',
    variant: 'default',
    icon: <Clock className="h-4 w-4" />,
    allowedNextStatuses: ['judgment_received', 'hearing_scheduled'],
  },
  judgment_received: {
    label: 'Judgment Received',
    description: 'Court decided',
    variant: 'default',
    icon: <CheckCircle className="h-4 w-4" />,
    allowedNextStatuses: ['execution', 'settled', 'judgment_received'],
  },
  execution: {
    label: 'Execution',
    description: 'Enforcing judgment',
    variant: 'default',
    icon: <AlertCircle className="h-4 w-4" />,
    allowedNextStatuses: ['settled', 'closed_won', 'execution'],
  },
  settled: {
    label: 'Settled',
    description: 'Customer paid or settlement reached',
    variant: 'default',
    icon: <CheckCircle className="h-4 w-4" />,
    allowedNextStatuses: ['closed_won', 'settled'],
  },
  closed_won: {
    label: 'Closed - Won',
    description: 'Case won',
    variant: 'default',
    icon: <CheckCircle className="h-4 w-4" />,
    allowedNextStatuses: ['closed_won'],
  },
  closed_lost: {
    label: 'Closed - Lost',
    description: 'Case lost',
    variant: 'destructive',
    icon: <AlertTriangle className="h-4 w-4" />,
    allowedNextStatuses: ['closed_lost'],
  },
  closed_withdrawn: {
    label: 'Closed - Withdrawn',
    description: 'Case withdrawn',
    variant: 'secondary',
    icon: <AlertCircle className="h-4 w-4" />,
    allowedNextStatuses: ['closed_withdrawn'],
  },
};

const CaseStatusManager: React.FC<CaseStatusManagerProps> = ({
  caseId,
  currentStatus,
  caseName,
  onStatusChange,
}) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentConfig = STATUS_CONFIGS[currentStatus as CaseStatus];
  const allowedNextStatuses = currentConfig?.allowedNextStatuses || [];

  const handleStatusChange = async () => {
    if (!selectedStatus) return;

    try {
      setIsLoading(true);

      if (onStatusChange) {
        await onStatusChange(selectedStatus, notes);
      }

      toast({
        title: 'Status Updated',
        description: `Case status changed to ${STATUS_CONFIGS[selectedStatus].label}`,
      });

      setIsDialogOpen(false);
      setSelectedStatus(null);
      setNotes('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update case status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Case Status</CardTitle>
          <CardDescription>Current status and available actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Current Status</Label>
            <div className="flex items-center gap-2">
              {currentConfig?.icon}
              <Badge variant={currentConfig?.variant as any}>
                {currentConfig?.label}
              </Badge>
              <span className="text-sm text-muted-foreground">{currentConfig?.description}</span>
            </div>
          </div>

          {/* Status Workflow Diagram */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Available Actions</Label>
            <div className="grid grid-cols-2 gap-2">
              {allowedNextStatuses.map((status) => {
                const config = STATUS_CONFIGS[status];
                const isCurrent = status === currentStatus;

                return (
                  <Button
                    key={status}
                    variant={isCurrent ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedStatus(status);
                      setIsDialogOpen(true);
                    }}
                    disabled={isCurrent}
                    className="justify-start text-left"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-xs">{config.label}</span>
                      <span className="text-xs opacity-70">{config.description}</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Status History Info */}
          <div className="bg-muted p-3 rounded text-sm">
            <p className="text-muted-foreground">
              💡 <strong>Tip:</strong> All status changes are automatically logged in the timeline with
              timestamp and your name.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Case Status</DialogTitle>
            <DialogDescription>
              {caseName ? `Update status for "${caseName}"` : 'Update case status'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedStatus && (
              <>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    {STATUS_CONFIGS[selectedStatus].icon}
                    <span className="font-medium">
                      {STATUS_CONFIGS[selectedStatus].label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {STATUS_CONFIGS[selectedStatus].description}
                  </p>
                </div>

                <div>
                  <Label htmlFor="status_notes" className="text-sm font-semibold mb-2 block">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="status_notes"
                    placeholder="Add notes about this status change..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    These notes will be visible in the case timeline
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedStatus(null);
                setNotes('');
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={isLoading || !selectedStatus}>
              {isLoading ? 'Updating...' : 'Change Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CaseStatusManager;

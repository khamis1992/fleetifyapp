/**
 * Reminder Templates Manager Component
 * 
 * Manage reminder templates, variables, and automation
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Play,
  BarChart3,
  Lightbulb,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getReminderTemplates,
  createReminderTemplate,
  updateReminderTemplate,
  archiveReminderTemplate,
  getDefaultTemplates,
  scheduleAutomatedReminders,
  getTemplateAnalytics,
  TEMPLATE_VARIABLES,
  type ReminderTemplate,
  type ReminderChannel,
  type ReminderStage,
  type TemplateTone,
} from '@/lib/reminderTemplates';

interface ReminderTemplatesManagerProps {
  companyId: string;
  companyName: string;
}

export const ReminderTemplatesManager: React.FC<ReminderTemplatesManagerProps> = ({
  companyId,
  companyName,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null);
  const [showVariablesPanel, setShowVariablesPanel] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ReminderStage | 'all'>('all');

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['reminder-templates', companyId, selectedStage],
    queryFn: () => getReminderTemplates(companyId, selectedStage !== 'all' ? { stage: selectedStage } : undefined),
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['template-analytics', companyId],
    queryFn: () => getTemplateAnalytics(companyId),
  });

  // Create default templates mutation
  const createDefaultsMutation = useMutation({
    mutationFn: async () => {
      const defaultTemplates = getDefaultTemplates(companyName);
      const promises = defaultTemplates.map(template =>
        createReminderTemplate({
          ...template,
          company_id: companyId,
          created_by: 'system',
        } as any)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-templates'] });
      toast({
        title: "Default Templates Created",
        description: "5 default reminder templates have been created successfully.",
      });
    },
  });

  // Schedule reminders mutation
  const scheduleRemindersMutation = useMutation({
    mutationFn: () => scheduleAutomatedReminders(companyId),
    onSuccess: (result) => {
      toast({
        title: "Reminders Scheduled",
        description: `${result.scheduled} reminders scheduled, ${result.skipped} skipped.`,
      });
    },
  });

  const handleCreateDefaults = () => {
    createDefaultsMutation.mutate();
  };

  const handleScheduleReminders = () => {
    scheduleRemindersMutation.mutate();
  };

  const handleEditTemplate = (template: ReminderTemplate) => {
    setEditingTemplate(template);
    setShowTemplateDialog(true);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowTemplateDialog(true);
  };

  const getChannelIcon = (channel: ReminderChannel) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'letter': return <FileText className="h-4 w-4" />;
    }
  };

  const getStageBadgeColor = (stage: ReminderStage) => {
    switch (stage) {
      case 'initial': return 'bg-blue-600';
      case 'first_reminder': return 'bg-yellow-600';
      case 'second_reminder': return 'bg-orange-600';
      case 'final_notice': return 'bg-red-600';
      case 'legal_notice': return 'bg-purple-600';
    }
  };

  const getToneBadgeColor = (tone: TemplateTone) => {
    switch (tone) {
      case 'friendly': return 'bg-green-600';
      case 'professional': return 'bg-blue-600';
      case 'firm': return 'bg-orange-600';
      case 'urgent': return 'bg-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminder Templates</h1>
          <p className="text-muted-foreground">
            Manage automated reminder templates with A/B testing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowVariablesPanel(true)}>
            <Lightbulb className="h-4 w-4 mr-2" />
            Variables
          </Button>
          {(!templates || templates.length === 0) && (
            <Button variant="outline" onClick={handleCreateDefaults} disabled={createDefaultsMutation.isPending}>
              <Copy className="h-4 w-4 mr-2" />
              Create Defaults
            </Button>
          )}
          <Button variant="outline" onClick={handleScheduleReminders} disabled={scheduleRemindersMutation.isPending}>
            <Clock className="h-4 w-4 mr-2" />
            Schedule Now
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Stage Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filter by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={selectedStage === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('all')}
            >
              All Stages
            </Button>
            <Button
              variant={selectedStage === 'initial' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('initial')}
            >
              Initial
            </Button>
            <Button
              variant={selectedStage === 'first_reminder' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('first_reminder')}
            >
              First Reminder
            </Button>
            <Button
              variant={selectedStage === 'second_reminder' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('second_reminder')}
            >
              Second Reminder
            </Button>
            <Button
              variant={selectedStage === 'final_notice' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('final_notice')}
            >
              Final Notice
            </Button>
            <Button
              variant={selectedStage === 'legal_notice' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('legal_notice')}
            >
              Legal Notice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      {analytics && analytics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.reduce((sum, a) => sum + a.totalSent, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Open Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(analytics.reduce((sum, a) => sum + a.openRate, 0) / analytics.length).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Response Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(analytics.reduce((sum, a) => sum + a.responseRate, 0) / analytics.length).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(analytics.reduce((sum, a) => sum + a.conversionRate, 0) / analytics.length).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">Loading templates...</div>
            </CardContent>
          </Card>
        ) : !templates || templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No templates found</p>
                <Button onClick={handleCreateDefaults}>
                  <Copy className="h-4 w-4 mr-2" />
                  Create Default Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              analytics={analytics?.find(a => a.templateId === template.id)}
              onEdit={() => handleEditTemplate(template)}
              onDelete={async () => {
                await archiveReminderTemplate(template.id);
                queryClient.invalidateQueries({ queryKey: ['reminder-templates'] });
                toast({ title: "Template Archived" });
              }}
            />
          ))
        )}
      </div>

      {/* Template Dialog */}
      <TemplateDialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        template={editingTemplate}
        companyId={companyId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['reminder-templates'] });
          setShowTemplateDialog(false);
          toast({
            title: editingTemplate ? "Template Updated" : "Template Created",
          });
        }}
      />

      {/* Variables Panel */}
      <VariablesPanel
        open={showVariablesPanel}
        onClose={() => setShowVariablesPanel(false)}
      />
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TemplateCardProps {
  template: ReminderTemplate;
  analytics?: any;
  onEdit: () => void;
  onDelete: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, analytics, onEdit, onDelete }) => {
  const getChannelIcon = (channel: ReminderChannel) => {
    const icons = {
      email: <Mail className="h-4 w-4" />,
      sms: <MessageSquare className="h-4 w-4" />,
      whatsapp: <MessageSquare className="h-4 w-4" />,
      phone: <Phone className="h-4 w-4" />,
      letter: <FileText className="h-4 w-4" />,
    };
    return icons[channel];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {template.variant && (
                <Badge variant="outline">Variant {template.variant}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`bg-${template.stage === 'initial' ? 'blue' : template.stage === 'first_reminder' ? 'yellow' : template.stage === 'second_reminder' ? 'orange' : template.stage === 'final_notice' ? 'red' : 'purple'}-600`}>
                {template.stage.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                {getChannelIcon(template.channel)}
                {template.channel}
              </Badge>
              <Badge variant="outline">{template.tone}</Badge>
              {template.status === 'draft' && <Badge variant="secondary">Draft</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Subject */}
          <div>
            <div className="text-sm font-semibold mb-1">Subject:</div>
            <div className="text-sm text-muted-foreground">{template.subject}</div>
          </div>

          {/* Body Preview */}
          <div>
            <div className="text-sm font-semibold mb-1">Message:</div>
            <div className="text-sm text-muted-foreground line-clamp-3">{template.body}</div>
          </div>

          {/* Performance Metrics */}
          {analytics && analytics.totalSent > 0 && (
            <div className="grid grid-cols-5 gap-4 pt-4 border-t">
              <div>
                <div className="text-xs text-muted-foreground">Sent</div>
                <div className="text-lg font-bold">{analytics.totalSent}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Open Rate</div>
                <div className="text-lg font-bold">{analytics.openRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Click Rate</div>
                <div className="text-lg font-bold">{analytics.clickRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Response</div>
                <div className="text-lg font-bold">{analytics.responseRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Conversion</div>
                <div className="text-lg font-bold text-green-600">{analytics.conversionRate.toFixed(1)}%</div>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Send at {template.send_time_preference}
            </div>
            {template.avoid_weekends && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Skip weekends
              </div>
            )}
            {template.avoid_holidays && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Skip holidays
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  template: ReminderTemplate | null;
  companyId: string;
  onSuccess: () => void;
}

const TemplateDialog: React.FC<TemplateDialogProps> = ({ open, onClose, template, companyId, onSuccess }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: template?.name || '',
    stage: template?.stage || 'initial' as ReminderStage,
    channel: template?.channel || 'email' as ReminderChannel,
    subject: template?.subject || '',
    body: template?.body || '',
    tone: template?.tone || 'professional' as TemplateTone,
    send_time_preference: template?.send_time_preference || '09:00',
    avoid_weekends: template?.avoid_weekends ?? true,
    avoid_holidays: template?.avoid_holidays ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (template) {
        return await updateReminderTemplate(template.id, formData as any);
      } else {
        return await createReminderTemplate({
          ...formData,
          company_id: companyId,
          status: 'active',
          variant: null,
          created_by: 'user',
        } as any);
      }
    },
    onSuccess,
  });

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create New Template'}</DialogTitle>
          <DialogDescription>
            Customize your reminder template with dynamic variables
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Friendly First Reminder"
            />
          </div>

          {/* Stage & Channel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Reminder Stage *</Label>
              <Select value={formData.stage} onValueChange={(value: ReminderStage) => setFormData({ ...formData, stage: value })}>
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Initial</SelectItem>
                  <SelectItem value="first_reminder">First Reminder</SelectItem>
                  <SelectItem value="second_reminder">Second Reminder</SelectItem>
                  <SelectItem value="final_notice">Final Notice</SelectItem>
                  <SelectItem value="legal_notice">Legal Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Channel *</Label>
              <Select value={formData.channel} onValueChange={(value: ReminderChannel) => setFormData({ ...formData, channel: value })}>
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="phone">Phone Script</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Select value={formData.tone} onValueChange={(value: TemplateTone) => setFormData({ ...formData, tone: value })}>
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="firm">Firm</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Payment Reminder: Invoice {invoice.number}"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message Body *</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Dear {customer.name},&#10;&#10;This is a reminder that invoice {invoice.number} for {invoice.amount} is due..."
              rows={12}
            />
            <p className="text-xs text-muted-foreground">
              Use variables like {'{customer.name}'}, {'{invoice.number}'}, {'{invoice.amount}'}, etc.
            </p>
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="send_time">Preferred Send Time</Label>
              <Input
                id="send_time"
                type="time"
                value={formData.send_time_preference}
                onChange={(e) => setFormData({ ...formData, send_time_preference: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="avoid_weekends"
                checked={formData.avoid_weekends}
                onCheckedChange={(checked) => setFormData({ ...formData, avoid_weekends: checked })}
              />
              <Label htmlFor="avoid_weekends">Avoid sending on weekends</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="avoid_holidays"
                checked={formData.avoid_holidays}
                onCheckedChange={(checked) => setFormData({ ...formData, avoid_holidays: checked })}
              />
              <Label htmlFor="avoid_holidays">Avoid sending on holidays</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface VariablesPanelProps {
  open: boolean;
  onClose: () => void;
}

const VariablesPanel: React.FC<VariablesPanelProps> = ({ open, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredVariables = TEMPLATE_VARIABLES.filter(v =>
    v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedVariables = filteredVariables.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, typeof TEMPLATE_VARIABLES>);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Template Variables
          </DialogTitle>
          <DialogDescription>
            Copy and paste these variables into your templates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Input
            placeholder="Search variables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {Object.entries(groupedVariables).map(([category, vars]) => (
            <div key={category} className="space-y-2">
              <h3 className="font-semibold capitalize">{category} Variables</h3>
              <div className="space-y-1">
                {vars.map(v => (
                  <div
                    key={v.key}
                    className="flex items-center justify-between p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      navigator.clipboard.writeText(`{${v.key}}`);
                      alert(`Copied: {${v.key}}`);
                    }}
                  >
                    <div>
                      <div className="font-mono text-sm">{`{${v.key}}`}</div>
                      <div className="text-xs text-muted-foreground">{v.label}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Example: {v.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderTemplatesManager;

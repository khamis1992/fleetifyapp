import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, Settings, Download, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const BulkOperations: React.FC = () => {
  const { toast } = useToast();
  
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [operationProgress, setOperationProgress] = useState<{
    isRunning: boolean;
    progress: number;
    currentOperation: string;
  }>({
    isRunning: false,
    progress: 0,
    currentOperation: '',
  });

  const companies = [
    { id: '1', name: 'Acme Corp', users: 45, status: 'active', plan: 'professional' },
    { id: '2', name: 'TechStart Inc', users: 12, status: 'active', plan: 'basic' },
    { id: '3', name: 'Enterprise Solutions', users: 200, status: 'active', plan: 'enterprise' },
    { id: '4', name: 'Small Business LLC', users: 8, status: 'suspended', plan: 'basic' },
    { id: '5', name: 'Global Industries', users: 150, status: 'active', plan: 'professional' },
  ];

  const bulkOperations = [
    {
      id: 'update_plan',
      name: 'Update Subscription Plan',
      description: 'Change subscription plan for selected companies',
      icon: Settings,
      requiresInput: true,
      inputType: 'select',
      inputOptions: ['free', 'basic', 'professional', 'enterprise'],
    },
    {
      id: 'send_notification',
      name: 'Send Notification',
      description: 'Send system notification to selected companies',
      icon: AlertCircle,
      requiresInput: true,
      inputType: 'text',
    },
    {
      id: 'export_data',
      name: 'Export Company Data',
      description: 'Export data for selected companies',
      icon: Download,
      requiresInput: false,
    },
    {
      id: 'reset_trial',
      name: 'Reset Trial Period',
      description: 'Reset trial period for selected companies',
      icon: RefreshCw,
      requiresInput: false,
    },
    {
      id: 'suspend_companies',
      name: 'Suspend Companies',
      description: 'Suspend access for selected companies',
      icon: Users,
      requiresInput: false,
      dangerous: true,
    },
  ];

  const handleCompanySelection = (companyId: string, checked: boolean) => {
    if (checked) {
      setSelectedCompanies(prev => [...prev, companyId]);
    } else {
      setSelectedCompanies(prev => prev.filter(id => id !== companyId));
    }
  };

  const handleSelectAll = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map(c => c.id));
    }
  };

  const executeBulkOperation = (operationId: string, input?: string) => {
    if (selectedCompanies.length === 0) {
      toast({
        title: "No companies selected",
        description: "Please select at least one company to perform the operation.",
        variant: "destructive",
      });
      return;
    }

    setOperationProgress({
      isRunning: true,
      progress: 0,
      currentOperation: operationId,
    });

    // Simulate bulk operation progress
    const interval = setInterval(() => {
      setOperationProgress(prev => {
        if (prev.progress >= 100) {
          clearInterval(interval);
          toast({
            title: "Bulk operation completed",
            description: `Successfully processed ${selectedCompanies.length} companies.`,
          });
          return { isRunning: false, progress: 0, currentOperation: '' };
        }
        return { ...prev, progress: prev.progress + 10 };
      });
    }, 500);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="operations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operations">Bulk Operations</TabsTrigger>
          <TabsTrigger value="migration">Data Migration</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          {/* Company Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Company Selection
              </CardTitle>
              <CardDescription>
                Select companies to perform bulk operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedCompanies.length === companies.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label>Select All ({companies.length} companies)</Label>
                </div>
                <Badge variant="outline">
                  {selectedCompanies.length} selected
                </Badge>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedCompanies.includes(company.id)}
                        onCheckedChange={(checked) => handleCompanySelection(company.id, checked as boolean)}
                      />
                      <div>
                        <h5 className="font-medium">{company.name}</h5>
                        <div className="text-sm text-muted-foreground">
                          {company.users} users • {company.plan} plan
                        </div>
                      </div>
                    </div>
                    <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                      {company.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bulk Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Available Operations
              </CardTitle>
              <CardDescription>
                Perform bulk operations on selected companies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {operationProgress.isRunning && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Operation in progress...</span>
                    <span className="text-sm text-muted-foreground">
                      {operationProgress.progress}%
                    </span>
                  </div>
                  <Progress value={operationProgress.progress} className="h-2" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bulkOperations.map((operation) => (
                  <Card key={operation.id} className={`border-l-4 ${
                    operation.dangerous ? 'border-l-destructive' : 'border-l-primary'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <operation.icon className={`h-5 w-5 ${
                          operation.dangerous ? 'text-destructive' : 'text-primary'
                        }`} />
                        <div>
                          <CardTitle className="text-base">{operation.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {operation.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {operation.requiresInput && (
                        <div className="space-y-2">
                          <Label>Input</Label>
                          {operation.inputType === 'select' ? (
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                              <SelectContent>
                                {operation.inputOptions?.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input placeholder="Enter value" />
                          )}
                        </div>
                      )}
                      <Button
                        className="w-full"
                        variant={operation.dangerous ? 'destructive' : 'default'}
                        onClick={() => executeBulkOperation(operation.id)}
                        disabled={operationProgress.isRunning || selectedCompanies.length === 0}
                      >
                        Execute
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration" className="space-y-6">
          {/* Data Migration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Data Migration Tools
              </CardTitle>
              <CardDescription>
                Import/export data and manage system migrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-20 flex-col" variant="outline">
                  <Upload className="h-6 w-6 mb-2" />
                  Import Companies
                </Button>
                <Button className="h-20 flex-col" variant="outline">
                  <Download className="h-6 w-6 mb-2" />
                  Export All Data
                </Button>
                <Button className="h-20 flex-col" variant="outline">
                  <RefreshCw className="h-6 w-6 mb-2" />
                  Migrate Schema
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Migration History</h4>
                <div className="space-y-2">
                  {[
                    { date: '2024-01-15', operation: 'Schema Migration v2.1', status: 'completed' },
                    { date: '2024-01-10', operation: 'Bulk User Import', status: 'completed' },
                    { date: '2024-01-08', operation: 'Company Data Export', status: 'completed' },
                  ].map((migration, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h5 className="font-medium">{migration.operation}</h5>
                        <div className="text-sm text-muted-foreground">{migration.date}</div>
                      </div>
                      <Badge variant="default">{migration.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
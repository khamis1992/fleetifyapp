/**
 * Export Dialog Component
 * Dialog for exporting audit data in various formats
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Download,
  FileText,
  Database,
  Code,
  Shield
} from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'excel' | 'pdf' | 'json', options: any) => void;
  isExporting: boolean;
  totalCount: number;
}

export function ExportDialog({ open, onClose, onExport, isExporting, totalCount }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel' | 'pdf' | 'json'>('csv');
  const [exportOptions, setExportOptions] = useState({
    includeIntegrityData: false,
    includeFinancialData: true,
    anonymizeUserData: false,
    complianceMode: false,
  });

  const handleExport = () => {
    onExport(selectedFormat, exportOptions);
  };

  const formatOptions = [
    {
      value: 'csv',
      label: 'CSV',
      description: 'Comma-separated values for spreadsheet applications',
      icon: <Database className="h-4 w-4" />
    },
    {
      value: 'excel',
      label: 'Excel',
      description: 'Microsoft Excel format with formatting',
      icon: <FileText className="h-4 w-4" />
    },
    {
      value: 'pdf',
      label: 'PDF',
      description: 'Portable Document Format for reports and sharing',
      icon: <FileText className="h-4 w-4" />
    },
    {
      value: 'json',
      label: 'JSON',
      description: 'Machine-readable format for data processing',
      icon: <Code className="h-4 w-4" />
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Audit Data
          </DialogTitle>
          <DialogDescription>
            Export {totalCount.toLocaleString()} audit records in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <div className="grid gap-2">
              {formatOptions.map((format) => (
                <Card
                  key={format.value}
                  className={`cursor-pointer transition-colors ${
                    selectedFormat === format.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedFormat(format.value as any)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded ${
                        selectedFormat === format.value
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {format.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{format.label}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <Tabs defaultValue="options" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            <TabsContent value="options" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="integrity-data"
                    checked={exportOptions.includeIntegrityData}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeIntegrityData: checked === true }))
                    }
                  />
                  <Label htmlFor="integrity-data" className="text-sm font-medium cursor-pointer">
                    Include integrity data
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Include hash signatures and verification status
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="financial-data"
                    checked={exportOptions.includeFinancialData}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeFinancialData: checked === true }))
                    }
                  />
                  <Label htmlFor="financial-data" className="text-sm font-medium cursor-pointer">
                    Include financial data
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Include amounts, currencies, and transaction details
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymize-data"
                    checked={exportOptions.anonymizeUserData}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, anonymizeUserData: checked === true }))
                    }
                  />
                  <Label htmlFor="anonymize-data" className="text-sm font-medium cursor-pointer">
                    Anonymize user data
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Remove user names and email addresses for privacy
                </p>
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="compliance-mode"
                    checked={exportOptions.complianceMode}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, complianceMode: checked === true }))
                    }
                  />
                  <Label htmlFor="compliance-mode" className="text-sm font-medium cursor-pointer">
                    Compliance mode
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Include compliance flags, retention periods, and audit metadata
                </p>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-2">
                      <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Compliance Features</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Compliance mode exports include additional fields required for regulatory reporting
                          and audit trail verification.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Export Summary */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Export Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Format:</span>
                <span className="font-medium uppercase">{selectedFormat}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Records:</span>
                <span className="font-medium">{totalCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Options:</span>
                <span className="font-medium">
                  {[
                    exportOptions.includeIntegrityData && 'Integrity',
                    exportOptions.includeFinancialData && 'Financial',
                    exportOptions.anonymizeUserData && 'Anonymous',
                    exportOptions.complianceMode && 'Compliance'
                  ].filter(Boolean).join(', ') || 'Standard'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
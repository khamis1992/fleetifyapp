import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { CSVRowFix } from "@/utils/csvAutoFix";

interface CSVFixPreviewProps {
  fixes: CSVRowFix[];
  onApprove: (approvedFixes: CSVRowFix[]) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function CSVFixPreview({ fixes, onApprove, onCancel, isProcessing = false }: CSVFixPreviewProps) {
  const [selectedFixes, setSelectedFixes] = useState<Set<number>>(
    new Set(fixes.map((_, index) => index))
  );
  const [showDetails, setShowDetails] = useState<Set<number>>(new Set());

  const fixableRows = fixes.filter(fix => !fix.hasErrors);
  const errorRows = fixes.filter(fix => fix.hasErrors);
  const totalFixes = fixes.reduce((sum, row) => sum + row.fixes.length, 0);

  const downloadErrorReport = () => {
    if (errorRows.length === 0) return;
    const headers = ['row', 'errors'];
    const rows = errorRows.map(r => [r.rowNumber, (r.validationErrors || []).join('; ')]);
    const csv = [
      headers.join(','),
      ...rows.map(arr => arr.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'csv_error_report.csv';
    link.click();
  };

  const handleRowSelection = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedFixes);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedFixes(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFixes(new Set(fixes.map((_, index) => index)));
    } else {
      setSelectedFixes(new Set());
    }
  };

  const toggleDetails = (index: number) => {
    const newShowDetails = new Set(showDetails);
    if (newShowDetails.has(index)) {
      newShowDetails.delete(index);
    } else {
      newShowDetails.add(index);
    }
    setShowDetails(newShowDetails);
  };

  const handleApprove = () => {
    const approvedFixes = fixes.filter((_, index) => selectedFixes.has(index));
    onApprove(approvedFixes);
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      high: "default",
      medium: "secondary",
      low: "destructive"
    } as const;
    
    const labels = {
      high: "عالية",
      medium: "متوسطة", 
      low: "منخفضة"
    };

    return (
      <Badge variant={variants[confidence as keyof typeof variants]}>
        {labels[confidence as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            معاينة إصلاحات CSV
          </CardTitle>
          <CardDescription>
            تم العثور على {totalFixes} إصلاح محتمل في {fixes.length} صف
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{fixableRows.length}</div>
              <div className="text-sm text-muted-foreground">صفوف قابلة للإصلاح</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalFixes}</div>
              <div className="text-sm text-muted-foreground">إجمالي الإصلاحات</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorRows.length}</div>
              <div className="text-sm text-muted-foreground">صفوف بأخطاء</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              checked={selectedFixes.size === fixes.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm">تحديد الكل ({selectedFixes.size} من {fixes.length})</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="fixable" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fixable" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            قابلة للإصلاح ({fixableRows.length})
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            أخطاء ({errorRows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fixable" className="space-y-4">
          <ScrollArea className="h-96">
            {fixableRows.map((rowFix, index) => {
              const originalIndex = fixes.findIndex(f => f.rowNumber === rowFix.rowNumber);
              return (
                <Card key={rowFix.rowNumber} className="mb-4">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedFixes.has(originalIndex)}
                          onCheckedChange={(checked) => handleRowSelection(originalIndex, checked as boolean)}
                        />
                        <CardTitle className="text-sm">
                          الصف {rowFix.rowNumber}
                        </CardTitle>
                        <Badge variant="outline">
                          {rowFix.fixes.length} إصلاح
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDetails(originalIndex)}
                      >
                        {showDetails.has(originalIndex) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {showDetails.has(originalIndex) && (
                    <CardContent className="space-y-3">
                      {rowFix.fixes.map((fix, fixIndex) => (
                        <div key={fixIndex} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{fix.field}</span>
                            {getConfidenceBadge(fix.fix.confidence)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">القيمة الأصلية:</span>
                              <div className="bg-red-50 p-2 rounded mt-1 text-red-800">
                                {String(fix.fix.originalValue)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">القيمة المصححة:</span>
                              <div className="bg-green-50 p-2 rounded mt-1 text-green-800">
                                {String(fix.fix.fixedValue)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            السبب: {fix.fix.reason}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">عدد الصفوف التي تحتوي على أخطاء: {errorRows.length}</div>
            {errorRows.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                تنزيل تقرير الأخطاء CSV
              </Button>
            )}
          </div>
          <ScrollArea className="h-96">
            {errorRows.map((rowFix) => (
              <Card key={rowFix.rowNumber} className="mb-4 border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    الصف {rowFix.rowNumber}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rowFix.validationErrors.map((error, index) => (
                      <div key={index} className="bg-red-50 p-2 rounded text-red-800 text-sm">
                        {error}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          إلغاء
        </Button>
        <Button 
          onClick={handleApprove} 
          disabled={selectedFixes.size === 0 || isProcessing}
        >
          {isProcessing ? "جاري الرفع..." : `رفع ${selectedFixes.size} صف`}
        </Button>
      </div>
    </div>
  );
}
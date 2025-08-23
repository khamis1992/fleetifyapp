import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { 
  DATE_FORMATS, 
  DateFormatOption, 
  DateDetectionResult,
  detectDateColumns,
  isDateColumn,
  suggestBestFormat,
  fixDatesInData
} from "@/utils/dateDetection";

interface DateFormatSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any[];
  onConfirm: (data: any[], columnFormats: { [column: string]: DateFormatOption }) => void;
}

interface ColumnAnalysis {
  column: string;
  isDateColumn: boolean;
  results: DateDetectionResult[];
  suggestedFormat: DateFormatOption | null;
  selectedFormat: DateFormatOption | null;
  enabled: boolean;
}

export function DateFormatSelector({ open, onOpenChange, data, onConfirm }: DateFormatSelectorProps) {
  const [analyses, setAnalyses] = useState<ColumnAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  useEffect(() => {
    if (open && data.length > 0) {
      analyzeData();
    }
  }, [open, data]);

  const analyzeData = async () => {
    setIsAnalyzing(true);
    
    try {
      const columnResults = detectDateColumns(data);
      const newAnalyses: ColumnAnalysis[] = [];
      
      for (const [column, results] of Object.entries(columnResults)) {
        const isDate = isDateColumn(results);
        const suggested = suggestBestFormat(results);
        
        if (isDate || results.some(r => r.isDate)) {
          newAnalyses.push({
            column,
            isDateColumn: isDate,
            results,
            suggestedFormat: suggested,
            selectedFormat: suggested,
            enabled: isDate
          });
        }
      }
      
      setAnalyses(newAnalyses);
      updatePreview(newAnalyses);
      
    } catch (error) {
      console.error('Error analyzing dates:', error);
      toast.error("خطأ في تحليل التواريخ");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updatePreview = (currentAnalyses: ColumnAnalysis[]) => {
    const columnFormats: { [column: string]: DateFormatOption } = {};
    
    currentAnalyses.forEach(analysis => {
      if (analysis.enabled && analysis.selectedFormat) {
        columnFormats[analysis.column] = analysis.selectedFormat;
      }
    });

    const fixedData = fixDatesInData(data.slice(0, 5), columnFormats);
    setPreviewData(fixedData);
  };

  const handleFormatChange = (column: string, formatName: string) => {
    const format = DATE_FORMATS.find(f => f.format === formatName);
    if (!format) return;

    const updatedAnalyses = analyses.map(analysis => 
      analysis.column === column 
        ? { ...analysis, selectedFormat: format }
        : analysis
    );
    
    setAnalyses(updatedAnalyses);
    updatePreview(updatedAnalyses);
  };

  const handleToggleColumn = (column: string, enabled: boolean) => {
    const updatedAnalyses = analyses.map(analysis => 
      analysis.column === column 
        ? { ...analysis, enabled }
        : analysis
    );
    
    setAnalyses(updatedAnalyses);
    updatePreview(updatedAnalyses);
  };

  const handleConfirm = () => {
    const columnFormats: { [column: string]: DateFormatOption } = {};
    
    analyses.forEach(analysis => {
      if (analysis.enabled && analysis.selectedFormat) {
        columnFormats[analysis.column] = analysis.selectedFormat;
      }
    });

    const fixedData = fixDatesInData(data, columnFormats);
    onConfirm(fixedData, columnFormats);
    onOpenChange(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            تحديد تنسيقات التواريخ
          </DialogTitle>
          <DialogDescription>
            حدد كيفية تفسير التواريخ في الأعمدة المختلفة
          </DialogDescription>
        </DialogHeader>

        {isAnalyzing ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>جاري تحليل التواريخ...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* الأعمدة المكتشفة */}
            <Card>
              <CardHeader>
                <CardTitle>الأعمدة التي تحتوي على تواريخ</CardTitle>
              </CardHeader>
              <CardContent>
                {analyses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>لم يتم العثور على أعمدة تحتوي على تواريخ</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analyses.map((analysis) => (
                      <div key={analysis.column} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={analysis.enabled}
                              onCheckedChange={(checked) => 
                                handleToggleColumn(analysis.column, !!checked)
                              }
                            />
                            <div>
                              <h4 className="font-medium">{analysis.column}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                {analysis.isDateColumn ? (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    عمود تواريخ
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    تواريخ محتملة
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {analysis.enabled && (
                            <div className="w-64">
                              <Select
                                value={analysis.selectedFormat?.format || ""}
                                onValueChange={(value) => handleFormatChange(analysis.column, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر تنسيق التاريخ" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DATE_FORMATS.map((format) => (
                                    <SelectItem key={format.format} value={format.format}>
                                      <div className="flex items-center justify-between w-full">
                                        <span>{format.label}</span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          {format.example}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {/* عينة من التواريخ المكتشفة */}
                        <div className="mt-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium mb-2">قيم العينة:</p>
                              <div className="space-y-1">
                                {analysis.results.slice(0, 3).map((result, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                      {result.originalValue}
                                    </span>
                                    {result.isDate && (
                                      <div className="flex items-center gap-1">
                                        <div 
                                          className={`w-2 h-2 rounded-full ${getConfidenceColor(result.confidence)}`}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          {result.confidence}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {analysis.suggestedFormat && (
                              <div>
                                <p className="font-medium mb-2">التنسيق المقترح:</p>
                                <Badge variant="secondary">
                                  {analysis.suggestedFormat.label}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* معاينة البيانات المحولة */}
            {previewData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>معاينة البيانات بعد التحويل</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-border">
                      <thead>
                        <tr className="bg-muted">
                          {Object.keys(previewData[0] || {}).map((column) => (
                            <th key={column} className="border border-border p-2 text-right">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, idx) => (
                          <tr key={idx}>
                            {Object.entries(row).map(([column, value]) => (
                              <td key={column} className="border border-border p-2">
                                {analyses.find(a => a.column === column && a.enabled) ? (
                                  <span className="text-green-600 font-medium">
                                    {String(value)}
                                  </span>
                                ) : (
                                  String(value)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={!analyses.some(a => a.enabled)}
              >
                تطبيق التحويلات
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
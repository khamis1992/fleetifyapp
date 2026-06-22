import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Info, Download } from "lucide-react";

interface CSVDiagnosticsProps {
  diagnostics: {
    totalRows: number;
    validRows: number;
    rejectedRows: number;
    columnMapping: Record<string, any>;
    missingColumns: string[];
    detectedColumns: string[];
    commonErrors: Array<{ type: string; count: number; description: string }>;
  };
  onDownloadErrorReport: () => void;
  onRetry: () => void;
}

export function CSVDiagnostics({ 
  diagnostics, 
  onDownloadErrorReport, 
  onRetry 
}: CSVDiagnosticsProps) {
  const {
    totalRows,
    validRows,
    rejectedRows,
    columnMapping,
    missingColumns,
    detectedColumns,
    commonErrors
  } = diagnostics;

  const successRate = totalRows > 0 ? ((validRows / totalRows) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className={`border-2 ${
        successRate >= 80 ? 'border-green-200 bg-green-50' :
        successRate >= 50 ? 'border-yellow-200 bg-yellow-50' :
        'border-red-200 bg-red-50'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {successRate >= 80 ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            )}
            تقرير تحليل ملف CSV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalRows}</div>
              <div className="text-sm text-muted-foreground">إجمالي الصفوف</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{validRows}</div>
              <div className="text-sm text-muted-foreground">صفوف صحيحة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{rejectedRows}</div>
              <div className="text-sm text-muted-foreground">صفوف مرفوضة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(successRate)}%</div>
              <div className="text-sm text-muted-foreground">معدل النجاح</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            تحليل الأعمدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">الأعمدة المكتشفة ({detectedColumns.length})</h4>
            <div className="flex flex-wrap gap-2">
              {detectedColumns.map(col => (
                <Badge key={col} variant="outline" className="text-xs">
                  {col}
                </Badge>
              ))}
            </div>
          </div>

          {missingColumns.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-red-600">أعمدة مطلوبة مفقودة ({missingColumns.length})</h4>
              <div className="flex flex-wrap gap-2">
                {missingColumns.map(col => (
                  <Badge key={col} variant="destructive" className="text-xs">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium mb-2">نموذج من البيانات المكتشفة</h4>
            <div className="bg-muted p-3 rounded-md text-sm">
              <pre className="whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(columnMapping, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Errors */}
      {commonErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              الأخطاء الشائعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commonErrors.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <div className="font-medium text-red-700">{error.type}</div>
                    <div className="text-sm text-muted-foreground">{error.description}</div>
                  </div>
                  <Badge variant="outline" className="text-red-600">
                    {error.count} مرة
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {rejectedRows > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onDownloadErrorReport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            تحميل تقرير الأخطاء
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRetry}
        >
          المحاولة مرة أخرى
        </Button>
      </div>

      {/* Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm">نصائح لتحسين النتائج</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>تأكد من استخدام القالب الصحيح المحمل من النظام</li>
            <li>اجعل أسماء الأعمدة باللغة الإنجليزية مثل: payment_date, amount</li>
            <li>استخدم تنسيق التاريخ: YYYY-MM-DD (مثل: 2025-01-15)</li>
            <li>تأكد من أن جميع المبالغ أرقام موجبة</li>
            <li>لا تترك خلايا فارغة في الأعمدة المطلوبة</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
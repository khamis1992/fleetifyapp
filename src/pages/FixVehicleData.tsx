import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, Car } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { addVehicleFieldsToContracts, checkVehicleFieldsInContracts } from '@/utils/addVehicleFieldsToContracts';

export default function FixVehicleData() {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [fixResult, setFixResult] = useState<any>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setCheckResult(null);

    const result = await checkVehicleFieldsInContracts();
    setCheckResult(result);
    setIsChecking(false);
  };

  const handleFix = async () => {
    setIsFixing(true);
    setFixResult(null);

    const result = await addVehicleFieldsToContracts();
    setFixResult(result);

    // After fixing, check again
    if (result.success) {
      await handleCheck();
    }

    setIsFixing(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-6 w-6" />
            إصلاح بيانات المركبات في العقود
          </CardTitle>
          <CardDescription>
            هذه الأداة تساعد في إضافة حقول المركبات المفقودة إلى جدول العقود
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Check Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">1. فحص حقول المركبات</h3>
            <Button
              onClick={handleCheck}
              disabled={isChecking}
              className="w-full sm:w-auto"
            >
              {isChecking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              فحص الحقول
            </Button>

            {checkResult && (
              <Alert className={checkResult.exists ? '' : 'border-red-500'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {checkResult.exists ? (
                    <div>
                      <p className="font-semibold text-green-600 mb-2">✅ حقول المركبات موجودة</p>
                      {checkResult.data && checkResult.data.length > 0 && (
                        <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                          <p className="font-medium mb-1">عينة من البيانات:</p>
                          <pre className="overflow-x-auto">{JSON.stringify(checkResult.data[0], null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-red-600">❌ حقول المركبات غير موجودة</p>
                      <p className="text-sm mt-1">{checkResult.error}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Fix Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">2. إضافة حقول المركبات</h3>
            <Button
              onClick={handleFix}
              disabled={isFixing}
              variant="default"
              className="w-full sm:w-auto"
            >
              {isFixing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              إضافة الحقول المفقودة
            </Button>

            {fixResult && (
              <Alert className={fixResult.success ? 'border-green-500' : 'border-red-500'}>
                {fixResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  {fixResult.success ? (
                    <div>
                      <p className="font-semibold text-green-600">✅ {fixResult.message}</p>
                      <p className="text-sm mt-2">يمكنك الآن مشاهدة معلومات المركبات في صفحة تفاصيل العقود</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-red-600">❌ فشل إضافة الحقول</p>
                      <p className="text-sm mt-1">{fixResult.error}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">تعليمات:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>اضغط على "فحص الحقول" للتحقق من وجود حقول المركبات</li>
              <li>إذا كانت الحقول غير موجودة، اضغط على "إضافة الحقول المفقودة"</li>
              <li>بعد الإضافة، ستظهر معلومات المركبات في صفحة تفاصيل العقود</li>
              <li>قد تحتاج إلى تحديث الصفحة بعد إضافة الحقول</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
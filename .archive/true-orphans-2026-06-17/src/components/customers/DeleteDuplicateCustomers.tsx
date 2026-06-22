import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const DeleteDuplicateCustomers: React.FC = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);

  // قائمة العملاء المتكررين في شركة العراف
  const duplicateCustomerIds = [
    'abc4266f-7130-42b4-8435-bdf2af914c5f',
    'b2c11c9c-41f5-4e3a-9a10-7f2cb7c13365',
    '7bf12557-685f-4add-a2fe-1c2e1d029c22',
    'f8eb6e24-f81e-4c0e-8f5c-98b30240d8be',
    '81e660b3-e4cc-40f0-bba5-690f47c7f393',
    'ad9e6556-12a1-4430-8505-681ceb31db52',
    '372b6a12-3a1d-4b64-bc3f-0614ce6cb10d',
    'f4fd7fee-5777-4f11-92df-fc435828245d',
    'dd02d5d4-fabc-43d3-9709-1d028da320e7',
    '4fd5dba3-f1fd-456c-85e0-b0c41df5d674',
    '8499e9ee-8c2b-4fda-aba5-0defb6f1da15',
    '4cf9156b-1bc4-41dd-a4cd-d19d32ab710e',
    '9a87c798-51b6-4e51-a750-641193c0cc7d',
    '3499faf9-44d4-486c-a5f9-3945fae7f01b',
    '3fb5c32a-3a2a-47b5-8777-76cb4d25f335',
    '63a59315-668c-4d39-9400-20af7bac1488',
    'd5db2b01-d000-4c36-9de1-ac099512cbfe',
    '1f6449d9-7fbf-4b4b-b8fd-e41c14a27f87',
    'c8a49e2d-c571-4c0f-ae49-3287383ccff4',
    'b81758aa-612d-462d-9ee3-53a05b2fcfc7'
  ];

  const handleDeleteDuplicates = async () => {
    setIsDeleting(true);
    setProgress(0);
    
    const companyId = '24bc0b21-4e2d-4413-9842-31719a3669f4'; // شركة العراف
    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < duplicateCustomerIds.length; i++) {
        const customerId = duplicateCustomerIds[i];
        
        try {
          const { data, error } = await supabase.rpc('enhanced_delete_customer_and_relations', {
            target_customer_id: customerId,
            target_company_id: companyId
          });
          
          if (error) {
            console.error(`خطأ في حذف العميل ${customerId}:`, error);
            errors.push(`${customerId}: ${error.message}`);
            failedCount++;
          } else if ((data as any)?.success) {
            console.log(`✅ تم حذف العميل ${customerId} بنجاح`);
            deletedCount++;
          } else {
            console.error(`فشل حذف العميل ${customerId}:`, (data as any)?.error);
            errors.push(`${customerId}: ${(data as any)?.error}`);
            failedCount++;
          }
        } catch (err: unknown) {
          console.error(`خطأ غير متوقع في حذف العميل ${customerId}:`, err);
          errors.push(`${customerId}: ${err.message}`);
          failedCount++;
        }
        
        // تحديث التقدم
        const currentProgress = ((i + 1) / duplicateCustomerIds.length) * 100;
        setProgress(currentProgress);
        
        // انتظار قصير بين العمليات لتجنب الضغط على الخادم
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // إعداد النتائج
      setResults({
        deletedCount,
        failedCount,
        errors,
        total: duplicateCustomerIds.length
      });

      if (deletedCount > 0) {
        toast.success(`تم حذف ${deletedCount} عميل متكرر بنجاح`);
      }
      
      if (failedCount > 0) {
        toast.error(`فشل في حذف ${failedCount} عميل`);
      }

    } catch (error: unknown) {
      console.error('خطأ عام في عملية الحذف:', error);
      toast.error('حدث خطأ في عملية الحذف');
      setResults({
        deletedCount,
        failedCount: duplicateCustomerIds.length - deletedCount,
        errors: [...errors, `خطأ عام: ${error.message}`],
        total: duplicateCustomerIds.length
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetResults = () => {
    setResults(null);
    setProgress(0);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          حذف العملاء المتكررين - شركة العراف
        </CardTitle>
        <CardDescription>
          تم العثور على {duplicateCustomerIds.length} عميل متكرر في شركة العراف لتاجير السيارات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!results ? (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>تحذير:</strong> هذه العملية ستحذف العملاء المتكررين وجميع البيانات المرتبطة بهم (عقود، فواتير، إلخ).
                تأكد من أن هذا ما تريد فعله.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">سيتم حذف:</h4>
              <ul className="text-sm space-y-1">
                <li>• {duplicateCustomerIds.length} عميل متكرر</li>
                <li>• جميع العقود المرتبطة</li>
                <li>• جميع الفواتير والمدفوعات</li>
                <li>• جميع البيانات الأخرى المرتبطة</li>
              </ul>
            </div>

            {isDeleting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>جاري الحذف...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <Button 
              onClick={handleDeleteDuplicates}
              disabled={isDeleting}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'جاري الحذف...' : 'حذف العملاء المتكررين'}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>انتهت العملية!</strong>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{results.deletedCount}</div>
                <div className="text-sm text-green-700">تم حذفها</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{results.failedCount}</div>
                <div className="text-sm text-red-700">فشل الحذف</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                <div className="text-sm text-blue-700">المجموع</div>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">الأخطاء:</h4>
                <div className="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                  {results.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-700 mb-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={resetResults} variant="outline" className="w-full">
              إعادة تعيين
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
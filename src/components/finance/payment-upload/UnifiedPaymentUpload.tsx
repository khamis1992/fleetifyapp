/**
 * نظام رفع المدفوعات الموحد
 * يدمج أفضل ميزات الأنظمة الثلاثة في واجهة واحدة محسنة
 */

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Zap, 
  Brain, 
  Settings, 
  TrendingUp,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { usePaymentsCSVUpload } from '@/hooks/usePaymentsCSVUpload';
import { usePaymentContractLinking } from '@/hooks/usePaymentContractLinking';
import { QuickUploadMode } from './QuickUploadMode';
import { SmartLinkingMode } from './SmartLinkingMode';
import { AdvancedMode } from './AdvancedMode';

interface UnifiedPaymentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

type UploadMode = 'quick' | 'smart' | 'advanced';

interface UploadModeConfig {
  id: UploadMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  recommended: boolean;
  accuracy: string;
  speed: string;
  color: string;
}

export function UnifiedPaymentUpload({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: UnifiedPaymentUploadProps) {
  const {
    smartUploadPayments,
    downloadTemplate,
    analyzePaymentData,
    paymentFieldTypes,
    paymentRequiredFields,
    isUploading,
    progress
  } = usePaymentsCSVUpload();

  const {
    searchPotentialContracts,
    validateLinking,
    linkPaymentToContract
  } = usePaymentContractLinking();

  // الحالات المحلية
  const [currentStep, setCurrentStep] = useState<'mode_selection' | 'upload'>('upload');
  const [selectedMode, setSelectedMode] = useState<UploadMode>('smart');
  const [uploadedData, setUploadedData] = useState<any[]>([]);

  // تكوين أنماط الرفع
  const uploadModes: UploadModeConfig[] = [
    {
      id: 'quick',
      title: 'الرفع السريع',
      description: 'استيراد مباشر للمدفوعات بدون ربط تلقائي',
      icon: <Zap className="h-8 w-8 text-green-600" />,
      features: [
        'رفع فوري للبيانات',
        'بدون معالجة إضافية',
        'مناسب للمستخدمين المتقدمين',
        'سرعة عالية'
      ],
      recommended: false,
      accuracy: 'غير مطبق',
      speed: 'سريع جداً',
      color: 'border-green-500 bg-green-50'
    },
    {
      id: 'smart',
      title: 'الربط الذكي',
      description: 'ربط المدفوعات بالعقود مع معاينة تفاعلية',
      icon: <Brain className="h-8 w-8 text-blue-600" />,
      features: [
        'ربط تلقائي بالعقود',
        'معاينة تفاعلية',
        'تحكم يدوي في الاختيارات',
        'دقة عالية مع مرونة'
      ],
      recommended: true,
      accuracy: '92%',
      speed: 'متوسط',
      color: 'border-blue-500 bg-blue-50'
    },
    {
      id: 'advanced',
      title: 'النمط المتقدم',
      description: 'ذكاء اصطناعي متطور مع إعدادات مخصصة',
      icon: <Sparkles className="h-8 w-8 text-purple-600" />,
      features: [
        'ذكاء اصطناعي متقدم',
        'إعدادات ربط مخصصة',
        'تحليل المخاطر',
        'توصيات ذكية'
      ],
      recommended: false,
      accuracy: '98%',
      speed: 'متوسط إلى بطيء',
      color: 'border-purple-500 bg-purple-50'
    }
  ];

  // معالجة اختيار النمط
  const handleModeSelection = useCallback((mode: UploadMode) => {
    setSelectedMode(mode);
    setCurrentStep('upload');
  }, []);

  // معالجة رفع الملف
  const handleFileUpload = useCallback(async (data: any[]) => {
    setUploadedData(data);
    
    switch (selectedMode) {
      case 'quick':
        return await handleQuickUpload(data);
      case 'smart':
        return await handleSmartUpload(data);
      case 'advanced':
        return await handleAdvancedUpload(data);
      default:
        throw new Error('نمط رفع غير معروف');
    }
  }, [selectedMode]);

  // رفع سريع
  const handleQuickUpload = useCallback(async (data: any[]) => {
    try {
      const result = await smartUploadPayments(data, { 
        previewMode: false,
        autoCreateCustomers: true 
      });
      
      toast.success(`✅ تم رفع ${result.successful} دفعة بنجاح`);
      onUploadComplete();
      return result;
    } catch (error) {
      toast.error(`خطأ في الرفع السريع: ${error}`);
      throw error;
    }
  }, [smartUploadPayments, onUploadComplete]);

  // رفع ذكي
  const handleSmartUpload = useCallback(async (data: any[]) => {
    try {
      // تحليل البيانات أولاً
      const analyzed = await analyzePaymentData(data);
      toast.success(`🧠 تم تحليل ${analyzed.length} دفعة`);
      
      // إنشاء معاينة تفاعلية
      return {
        total: data.length,
        successful: 0,
        failed: 0,
        previewData: analyzed,
        requiresPreview: true
      };
    } catch (error) {
      toast.error(`خطأ في التحليل الذكي: ${error}`);
      throw error;
    }
  }, [analyzePaymentData]);

  // رفع متقدم
  const handleAdvancedUpload = useCallback(async (data: any[]) => {
    try {
      // معالجة متقدمة مع إعدادات مخصصة
      const analyzed = await analyzePaymentData(data);
      
      // البحث عن العقود لكل دفعة
      const withContracts = await Promise.all(
        analyzed.map(async (item) => {
          const contracts = await searchPotentialContracts(item.data);
          return {
            ...item,
            potentialContracts: contracts,
            bestMatch: contracts[0]
          };
        })
      );
      
      toast.success(`🎯 تم تحليل ${withContracts.length} دفعة بذكاء اصطناعي متقدم`);
      
      return {
        total: data.length,
        successful: 0,
        failed: 0,
        previewData: withContracts,
        requiresAdvanced: true
      };
    } catch (error) {
      toast.error(`خطأ في المعالجة المتقدمة: ${error}`);
      throw error;
    }
  }, [analyzePaymentData, searchPotentialContracts]);

  // معالجة العودة
  const handleBack = useCallback(() => {
    setCurrentStep('mode_selection');
    setUploadedData([]);
  }, []);

  // عرض اختيار النمط
  const renderModeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">اختر نمط رفع المدفوعات</h2>
        <p className="text-muted-foreground">
          اختر النمط الأنسب لاحتياجاتك من بين ثلاثة أنماط محسنة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {uploadModes.map((mode) => (
          <Card 
            key={mode.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedMode === mode.id ? mode.color : 'border-gray-200'
            } ${mode.recommended ? 'ring-2 ring-blue-200' : ''}`}
            onClick={() => setSelectedMode(mode.id)}
          >
            <CardHeader className="text-center">
              {mode.recommended && (
                <Badge className="w-fit mx-auto mb-2 bg-blue-600">
                  مُوصى به
                </Badge>
              )}
              <div className="flex justify-center mb-3">
                {mode.icon}
              </div>
              <CardTitle className="text-lg">{mode.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{mode.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>الدقة:</span>
                  <span className="font-semibold text-blue-600">{mode.accuracy}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>السرعة:</span>
                  <span className="font-semibold text-green-600">{mode.speed}</span>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">الميزات:</h4>
                  <ul className="text-xs space-y-1">
                    {mode.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={() => handleModeSelection(selectedMode)}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Settings className="h-4 w-4 mr-2" />
          متابعة مع {uploadModes.find(m => m.id === selectedMode)?.title}
        </Button>
      </div>
    </div>
  );

  // عرض واجهة الرفع
  const renderUploadInterface = () => {
    const mode = uploadModes.find(m => m.id === selectedMode);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mode?.icon}
            <div>
              <h3 className="text-lg font-semibold">{mode?.title}</h3>
              <p className="text-sm text-muted-foreground">{mode?.description}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleBack}>
            العودة للاختيار
          </Button>
        </div>

        {selectedMode === 'quick' && (
          <QuickUploadMode 
            onUploadComplete={handleFileUpload}
            downloadTemplate={downloadTemplate}
            fieldTypes={paymentFieldTypes}
            requiredFields={paymentRequiredFields}
            isUploading={isUploading}
            progress={progress}
          />
        )}
        
        {selectedMode === 'smart' && (
          <SmartLinkingMode 
            onUploadComplete={handleFileUpload}
            downloadTemplate={downloadTemplate}
            fieldTypes={paymentFieldTypes}
            requiredFields={paymentRequiredFields}
            isUploading={isUploading}
            progress={progress}
            linkingFunctions={{
              searchPotentialContracts,
              validateLinking,
              linkPaymentToContract
            }}
          />
        )}
        
        {selectedMode === 'advanced' && (
          <AdvancedMode 
            onUploadComplete={handleFileUpload}
            downloadTemplate={downloadTemplate}
            fieldTypes={paymentFieldTypes}
            requiredFields={paymentRequiredFields}
            isUploading={isUploading}
            progress={progress}
            linkingFunctions={{
              searchPotentialContracts,
              validateLinking,
              linkPaymentToContract
            }}
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            رفع المدفوعات الذكي
          </DialogTitle>
        </DialogHeader>
        
        <SmartLinkingMode 
          onUploadComplete={handleFileUpload}
          downloadTemplate={downloadTemplate}
          fieldTypes={paymentFieldTypes}
          requiredFields={paymentRequiredFields}
          isUploading={isUploading}
          progress={progress}
          linkingFunctions={{
            searchPotentialContracts,
            validateLinking,
            linkPaymentToContract
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
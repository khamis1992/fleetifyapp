/**
 * Taqadi Data Card Component
 * مكون بيانات تقاضي
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Copy, Check, ChevronDown, ChevronUp, User, FileText, Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLawsuitPreparationContext } from '../../store';

interface CopyableFieldProps {
  label: string;
  value: string;
  fieldId: string;
  isMultiline?: boolean;
}

function CopyableField({ label, value, fieldId, isMultiline = false }: CopyableFieldProps) {
  const { state, actions } = useLawsuitPreparationContext();
  const { ui } = state;
  const isCopied = ui.copiedField === fieldId;
  
  return (
    <div className={`p-3 bg-muted/30 rounded-lg ${isMultiline ? '' : 'flex items-center justify-between'}`}>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`${isMultiline ? 'text-sm whitespace-pre-wrap' : 'font-medium text-sm'}`}>
          {value || '-'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => actions.copyToClipboard(value, fieldId)}
        className="flex-shrink-0 mr-2"
      >
        {isCopied ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function TaqadiDataCard() {
  const { state, actions } = useLawsuitPreparationContext();
  const { taqadiData, ui } = state;
  const [activeTab, setActiveTab] = useState('case');
  
  if (!taqadiData) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mb-6"
    >
      <Collapsible open={ui.showTaqadiData} onOpenChange={actions.toggleTaqadiData}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  بيانات النسخ تقاضي
                </CardTitle>
                {ui.showTaqadiData ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="case" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    بيانات الدعوى
                  </TabsTrigger>
                  <TabsTrigger value="defendant" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    المدعى عليه
                  </TabsTrigger>
                  <TabsTrigger value="contract" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    العقد
                  </TabsTrigger>
                  <TabsTrigger value="vehicle" className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    السيارة
                  </TabsTrigger>
                </TabsList>
                
                {/* بيانات الدعوى */}
                <TabsContent value="case" className="space-y-3">
                  <CopyableField
                    label="عنوان الدعوى"
                    value={taqadiData.caseTitle}
                    fieldId="title"
                  />
                  
                  <CopyableField
                    label="الوقائع"
                    value={taqadiData.facts}
                    fieldId="facts"
                    isMultiline
                  />
                  
                  <CopyableField
                    label="الطلبات"
                    value={taqadiData.claims}
                    fieldId="claims"
                    isMultiline
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <CopyableField
                      label="المبلغ"
                      value={taqadiData.amount.toLocaleString('ar-QA')}
                      fieldId="amount"
                    />
                    <CopyableField
                      label="المبلغ كتابةً"
                      value={taqadiData.amountInWords}
                      fieldId="words"
                    />
                  </div>
                </TabsContent>
                
                {/* بيانات المدعى عليه */}
                <TabsContent value="defendant" className="space-y-3">
                  <CopyableField
                    label="الاسم الكامل"
                    value={taqadiData.defendant.fullName}
                    fieldId="def-fullname"
                  />
                  
                  <div className="grid grid-cols-3 gap-3">
                    <CopyableField
                      label="الاسم الأول"
                      value={taqadiData.defendant.firstName || '-'}
                      fieldId="def-firstname"
                    />
                    <CopyableField
                      label="الاسم الأوسط"
                      value={taqadiData.defendant.middleName || '-'}
                      fieldId="def-middlename"
                    />
                    <CopyableField
                      label="اسم العائلة"
                      value={taqadiData.defendant.lastName || '-'}
                      fieldId="def-lastname"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <CopyableField
                      label="رقم الهوية"
                      value={taqadiData.defendant.idNumber || '-'}
                      fieldId="def-idnumber"
                    />
                    <CopyableField
                      label="نوع الهوية"
                      value={taqadiData.defendant.idType || '-'}
                      fieldId="def-idtype"
                    />
                  </div>
                  
                  <CopyableField
                    label="الجنسية"
                    value={taqadiData.defendant.nationality || '-'}
                    fieldId="def-nationality"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <CopyableField
                      label="رقم الهاتف"
                      value={taqadiData.defendant.phone || '-'}
                      fieldId="def-phone"
                    />
                    <CopyableField
                      label="البريد الإلكتروني"
                      value={taqadiData.defendant.email || '-'}
                      fieldId="def-email"
                    />
                  </div>
                  
                  <CopyableField
                    label="العنوان"
                    value={taqadiData.defendant.address || '-'}
                    fieldId="def-address"
                    isMultiline
                  />
                </TabsContent>
                
                {/* بيانات العقد */}
                <TabsContent value="contract" className="space-y-3">
                  <CopyableField
                    label="رقم العقد"
                    value={taqadiData.contract.contractNumber}
                    fieldId="contract-number"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <CopyableField
                      label="تاريخ بدء العقد"
                      value={new Date(taqadiData.contract.startDate).toLocaleDateString('ar-QA')}
                      fieldId="contract-start"
                    />
                    <CopyableField
                      label="تاريخ انتهاء العقد"
                      value={taqadiData.contract.endDate 
                        ? new Date(taqadiData.contract.endDate).toLocaleDateString('ar-QA')
                        : '-'
                      }
                      fieldId="contract-end"
                    />
                  </div>
                  
                  <CopyableField
                    label="القيمة الإيجارية الشهرية"
                    value={taqadiData.contract.monthlyAmount 
                      ? `${taqadiData.contract.monthlyAmount.toLocaleString('ar-QA')} ر.ق`
                      : '-'
                    }
                    fieldId="contract-monthly"
                  />
                </TabsContent>
                
                {/* بيانات السيارة */}
                <TabsContent value="vehicle" className="space-y-3">
                  <CopyableField
                    label="وصف السيارة الكامل"
                    value={taqadiData.vehicle.fullDescription}
                    fieldId="vehicle-full"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <CopyableField
                      label="الماركة"
                      value={taqadiData.vehicle.make || '-'}
                      fieldId="vehicle-make"
                    />
                    <CopyableField
                      label="الموديل"
                      value={taqadiData.vehicle.model || '-'}
                      fieldId="vehicle-model"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <CopyableField
                      label="السنة"
                      value={taqadiData.vehicle.year?.toString() || '-'}
                      fieldId="vehicle-year"
                    />
                    <CopyableField
                      label="رقم اللوحة"
                      value={taqadiData.vehicle.plateNumber || '-'}
                      fieldId="vehicle-plate"
                    />
                    <CopyableField
                      label="اللون"
                      value={taqadiData.vehicle.color || '-'}
                      fieldId="vehicle-color"
                    />
                  </div>
                  
                  <CopyableField
                    label="رقم الشاسيه (VIN)"
                    value={taqadiData.vehicle.vin || '-'}
                    fieldId="vehicle-vin"
                  />
                </TabsContent>
              </Tabs>
              
              {/* Copy All Button */}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  const allText = `
=== بيانات الدعوى ===
عنوان الدعوى: ${taqadiData.caseTitle}

الوقائع:
${taqadiData.facts}

الطلبات:
${taqadiData.claims}

المبلغ: ${taqadiData.amount.toLocaleString('ar-QA')} ر.ق
المبلغ كتابةً: ${taqadiData.amountInWords}

=== بيانات المدعى عليه ===
الاسم الكامل: ${taqadiData.defendant.fullName}
الاسم الأول: ${taqadiData.defendant.firstName || '-'}
الاسم الأوسط: ${taqadiData.defendant.middleName || '-'}
اسم العائلة: ${taqadiData.defendant.lastName || '-'}
رقم الهوية: ${taqadiData.defendant.idNumber || '-'}
نوع الهوية: ${taqadiData.defendant.idType || '-'}
الجنسية: ${taqadiData.defendant.nationality || '-'}
الهاتف: ${taqadiData.defendant.phone || '-'}
البريد الإلكتروني: ${taqadiData.defendant.email || '-'}
العنوان: ${taqadiData.defendant.address || '-'}

=== بيانات العقد ===
رقم العقد: ${taqadiData.contract.contractNumber}
تاريخ البدء: ${new Date(taqadiData.contract.startDate).toLocaleDateString('ar-QA')}
تاريخ الانتهاء: ${taqadiData.contract.endDate ? new Date(taqadiData.contract.endDate).toLocaleDateString('ar-QA') : '-'}
القيمة الشهرية: ${taqadiData.contract.monthlyAmount ? taqadiData.contract.monthlyAmount.toLocaleString('ar-QA') + ' ر.ق' : '-'}

=== بيانات السيارة ===
الوصف الكامل: ${taqadiData.vehicle.fullDescription}
الماركة: ${taqadiData.vehicle.make || '-'}
الموديل: ${taqadiData.vehicle.model || '-'}
السنة: ${taqadiData.vehicle.year || '-'}
رقم اللوحة: ${taqadiData.vehicle.plateNumber || '-'}
اللون: ${taqadiData.vehicle.color || '-'}
رقم الشاسيه: ${taqadiData.vehicle.vin || '-'}
                  `.trim();
                  actions.copyToClipboard(allText, 'all');
                }}
              >
                <Copy className="h-4 w-4 ml-2" />
                نسخ جميع البيانات
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
}

export default TaqadiDataCard;

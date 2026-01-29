/**
 * Taqadi Data Card Component
 * مكون بيانات تقاضي
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
                  بيانات تقاضي (للنسخ)
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
            <CardContent className="space-y-4 pt-0">
              {/* Case Title */}
              <CopyableField
                label="عنوان الدعوى"
                value={taqadiData.caseTitle}
                fieldId="title"
              />
              
              {/* Facts */}
              <CopyableField
                label="الوقائع"
                value={taqadiData.facts}
                fieldId="facts"
                isMultiline
              />
              
              {/* Claims */}
              <CopyableField
                label="الطلبات"
                value={taqadiData.claims}
                fieldId="claims"
                isMultiline
              />
              
              {/* Amount */}
              <div className="grid grid-cols-2 gap-3">
                <CopyableField
                  label="المبلغ"
                  value={taqadiData.amount.toLocaleString('ar-QA')}
                  fieldId="amount"
                />
                <CopyableField
                  label="كتابةً"
                  value={taqadiData.amountInWords}
                  fieldId="words"
                />
              </div>
              
              {/* Copy All Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const allText = `
عنوان الدعوى:
${taqadiData.caseTitle}

الوقائع:
${taqadiData.facts}

الطلبات:
${taqadiData.claims}

المبلغ: ${taqadiData.amount.toLocaleString('ar-QA')} ر.ق
${taqadiData.amountInWords}
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

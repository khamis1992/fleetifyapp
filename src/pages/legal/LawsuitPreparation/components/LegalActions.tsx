/**
 * Legal Actions Component
 * مكون الإجراءات القانونية النهائية
 * 
 * Displays final action buttons, readiness checklist, and case status
 * for the lawsuit preparation workflow.
 */

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FileStack,
  CheckCircle,
  FolderDown,
  Gavel,
  Shield,
  ListCheck,
  FileText,
  Database,
  Circle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useLawsuitPreparationContext } from '../store';

interface ChecklistItemProps {
  label: string;
  isComplete: boolean;
  isLoading?: boolean;
  icon: React.ReactNode;
}

function ChecklistItem({ label, isComplete, isLoading, icon }: ChecklistItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-slate-100">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isComplete
          ? 'bg-emerald-500/20 text-emerald-500'
          : isLoading
          ? 'bg-teal-600/20 text-teal-600'
          : 'bg-slate-200 text-slate-500'
      }`}>
        {isLoading ? (
          <LoadingSpinner className="h-4 w-4" />
        ) : isComplete ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${
          isComplete ? 'text-slate-900' : 'text-slate-600'
        }`}>
          {label}
        </p>
      </div>
      <div className="flex-shrink-0">
        {icon}
      </div>
    </div>
  );
}

export function LegalActions() {
  const { t: _t } = useTranslation();
  const { state, actions } = useLawsuitPreparationContext();
  const { documents, ui, taqadiData } = state;
  


  // Check mandatory documents readiness
  const mandatoryDocs = [
    documents.memo,
    documents.claims,
    documents.docsList,
    documents.contract,
    documents.commercialRegister,
    documents.ibanCertificate,
    documents.representativeId,
  ].filter(doc => doc.type === 'mandatory');

  const allMandatoryDocsReady = mandatoryDocs.every(doc => doc.status === 'ready');
  const readyCount = mandatoryDocs.filter(doc => doc.status === 'ready').length;

  // Check Taqadi data
  const hasTaqadiData = !!(taqadiData !== null && taqadiData.caseTitle && taqadiData.defendant.fullName);

  // Check contract upload
  const contractUploaded = documents.contract.status === 'ready';

  // Overall readiness
  const allRequirementsMet = allMandatoryDocsReady && hasTaqadiData && contractUploaded;

  // Check if any documents can be downloaded
  const hasDocumentsForZip = mandatoryDocs.some(doc => doc.status === 'ready');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="space-y-4"
    >
      {/* Readiness Checklist Card */}
      <Card className="bg-white border-slate-200 shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600/20 flex items-center justify-center">
                <ListCheck className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-slate-900 text-lg">
                  قائمة التحقق
                </CardTitle>
                <CardDescription className="text-slate-600">
                  متطلبات فتح القضية
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={allRequirementsMet ? 'default' : 'secondary'}
              className={`${
                allRequirementsMet
                  ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                  : 'bg-teal-600/20 text-teal-600'
              }`}
            >
              {allRequirementsMet ? (
                <>
                  <CheckCircle className="h-3 w-3 ml-1" />
                  جاهز
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 ml-1" />
                  قيد الإعداد
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-2">
          <ChecklistItem
            label="جميع المستندات الإلزامية جاهزة"
            isComplete={allMandatoryDocsReady}
            isLoading={ui.isGeneratingAll}
            icon={
              <Badge variant="outline" className="border-slate-300 text-slate-600">
                {readyCount}/{mandatoryDocs.length}
              </Badge>
            }
          />

          <ChecklistItem
            label="بيانات تقدي مكتملة"
            isComplete={hasTaqadiData}
            icon={<Database className="h-4 w-4 text-slate-500" />}
          />

          <ChecklistItem
            label="عقد الإيجار مرفوع"
            isComplete={contractUploaded}
            isLoading={documents.contract.isUploading}
            icon={<FileText className="h-4 w-4 text-slate-500" />}
          />

          {!allRequirementsMet && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 rounded-md bg-teal-600/10 border border-teal-600/20"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-teal-700/80">
                  يجب إكمال جميع المتطلبات قبل فتح القضية. تأكد من توليد جميع المستندات ورفع العقد.
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${allMandatoryDocsReady ? 'bg-emerald-500/20 text-emerald-500' : 'bg-teal-600/20 text-teal-600'}`}>
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600">المستندات</p>
                <p className={`text-sm font-medium truncate ${allMandatoryDocsReady ? 'text-emerald-600' : 'text-teal-600'}`}>
                  {allMandatoryDocsReady ? 'جاهزة' : 'غير مكتملة'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ui.isRegistering ? 'bg-teal-500/20 text-teal-500' : 'bg-slate-200 text-slate-500'}`}>
                <Gavel className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600">حالة القضية</p>
                <p className={`text-sm font-medium truncate ${ui.isRegistering ? 'text-teal-600' : 'text-slate-600'}`}>
                  {ui.isRegistering ? 'جاري التسجيل...' : 'لم تسجل'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="bg-slate-200" />

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Primary Action - Mark Case as Opened */}
        <Button
          size="lg"
          onClick={actions.markCaseAsOpened}
          disabled={ui.isMarkingCaseOpened || !allRequirementsMet}
          className="w-full h-14 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold text-lg shadow-lg shadow-teal-600/25 disabled:shadow-none"
        >
          {ui.isMarkingCaseOpened ? (
            <>
              <LoadingSpinner className="h-5 w-5 ml-3" />
              جاري فتح القضية...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 ml-3" />
              تم فتح قضية
            </>
          )}
        </Button>

        {/* Secondary Actions Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Generate All Documents */}
          <Button
            size="default"
            onClick={actions.generateAllDocuments}
            disabled={ui.isGeneratingAll || ui.isRegistering}
            variant="outline"
            className="h-11 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            {ui.isGeneratingAll ? (
              <>
                <LoadingSpinner className="h-4 w-4 ml-2" />
                جاري التوليد...
              </>
            ) : (
              <>
                <FileStack className="h-4 w-4 ml-2 text-teal-600" />
                توليد الكل
              </>
            )}
          </Button>

          {/* Download All as ZIP */}
          <Button
            size="default"
            onClick={actions.downloadAllAsZip}
            disabled={!hasDocumentsForZip || ui.isDownloadingZip}
            variant="outline"
            className="h-11 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            {ui.isDownloadingZip ? (
              <>
                <LoadingSpinner className="h-4 w-4 ml-2" />
                جاري التحميل...
              </>
            ) : (
              <>
                <FolderDown className="h-4 w-4 ml-2 text-emerald-500" />
                تحميل ZIP
              </>
            )}
          </Button>
        </div>

        {/* Register Legal Case Button */}
        <Button
          size="default"
          onClick={actions.registerCase}
          disabled={ui.isRegistering || !allRequirementsMet}
          variant="ghost"
          className="w-full h-10 text-slate-600 hover:text-slate-800 hover:bg-slate-100"
        >
          {ui.isRegistering ? (
            <>
              <LoadingSpinner className="h-4 w-4 ml-2" />
              جاري تسجيل القضية...
            </>
          ) : (
            <>
              <Gavel className="h-4 w-4 ml-2" />
              تسجيل القضية في النظام
            </>
          )}
        </Button>
      </div>

    </motion.div>
  );
}

export default LegalActions;

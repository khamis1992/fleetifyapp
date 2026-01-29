/**
 * Action Bar Component
 * مكون شريط الإجراءات
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Gavel, 
  FileStack, 
  FolderDown, 
  Send, 
  Upload, 
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useLawsuitPreparationContext } from '../../store';

export function ActionBar() {
  const navigate = useNavigate();
  const { state, actions } = useLawsuitPreparationContext();
  const { ui } = state;
  
  const allMandatoryReady = ui.progress.percentage === 100;
  
  return (
    <>
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 ml-2" />
        رجوع
      </Button>
      
      {/* Main Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="sticky bottom-4"
      >
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
              {/* Generate All Documents */}
              <Button
                size="lg"
                onClick={actions.generateAllDocuments}
                disabled={ui.isGeneratingAll || ui.isRegistering}
                variant="outline"
                className="w-full sm:w-auto border-amber-500 text-amber-700 hover:bg-amber-50 hover:border-amber-600"
              >
                {ui.isGeneratingAll ? (
                  <>
                    <LoadingSpinner className="h-5 w-5 ml-2" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <FileStack className="h-5 w-5 ml-2" />
                    توليد جميع المستندات
                  </>
                )}
              </Button>
              
              {/* Register Case */}
              <Button
                size="lg"
                onClick={actions.registerCase}
                disabled={ui.isRegistering || !allMandatoryReady}
                className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
              >
                {ui.isRegistering ? (
                  <>
                    <LoadingSpinner className="h-5 w-5 ml-2" />
                    جاري التسجيل...
                  </>
                ) : (
                  <>
                    <Gavel className="h-5 w-5 ml-2" />
                    تسجيل القضية في النظام
                  </>
                )}
              </Button>
              
              {/* Send to Lawsuit Data */}
              <Button
                variant="outline"
                size="lg"
                onClick={actions.sendToLawsuitData}
                disabled={ui.isSendingToLawsuitData || !state.taqadiData}
                className="w-full sm:w-auto border-purple-500 text-purple-700 hover:bg-purple-50 hover:border-purple-600"
              >
                {ui.isSendingToLawsuitData ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 ml-2" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 ml-2" />
                    إرسال إلى بيانات تقاضي
                  </>
                )}
              </Button>
              
              {/* Download ZIP */}
              <Button
                variant="outline"
                size="lg"
                onClick={actions.downloadAllAsZip}
                disabled={ui.isDownloadingZip}
                className="w-full sm:w-auto border-green-500 text-green-700 hover:bg-green-50 hover:border-green-600"
              >
                {ui.isDownloadingZip ? (
                  <>
                    <LoadingSpinner className="h-5 w-5 ml-2" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    <FolderDown className="h-5 w-5 ml-2" />
                    تحميل الكل ZIP
                  </>
                )}
              </Button>
              
              {/* Taqadi Automation */}
              {!ui.isTaqadiAutomating ? (
                <Button
                  size="lg"
                  onClick={actions.startTaqadiAutomation}
                  disabled={!allMandatoryReady || !ui.taqadiServerRunning}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Upload className="h-5 w-5 ml-2" />
                  رفع إلى تقاضي (أتمتة)
                  {!ui.taqadiServerRunning && (
                    <Badge variant="destructive" className="mr-2 text-xs">
                      متوقف
                    </Badge>
                  )}
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={actions.stopTaqadiAutomation}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <AlertCircle className="h-5 w-5 ml-2" />
                  إيقاف الأتمتة
                </Button>
              )}
            </div>
            
            {/* Automation Status */}
            {(ui.isTaqadiAutomating || ui.taqadiAutomationStatus) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  {ui.isTaqadiAutomating && <LoadingSpinner className="h-4 w-4" />}
                  <span className="text-sm font-medium text-blue-900">
                    {ui.taqadiAutomationStatus || 'جاري المعالجة...'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Warning if not all ready */}
            {!allMandatoryReady && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                ⚠️ يجب تجهيز جميع المستندات المولدة ({ui.progress.ready}/{ui.progress.total}) قبل رفع الدعوى
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

export default ActionBar;

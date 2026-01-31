/**
 * Action Bar Component
 * مكون شريط الإجراءات
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileStack, 
  ArrowLeft,
  Database,
  CheckCircle,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLawsuitPreparationContext } from '../../store';

export function ActionBar() {
  const navigate = useNavigate();
  const { state, actions } = useLawsuitPreparationContext();
  const { ui } = state;
  
  return (
    <>
      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 ml-2" />
          رجوع
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/legal/lawsuit-data')}
          className="border-teal-300 text-teal-700 hover:bg-teal-50"
        >
          <Database className="h-4 w-4 ml-2" />
          عرض جميع القضايا
        </Button>
      </div>
      
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
              
              {/* Mark Case as Opened */}
              <Button
                size="lg"
                onClick={actions.markCaseAsOpened}
                disabled={ui.isMarkingCaseOpened}
                className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                {ui.isMarkingCaseOpened ? (
                  <>
                    <LoadingSpinner className="h-5 w-5 ml-2" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 ml-2" />
                    تم فتح قضية
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

export default ActionBar;

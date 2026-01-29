/**
 * Lawsuit Preparation Page - Refactored
 * صفحة تجهيز الدعوى - معاد تصميمها
 * 
 * Architecture:
 * - Uses Context + Reducer for state management
 * - Modular components for each section
 * - Separated concerns (UI, logic, data)
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Store
import { LawsuitPreparationProvider, useLawsuitPreparationContext } from './store';

// Components
import { CaseSummary, QuickStats } from './components/Header';
import { MandatoryDocs, OptionalDocs } from './components/DocumentList';
import { TaqadiDataCard } from './components/TaqadiSection';
import { ActionBar } from './components/Actions';

// ==========================================
// Inner Component (uses context)
// ==========================================

function LawsuitPreparationContent() {
  const { state } = useLawsuitPreparationContext();
  const { ui, contract } = state;
  
  // Loading State
  if (ui.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <span className="mr-2 text-muted-foreground">جاري تحميل البيانات...</span>
      </div>
    );
  }
  
  // Error State - No Contract
  if (!contract) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>لم يتم العثور على العقد</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-4xl" dir="rtl">
      <ActionBar />
      <CaseSummary />
      <QuickStats />
      <MandatoryDocs />
      <OptionalDocs />
      <TaqadiDataCard />
    </div>
  );
}

// ==========================================
// Main Component (with Provider)
// ==========================================

export default function LawsuitPreparationPage() {
  const { contractId } = useParams<{ contractId: string }>();
  
  if (!contractId) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>معرف العقد مطلوب</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <LawsuitPreparationProvider contractId={contractId}>
      <LawsuitPreparationContent />
    </LawsuitPreparationProvider>
  );
}

// Named export for lazy loading
export { LawsuitPreparationPage };

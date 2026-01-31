/**
 * Lawsuit Preparation Page - Redesigned Legal Professional Theme
 * صفحة تجهيز الدعوى - تصميم احترافي قانوني
 * 
 * Design:
 * - Legal Professional aesthetic with dark theme
 * - Tabbed organization for better workflow
 * - Gold/bronze accents for premium legal feel
 * - All current features maintained
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText, Gavel, FolderOpen, Activity } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Store
import { LawsuitPreparationProvider, useLawsuitPreparationContext } from './store';

// Styles
import './LegalTheme.css';

// New Components
import { LegalHeader } from './components/LegalHeader';
import { LegalOverview } from './components/LegalOverview';
import { LegalDocuments } from './components/LegalDocuments';
import { LegalTaqadi } from './components/LegalTaqadi';
import { LegalActions } from './components/LegalActions';

// ==========================================
// Types
// ==========================================

type TabId = 'overview' | 'documents' | 'taqadi' | 'actions';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// ==========================================
// Tab Configuration
// ==========================================

const TABS: Tab[] = [
  {
    id: 'overview',
    label: 'ملخص القضية',
    icon: <Activity className="h-5 w-5" />,
    description: 'نظرة عامة على بيانات العقد والعميل'
  },
  {
    id: 'documents',
    label: 'المستندات',
    icon: <FileText className="h-5 w-5" />,
    description: 'توليد وإدارة المستندات القانونية'
  },
  {
    id: 'taqadi',
    label: 'بيانات التقاضي',
    icon: <Gavel className="h-5 w-5" />,
    description: 'البيانات المطلوبة لنظام التقاضي'
  },
  {
    id: 'actions',
    label: 'الإجراءات',
    icon: <FolderOpen className="h-5 w-5" />,
    description: 'فتح القضية وإرسال البيانات'
  }
];

// ==========================================
// Tab Navigation Component
// ==========================================

function LegalTabs({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  return (
    <div className="legal-tabs-container">
      <div className="flex flex-wrap gap-2 p-2 bg-slate-100/50 rounded-xl border border-slate-200 backdrop-blur-sm">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-3 px-6 py-3 rounded-lg transition-all duration-300
                ${isActive
                  ? 'bg-gradient-to-r from-teal-600/20 to-teal-700/20 text-teal-600 border border-teal-600/50 shadow-lg shadow-teal-600/10'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
                }
              `}
            >
              <span className={isActive ? 'text-teal-500' : 'text-slate-500'}>
                {tab.icon}
              </span>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm">{tab.label}</span>
                <span className={`text-xs ${isActive ? 'text-teal-600/70' : 'text-slate-500'}`}>
                  {tab.description}
                </span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-teal-600/5"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// Tab Content Component
// ==========================================

function TabContent({ activeTab }: { activeTab: TabId }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mt-6"
      >
        {activeTab === 'overview' && <LegalOverview />}
        {activeTab === 'documents' && <LegalDocuments />}
        {activeTab === 'taqadi' && <LegalTaqadi />}
        {activeTab === 'actions' && <LegalActions />}
      </motion.div>
    </AnimatePresence>
  );
}

// ==========================================
// Main Content Component
// ==========================================

function LawsuitPreparationContent() {
  const { state } = useLawsuitPreparationContext();
  const { ui, contract } = state;
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  
  // Loading State
  if (ui.isLoading) {
    return (
      <div className="legal-loading-container">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <LoadingSpinner className="h-12 w-12 text-teal-600" />
          <span className="text-slate-600 text-lg">جاري تحميل بيانات القضية...</span>
        </div>
      </div>
    );
  }
  
  // Error State - No Contract
  if (!contract) {
    return (
      <div className="legal-error-container">
        <Alert variant="destructive" className="bg-red-950/50 border-red-800/50 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertDescription className="text-lg">لم يتم العثور على العقد</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="legal-page-container" dir="rtl">
      {/* Legal Header */}
      <LegalHeader />
      
      {/* Tab Navigation */}
      <LegalTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Tab Content */}
      <TabContent activeTab={activeTab} />
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
      <div className="legal-error-container">
        <Alert variant="destructive" className="bg-red-950/50 border-red-800/50 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertDescription className="text-lg">معرف العقد مطلوب</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <LawsuitPreparationProvider contractId={contractId}>
      <div className="min-h-screen bg-slate-50">
        <LawsuitPreparationContent />
      </div>
    </LawsuitPreparationProvider>
  );
}

// Named export for lazy loading
export { LawsuitPreparationPage };

// Legal AI System - Unified Export File
export { EnhancedLegalAIInterface_v2 } from './EnhancedLegalAIInterface_v2';
export { APIKeySettings } from './APIKeySettings';
export { LegalDocumentGenerator } from './LegalDocumentGenerator';
export { RiskAnalyzer } from './RiskAnalyzer';
export { default as LegalCaseCreationWizard } from './LegalCaseCreationWizard';
export { default as AutoCreateCaseTriggersConfig } from './AutoCreateCaseTriggersConfig';
export { default as CaseStatusManager } from './CaseStatusManager';
export { default as CaseTimeline } from './CaseTimeline';
export { default as TimelineEntryDialog } from './TimelineEntryDialog';
export { default as EnhancedLegalNoticeGenerator } from './EnhancedLegalNoticeGenerator';
export { NoticeAutoFiller } from './NoticeAutoFiller';
export { NoticeTemplates, getTemplateList } from './NoticeTemplateManager';
export { default as CaseDashboard } from './CaseDashboard';
export { default as CaseListTable } from './CaseListTable';
export { default as DeadlineAlerts } from './DeadlineAlerts';
export { default as SettlementProposal } from './SettlementProposal';
export { default as SettlementTracking } from './SettlementTracking';
export { default as SettlementCompliance } from './SettlementCompliance';

export type { TimelineEntry } from './CaseTimeline';
export type { TimelineEntryFormData } from './TimelineEntryDialog';
export type { NoticeVariables } from './NoticeTemplateManager';

// Types
export type {
  LegalAIInterfaceProps,
  LegalDocument,
  RiskAnalysis,
  RiskFactors
} from './EnhancedLegalAIInterface_v2';

// Types for enhanced contract document saving functionality

export interface ContractDocumentSavingSettings {
  auto_save_unsigned_contracts: boolean
  auto_save_signed_contracts: boolean
  auto_save_condition_reports: boolean
  auto_save_signatures: boolean
  pdf_generation_priority: 'immediate' | 'background' | 'manual'
  error_handling_mode: 'strict' | 'lenient'
  notification_preferences: {
    success: boolean
    warnings: boolean
    errors: boolean
  }
}

export interface DocumentSavingProgress {
  step: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'warning'
  message: string
  progress: number
  timestamp: string
}

export interface ContractDocumentSavingResult {
  success: boolean
  documents_created: Array<{
    id: string
    document_type: string
    document_name: string
    file_path?: string
    status: 'saved' | 'failed' | 'pending'
  }>
  warnings: string[]
  errors: string[]
  total_documents: number
  successful_saves: number
}

export interface UnsignedContractPdfData {
  contract_number: string
  contract_type: string
  customer_name: string
  vehicle_info?: string
  start_date: string
  end_date: string
  contract_amount: number
  monthly_amount: number
  terms?: string
  company_name: string
  created_date: string
  is_draft: boolean
  draft_watermark?: boolean
}

export interface DocumentSavingStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'warning'
  error?: string
  warnings?: string[]
  progress: number
  started_at?: string
  completed_at?: string
}
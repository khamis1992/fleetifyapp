export interface CustomerDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_path?: string;
  file_url?: string;
  uploaded_at: string;
  file_size?: number;
  notes?: string;
}

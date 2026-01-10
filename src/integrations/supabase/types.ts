export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      account_creation_requests: {
        Row: {
          company_id: string
          created_at: string
          direct_creation: boolean | null
          employee_id: string
          id: string
          notes: string | null
          password_expires_at: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          request_date: string
          requested_by: string
          requested_roles: string[] | null
          status: string
          temporary_password: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          direct_creation?: boolean | null
          employee_id: string
          id?: string
          notes?: string | null
          password_expires_at?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_by: string
          requested_roles?: string[] | null
          status?: string
          temporary_password?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          direct_creation?: boolean | null
          employee_id?: string
          id?: string
          notes?: string | null
          password_expires_at?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_by?: string
          requested_roles?: string[] | null
          status?: string
          temporary_password?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_creation_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_log: {
        Row: {
          affected_records: Json | null
          company_id: string
          created_at: string
          deleted_account_code: string | null
          deleted_account_id: string | null
          deleted_account_name: string | null
          deleted_by: string | null
          deletion_reason: string | null
          deletion_type: string
          id: string
          transfer_to_account_id: string | null
        }
        Insert: {
          affected_records?: Json | null
          company_id: string
          created_at?: string
          deleted_account_code?: string | null
          deleted_account_id?: string | null
          deleted_account_name?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          deletion_type: string
          id?: string
          transfer_to_account_id?: string | null
        }
        Update: {
          affected_records?: Json | null
          company_id?: string
          created_at?: string
          deleted_account_code?: string | null
          deleted_account_id?: string | null
          deleted_account_name?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          deletion_type?: string
          id?: string
          transfer_to_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_log_transfer_to_account_id_fkey"
            columns: ["transfer_to_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_log_transfer_to_account_id_fkey"
            columns: ["transfer_to_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_mappings: {
        Row: {
          chart_of_accounts_id: string
          company_id: string
          created_at: string
          default_account_type_id: string
          id: string
          is_active: boolean | null
          mapped_by: string | null
          updated_at: string
        }
        Insert: {
          chart_of_accounts_id: string
          company_id: string
          created_at?: string
          default_account_type_id: string
          id?: string
          is_active?: boolean | null
          mapped_by?: string | null
          updated_at?: string
        }
        Update: {
          chart_of_accounts_id?: string
          company_id?: string
          created_at?: string
          default_account_type_id?: string
          id?: string
          is_active?: boolean | null
          mapped_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_mappings_chart_of_accounts_id_fkey"
            columns: ["chart_of_accounts_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_mappings_chart_of_accounts_id_fkey"
            columns: ["chart_of_accounts_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_mappings_default_account_type_id_fkey"
            columns: ["default_account_type_id"]
            isOneToOne: false
            referencedRelation: "default_account_types"
            referencedColumns: ["id"]
          },
        ]
      }
      account_movement_settings: {
        Row: {
          approval_threshold: number | null
          auto_create_movements: boolean | null
          company_id: string
          created_at: string | null
          default_movement_type: string | null
          id: string
          is_active: boolean | null
          require_approval: boolean | null
          updated_at: string | null
        }
        Insert: {
          approval_threshold?: number | null
          auto_create_movements?: boolean | null
          company_id: string
          created_at?: string | null
          default_movement_type?: string | null
          id?: string
          is_active?: boolean | null
          require_approval?: boolean | null
          updated_at?: string | null
        }
        Update: {
          approval_threshold?: number | null
          auto_create_movements?: boolean | null
          company_id?: string
          created_at?: string | null
          default_movement_type?: string | null
          id?: string
          is_active?: boolean | null
          require_approval?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_movement_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_periods: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          is_adjustment_period: boolean | null
          period_name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          is_adjustment_period?: boolean | null
          period_name: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_adjustment_period?: boolean | null
          period_name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounting_templates: {
        Row: {
          company_id: string
          conditions: Json
          created_at: string
          description: string | null
          enabled: boolean
          entries: Json
          id: string
          name: string
          priority: number
          template_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          entries?: Json
          id?: string
          name: string
          priority?: number
          template_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          entries?: Json
          id?: string
          name?: string
          priority?: number
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      adaptive_rules: {
        Row: {
          category: string | null
          company_id: string
          confidence: number | null
          created_at: string | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          priority: number | null
          rule_action: string
          rule_condition: string
          success_count: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          confidence?: number | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_action: string
          rule_condition: string
          success_count?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          confidence?: number | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_action?: string
          rule_condition?: string
          success_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      advanced_late_fee_calculations: {
        Row: {
          ai_recommendations: string[] | null
          calculated_by: string | null
          calculation_date: string | null
          calculation_method: string | null
          company_id: string | null
          contract_id: string | null
          created_at: string | null
          daily_fine_rate: number | null
          days_overdue: number
          final_fine_amount: number | null
          id: string
          monthly_breakdown: Json | null
          monthly_cap_amount: number | null
          monthly_cap_applied: boolean | null
          months_overdue: number
          original_due_date: string | null
          payment_history_summary: string | null
          payment_id: string | null
          raw_daily_fine: number | null
          risk_level: string | null
          updated_at: string | null
        }
        Insert: {
          ai_recommendations?: string[] | null
          calculated_by?: string | null
          calculation_date?: string | null
          calculation_method?: string | null
          company_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          daily_fine_rate?: number | null
          days_overdue: number
          final_fine_amount?: number | null
          id?: string
          monthly_breakdown?: Json | null
          monthly_cap_amount?: number | null
          monthly_cap_applied?: boolean | null
          months_overdue: number
          original_due_date?: string | null
          payment_history_summary?: string | null
          payment_id?: string | null
          raw_daily_fine?: number | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_recommendations?: string[] | null
          calculated_by?: string | null
          calculation_date?: string | null
          calculation_method?: string | null
          company_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          daily_fine_rate?: number | null
          days_overdue?: number
          final_fine_amount?: number | null
          id?: string
          monthly_breakdown?: Json | null
          monthly_cap_amount?: number | null
          monthly_cap_applied?: boolean | null
          months_overdue?: number
          original_due_date?: string | null
          payment_history_summary?: string | null
          payment_id?: string | null
          raw_daily_fine?: number | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agreements_with_details: {
        Row: {
          agreement_number: string | null
          created_at: string | null
          customer_driver_license: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          end_date: string | null
          fines_summary: string | null
          first_payment_date: string | null
          id: string
          last_payment_date: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          paid_fines_amount: number | null
          payment_count: number | null
          payment_summary: string | null
          pending_fines_amount: number | null
          rent_amount: number | null
          start_date: string | null
          status: string | null
          total_amount: number | null
          total_fines: number | null
          total_fines_amount: number | null
          total_late_fees_paid: number | null
          total_paid_amount: number | null
          updated_at: string | null
          vehicle_status: string | null
          year: number | null
        }
        Insert: {
          agreement_number?: string | null
          created_at?: string | null
          customer_driver_license?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          end_date?: string | null
          fines_summary?: string | null
          first_payment_date?: string | null
          id: string
          last_payment_date?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          paid_fines_amount?: number | null
          payment_count?: number | null
          payment_summary?: string | null
          pending_fines_amount?: number | null
          rent_amount?: number | null
          start_date?: string | null
          status?: string | null
          total_amount?: number | null
          total_fines?: number | null
          total_fines_amount?: number | null
          total_late_fees_paid?: number | null
          total_paid_amount?: number | null
          updated_at?: string | null
          vehicle_status?: string | null
          year?: number | null
        }
        Update: {
          agreement_number?: string | null
          created_at?: string | null
          customer_driver_license?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          end_date?: string | null
          fines_summary?: string | null
          first_payment_date?: string | null
          id?: string
          last_payment_date?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          paid_fines_amount?: number | null
          payment_count?: number | null
          payment_summary?: string | null
          pending_fines_amount?: number | null
          rent_amount?: number | null
          start_date?: string | null
          status?: string | null
          total_amount?: number | null
          total_fines?: number | null
          total_fines_amount?: number | null
          total_late_fees_paid?: number | null
          total_paid_amount?: number | null
          updated_at?: string | null
          vehicle_status?: string | null
          year?: number | null
        }
        Relationships: []
      }
      ai_activity_logs: {
        Row: {
          activity_type: string
          company_id: string | null
          created_at: string
          details: Json | null
          id: string
          session_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          session_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          session_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_analysis_results: {
        Row: {
          analysis_type: string
          company_id: string
          confidence_score: number | null
          created_at: string
          created_by: string | null
          id: string
          results: Json
        }
        Insert: {
          analysis_type: string
          company_id: string
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          results?: Json
        }
        Update: {
          analysis_type?: string
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          results?: Json
        }
        Relationships: []
      }
      ai_clarification_sessions: {
        Row: {
          clarification_questions: Json
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          final_intent: string | null
          id: string
          original_query: string
          session_status: string
          user_responses: Json
        }
        Insert: {
          clarification_questions?: Json
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          final_intent?: string | null
          id?: string
          original_query: string
          session_status?: string
          user_responses?: Json
        }
        Update: {
          clarification_questions?: Json
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          final_intent?: string | null
          id?: string
          original_query?: string
          session_status?: string
          user_responses?: Json
        }
        Relationships: []
      }
      ai_learning_feedback: {
        Row: {
          clarification_session_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          feedback_comments: string | null
          feedback_rating: number | null
          feedback_type: string
          id: string
          improvement_suggestions: Json | null
          query_intent_id: string | null
        }
        Insert: {
          clarification_session_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          feedback_comments?: string | null
          feedback_rating?: number | null
          feedback_type: string
          id?: string
          improvement_suggestions?: Json | null
          query_intent_id?: string | null
        }
        Update: {
          clarification_session_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          feedback_comments?: string | null
          feedback_rating?: number | null
          feedback_type?: string
          id?: string
          improvement_suggestions?: Json | null
          query_intent_id?: string | null
        }
        Relationships: []
      }
      ai_learning_patterns: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          pattern_data: Json
          pattern_type: string
          success_rate: number | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          pattern_data: Json
          pattern_type: string
          success_rate?: number | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          pattern_data?: Json
          pattern_type?: string
          success_rate?: number | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      ai_performance_metrics: {
        Row: {
          clarification_requests: number | null
          company_id: string
          created_at: string
          id: string
          learning_improvements: number | null
          metric_date: string
          response_time_avg: number | null
          successful_classifications: number | null
          total_queries: number | null
          user_satisfaction_avg: number | null
        }
        Insert: {
          clarification_requests?: number | null
          company_id: string
          created_at?: string
          id?: string
          learning_improvements?: number | null
          metric_date?: string
          response_time_avg?: number | null
          successful_classifications?: number | null
          total_queries?: number | null
          user_satisfaction_avg?: number | null
        }
        Update: {
          clarification_requests?: number | null
          company_id?: string
          created_at?: string
          id?: string
          learning_improvements?: number | null
          metric_date?: string
          response_time_avg?: number | null
          successful_classifications?: number | null
          total_queries?: number | null
          user_satisfaction_avg?: number | null
        }
        Relationships: []
      }
      ai_query_intents: {
        Row: {
          company_id: string
          confidence_score: number | null
          context_data: Json | null
          created_at: string
          created_by: string | null
          id: string
          intent_classification: string
          normalized_query: string | null
          original_query: string
          updated_at: string
          user_confirmed: boolean | null
        }
        Insert: {
          company_id: string
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          intent_classification: string
          normalized_query?: string | null
          original_query: string
          updated_at?: string
          user_confirmed?: boolean | null
        }
        Update: {
          company_id?: string
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          intent_classification?: string
          normalized_query?: string | null
          original_query?: string
          updated_at?: string
          user_confirmed?: boolean | null
        }
        Relationships: []
      }
      amendment_change_log: {
        Row: {
          amendment_id: string
          change_impact: string | null
          created_at: string
          field_label_ar: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          value_type: string | null
        }
        Insert: {
          amendment_id: string
          change_impact?: string | null
          created_at?: string
          field_label_ar?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          value_type?: string | null
        }
        Update: {
          amendment_id?: string
          change_impact?: string | null
          created_at?: string
          field_label_ar?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          value_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amendment_change_log_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "contract_amendments"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_kyc_diligence: {
        Row: {
          adverse_media_findings: number | null
          approval_required: boolean | null
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          documents_verified: string[] | null
          due_diligence_level: string | null
          enhanced_due_diligence: boolean | null
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          last_review_date: string | null
          mitigating_factors: Json | null
          next_review_date: string | null
          notes: string | null
          ongoing_monitoring: boolean | null
          pep_status: string | null
          risk_factors: Json | null
          risk_rating: string | null
          sanctions_status: string | null
          screening_results: Json | null
          updated_at: string | null
          verification_method: string | null
          verification_score: number | null
          verification_status: string | null
        }
        Insert: {
          adverse_media_findings?: number | null
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          documents_verified?: string[] | null
          due_diligence_level?: string | null
          enhanced_due_diligence?: boolean | null
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          last_review_date?: string | null
          mitigating_factors?: Json | null
          next_review_date?: string | null
          notes?: string | null
          ongoing_monitoring?: boolean | null
          pep_status?: string | null
          risk_factors?: Json | null
          risk_rating?: string | null
          sanctions_status?: string | null
          screening_results?: Json | null
          updated_at?: string | null
          verification_method?: string | null
          verification_score?: number | null
          verification_status?: string | null
        }
        Update: {
          adverse_media_findings?: number | null
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          documents_verified?: string[] | null
          due_diligence_level?: string | null
          enhanced_due_diligence?: boolean | null
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          last_review_date?: string | null
          mitigating_factors?: Json | null
          next_review_date?: string | null
          notes?: string | null
          ongoing_monitoring?: boolean | null
          pep_status?: string | null
          risk_factors?: Json | null
          risk_rating?: string | null
          sanctions_status?: string | null
          screening_results?: Json | null
          updated_at?: string | null
          verification_method?: string | null
          verification_score?: number | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aml_kyc_diligence_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_notifications: {
        Row: {
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          read_at: string | null
          recipient_id: string
          request_id: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          read_at?: string | null
          recipient_id: string
          request_id: string
          sent_at?: string | null
        }
        Update: {
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          request_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          current_step_order: number | null
          description: string | null
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["approval_priority"] | null
          request_number: string
          requested_by: string
          source_id: string | null
          source_type: Database["public"]["Enums"]["request_source"]
          status: Database["public"]["Enums"]["approval_status"] | null
          title: string
          total_amount: number | null
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          current_step_order?: number | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          request_number: string
          requested_by: string
          source_id?: string | null
          source_type: Database["public"]["Enums"]["request_source"]
          status?: Database["public"]["Enums"]["approval_status"] | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_step_order?: number | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          request_number?: string
          requested_by?: string
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["request_source"]
          status?: Database["public"]["Enums"]["approval_status"] | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          approver_type: string
          approver_value: string
          comments: string | null
          created_at: string | null
          id: string
          request_id: string
          status: Database["public"]["Enums"]["approval_status"] | null
          step_order: number
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          approver_type: string
          approver_value: string
          comments?: string | null
          created_at?: string | null
          id?: string
          request_id: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          step_order: number
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          approver_type?: string
          approver_value?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          request_id?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_templates: {
        Row: {
          company_id: string
          contract_type: string
          created_at: string
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          steps: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contract_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          steps: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contract_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          steps?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_workflows: {
        Row: {
          company_id: string
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          source_type: Database["public"]["Enums"]["request_source"]
          steps: Json
          updated_at: string | null
          workflow_name: string
          workflow_name_ar: string | null
        }
        Insert: {
          company_id: string
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          source_type: Database["public"]["Enums"]["request_source"]
          steps?: Json
          updated_at?: string | null
          workflow_name: string
          workflow_name_ar?: string | null
        }
        Update: {
          company_id?: string
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          source_type?: Database["public"]["Enums"]["request_source"]
          steps?: Json
          updated_at?: string | null
          workflow_name?: string
          workflow_name_ar?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attendance_date: string
          auto_checkout: boolean | null
          break_end_time: string | null
          break_start_time: string | null
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_in_time: string | null
          check_out_latitude: number | null
          check_out_longitude: number | null
          check_out_time: string | null
          created_at: string
          employee_id: string
          id: string
          is_approved: boolean | null
          late_hours: number | null
          location_verified: boolean | null
          notes: string | null
          overtime_hours: number | null
          status: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_date: string
          auto_checkout?: boolean | null
          break_end_time?: string | null
          break_start_time?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_approved?: boolean | null
          late_hours?: number | null
          location_verified?: boolean | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_date?: string
          auto_checkout?: boolean | null
          break_end_time?: string | null
          break_start_time?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_approved?: boolean | null
          late_hours?: number | null
          location_verified?: boolean | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changes_summary: string | null
          company_id: string | null
          created_at: string | null
          entity_name: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          request_method: string | null
          request_path: string | null
          resource_id: string | null
          resource_type: string
          severity: string | null
          status: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          changes_summary?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_name?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          request_method?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type: string
          severity?: string | null
          status?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          changes_summary?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_name?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          request_method?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type?: string
          severity?: string | null
          status?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      audit_trail: {
        Row: {
          action: string
          changed_at: string
          changed_fields: string[] | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_fields?: string[] | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_fields?: string[] | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          data: Json
          error: string | null
          id: string
          job_type: string
          max_retries: number | null
          name: string
          priority: number | null
          progress: number | null
          result: Json | null
          retries: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          error?: string | null
          id?: string
          job_type: string
          max_retries?: number | null
          name: string
          priority?: number | null
          progress?: number | null
          result?: Json | null
          retries?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          error?: string | null
          id?: string
          job_type?: string
          max_retries?: number | null
          name?: string
          priority?: number | null
          progress?: number | null
          result?: Json | null
          retries?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "background_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_logs: {
        Row: {
          backup_type: string
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          metadata: Json | null
          records_count: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          backup_type: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          records_count?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          backup_type?: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          records_count?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          balance_after: number
          bank_id: string
          check_number: string | null
          company_id: string
          counterpart_bank_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          journal_entry_id: string | null
          reconciled: boolean | null
          reconciled_at: string | null
          reference_number: string | null
          status: string
          transaction_date: string
          transaction_number: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          balance_after: number
          bank_id: string
          check_number?: string | null
          company_id: string
          counterpart_bank_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          journal_entry_id?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reference_number?: string | null
          status?: string
          transaction_date?: string
          transaction_number: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number
          bank_id?: string
          check_number?: string | null
          company_id?: string
          counterpart_bank_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          journal_entry_id?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reference_number?: string | null
          status?: string
          transaction_date?: string
          transaction_number?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      banks: {
        Row: {
          account_number: string
          account_type: string
          address: string | null
          bank_name: string
          bank_name_ar: string | null
          branch_name: string | null
          branch_name_ar: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          currency: string
          current_balance: number | null
          email: string | null
          iban: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          notes: string | null
          opening_balance: number | null
          opening_date: string | null
          phone: string | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_number: string
          account_type?: string
          address?: string | null
          bank_name: string
          bank_name_ar?: string | null
          branch_name?: string | null
          branch_name_ar?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          currency?: string
          current_balance?: number | null
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          opening_balance?: number | null
          opening_date?: string | null
          phone?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_type?: string
          address?: string | null
          bank_name?: string
          bank_name_ar?: string | null
          branch_name?: string | null
          branch_name_ar?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          currency?: string
          current_balance?: number | null
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          opening_balance?: number | null
          opening_date?: string | null
          phone?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          address_ar: string | null
          branch_code: string
          branch_name: string
          branch_name_ar: string | null
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          branch_code: string
          branch_name: string
          branch_name_ar?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          branch_code?: string
          branch_name?: string
          branch_name_ar?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      budget_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          amount_exceeded: number
          budget_id: string
          budget_item_id: string | null
          company_id: string
          created_at: string
          current_percentage: number
          id: string
          is_acknowledged: boolean | null
          message: string
          message_ar: string | null
          threshold_percentage: number
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          amount_exceeded?: number
          budget_id: string
          budget_item_id?: string | null
          company_id: string
          created_at?: string
          current_percentage?: number
          id?: string
          is_acknowledged?: boolean | null
          message: string
          message_ar?: string | null
          threshold_percentage?: number
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          amount_exceeded?: number
          budget_id?: string
          budget_item_id?: string | null
          company_id?: string
          created_at?: string
          current_percentage?: number
          id?: string
          is_acknowledged?: boolean | null
          message?: string
          message_ar?: string | null
          threshold_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          account_id: string
          actual_amount: number | null
          budget_id: string
          budgeted_amount: number
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          variance_amount: number | null
          variance_percentage: number | null
        }
        Insert: {
          account_id: string
          actual_amount?: number | null
          budget_id: string
          budgeted_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Update: {
          account_id?: string
          actual_amount?: number | null
          budget_id?: string
          budgeted_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          accounting_period_id: string | null
          approved_at: string | null
          approved_by: string | null
          budget_name: string
          budget_year: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          net_income: number | null
          notes: string | null
          status: string
          total_expenses: number | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          accounting_period_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budget_name: string
          budget_year: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          net_income?: number | null
          notes?: string | null
          status?: string
          total_expenses?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          accounting_period_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budget_name?: string
          budget_year?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          net_income?: number | null
          notes?: string | null
          status?: string
          total_expenses?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_accounting_period_id_fkey"
            columns: ["accounting_period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      business_templates: {
        Row: {
          business_type: string
          color_scheme: Json | null
          created_at: string | null
          default_chart_accounts: Json | null
          default_modules: string[]
          default_settings: Json | null
          description: string | null
          description_ar: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          template_name: string
          template_name_ar: string | null
          updated_at: string | null
        }
        Insert: {
          business_type: string
          color_scheme?: Json | null
          created_at?: string | null
          default_chart_accounts?: Json | null
          default_modules?: string[]
          default_settings?: Json | null
          description?: string | null
          description_ar?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          template_name: string
          template_name_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          business_type?: string
          color_scheme?: Json | null
          created_at?: string | null
          default_chart_accounts?: Json | null
          default_modules?: string[]
          default_settings?: Json | null
          description?: string | null
          description_ar?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          template_name?: string
          template_name_ar?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_level: number | null
          account_name: string
          account_name_ar: string | null
          account_subtype: string | null
          account_type: string
          balance_type: string
          can_link_customers: boolean | null
          can_link_employees: boolean | null
          can_link_vendors: boolean | null
          company_id: string
          created_at: string
          current_balance: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_header: boolean | null
          is_system: boolean | null
          parent_account_code: string | null
          parent_account_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_level?: number | null
          account_name: string
          account_name_ar?: string | null
          account_subtype?: string | null
          account_type: string
          balance_type: string
          can_link_customers?: boolean | null
          can_link_employees?: boolean | null
          can_link_vendors?: boolean | null
          company_id: string
          created_at?: string
          current_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_header?: boolean | null
          is_system?: boolean | null
          parent_account_code?: string | null
          parent_account_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_level?: number | null
          account_name?: string
          account_name_ar?: string | null
          account_subtype?: string | null
          account_type?: string
          balance_type?: string
          can_link_customers?: boolean | null
          can_link_employees?: boolean | null
          can_link_vendors?: boolean | null
          company_id?: string
          created_at?: string
          current_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_header?: boolean | null
          is_system?: boolean | null
          parent_account_code?: string | null
          parent_account_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active_modules: string[] | null
          address: string | null
          address_ar: string | null
          allowed_radius: number | null
          auto_checkout_enabled: boolean | null
          business_type: string | null
          city: string | null
          commercial_register: string | null
          company_template: string | null
          country: string | null
          created_at: string
          currency: string | null
          current_plan_id: string | null
          custom_branding: Json | null
          customer_account_settings: Json | null
          email: string | null
          id: string
          industry_config: Json | null
          is_demo: boolean | null
          license_number: string | null
          logo_url: string | null
          name: string
          name_ar: string | null
          number_format_preferences: Json | null
          office_latitude: number | null
          office_longitude: number | null
          phone: string | null
          settings: Json | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_end_date: string | null
          updated_at: string
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          active_modules?: string[] | null
          address?: string | null
          address_ar?: string | null
          allowed_radius?: number | null
          auto_checkout_enabled?: boolean | null
          business_type?: string | null
          city?: string | null
          commercial_register?: string | null
          company_template?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          current_plan_id?: string | null
          custom_branding?: Json | null
          customer_account_settings?: Json | null
          email?: string | null
          id?: string
          industry_config?: Json | null
          is_demo?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          name: string
          name_ar?: string | null
          number_format_preferences?: Json | null
          office_latitude?: number | null
          office_longitude?: number | null
          phone?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          updated_at?: string
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          active_modules?: string[] | null
          address?: string | null
          address_ar?: string | null
          allowed_radius?: number | null
          auto_checkout_enabled?: boolean | null
          business_type?: string | null
          city?: string | null
          commercial_register?: string | null
          company_template?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          current_plan_id?: string | null
          custom_branding?: Json | null
          customer_account_settings?: Json | null
          email?: string | null
          id?: string
          industry_config?: Json | null
          is_demo?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          name?: string
          name_ar?: string | null
          number_format_preferences?: Json | null
          office_latitude?: number | null
          office_longitude?: number | null
          phone?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          updated_at?: string
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branding_settings: {
        Row: {
          accent_color: string | null
          background_color: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          custom_css: string | null
          favicon_url: string | null
          font_family: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          sidebar_accent_color: string | null
          sidebar_background_color: string | null
          sidebar_border_color: string | null
          sidebar_foreground_color: string | null
          system_name: string | null
          system_name_ar: string | null
          text_color: string | null
          theme_preset: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sidebar_accent_color?: string | null
          sidebar_background_color?: string | null
          sidebar_border_color?: string | null
          sidebar_foreground_color?: string | null
          system_name?: string | null
          system_name_ar?: string | null
          text_color?: string | null
          theme_preset?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sidebar_accent_color?: string | null
          sidebar_background_color?: string | null
          sidebar_border_color?: string | null
          sidebar_foreground_color?: string | null
          system_name?: string | null
          system_name_ar?: string | null
          text_color?: string | null
          theme_preset?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_legal_documents: {
        Row: {
          company_id: string
          created_at: string | null
          document_name: string
          document_type: string
          expiry_date: string | null
          file_size: number | null
          file_url: string
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          document_name: string
          document_type: string
          expiry_date?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          document_name?: string
          document_type?: string
          expiry_date?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      company_usage: {
        Row: {
          api_calls_count: number | null
          company_id: string
          contracts_count: number | null
          created_at: string | null
          customers_count: number | null
          id: string
          storage_used_mb: number | null
          usage_date: string
          users_count: number | null
          vehicles_count: number | null
        }
        Insert: {
          api_calls_count?: number | null
          company_id: string
          contracts_count?: number | null
          created_at?: string | null
          customers_count?: number | null
          id?: string
          storage_used_mb?: number | null
          usage_date?: string
          users_count?: number | null
          vehicles_count?: number | null
        }
        Update: {
          api_calls_count?: number | null
          company_id?: string
          contracts_count?: number | null
          created_at?: string | null
          customers_count?: number | null
          id?: string
          storage_used_mb?: number | null
          usage_date?: string
          users_count?: number | null
          vehicles_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_audit_trail: {
        Row: {
          action_description: string
          action_timestamp: string | null
          action_type: string
          company_id: string | null
          compliance_impact: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          requires_review: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          system_generated: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_description: string
          action_timestamp?: string | null
          action_type: string
          company_id?: string | null
          compliance_impact?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          system_generated?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_description?: string
          action_timestamp?: string | null
          action_type?: string
          company_id?: string | null
          compliance_impact?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          system_generated?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_audit_trail_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_calendar: {
        Row: {
          company_id: string | null
          completion_date: string | null
          completion_notes: string | null
          created_at: string | null
          due_date: string
          event_description: string | null
          event_title: string
          event_type: string
          file_attachments: string[] | null
          id: string
          jurisdiction: string | null
          priority: string | null
          recurring_end_date: string | null
          recurring_pattern: string | null
          reminder_days: number | null
          responsible_user_id: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          completion_date?: string | null
          completion_notes?: string | null
          created_at?: string | null
          due_date: string
          event_description?: string | null
          event_title: string
          event_type: string
          file_attachments?: string[] | null
          id?: string
          jurisdiction?: string | null
          priority?: string | null
          recurring_end_date?: string | null
          recurring_pattern?: string | null
          reminder_days?: number | null
          responsible_user_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          completion_date?: string | null
          completion_notes?: string | null
          created_at?: string | null
          due_date?: string
          event_description?: string | null
          event_title?: string
          event_type?: string
          file_attachments?: string[] | null
          id?: string
          jurisdiction?: string | null
          priority?: string | null
          recurring_end_date?: string | null
          recurring_pattern?: string | null
          reminder_days?: number | null
          responsible_user_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_calendar_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          auto_execute: boolean | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          execution_frequency: string | null
          id: string
          is_active: boolean | null
          jurisdiction: string | null
          notification_config: Json | null
          rule_category: string
          rule_code: string
          rule_config: Json
          rule_description: string | null
          rule_name: string
          rule_type: string
          severity_level: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          auto_execute?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          execution_frequency?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string | null
          notification_config?: Json | null
          rule_category: string
          rule_code: string
          rule_config: Json
          rule_description?: string | null
          rule_name: string
          rule_type: string
          severity_level?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          auto_execute?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          execution_frequency?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string | null
          notification_config?: Json | null
          rule_category?: string
          rule_code?: string
          rule_config?: Json
          rule_description?: string | null
          rule_name?: string
          rule_type?: string
          severity_level?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_validations: {
        Row: {
          action_deadline: string | null
          action_description: string | null
          action_required: boolean | null
          assigned_to: string | null
          company_id: string | null
          created_at: string | null
          entity_id: string
          entity_reference: string | null
          entity_type: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_assessment: string | null
          rule_id: string | null
          validated_at: string | null
          validation_details: Json | null
          validation_result: string
          validation_score: number | null
        }
        Insert: {
          action_deadline?: string | null
          action_description?: string | null
          action_required?: boolean | null
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_id: string
          entity_reference?: string | null
          entity_type: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_assessment?: string | null
          rule_id?: string | null
          validated_at?: string | null
          validation_details?: Json | null
          validation_result: string
          validation_score?: number | null
        }
        Update: {
          action_deadline?: string | null
          action_description?: string | null
          action_required?: boolean | null
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_id?: string
          entity_reference?: string | null
          entity_type?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_assessment?: string | null
          rule_id?: string | null
          validated_at?: string | null
          validation_details?: Json | null
          validation_result?: string
          validation_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_validations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_validations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_amendments: {
        Row: {
          amendment_number: string
          amendment_reason: string
          amendment_type: string
          amount_difference: number | null
          applied_at: string | null
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          changes_summary: Json | null
          company_id: string
          company_signature_data: string | null
          company_signed_at: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          customer_signature_data: string | null
          customer_signed: boolean | null
          customer_signed_at: string | null
          effective_date: string | null
          id: string
          new_values: Json
          original_values: Json
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_customer_signature: boolean | null
          requires_payment_adjustment: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          amendment_number: string
          amendment_reason: string
          amendment_type: string
          amount_difference?: number | null
          applied_at?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          changes_summary?: Json | null
          company_id: string
          company_signature_data?: string | null
          company_signed_at?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          customer_signature_data?: string | null
          customer_signed?: boolean | null
          customer_signed_at?: string | null
          effective_date?: string | null
          id?: string
          new_values: Json
          original_values: Json
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_customer_signature?: boolean | null
          requires_payment_adjustment?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          amendment_number?: string
          amendment_reason?: string
          amendment_type?: string
          amount_difference?: number | null
          applied_at?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          changes_summary?: Json | null
          company_id?: string
          company_signature_data?: string | null
          company_signed_at?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          customer_signature_data?: string | null
          customer_signed?: boolean | null
          customer_signed_at?: string | null
          effective_date?: string | null
          id?: string
          new_values?: Json
          original_values?: Json
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_customer_signature?: boolean | null
          requires_payment_adjustment?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contract_amendments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_amendments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contract_amendments_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contract_approval_steps: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          approver_role: string
          comments: string | null
          company_id: string
          contract_id: string
          created_at: string
          id: string
          rejected_at: string | null
          status: string
          step_order: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          approver_role: string
          comments?: string | null
          company_id: string
          contract_id: string
          created_at?: string
          id?: string
          rejected_at?: string | null
          status?: string
          step_order: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          approver_role?: string
          comments?: string | null
          company_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          rejected_at?: string | null
          status?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contract_approval_steps_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "fk_contract_approval_steps_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contract_approval_steps_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_creation_log: {
        Row: {
          attempt_number: number | null
          company_id: string
          contract_id: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          operation_step: string
          status: string
        }
        Insert: {
          attempt_number?: number | null
          company_id: string
          contract_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          operation_step: string
          status: string
        }
        Update: {
          attempt_number?: number | null
          company_id?: string
          contract_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          operation_step?: string
          status?: string
        }
        Relationships: []
      }
      contract_document_operation_log: {
        Row: {
          company_id: string
          completed_at: string | null
          contract_id: string | null
          created_at: string | null
          document_id: string | null
          error_code: string | null
          error_message: string | null
          file_path: string | null
          id: string
          metadata: Json | null
          operation_status: string
          operation_type: string
          performed_by: string | null
          retry_count: number | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          document_id?: string | null
          error_code?: string | null
          error_message?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          operation_status?: string
          operation_type: string
          performed_by?: string | null
          retry_count?: number | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          document_id?: string | null
          error_code?: string | null
          error_message?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          operation_status?: string
          operation_type?: string
          performed_by?: string | null
          retry_count?: number | null
        }
        Relationships: []
      }
      contract_documents: {
        Row: {
          company_id: string
          condition_report_id: string | null
          contract_id: string | null
          created_at: string | null
          document_name: string
          document_type: string
          file_path: string | null
          file_size: number | null
          id: string
          is_required: boolean | null
          mime_type: string | null
          notes: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          // AI Matching columns (added 2025-01-10)
          ai_match_status: 'pending' | 'matched' | 'not_matched' | 'manual_override' | 'review_required' | null
          ai_match_confidence: number | null
          matched_by: 'ai' | 'manual' | 'bulk_import' | null
          matched_at: string | null
          verified_by: string | null
          verified_at: string | null
          match_notes: string | null
          // Batch tracking columns (added 2025-01-10)
          upload_batch_id: string | null
          original_filename: string | null
          processing_status: 'uploading' | 'parsing' | 'matching' | 'complete' | 'failed' | 'review_required' | null
          processing_error: string | null
        }
        Insert: {
          company_id: string
          condition_report_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          document_name: string
          document_type?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_required?: boolean | null
          mime_type?: string | null
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          // AI Matching columns
          ai_match_status?: 'pending' | 'matched' | 'not_matched' | 'manual_override' | 'review_required' | null
          ai_match_confidence?: number | null
          matched_by?: 'ai' | 'manual' | 'bulk_import' | null
          matched_at?: string | null
          verified_by?: string | null
          verified_at?: string | null
          match_notes?: string | null
          // Batch tracking columns
          upload_batch_id?: string | null
          original_filename?: string | null
          processing_status?: 'uploading' | 'parsing' | 'matching' | 'complete' | 'failed' | 'review_required' | null
          processing_error?: string | null
        }
        Update: {
          company_id?: string
          condition_report_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          document_name?: string
          document_type?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_required?: boolean | null
          mime_type?: string | null
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          // AI Matching columns
          ai_match_status?: 'pending' | 'matched' | 'not_matched' | 'manual_override' | 'review_required' | null
          ai_match_confidence?: number | null
          matched_by?: 'ai' | 'manual' | 'bulk_import' | null
          matched_at?: string | null
          verified_by?: string | null
          verified_at?: string | null
          match_notes?: string | null
          // Batch tracking columns
          upload_batch_id?: string | null
          original_filename?: string | null
          processing_status?: 'uploading' | 'parsing' | 'matching' | 'complete' | 'failed' | 'review_required' | null
          processing_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_condition_report_id_fkey"
            columns: ["condition_report_id"]
            isOneToOne: false
            referencedRelation: "vehicle_condition_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_drafts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          current_step: number
          data: Json
          id: string
          last_saved_at: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          current_step?: number
          data?: Json
          id?: string
          last_saved_at?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          current_step?: number
          data?: Json
          id?: string
          last_saved_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_notifications: {
        Row: {
          company_id: string
          contract_id: string
          created_at: string
          delivery_status: string | null
          id: string
          message: string
          notification_type: string
          recipient_email: string | null
          recipient_id: string
          recipient_phone: string | null
          sent_at: string | null
          title: string
        }
        Insert: {
          company_id: string
          contract_id: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          message: string
          notification_type: string
          recipient_email?: string | null
          recipient_id: string
          recipient_phone?: string | null
          sent_at?: string | null
          title: string
        }
        Update: {
          company_id?: string
          contract_id?: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          message?: string
          notification_type?: string
          recipient_email?: string | null
          recipient_id?: string
          recipient_phone?: string | null
          sent_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contract_notifications_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "fk_contract_notifications_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contract_notifications_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_number_history: {
        Row: {
          contract_id: string
          id: string
          new_contract_number: string
          old_contract_number: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          contract_id: string
          id?: string
          new_contract_number: string
          old_contract_number: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          contract_id?: string
          id?: string
          new_contract_number?: string
          old_contract_number?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      contract_operations_log: {
        Row: {
          company_id: string
          contract_id: string
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          operation_details: Json | null
          operation_type: string
          performed_at: string | null
          performed_by: string | null
        }
        Insert: {
          company_id: string
          contract_id: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          operation_details?: Json | null
          operation_type: string
          performed_at?: string | null
          performed_by?: string | null
        }
        Update: {
          company_id?: string
          contract_id?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          operation_details?: Json | null
          operation_type?: string
          performed_at?: string | null
          performed_by?: string | null
        }
        Relationships: []
      }
      contract_payment_schedules: {
        Row: {
          amount: number
          company_id: string
          contract_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          installment_number: number
          invoice_id: string | null
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          installment_number: number
          invoice_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          invoice_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          account_id: string | null
          account_mappings: Json
          approval_threshold: number
          auto_calculate_pricing: boolean
          company_id: string
          contract_type: string
          created_at: string
          created_by: string
          default_duration_days: number
          default_terms: string | null
          id: string
          is_active: boolean
          requires_approval: boolean
          template_name: string
          template_name_ar: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_mappings?: Json
          approval_threshold?: number
          auto_calculate_pricing?: boolean
          company_id: string
          contract_type: string
          created_at?: string
          created_by: string
          default_duration_days?: number
          default_terms?: string | null
          id?: string
          is_active?: boolean
          requires_approval?: boolean
          template_name: string
          template_name_ar?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_mappings?: Json
          approval_threshold?: number
          auto_calculate_pricing?: boolean
          company_id?: string
          contract_type?: string
          created_at?: string
          created_by?: string
          default_duration_days?: number
          default_terms?: string | null
          id?: string
          is_active?: boolean
          requires_approval?: boolean
          template_name?: string
          template_name_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contract_templates_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contract_templates_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_vehicle_returns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          contract_id: string
          created_at: string
          damages: Json | null
          fuel_level: number | null
          id: string
          notes: string | null
          odometer_reading: number | null
          rejection_reason: string | null
          return_date: string
          returned_by: string
          status: string
          updated_at: string
          vehicle_condition: string
          vehicle_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          contract_id: string
          created_at?: string
          damages?: Json | null
          fuel_level?: number | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          rejection_reason?: string | null
          return_date: string
          returned_by: string
          status?: string
          updated_at?: string
          vehicle_condition?: string
          vehicle_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          contract_id?: string
          created_at?: string
          damages?: Json | null
          fuel_level?: number | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          rejection_reason?: string | null
          return_date?: string
          returned_by?: string
          status?: string
          updated_at?: string
          vehicle_condition?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      contract_vehicles: {
        Row: {
          allocated_amount: number
          company_id: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          vehicle_id: string
          vehicle_installment_id: string
        }
        Insert: {
          allocated_amount?: number
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          vehicle_id: string
          vehicle_installment_id: string
        }
        Update: {
          allocated_amount?: number
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          vehicle_id?: string
          vehicle_installment_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          account_id: string | null
          auto_renew_enabled: boolean | null
          balance_due: number | null
          company_id: string
          contract_amount: number
          contract_date: string
          contract_number: string
          contract_type: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          created_via: string | null
          customer_id: string
          days_overdue: number | null
          description: string | null
          end_date: string
          expired_at: string | null
          id: string
          journal_entry_id: string | null
          last_payment_check_date: string | null
          last_payment_date: string | null
          last_renewal_check: string | null
          late_fine_amount: number | null
          license_plate: string | null
          make: string | null
          model: string | null
          monthly_amount: number
          payment_status: string | null
          renewal_terms: Json | null
          start_date: string
          status: string
          suspension_reason: string | null
          terms: string | null
          total_paid: number | null
          updated_at: string
          vehicle_id: string | null
          vehicle_returned: boolean | null
          vehicle_status: string | null
          year: number | null
        }
        Insert: {
          account_id?: string | null
          auto_renew_enabled?: boolean | null
          balance_due?: number | null
          company_id: string
          contract_amount?: number
          contract_date: string
          contract_number: string
          contract_type?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          created_via?: string | null
          customer_id: string
          days_overdue?: number | null
          description?: string | null
          end_date: string
          expired_at?: string | null
          id?: string
          journal_entry_id?: string | null
          last_payment_check_date?: string | null
          last_payment_date?: string | null
          last_renewal_check?: string | null
          late_fine_amount?: number | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          monthly_amount?: number
          payment_status?: string | null
          renewal_terms?: Json | null
          start_date: string
          status?: string
          suspension_reason?: string | null
          terms?: string | null
          total_paid?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_returned?: boolean | null
          vehicle_status?: string | null
          year?: number | null
        }
        Update: {
          account_id?: string | null
          auto_renew_enabled?: boolean | null
          balance_due?: number | null
          company_id?: string
          contract_amount?: number
          contract_date?: string
          contract_number?: string
          contract_type?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          created_via?: string | null
          customer_id?: string
          days_overdue?: number | null
          description?: string | null
          end_date?: string
          expired_at?: string | null
          id?: string
          journal_entry_id?: string | null
          last_payment_check_date?: string | null
          last_payment_date?: string | null
          last_renewal_check?: string | null
          late_fine_amount?: number | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          monthly_amount?: number
          payment_status?: string | null
          renewal_terms?: Json | null
          start_date?: string
          status?: string
          suspension_reason?: string | null
          terms?: string | null
          total_paid?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_returned?: boolean | null
          vehicle_status?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          actual_amount: number | null
          budget_amount: number | null
          center_code: string
          center_name: string
          center_name_ar: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          manager_id: string | null
          parent_center_id: string | null
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          budget_amount?: number | null
          center_code: string
          center_name: string
          center_name_ar?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          manager_id?: string | null
          parent_center_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          budget_amount?: number | null
          center_code?: string
          center_name?: string
          center_name_ar?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          manager_id?: string | null
          parent_center_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      csv_file_archives: {
        Row: {
          company_id: string
          created_at: string
          created_contracts_ids: string[] | null
          error_details: Json | null
          failed_rows: number | null
          file_content: string | null
          file_name: string
          file_size_bytes: number
          id: string
          is_archived: boolean | null
          metadata: Json | null
          original_file_name: string
          processing_results: Json | null
          processing_status: string
          storage_bucket: string | null
          storage_path: string | null
          successful_rows: number | null
          total_rows: number | null
          updated_at: string
          upload_type: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_contracts_ids?: string[] | null
          error_details?: Json | null
          failed_rows?: number | null
          file_content?: string | null
          file_name: string
          file_size_bytes: number
          id?: string
          is_archived?: boolean | null
          metadata?: Json | null
          original_file_name: string
          processing_results?: Json | null
          processing_status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          successful_rows?: number | null
          total_rows?: number | null
          updated_at?: string
          upload_type?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_contracts_ids?: string[] | null
          error_details?: Json | null
          failed_rows?: number | null
          file_content?: string | null
          file_name?: string
          file_size_bytes?: number
          id?: string
          is_archived?: boolean | null
          metadata?: Json | null
          original_file_name?: string
          processing_results?: Json | null
          processing_status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          successful_rows?: number | null
          total_rows?: number | null
          updated_at?: string
          upload_type?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      csv_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          entity_type: string
          field_mappings: Json | null
          headers: string[]
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_used_at: string | null
          sample_data: Json | null
          template_name: string
          template_name_ar: string | null
          updated_at: string
          usage_count: number | null
          validation_rules: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          entity_type: string
          field_mappings?: Json | null
          headers: string[]
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_used_at?: string | null
          sample_data?: Json | null
          template_name: string
          template_name_ar?: string | null
          updated_at?: string
          usage_count?: number | null
          validation_rules?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          entity_type?: string
          field_mappings?: Json | null
          headers?: string[]
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_used_at?: string | null
          sample_data?: Json | null
          template_name?: string
          template_name_ar?: string | null
          updated_at?: string
          usage_count?: number | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      cto_agent_audit: {
        Row: {
          actor: string
          branch: string | null
          commit_sha: string | null
          company_id: string | null
          created_at: string
          details: Json
          duration_ms: number | null
          id: string
          metrics: Json | null
          pr_number: number | null
          repo: string
          run_id: string
          severity: string | null
          stage: string
          status: string
          violations: Json | null
          waiver_approved_by: string | null
          waiver_expires_at: string | null
          waiver_reason: string | null
        }
        Insert: {
          actor: string
          branch?: string | null
          commit_sha?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          metrics?: Json | null
          pr_number?: number | null
          repo?: string
          run_id: string
          severity?: string | null
          stage: string
          status: string
          violations?: Json | null
          waiver_approved_by?: string | null
          waiver_expires_at?: string | null
          waiver_reason?: string | null
        }
        Update: {
          actor?: string
          branch?: string | null
          commit_sha?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          metrics?: Json | null
          pr_number?: number | null
          repo?: string
          run_id?: string
          severity?: string | null
          stage?: string
          status?: string
          violations?: Json | null
          waiver_approved_by?: string | null
          waiver_expires_at?: string | null
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_agent_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_deploy_gates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          build_passed: boolean
          build_time_seconds: number | null
          bundle_size_kb: number | null
          coverage_passed: boolean
          coverage_percent: number | null
          created_at: string
          deployed_at: string | null
          environment: string
          gate_status: string
          id: string
          lint_passed: boolean
          notes: string | null
          rejection_reason: string | null
          run_id: string
          security_passed: boolean
          tests_passed: boolean
          triggered_by: string
          typecheck_passed: boolean
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          build_passed?: boolean
          build_time_seconds?: number | null
          bundle_size_kb?: number | null
          coverage_passed?: boolean
          coverage_percent?: number | null
          created_at?: string
          deployed_at?: string | null
          environment: string
          gate_status: string
          id?: string
          lint_passed?: boolean
          notes?: string | null
          rejection_reason?: string | null
          run_id: string
          security_passed?: boolean
          tests_passed?: boolean
          triggered_by: string
          typecheck_passed?: boolean
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          build_passed?: boolean
          build_time_seconds?: number | null
          bundle_size_kb?: number | null
          coverage_passed?: boolean
          coverage_percent?: number | null
          created_at?: string
          deployed_at?: string | null
          environment?: string
          gate_status?: string
          id?: string
          lint_passed?: boolean
          notes?: string | null
          rejection_reason?: string | null
          run_id?: string
          security_passed?: boolean
          tests_passed?: boolean
          triggered_by?: string
          typecheck_passed?: boolean
        }
        Relationships: []
      }
      cto_quality_metrics: {
        Row: {
          avg_build_time_seconds: number | null
          avg_bundle_size_kb: number | null
          avg_coverage: number | null
          avg_pr_review_hours: number | null
          blocked_deploys: number | null
          created_at: string
          critical_violations: number | null
          failed_deploys: number | null
          id: string
          merged_prs: number | null
          metric_date: string
          successful_deploys: number | null
          total_deploys: number | null
          total_prs: number | null
          total_violations: number | null
          warning_violations: number | null
        }
        Insert: {
          avg_build_time_seconds?: number | null
          avg_bundle_size_kb?: number | null
          avg_coverage?: number | null
          avg_pr_review_hours?: number | null
          blocked_deploys?: number | null
          created_at?: string
          critical_violations?: number | null
          failed_deploys?: number | null
          id?: string
          merged_prs?: number | null
          metric_date: string
          successful_deploys?: number | null
          total_deploys?: number | null
          total_prs?: number | null
          total_violations?: number | null
          warning_violations?: number | null
        }
        Update: {
          avg_build_time_seconds?: number | null
          avg_bundle_size_kb?: number | null
          avg_coverage?: number | null
          avg_pr_review_hours?: number | null
          blocked_deploys?: number | null
          created_at?: string
          critical_violations?: number | null
          failed_deploys?: number | null
          id?: string
          merged_prs?: number | null
          metric_date?: string
          successful_deploys?: number | null
          total_deploys?: number | null
          total_prs?: number | null
          total_violations?: number | null
          warning_violations?: number | null
        }
        Relationships: []
      }
      cto_waivers: {
        Row: {
          approved_by: string | null
          branch: string | null
          created_at: string
          expires_at: string
          id: string
          pr_number: number | null
          reason: string
          requested_by: string
          rule_id: string
          rule_name: string
          status: string
          updated_at: string
          used_at: string | null
          used_in_run_id: string | null
        }
        Insert: {
          approved_by?: string | null
          branch?: string | null
          created_at?: string
          expires_at: string
          id?: string
          pr_number?: number | null
          reason: string
          requested_by: string
          rule_id: string
          rule_name: string
          status: string
          updated_at?: string
          used_at?: string | null
          used_in_run_id?: string | null
        }
        Update: {
          approved_by?: string | null
          branch?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          pr_number?: number | null
          reason?: string
          requested_by?: string
          rule_id?: string
          rule_name?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_in_run_id?: string | null
        }
        Relationships: []
      }
      customer_account_types: {
        Row: {
          account_category: string
          created_at: string
          id: string
          is_active: boolean
          type_name: string
          type_name_ar: string
          updated_at: string
        }
        Insert: {
          account_category: string
          created_at?: string
          id?: string
          is_active?: boolean
          type_name: string
          type_name_ar: string
          updated_at?: string
        }
        Update: {
          account_category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          type_name?: string
          type_name_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_accounts: {
        Row: {
          account_id: string
          account_purpose: string | null
          account_type_id: string | null
          company_id: string
          created_at: string
          credit_limit: number | null
          currency: string
          customer_id: string
          id: string
          is_active: boolean
          is_default: boolean
          updated_at: string
        }
        Insert: {
          account_id: string
          account_purpose?: string | null
          account_type_id?: string | null
          company_id: string
          created_at?: string
          credit_limit?: number | null
          currency?: string
          customer_id: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_purpose?: string | null
          account_type_id?: string | null
          company_id?: string
          created_at?: string
          credit_limit?: number | null
          currency?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_account_type_id_fkey"
            columns: ["account_type_id"]
            isOneToOne: false
            referencedRelation: "customer_account_types"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_aging_analysis: {
        Row: {
          analysis_date: string
          company_id: string
          created_at: string
          current_amount: number | null
          customer_id: string
          days_1_30: number | null
          days_31_60: number | null
          days_61_90: number | null
          days_91_120: number | null
          days_over_120: number | null
          id: string
          total_outstanding: number | null
        }
        Insert: {
          analysis_date?: string
          company_id: string
          created_at?: string
          current_amount?: number | null
          customer_id: string
          days_1_30?: number | null
          days_31_60?: number | null
          days_61_90?: number | null
          days_91_120?: number | null
          days_over_120?: number | null
          id?: string
          total_outstanding?: number | null
        }
        Update: {
          analysis_date?: string
          company_id?: string
          created_at?: string
          current_amount?: number | null
          customer_id?: string
          days_1_30?: number | null
          days_31_60?: number | null
          days_61_90?: number | null
          days_91_120?: number | null
          days_over_120?: number | null
          id?: string
          total_outstanding?: number | null
        }
        Relationships: []
      }
      customer_balances: {
        Row: {
          account_id: string | null
          company_id: string
          created_at: string
          credit_available: number | null
          credit_limit: number | null
          credit_used: number | null
          current_balance: number
          customer_id: string
          days_overdue: number | null
          id: string
          last_payment_amount: number | null
          last_payment_date: string | null
          last_statement_date: string | null
          next_statement_date: string | null
          overdue_amount: number | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          company_id: string
          created_at?: string
          credit_available?: number | null
          credit_limit?: number | null
          credit_used?: number | null
          current_balance?: number
          customer_id: string
          days_overdue?: number | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_date?: string | null
          next_statement_date?: string | null
          overdue_amount?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          company_id?: string
          created_at?: string
          credit_available?: number | null
          credit_limit?: number | null
          credit_used?: number | null
          current_balance?: number
          customer_id?: string
          days_overdue?: number | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_date?: string | null
          next_statement_date?: string | null
          overdue_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_credit_history: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
      customer_deposits: {
        Row: {
          account_id: string | null
          amount: number
          company_id: string
          contract_id: string | null
          created_at: string
          customer_id: string
          deposit_number: string
          deposit_type: string
          due_date: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          received_date: string
          returned_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          company_id: string
          contract_id?: string | null
          created_at?: string
          customer_id: string
          deposit_number: string
          deposit_type?: string
          due_date?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          received_date: string
          returned_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          company_id?: string
          contract_id?: string | null
          created_at?: string
          customer_id?: string
          deposit_number?: string
          deposit_type?: string
          due_date?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          received_date?: string
          returned_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_documents: {
        Row: {
          company_id: string
          created_at: string | null
          customer_id: string
          document_name: string
          document_type: string
          file_path: string | null
          file_size: number | null
          id: string
          is_required: boolean | null
          mime_type: string | null
          notes: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          customer_id: string
          document_name: string
          document_type: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_required?: boolean | null
          mime_type?: string | null
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          customer_id?: string
          document_name?: string
          document_type?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_required?: boolean | null
          mime_type?: string | null
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customer_financial_summary: {
        Row: {
          average_days_to_pay: number | null
          company_id: string
          created_at: string
          credit_score: number | null
          customer_id: string
          id: string
          largest_outstanding_invoice: number | null
          last_payment_date: string | null
          payment_frequency: number | null
          risk_level: string | null
          summary_date: string
          total_invoiced: number | null
          total_outstanding: number | null
          total_paid: number | null
          updated_at: string
        }
        Insert: {
          average_days_to_pay?: number | null
          company_id: string
          created_at?: string
          credit_score?: number | null
          customer_id: string
          id?: string
          largest_outstanding_invoice?: number | null
          last_payment_date?: string | null
          payment_frequency?: number | null
          risk_level?: string | null
          summary_date?: string
          total_invoiced?: number | null
          total_outstanding?: number | null
          total_paid?: number | null
          updated_at?: string
        }
        Update: {
          average_days_to_pay?: number | null
          company_id?: string
          created_at?: string
          credit_score?: number | null
          customer_id?: string
          id?: string
          largest_outstanding_invoice?: number | null
          last_payment_date?: string | null
          payment_frequency?: number | null
          risk_level?: string | null
          summary_date?: string
          total_invoiced?: number | null
          total_outstanding?: number | null
          total_paid?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          is_important: boolean | null
          note_type: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          is_important?: boolean | null
          note_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          is_important?: boolean | null
          note_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_payment_scores: {
        Row: {
          broken_promises_deduction: number | null
          calculated_at: string
          category: string
          company_id: string
          created_at: string | null
          customer_id: string
          disputes_deduction: number | null
          early_payments_bonus: number | null
          failed_payments_deduction: number | null
          id: string
          late_payments_deduction: number | null
          other_bonuses: number | null
          score: number
        }
        Insert: {
          broken_promises_deduction?: number | null
          calculated_at?: string
          category: string
          company_id: string
          created_at?: string | null
          customer_id: string
          disputes_deduction?: number | null
          early_payments_bonus?: number | null
          failed_payments_deduction?: number | null
          id?: string
          late_payments_deduction?: number | null
          other_bonuses?: number | null
          score: number
        }
        Update: {
          broken_promises_deduction?: number | null
          calculated_at?: string
          category?: string
          company_id?: string
          created_at?: string | null
          customer_id?: string
          disputes_deduction?: number | null
          early_payments_bonus?: number | null
          failed_payments_deduction?: number | null
          id?: string
          late_payments_deduction?: number | null
          other_bonuses?: number | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_scores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_scores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          address_ar: string | null
          alternative_phone: string | null
          auto_pay_enabled: boolean | null
          blacklist_reason: string | null
          city: string | null
          company_id: string
          company_name: string | null
          company_name_ar: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          customer_code: string | null
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          date_of_birth: string | null
          default_cost_center_id: string | null
          documents: Json | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          first_name_ar: string | null
          id: string
          is_active: boolean | null
          is_blacklisted: boolean | null
          last_name: string | null
          last_name_ar: string | null
          license_expiry: string | null
          license_number: string | null
          national_id: string | null
          national_id_expiry: string | null
          notes: string | null
          passport_number: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          alternative_phone?: string | null
          auto_pay_enabled?: boolean | null
          blacklist_reason?: string | null
          city?: string | null
          company_id: string
          company_name?: string | null
          company_name_ar?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_code?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          date_of_birth?: string | null
          default_cost_center_id?: string | null
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          first_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          is_blacklisted?: boolean | null
          last_name?: string | null
          last_name_ar?: string | null
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          national_id_expiry?: string | null
          notes?: string | null
          passport_number?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          alternative_phone?: string | null
          auto_pay_enabled?: boolean | null
          blacklist_reason?: string | null
          city?: string | null
          company_id?: string
          company_name?: string | null
          company_name_ar?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_code?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          date_of_birth?: string | null
          default_cost_center_id?: string | null
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          first_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          is_blacklisted?: boolean | null
          last_name?: string | null
          last_name_ar?: string | null
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          national_id_expiry?: string | null
          notes?: string | null
          passport_number?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_default_cost_center_id_fkey"
            columns: ["default_cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customers_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          data_source: Json
          id: string
          is_active: boolean | null
          position: Json | null
          refresh_interval: number | null
          updated_at: string | null
          visualization_config: Json
          widget_name: string
          widget_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          data_source: Json
          id?: string
          is_active?: boolean | null
          position?: Json | null
          refresh_interval?: number | null
          updated_at?: string | null
          visualization_config: Json
          widget_name: string
          widget_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          data_source?: Json
          id?: string
          is_active?: boolean | null
          position?: Json | null
          refresh_interval?: number | null
          updated_at?: string | null
          visualization_config?: Json
          widget_name?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      default_account_types: {
        Row: {
          account_category: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean | null
          type_code: string
          type_name: string
          type_name_ar: string | null
          updated_at: string
        }
        Insert: {
          account_category: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          type_code: string
          type_name: string
          type_name_ar?: string | null
          updated_at?: string
        }
        Update: {
          account_category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          type_code?: string
          type_name?: string
          type_name_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      default_chart_of_accounts: {
        Row: {
          account_code: string
          account_level: number | null
          account_name: string
          account_name_ar: string | null
          account_subtype: string | null
          account_type: string
          balance_type: string
          created_at: string
          description: string | null
          id: string
          is_header: boolean | null
          is_system: boolean | null
          parent_account_code: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_level?: number | null
          account_name: string
          account_name_ar?: string | null
          account_subtype?: string | null
          account_type: string
          balance_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_header?: boolean | null
          is_system?: boolean | null
          parent_account_code?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_level?: number | null
          account_name?: string
          account_name_ar?: string | null
          account_subtype?: string | null
          account_type?: string
          balance_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_header?: boolean | null
          is_system?: boolean | null
          parent_account_code?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      default_cost_centers: {
        Row: {
          center_code: string
          center_name: string
          center_name_ar: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          center_code: string
          center_name: string
          center_name_ar?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          center_code?: string
          center_name?: string
          center_name_ar?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      delinquent_customers: {
        Row: {
          actual_payments_count: number | null
          company_id: string
          contract_id: string
          contract_number: string
          contract_start_date: string
          credit_limit: number | null
          customer_code: string | null
          customer_id: string
          customer_name: string
          customer_type: string | null
          days_overdue: number | null
          email: string | null
          expected_payments_count: number | null
          first_detected_at: string | null
          has_previous_legal_cases: boolean | null
          id: string
          is_active: boolean | null
          is_blacklisted: boolean | null
          last_payment_amount: number | null
          last_payment_date: string | null
          last_updated_at: string | null
          late_penalty: number | null
          monthly_rent: number
          months_unpaid: number | null
          overdue_amount: number | null
          phone: string | null
          previous_legal_cases_count: number | null
          recommended_action: string | null
          risk_color: string | null
          risk_level: string | null
          risk_level_en: string | null
          risk_score: number | null
          total_debt: number | null
          vehicle_id: string | null
          vehicle_plate: string | null
          violations_amount: number | null
          violations_count: number | null
        }
        Insert: {
          actual_payments_count?: number | null
          company_id: string
          contract_id: string
          contract_number: string
          contract_start_date: string
          credit_limit?: number | null
          customer_code?: string | null
          customer_id: string
          customer_name: string
          customer_type?: string | null
          days_overdue?: number | null
          email?: string | null
          expected_payments_count?: number | null
          first_detected_at?: string | null
          has_previous_legal_cases?: boolean | null
          id?: string
          is_active?: boolean | null
          is_blacklisted?: boolean | null
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_updated_at?: string | null
          late_penalty?: number | null
          monthly_rent: number
          months_unpaid?: number | null
          overdue_amount?: number | null
          phone?: string | null
          previous_legal_cases_count?: number | null
          recommended_action?: string | null
          risk_color?: string | null
          risk_level?: string | null
          risk_level_en?: string | null
          risk_score?: number | null
          total_debt?: number | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
          violations_amount?: number | null
          violations_count?: number | null
        }
        Update: {
          actual_payments_count?: number | null
          company_id?: string
          contract_id?: string
          contract_number?: string
          contract_start_date?: string
          credit_limit?: number | null
          customer_code?: string | null
          customer_id?: string
          customer_name?: string
          customer_type?: string | null
          days_overdue?: number | null
          email?: string | null
          expected_payments_count?: number | null
          first_detected_at?: string | null
          has_previous_legal_cases?: boolean | null
          id?: string
          is_active?: boolean | null
          is_blacklisted?: boolean | null
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_updated_at?: string | null
          late_penalty?: number | null
          monthly_rent?: number
          months_unpaid?: number | null
          overdue_amount?: number | null
          phone?: string | null
          previous_legal_cases_count?: number | null
          recommended_action?: string | null
          risk_color?: string | null
          risk_level?: string | null
          risk_level_en?: string | null
          risk_score?: number | null
          total_debt?: number | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
          violations_amount?: number | null
          violations_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delinquent_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquent_customers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "delinquent_customers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquent_customers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquent_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquent_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delinquent_customers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_sessions: {
        Row: {
          created_at: string
          demo_user_id: string
          id: string
          is_active: boolean
          trial_end_date: string
          trial_start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_user_id: string
          id?: string
          is_active?: boolean
          trial_end_date: string
          trial_start_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_user_id?: string
          id?: string
          is_active?: boolean
          trial_end_date?: string
          trial_start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      depreciation_records: {
        Row: {
          accumulated_depreciation: number
          book_value: number
          created_at: string
          depreciation_amount: number
          depreciation_date: string
          fixed_asset_id: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          period_type: string
        }
        Insert: {
          accumulated_depreciation: number
          book_value: number
          created_at?: string
          depreciation_amount: number
          depreciation_date: string
          fixed_asset_id: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period_type?: string
        }
        Update: {
          accumulated_depreciation?: number
          book_value?: number
          created_at?: string
          depreciation_amount?: number
          depreciation_date?: string
          fixed_asset_id?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          period_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "depreciation_records_fixed_asset_id_fkey"
            columns: ["fixed_asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_records_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_permit_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          permit_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          permit_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          permit_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_permit_attachments_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dispatch_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_permit_tracking: {
        Row: {
          change_reason: string | null
          changed_by: string
          created_at: string
          id: string
          location: string | null
          odometer_reading: number | null
          permit_id: string
          status_changed_from: string | null
          status_changed_to: string
        }
        Insert: {
          change_reason?: string | null
          changed_by: string
          created_at?: string
          id?: string
          location?: string | null
          odometer_reading?: number | null
          permit_id: string
          status_changed_from?: string | null
          status_changed_to: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          location?: string | null
          odometer_reading?: number | null
          permit_id?: string
          status_changed_from?: string | null
          status_changed_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_permit_tracking_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_dispatch_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      document_expiry_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          company_id: string
          contract_id: string
          contract_number: string
          created_at: string
          customer_id: string
          customer_name: string
          days_until_expiry: number
          document_type: string
          expiry_date: string
          id: string
          is_acknowledged: boolean | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          company_id: string
          contract_id: string
          contract_number: string
          created_at?: string
          customer_id: string
          customer_name: string
          days_until_expiry: number
          document_type: string
          expiry_date: string
          id?: string
          is_acknowledged?: boolean | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          company_id?: string
          contract_id?: string
          contract_number?: string
          created_at?: string
          customer_id?: string
          customer_name?: string
          days_until_expiry?: number
          document_type?: string
          expiry_date?: string
          id?: string
          is_acknowledged?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      driver_assignments: {
        Row: {
          commission_amount: number | null
          company_id: string
          contract_id: string
          created_at: string | null
          customer_name: string
          driver_id: string
          dropoff_location: string
          end_date: string
          id: string
          notes: string | null
          pickup_location: string
          start_date: string
          status: string | null
          trip_distance: number | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          commission_amount?: number | null
          company_id: string
          contract_id: string
          created_at?: string | null
          customer_name: string
          driver_id: string
          dropoff_location: string
          end_date: string
          id?: string
          notes?: string | null
          pickup_location: string
          start_date: string
          status?: string | null
          trip_distance?: number | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          commission_amount?: number | null
          company_id?: string
          contract_id?: string
          created_at?: string | null
          customer_name?: string
          driver_id?: string
          dropoff_location?: string
          end_date?: string
          id?: string
          notes?: string | null
          pickup_location?: string
          start_date?: string
          status?: string | null
          trip_distance?: number | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "driver_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          availability_status: string | null
          commission_rate: number | null
          company_id: string
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          license_class: string | null
          license_expiry: string
          license_number: string
          phone_number: string
          rating: number | null
          status: string | null
          total_earnings: number | null
          total_trips: number | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          availability_status?: string | null
          commission_rate?: number | null
          company_id: string
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          license_class?: string | null
          license_expiry: string
          license_number: string
          phone_number: string
          rating?: number | null
          status?: string | null
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          availability_status?: string | null
          commission_rate?: number | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          license_class?: string | null
          license_expiry?: string
          license_number?: string
          phone_number?: string
          rating?: number | null
          status?: string | null
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          account_status: string | null
          address: string | null
          address_ar: string | null
          allowances: number | null
          bank_account: string | null
          basic_salary: number
          company_id: string
          created_at: string
          created_by: string | null
          department: string | null
          department_ar: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string
          first_name: string
          first_name_ar: string | null
          has_system_access: boolean | null
          hire_date: string
          iban: string | null
          id: string
          is_active: boolean | null
          last_name: string
          last_name_ar: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          position: string | null
          position_ar: string | null
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_status?: string | null
          address?: string | null
          address_ar?: string | null
          allowances?: number | null
          bank_account?: string | null
          basic_salary?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          department_ar?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number: string
          first_name: string
          first_name_ar?: string | null
          has_system_access?: boolean | null
          hire_date: string
          iban?: string | null
          id?: string
          is_active?: boolean | null
          last_name: string
          last_name_ar?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          position_ar?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_status?: string | null
          address?: string | null
          address_ar?: string | null
          allowances?: number | null
          bank_account?: string | null
          basic_salary?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          department_ar?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string
          first_name?: string
          first_name_ar?: string | null
          has_system_access?: boolean | null
          hire_date?: string
          iban?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          last_name_ar?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          position_ar?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_employees_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      essential_account_mappings: {
        Row: {
          account_id: string | null
          account_type: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_configured: boolean | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_configured?: boolean | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_configured?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_essential_mappings_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_essential_mappings_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_essential_mappings_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      event_subscriptions: {
        Row: {
          company_id: string | null
          created_at: string | null
          event_type: string
          handler_name: string
          id: string
          is_active: boolean | null
          priority: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          event_type: string
          handler_name: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          event_type?: string
          handler_name?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          company_id: string
          created_at: string | null
          data: Json
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_gates: {
        Row: {
          created_at: string | null
          description: string | null
          feature_code: string
          feature_name: string
          id: string
          is_active: boolean | null
          required_plans: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          feature_code: string
          feature_name: string
          id?: string
          is_active?: boolean | null
          required_plans?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          feature_code?: string
          feature_name?: string
          id?: string
          is_active?: boolean | null
          required_plans?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number | null
          asset_account_id: string | null
          asset_code: string
          asset_name: string
          asset_name_ar: string | null
          book_value: number
          category: string
          company_id: string
          condition_status: string | null
          created_at: string
          depreciation_account_id: string | null
          depreciation_method: string
          disposal_amount: number | null
          disposal_date: string | null
          id: string
          is_active: boolean | null
          location: string | null
          notes: string | null
          purchase_cost: number
          purchase_date: string
          salvage_value: number | null
          serial_number: string | null
          updated_at: string
          useful_life_years: number
        }
        Insert: {
          accumulated_depreciation?: number | null
          asset_account_id?: string | null
          asset_code: string
          asset_name: string
          asset_name_ar?: string | null
          book_value: number
          category: string
          company_id: string
          condition_status?: string | null
          created_at?: string
          depreciation_account_id?: string | null
          depreciation_method?: string
          disposal_amount?: number | null
          disposal_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          notes?: string | null
          purchase_cost: number
          purchase_date: string
          salvage_value?: number | null
          serial_number?: string | null
          updated_at?: string
          useful_life_years: number
        }
        Update: {
          accumulated_depreciation?: number | null
          asset_account_id?: string | null
          asset_code?: string
          asset_name?: string
          asset_name_ar?: string | null
          book_value?: number
          category?: string
          company_id?: string
          condition_status?: string | null
          created_at?: string
          depreciation_account_id?: string | null
          depreciation_method?: string
          disposal_amount?: number | null
          disposal_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          notes?: string | null
          purchase_cost?: number
          purchase_date?: string
          salvage_value?: number | null
          serial_number?: string | null
          updated_at?: string
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_depreciation_account_id_fkey"
            columns: ["depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_depreciation_account_id_fkey"
            columns: ["depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_reports: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_scheduled: boolean | null
          last_generated_at: string | null
          report_config: Json
          report_name: string
          report_name_ar: string | null
          report_type: string
          schedule_config: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_scheduled?: boolean | null
          last_generated_at?: string | null
          report_config?: Json
          report_name: string
          report_name_ar?: string | null
          report_type: string
          schedule_config?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_scheduled?: boolean | null
          last_generated_at?: string | null
          report_config?: Json
          report_name?: string
          report_name_ar?: string | null
          report_type?: string
          schedule_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      fleet_vehicle_groups: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          group_name: string
          group_name_ar: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          parent_group_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          group_name: string
          group_name_ar?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          parent_group_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          group_name?: string
          group_name_ar?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          parent_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_vehicle_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_vehicle_groups_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_vehicle_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_vehicle_insurance: {
        Row: {
          company_id: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          coverage_amount: number | null
          created_at: string
          deductible_amount: number | null
          end_date: string
          id: string
          insurance_company: string
          insurance_company_ar: string | null
          is_active: boolean
          notes: string | null
          policy_document_url: string | null
          policy_number: string
          policy_type: string
          premium_amount: number
          start_date: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          company_id: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coverage_amount?: number | null
          created_at?: string
          deductible_amount?: number | null
          end_date: string
          id?: string
          insurance_company: string
          insurance_company_ar?: string | null
          is_active?: boolean
          notes?: string | null
          policy_document_url?: string | null
          policy_number: string
          policy_type: string
          premium_amount: number
          start_date: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          company_id?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coverage_amount?: number | null
          created_at?: string
          deductible_amount?: number | null
          end_date?: string
          id?: string
          insurance_company?: string
          insurance_company_ar?: string | null
          is_active?: boolean
          notes?: string | null
          policy_document_url?: string | null
          policy_number?: string
          policy_type?: string
          premium_amount?: number
          start_date?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_vehicle_insurance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_vehicle_insurance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_records: {
        Row: {
          company_id: string
          cost_per_liter: number
          created_at: string
          created_by: string | null
          fuel_date: string
          fuel_station: string | null
          fuel_type: string
          id: string
          notes: string | null
          odometer_reading: number | null
          quantity_liters: number
          receipt_number: string | null
          total_cost: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          company_id: string
          cost_per_liter: number
          created_at?: string
          created_by?: string | null
          fuel_date?: string
          fuel_station?: string | null
          fuel_type?: string
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          quantity_liters: number
          receipt_number?: string | null
          total_cost: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          company_id?: string
          cost_per_liter?: number
          created_at?: string
          created_by?: string | null
          fuel_date?: string
          fuel_station?: string | null
          fuel_type?: string
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          quantity_liters?: number
          receipt_number?: string | null
          total_cost?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      goods_receipt_items: {
        Row: {
          created_at: string
          goods_receipt_id: string
          id: string
          notes: string | null
          purchase_order_item_id: string
          received_quantity: number
        }
        Insert: {
          created_at?: string
          goods_receipt_id: string
          id?: string
          notes?: string | null
          purchase_order_item_id: string
          received_quantity?: number
        }
        Update: {
          created_at?: string
          goods_receipt_id?: string
          id?: string
          notes?: string | null
          purchase_order_item_id?: string
          received_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_goods_receipt_items_po_item"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_goods_receipt_items_receipt"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          company_id: string
          created_at: string
          delivery_note_number: string | null
          id: string
          notes: string | null
          purchase_order_id: string
          receipt_date: string
          receipt_number: string
          received_by: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delivery_note_number?: string | null
          id?: string
          notes?: string | null
          purchase_order_id: string
          receipt_date?: string
          receipt_number: string
          received_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delivery_note_number?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string
          receipt_date?: string
          receipt_number?: string
          received_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_goods_receipts_purchase_order"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_settings: {
        Row: {
          allow_negative_balance: boolean
          auto_calculate_overtime: boolean
          company_id: string
          created_at: string
          daily_working_hours: number
          email_notifications: boolean
          id: string
          late_penalty_per_hour: number
          late_threshold_minutes: number
          overtime_rate_percentage: number
          pay_date: number
          payroll_frequency: string
          require_manager_approval: boolean
          sms_notifications: boolean
          social_security_rate: number
          tax_rate: number
          updated_at: string
          work_end_time: string
          work_start_time: string
          working_days_per_week: number
        }
        Insert: {
          allow_negative_balance?: boolean
          auto_calculate_overtime?: boolean
          company_id: string
          created_at?: string
          daily_working_hours?: number
          email_notifications?: boolean
          id?: string
          late_penalty_per_hour?: number
          late_threshold_minutes?: number
          overtime_rate_percentage?: number
          pay_date?: number
          payroll_frequency?: string
          require_manager_approval?: boolean
          sms_notifications?: boolean
          social_security_rate?: number
          tax_rate?: number
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
          working_days_per_week?: number
        }
        Update: {
          allow_negative_balance?: boolean
          auto_calculate_overtime?: boolean
          company_id?: string
          created_at?: string
          daily_working_hours?: number
          email_notifications?: boolean
          id?: string
          late_penalty_per_hour?: number
          late_threshold_minutes?: number
          overtime_rate_percentage?: number
          pay_date?: number
          payroll_frequency?: string
          require_manager_approval?: boolean
          sms_notifications?: boolean
          social_security_rate?: number
          tax_rate?: number
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
          working_days_per_week?: number
        }
        Relationships: []
      }
      inventory_alert_history: {
        Row: {
          alert_type: string
          company_id: string
          context: Json | null
          created_at: string | null
          id: string
          message: string
          recipients: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          severity: string
          status: string | null
          title: string
        }
        Insert: {
          alert_type: string
          company_id: string
          context?: Json | null
          created_at?: string | null
          id?: string
          message: string
          recipients?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity: string
          status?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          recipients?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alert_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alert_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "inventory_alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alert_rules: {
        Row: {
          alert_config: Json
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          rule_name: string
          rule_type: string
          severity: string | null
          trigger_conditions: Json
          trigger_count: number | null
          updated_at: string | null
        }
        Insert: {
          alert_config: Json
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          rule_name: string
          rule_type: string
          severity?: string | null
          trigger_conditions: Json
          trigger_count?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_config?: Json
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          rule_name?: string
          rule_type?: string
          severity?: string | null
          trigger_conditions?: Json
          trigger_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alert_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          category_name: string
          category_name_ar: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          parent_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_name: string
          category_name_ar?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_name?: string
          category_name_ar?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_demand_forecasts: {
        Row: {
          actual_demand: number | null
          company_id: string
          confidence_level: number | null
          created_at: string | null
          forecast_date: string
          forecast_method: string | null
          forecast_period: string
          id: string
          item_id: string | null
          model_parameters: Json | null
          predicted_demand: number
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          actual_demand?: number | null
          company_id: string
          confidence_level?: number | null
          created_at?: string | null
          forecast_date: string
          forecast_method?: string | null
          forecast_period: string
          id?: string
          item_id?: string | null
          model_parameters?: Json | null
          predicted_demand: number
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          actual_demand?: number | null
          company_id?: string
          confidence_level?: number | null
          created_at?: string | null
          forecast_date?: string
          forecast_method?: string | null
          forecast_period?: string
          id?: string
          item_id?: string | null
          model_parameters?: Json | null
          predicted_demand?: number
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_demand_forecasts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_demand_forecasts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          category_id: string | null
          company_id: string
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_tracked: boolean | null
          item_code: string | null
          item_name: string
          item_name_ar: string | null
          item_type: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          notes: string | null
          reorder_point: number | null
          reorder_quantity: number | null
          sku: string | null
          unit_of_measure: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          company_id: string
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_tracked?: boolean | null
          item_code?: string | null
          item_name: string
          item_name_ar?: string | null
          item_type?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          notes?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          sku?: string | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          company_id?: string
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_tracked?: boolean | null
          item_code?: string | null
          item_name?: string
          item_name_ar?: string | null
          item_type?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          notes?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          sku?: string | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          from_warehouse_id: string | null
          id: string
          item_id: string
          movement_date: string | null
          movement_type: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          to_warehouse_id: string | null
          total_cost: number | null
          unit_cost: number | null
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          item_id: string
          movement_date?: string | null
          movement_type: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          to_warehouse_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          item_id?: string
          movement_date?: string | null
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          to_warehouse_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_optimization_metrics: {
        Row: {
          calculation_date: string
          company_id: string
          created_at: string | null
          current_stock_level: number | null
          days_of_supply: number | null
          excess_stock_value: number | null
          holding_cost: number | null
          id: string
          inventory_turnover_rate: number | null
          item_id: string | null
          optimal_stock_level: number | null
          ordering_cost: number | null
          service_level: number | null
          stockout_count: number | null
          total_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          calculation_date: string
          company_id: string
          created_at?: string | null
          current_stock_level?: number | null
          days_of_supply?: number | null
          excess_stock_value?: number | null
          holding_cost?: number | null
          id?: string
          inventory_turnover_rate?: number | null
          item_id?: string | null
          optimal_stock_level?: number | null
          ordering_cost?: number | null
          service_level?: number | null
          stockout_count?: number | null
          total_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          calculation_date?: string
          company_id?: string
          created_at?: string | null
          current_stock_level?: number | null
          days_of_supply?: number | null
          excess_stock_value?: number | null
          holding_cost?: number | null
          id?: string
          inventory_turnover_rate?: number | null
          item_id?: string | null
          optimal_stock_level?: number | null
          ordering_cost?: number | null
          service_level?: number | null
          stockout_count?: number | null
          total_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_optimization_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_optimization_metrics_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_purchase_order_items: {
        Row: {
          created_at: string | null
          expected_delivery_date: string | null
          id: string
          item_id: string
          notes: string | null
          order_id: string
          quantity: number
          received_quantity: number | null
          remaining_quantity: number | null
          sku: string
          total_price: number
          unit_of_measure: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          item_id: string
          notes?: string | null
          order_id: string
          quantity: number
          received_quantity?: number | null
          remaining_quantity?: number | null
          sku: string
          total_price: number
          unit_of_measure?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          received_quantity?: number | null
          remaining_quantity?: number | null
          sku?: string
          total_price?: number
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "inventory_pending_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "inventory_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_address: string | null
          expected_delivery_date: string | null
          id: string
          internal_reference: string | null
          notes: string | null
          order_date: string | null
          order_number: string
          payment_terms: string | null
          sent_at: string | null
          status: string | null
          supplier_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_address?: string | null
          expected_delivery_date?: string | null
          id?: string
          internal_reference?: string | null
          notes?: string | null
          order_date?: string | null
          order_number: string
          payment_terms?: string | null
          sent_at?: string | null
          status?: string | null
          supplier_id: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_address?: string | null
          expected_delivery_date?: string | null
          id?: string
          internal_reference?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string
          payment_terms?: string | null
          sent_at?: string | null
          status?: string | null
          supplier_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_purchasing_rules: {
        Row: {
          action_config: Json
          company_id: string
          created_at: string | null
          created_by: string | null
          execution_count: number | null
          execution_frequency: string | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          notes: string | null
          priority: number | null
          rule_name: string
          rule_type: string
          success_count: number | null
          supplier_preferences: Json | null
          trigger_condition: Json
          updated_at: string | null
        }
        Insert: {
          action_config: Json
          company_id: string
          created_at?: string | null
          created_by?: string | null
          execution_count?: number | null
          execution_frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          notes?: string | null
          priority?: number | null
          rule_name: string
          rule_type: string
          success_count?: number | null
          supplier_preferences?: Json | null
          trigger_condition: Json
          updated_at?: string | null
        }
        Update: {
          action_config?: Json
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          execution_count?: number | null
          execution_frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          notes?: string | null
          priority?: number | null
          rule_name?: string
          rule_type?: string
          success_count?: number | null
          supplier_preferences?: Json | null
          trigger_condition?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchasing_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_replenishment_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          current_stock: number
          expected_delivery_date: string | null
          id: string
          item_id: string | null
          notes: string | null
          request_number: string
          requested_quantity: number
          rule_id: string | null
          status: string | null
          updated_at: string | null
          urgency_level: string | null
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          current_stock: number
          expected_delivery_date?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          request_number: string
          requested_quantity: number
          rule_id?: string | null
          status?: string | null
          updated_at?: string | null
          urgency_level?: string | null
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          current_stock?: number
          expected_delivery_date?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          request_number?: string
          requested_quantity?: number
          rule_id?: string | null
          status?: string | null
          updated_at?: string | null
          urgency_level?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_replenishment_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "inventory_replenishment_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_replenishment_rules: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          item_id: string | null
          lead_time_days: number | null
          max_stock_level: number | null
          notes: string | null
          priority: number | null
          reorder_point: number
          reorder_quantity: number
          rule_type: string
          safety_stock: number | null
          supplier_id: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          lead_time_days?: number | null
          max_stock_level?: number | null
          notes?: string | null
          priority?: number | null
          reorder_point: number
          reorder_quantity: number
          rule_type: string
          safety_stock?: number | null
          supplier_id?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          lead_time_days?: number | null
          max_stock_level?: number | null
          notes?: string | null
          priority?: number | null
          reorder_point?: number
          reorder_quantity?: number
          rule_type?: string
          safety_stock?: number | null
          supplier_id?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_replenishment_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_replenishment_rules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reports: {
        Row: {
          company_id: string
          created_at: string | null
          data: Json
          expires_at: string | null
          file_size: number | null
          file_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          is_public: boolean | null
          parameters: Json | null
          report_name: string
          report_type: string
          summary: Json | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data: Json
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_public?: boolean | null
          parameters?: Json | null
          report_name: string
          report_type: string
          summary?: Json | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data?: Json
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_public?: boolean | null
          parameters?: Json | null
          report_name?: string
          report_type?: string
          summary?: Json | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          company_id: string
          created_at: string | null
          days_of_supply: number | null
          id: string
          item_id: string
          quantity_on_hand: number
          quantity_reserved: number | null
          snapshot_date: string
          total_cost_value: number | null
          total_selling_value: number | null
          turnover_rate: number | null
          unit_cost: number
          unit_price: number
          warehouse_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          days_of_supply?: number | null
          id?: string
          item_id: string
          quantity_on_hand: number
          quantity_reserved?: number | null
          snapshot_date: string
          total_cost_value?: number | null
          total_selling_value?: number | null
          turnover_rate?: number | null
          unit_cost: number
          unit_price: number
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          days_of_supply?: number | null
          id?: string
          item_id?: string
          quantity_on_hand?: number
          quantity_reserved?: number | null
          snapshot_date?: string
          total_cost_value?: number | null
          total_selling_value?: number | null
          turnover_rate?: number | null
          unit_cost?: number
          unit_price?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_levels: {
        Row: {
          company_id: string
          id: string
          item_id: string
          last_counted_at: string | null
          last_movement_at: string | null
          quantity_available: number | null
          quantity_on_hand: number | null
          quantity_reserved: number | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          company_id: string
          id?: string
          item_id: string
          last_counted_at?: string | null
          last_movement_at?: string | null
          quantity_available?: number | null
          quantity_on_hand?: number | null
          quantity_reserved?: number | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          company_id?: string
          id?: string
          item_id?: string
          last_counted_at?: string | null
          last_movement_at?: string | null
          quantity_available?: number | null
          quantity_on_hand?: number | null
          quantity_reserved?: number | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_levels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_take_lines: {
        Row: {
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          id: string
          item_id: string
          notes: string | null
          stock_take_id: string
          system_quantity: number | null
          variance: number | null
          variance_value: number | null
        }
        Insert: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          id?: string
          item_id: string
          notes?: string | null
          stock_take_id: string
          system_quantity?: number | null
          variance?: number | null
          variance_value?: number | null
        }
        Update: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          id?: string
          item_id?: string
          notes?: string | null
          stock_take_id?: string
          system_quantity?: number | null
          variance?: number | null
          variance_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_take_lines_stock_take_id_fkey"
            columns: ["stock_take_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_takes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_takes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          counted_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          status: string | null
          stock_take_date: string
          stock_take_number: string | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          counted_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          stock_take_date: string
          stock_take_number?: string | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          counted_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          stock_take_date?: string
          stock_take_number?: string | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_takes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_takes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_takes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_takes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_takes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_takes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_supplier_categories: {
        Row: {
          category_name: string
          category_name_ar: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          category_name: string
          category_name_ar?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category_name?: string
          category_name_ar?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_supplier_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_supplier_category_mapping: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          supplier_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          supplier_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_supplier_category_mapping_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_supplier_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_category_mapping_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_category_mapping_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_supplier_performance: {
        Row: {
          average_lead_time_days: number | null
          calculated_at: string | null
          company_id: string
          created_at: string | null
          delayed_deliveries: number | null
          evaluation_period: string
          id: string
          issues_count: number | null
          on_time_deliveries: number | null
          order_accuracy_rate: number | null
          price_competitiveness_score: number | null
          quality_score: number | null
          responsiveness_score: number | null
          return_rate: number | null
          supplier_id: string
          total_order_value: number | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          average_lead_time_days?: number | null
          calculated_at?: string | null
          company_id: string
          created_at?: string | null
          delayed_deliveries?: number | null
          evaluation_period: string
          id?: string
          issues_count?: number | null
          on_time_deliveries?: number | null
          order_accuracy_rate?: number | null
          price_competitiveness_score?: number | null
          quality_score?: number | null
          responsiveness_score?: number | null
          return_rate?: number | null
          supplier_id: string
          total_order_value?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          average_lead_time_days?: number | null
          calculated_at?: string | null
          company_id?: string
          created_at?: string | null
          delayed_deliveries?: number | null
          evaluation_period?: string
          id?: string
          issues_count?: number | null
          on_time_deliveries?: number | null
          order_accuracy_rate?: number | null
          price_competitiveness_score?: number | null
          quality_score?: number | null
          responsiveness_score?: number | null
          return_rate?: number | null
          supplier_id?: string
          total_order_value?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_supplier_performance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_performance_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_performance_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_supplier_products: {
        Row: {
          availability_status: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          discount_percentage: number | null
          effective_date: string | null
          expiry_date: string | null
          id: string
          item_id: string | null
          last_price_update: string | null
          lead_time_days: number | null
          min_order_quantity: number | null
          notes: string | null
          package_size: number | null
          quality_rating: number | null
          sku: string
          supplier_catalog_url: string | null
          supplier_id: string
          supplier_product_code: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          availability_status?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_percentage?: number | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          last_price_update?: string | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          notes?: string | null
          package_size?: number | null
          quality_rating?: number | null
          sku: string
          supplier_catalog_url?: string | null
          supplier_id: string
          supplier_product_code?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          availability_status?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_percentage?: number | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          last_price_update?: string | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          notes?: string | null
          package_size?: number | null
          quality_rating?: number | null
          sku?: string
          supplier_catalog_url?: string | null
          supplier_id?: string
          supplier_product_code?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_supplier_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_suppliers: {
        Row: {
          address: string | null
          city: string | null
          commercial_register: string | null
          company_id: string
          company_name: string
          company_name_ar: string | null
          contact_person: string
          country: string | null
          created_at: string | null
          created_by: string | null
          delivery_terms: string | null
          email: string
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          lead_time_days: number | null
          minimum_order_value: number | null
          notes: string | null
          payment_terms: string | null
          phone: string
          rating: number | null
          tax_number: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          commercial_register?: string | null
          company_id: string
          company_name: string
          company_name_ar?: string | null
          contact_person: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_terms?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          lead_time_days?: number | null
          minimum_order_value?: number | null
          notes?: string | null
          payment_terms?: string | null
          phone: string
          rating?: number | null
          tax_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          commercial_register?: string | null
          company_id?: string
          company_name?: string
          company_name_ar?: string | null
          contact_person?: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_terms?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          lead_time_days?: number | null
          minimum_order_value?: number | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string
          rating?: number | null
          tax_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_warehouse_transfer_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          notes: string | null
          quantity_received: number | null
          quantity_requested: number
          quantity_shipped: number | null
          transfer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity_received?: number | null
          quantity_requested: number
          quantity_shipped?: number | null
          transfer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity_received?: number | null
          quantity_requested?: number
          quantity_shipped?: number | null
          transfer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_warehouse_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_low_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_movement_summary"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_reorder_recommendations"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_inventory_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouse_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_warehouse_transfers: {
        Row: {
          company_id: string
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          from_warehouse_id: string
          id: string
          notes: string | null
          status: string | null
          to_warehouse_id: string
          transfer_date: string
          transfer_number: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          notes?: string | null
          status?: string | null
          to_warehouse_id: string
          transfer_date: string
          transfer_number: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          to_warehouse_id?: string
          transfer_date?: string
          transfer_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_warehouse_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_warehouses: {
        Row: {
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          location_address: string | null
          location_city: string | null
          location_country: string | null
          manager_id: string | null
          phone: string | null
          updated_at: string | null
          warehouse_code: string | null
          warehouse_name: string
          warehouse_name_ar: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          manager_id?: string | null
          phone?: string | null
          updated_at?: string | null
          warehouse_code?: string | null
          warehouse_name: string
          warehouse_name_ar?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          manager_id?: string | null
          phone?: string | null
          updated_at?: string | null
          warehouse_code?: string | null
          warehouse_name?: string
          warehouse_name_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_cost_center_analysis: {
        Row: {
          budget_amount: number | null
          company_id: string
          cost_center_id: string
          created_at: string
          id: string
          invoice_type: string
          period_end: string
          period_start: string
          total_amount: number
          total_invoices: number
          updated_at: string
          variance_amount: number | null
          variance_percentage: number | null
        }
        Insert: {
          budget_amount?: number | null
          company_id: string
          cost_center_id: string
          created_at?: string
          id?: string
          invoice_type: string
          period_end: string
          period_start: string
          total_amount?: number
          total_invoices?: number
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Update: {
          budget_amount?: number | null
          company_id?: string
          cost_center_id?: string
          created_at?: string
          id?: string
          invoice_type?: string
          period_end?: string
          period_start?: string
          total_amount?: number
          total_invoices?: number
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_cost_center_analysis_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          account_id: string | null
          cost_center_id: string | null
          created_at: string
          id: string
          invoice_id: string
          item_description: string
          item_description_ar: string | null
          line_number: number
          line_total: number
          quantity: number | null
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          item_description: string
          item_description_ar?: string | null
          line_number: number
          line_total: number
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price: number
        }
        Update: {
          account_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          item_description?: string
          item_description_ar?: string | null
          line_number?: number
          line_total?: number
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      invoice_ocr_logs: {
        Row: {
          company_id: string
          created_at: string | null
          error_message: string | null
          extracted_data: Json | null
          id: string
          image_url: string
          invoice_id: string | null
          match_confidence: number | null
          match_reasons: string[] | null
          matched_contract_id: string | null
          matched_customer_id: string | null
          ocr_confidence: number | null
          processed_by: string | null
          processing_status: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          image_url: string
          invoice_id?: string | null
          match_confidence?: number | null
          match_reasons?: string[] | null
          matched_contract_id?: string | null
          matched_customer_id?: string | null
          ocr_confidence?: number | null
          processed_by?: string | null
          processing_status?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          image_url?: string
          invoice_id?: string | null
          match_confidence?: number | null
          match_reasons?: string[] | null
          matched_contract_id?: string | null
          matched_customer_id?: string | null
          ocr_confidence?: number | null
          processed_by?: string | null
          processing_status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_ocr_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_ocr_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_ocr_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_ocr_logs_matched_contract_id_fkey"
            columns: ["matched_contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "invoice_ocr_logs_matched_contract_id_fkey"
            columns: ["matched_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_ocr_logs_matched_contract_id_fkey"
            columns: ["matched_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_ocr_logs_matched_customer_id_fkey"
            columns: ["matched_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_ocr_logs_matched_customer_id_fkey"
            columns: ["matched_customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due: number | null
          company_id: string
          contract_id: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_id: string | null
          discount_amount: number | null
          due_date: string | null
          fixed_asset_id: string | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          is_legacy: boolean | null
          journal_entry_id: string | null
          manual_review_required: boolean | null
          notes: string | null
          ocr_confidence: number | null
          ocr_data: Json | null
          paid_amount: number | null
          payment_status: string
          scanned_image_url: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          terms: string | null
          total_amount: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          balance_due?: number | null
          company_id: string
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          due_date?: string | null
          fixed_asset_id?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          is_legacy?: boolean | null
          journal_entry_id?: string | null
          manual_review_required?: boolean | null
          notes?: string | null
          ocr_confidence?: number | null
          ocr_data?: Json | null
          paid_amount?: number | null
          payment_status?: string
          scanned_image_url?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          terms?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          balance_due?: number | null
          company_id?: string
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          due_date?: string | null
          fixed_asset_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          is_legacy?: boolean | null
          journal_entry_id?: string | null
          manual_review_required?: boolean | null
          notes?: string | null
          ocr_confidence?: number | null
          ocr_data?: Json | null
          paid_amount?: number | null
          payment_status?: string
          scanned_image_url?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          terms?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "fk_invoices_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_fixed_asset_id_fkey"
            columns: ["fixed_asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "top_rated_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_purchase_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          accounting_period_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          id: string
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejection_reason: string | null
          reversal_entry_id: string | null
          reversed_at: string | null
          reversed_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          total_credit: number
          total_debit: number
          updated_at: string
          updated_by: string | null
          workflow_notes: string | null
        }
        Insert: {
          accounting_period_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          entry_date: string
          entry_number: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejection_reason?: string | null
          reversal_entry_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
          updated_by?: string | null
          workflow_notes?: string | null
        }
        Update: {
          accounting_period_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejection_reason?: string | null
          reversal_entry_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
          updated_by?: string | null
          workflow_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_journal_entries_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_journal_entries_posted_by"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "journal_entries_accounting_period_id_fkey"
            columns: ["accounting_period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          asset_id: string | null
          cost_center_id: string | null
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          employee_id: string | null
          id: string
          journal_entry_id: string
          line_description: string | null
          line_number: number
        }
        Insert: {
          account_id: string
          asset_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          employee_id?: string | null
          id?: string
          journal_entry_id: string
          line_description?: string | null
          line_number: number
        }
        Update: {
          account_id?: string
          asset_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          employee_id?: string | null
          id?: string
          journal_entry_id?: string
          line_description?: string | null
          line_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_journal_entry_lines_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_journal_entry_lines_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_journal_entry_lines_asset"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_journal_entry_lines_cost_center"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_journal_entry_lines_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          created_at: string
          from_status: string
          id: string
          journal_entry_id: string
          notes: string | null
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          created_at?: string
          from_status: string
          id?: string
          journal_entry_id: string
          notes?: string | null
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          created_at?: string
          from_status?: string
          id?: string
          journal_entry_id?: string
          notes?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_status_history_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_articles: {
        Row: {
          category_id: string | null
          content: string
          content_ar: string
          created_at: string | null
          created_by: string
          helpful_count: number | null
          id: string
          is_published: boolean | null
          not_helpful_count: number | null
          tags: string[] | null
          title: string
          title_ar: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          category_id?: string | null
          content: string
          content_ar: string
          created_at?: string | null
          created_by: string
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          tags?: string[] | null
          title: string
          title_ar: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          category_id?: string | null
          content?: string
          content_ar?: string
          created_at?: string | null
          created_by?: string
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          tags?: string[] | null
          title?: string
          title_ar?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_ab_tests: {
        Row: {
          company_id: string | null
          conversion_goal: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string | null
          status: string | null
          test_name: string
          test_name_ar: string | null
          traffic_split: number | null
          updated_at: string | null
          variant_a_config: Json | null
          variant_b_config: Json | null
          winner_variant: string | null
        }
        Insert: {
          company_id?: string | null
          conversion_goal?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          status?: string | null
          test_name: string
          test_name_ar?: string | null
          traffic_split?: number | null
          updated_at?: string | null
          variant_a_config?: Json | null
          variant_b_config?: Json | null
          winner_variant?: string | null
        }
        Update: {
          company_id?: string | null
          conversion_goal?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          status?: string | null
          test_name?: string
          test_name_ar?: string | null
          traffic_split?: number | null
          updated_at?: string | null
          variant_a_config?: Json | null
          variant_b_config?: Json | null
          winner_variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_ab_tests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_analytics: {
        Row: {
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          page_path: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_content: {
        Row: {
          content_key: string
          content_type: string
          content_value: string | null
          content_value_ar: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          link_url: string | null
          media_url: string | null
          metadata: Json | null
          section_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          content_key: string
          content_type: string
          content_value?: string | null
          content_value_ar?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          media_url?: string | null
          metadata?: Json | null
          section_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          content_key?: string
          content_type?: string
          content_value?: string | null
          content_value_ar?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          media_url?: string | null
          metadata?: Json | null
          section_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_content_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "landing_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_media: {
        Row: {
          alt_text: string | null
          alt_text_ar: string | null
          company_id: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          is_active: boolean | null
          mime_type: string | null
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          alt_text?: string | null
          alt_text_ar?: string | null
          company_id?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          alt_text?: string | null
          alt_text_ar?: string | null
          company_id?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_media_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_sections: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          section_name: string
          section_name_ar: string | null
          section_type: string
          settings: Json
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          section_name: string
          section_name_ar?: string | null
          section_type: string
          settings?: Json
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          section_name?: string
          section_name_ar?: string | null
          section_type?: string
          settings?: Json
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_sections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_settings: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_themes: {
        Row: {
          colors: Json
          company_id: string | null
          created_at: string | null
          created_by: string | null
          custom_css: string | null
          fonts: Json
          id: string
          is_active: boolean | null
          is_default: boolean | null
          spacing: Json
          theme_name: string
          theme_name_ar: string | null
          updated_at: string | null
        }
        Insert: {
          colors?: Json
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_css?: string | null
          fonts?: Json
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          spacing?: Json
          theme_name: string
          theme_name_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          colors?: Json
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_css?: string | null
          fonts?: Json
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          spacing?: Json
          theme_name?: string
          theme_name_ar?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_themes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      late_fee_history: {
        Row: {
          action: string
          created_at: string
          id: string
          late_fee_id: string
          notes: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          late_fee_id: string
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          late_fee_id?: string
          notes?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "late_fee_history_late_fee_id_fkey"
            columns: ["late_fee_id"]
            isOneToOne: false
            referencedRelation: "late_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_fee_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      late_fee_rules: {
        Row: {
          apply_to_invoice_types: string[] | null
          company_id: string
          created_at: string
          fee_amount: number
          fee_type: string
          grace_period_days: number | null
          id: string
          is_active: boolean | null
          max_fee_amount: number | null
          rule_name: string
          updated_at: string
        }
        Insert: {
          apply_to_invoice_types?: string[] | null
          company_id: string
          created_at?: string
          fee_amount: number
          fee_type: string
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          max_fee_amount?: number | null
          rule_name: string
          updated_at?: string
        }
        Update: {
          apply_to_invoice_types?: string[] | null
          company_id?: string
          created_at?: string
          fee_amount?: number
          fee_type?: string
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          max_fee_amount?: number | null
          rule_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "late_fee_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      late_fees: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          company_id: string
          contract_id: string | null
          created_at: string
          customer_notified_at: string | null
          days_overdue: number
          fee_amount: number
          fee_type: string
          id: string
          invoice_id: string
          late_fee_rule_id: string | null
          notification_sent: boolean | null
          original_amount: number
          status: string
          updated_at: string
          waive_reason: string | null
          waive_requested_at: string | null
          waive_requested_by: string | null
          waived_at: string | null
          waived_by: string | null
          waiver_approval_notes: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          customer_notified_at?: string | null
          days_overdue: number
          fee_amount: number
          fee_type: string
          id?: string
          invoice_id: string
          late_fee_rule_id?: string | null
          notification_sent?: boolean | null
          original_amount: number
          status?: string
          updated_at?: string
          waive_reason?: string | null
          waive_requested_at?: string | null
          waive_requested_by?: string | null
          waived_at?: string | null
          waived_by?: string | null
          waiver_approval_notes?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          customer_notified_at?: string | null
          days_overdue?: number
          fee_amount?: number
          fee_type?: string
          id?: string
          invoice_id?: string
          late_fee_rule_id?: string | null
          notification_sent?: boolean | null
          original_amount?: number
          status?: string
          updated_at?: string
          waive_reason?: string | null
          waive_requested_at?: string | null
          waive_requested_by?: string | null
          waived_at?: string | null
          waived_by?: string | null
          waiver_approval_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "late_fees_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "late_fees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_fees_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "late_fees_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_fees_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_fees_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_fees_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "late_fees_late_fee_rule_id_fkey"
            columns: ["late_fee_rule_id"]
            isOneToOne: false
            referencedRelation: "late_fee_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_fees_waive_requested_by_fkey"
            columns: ["waive_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "late_fees_waived_by_fkey"
            columns: ["waived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      late_fine_settings: {
        Row: {
          company_id: string
          created_at: string
          fine_rate: number
          fine_type: string
          grace_period_days: number
          id: string
          is_active: boolean
          max_fine_amount: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          fine_rate?: number
          fine_type: string
          grace_period_days?: number
          id?: string
          is_active?: boolean
          max_fine_amount?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          fine_rate?: number
          fine_type?: string
          grace_period_days?: number
          id?: string
          is_active?: boolean
          max_fine_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      lawsuit_preparations: {
        Row: {
          amount_in_words: string | null
          case_title: string | null
          claims_statement_url: string | null
          claims_text: string | null
          company_id: string
          contract_copy_url: string | null
          contract_id: string | null
          created_at: string | null
          customer_id: string | null
          defendant_id_number: string | null
          defendant_name: string
          defendant_type: string | null
          explanatory_memo_url: string | null
          facts_text: string | null
          id: string
          late_fees: number | null
          notes: string | null
          other_fees: number | null
          overdue_rent: number | null
          prepared_at: string | null
          prepared_by: string | null
          registered_at: string | null
          status: string | null
          submitted_at: string | null
          taqadi_case_number: string | null
          taqadi_reference_number: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          amount_in_words?: string | null
          case_title?: string | null
          claims_statement_url?: string | null
          claims_text?: string | null
          company_id: string
          contract_copy_url?: string | null
          contract_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          defendant_id_number?: string | null
          defendant_name: string
          defendant_type?: string | null
          explanatory_memo_url?: string | null
          facts_text?: string | null
          id?: string
          late_fees?: number | null
          notes?: string | null
          other_fees?: number | null
          overdue_rent?: number | null
          prepared_at?: string | null
          prepared_by?: string | null
          registered_at?: string | null
          status?: string | null
          submitted_at?: string | null
          taqadi_case_number?: string | null
          taqadi_reference_number?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          amount_in_words?: string | null
          case_title?: string | null
          claims_statement_url?: string | null
          claims_text?: string | null
          company_id?: string
          contract_copy_url?: string | null
          contract_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          defendant_id_number?: string | null
          defendant_name?: string
          defendant_type?: string | null
          explanatory_memo_url?: string | null
          facts_text?: string | null
          id?: string
          late_fees?: number | null
          notes?: string | null
          other_fees?: number | null
          overdue_rent?: number | null
          prepared_at?: string | null
          prepared_by?: string | null
          registered_at?: string | null
          status?: string | null
          submitted_at?: string | null
          taqadi_case_number?: string | null
          taqadi_reference_number?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_interactions: {
        Row: {
          accurate: boolean | null
          cache_hit: boolean | null
          company_id: string
          confidence_score: number | null
          context_data: Json | null
          created_at: string | null
          feedback_comments: string | null
          helpful: boolean | null
          id: string
          intent: string | null
          query: string
          rating: number | null
          relevant: boolean | null
          response: string
          response_time_ms: number | null
          session_id: string
          sources_used: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accurate?: boolean | null
          cache_hit?: boolean | null
          company_id: string
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string | null
          feedback_comments?: string | null
          helpful?: boolean | null
          id?: string
          intent?: string | null
          query: string
          rating?: number | null
          relevant?: boolean | null
          response: string
          response_time_ms?: number | null
          session_id: string
          sources_used?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accurate?: boolean | null
          cache_hit?: boolean | null
          company_id?: string
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string | null
          feedback_comments?: string | null
          helpful?: boolean | null
          id?: string
          intent?: string | null
          query?: string
          rating?: number | null
          relevant?: boolean | null
          response?: string
          response_time_ms?: number | null
          session_id?: string
          sources_used?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_patterns: {
        Row: {
          average_rating: number | null
          category: string | null
          company_id: string
          created_at: string | null
          examples: Json | null
          frequency: number | null
          id: string
          last_seen: string | null
          pattern: string
          success_rate: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          category?: string | null
          company_id: string
          created_at?: string | null
          examples?: Json | null
          frequency?: number | null
          id?: string
          last_seen?: string | null
          pattern: string
          success_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          category?: string | null
          company_id?: string
          created_at?: string | null
          examples?: Json | null
          frequency?: number | null
          id?: string
          last_seen?: string | null
          pattern?: string
          success_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_patterns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          leave_type_id: string
          remaining_days: number | null
          total_days: number | null
          updated_at: string | null
          used_days: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          leave_type_id: string
          remaining_days?: number | null
          total_days?: number | null
          updated_at?: string | null
          used_days?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          leave_type_id?: string
          remaining_days?: number | null
          total_days?: number | null
          updated_at?: string | null
          used_days?: number | null
          year?: number
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          applied_date: string | null
          attachment_url: string | null
          covering_employee_id: string | null
          created_at: string | null
          emergency_contact: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string | null
          total_days: number
          updated_at: string | null
        }
        Insert: {
          applied_date?: string | null
          attachment_url?: string | null
          covering_employee_id?: string | null
          created_at?: string | null
          emergency_contact?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string | null
          total_days: number
          updated_at?: string | null
        }
        Update: {
          applied_date?: string | null
          attachment_url?: string | null
          covering_employee_id?: string | null
          created_at?: string | null
          emergency_contact?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string | null
          total_days?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      leave_types: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          max_days_per_year: number | null
          requires_approval: boolean | null
          type_name: string
          type_name_ar: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_days_per_year?: number | null
          requires_approval?: boolean | null
          type_name: string
          type_name_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_days_per_year?: number | null
          requires_approval?: boolean | null
          type_name?: string
          type_name_ar?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_ai_access_logs: {
        Row: {
          access_type: string
          company_id: string
          created_at: string
          customer_id: string | null
          data_accessed: Json | null
          id: string
          purpose: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          data_accessed?: Json | null
          id?: string
          purpose?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          data_accessed?: Json | null
          id?: string
          purpose?: string | null
          user_id?: string
        }
        Relationships: []
      }
      legal_ai_feedback: {
        Row: {
          company_id: string
          country: string | null
          created_at: string
          feedback_text: string | null
          id: string
          message_id: string
          query: string | null
          rating: number
        }
        Insert: {
          company_id: string
          country?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_id: string
          query?: string | null
          rating: number
        }
        Update: {
          company_id?: string
          country?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_id?: string
          query?: string | null
          rating?: number
        }
        Relationships: []
      }
      legal_ai_queries: {
        Row: {
          company_id: string
          confidence_score: number | null
          cost_saved: boolean | null
          country: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          metadata: Json | null
          query: string
          response: string | null
          response_time: number | null
          source_type: string | null
          usage_count: number | null
        }
        Insert: {
          company_id: string
          confidence_score?: number | null
          cost_saved?: boolean | null
          country?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          query: string
          response?: string | null
          response_time?: number | null
          source_type?: string | null
          usage_count?: number | null
        }
        Update: {
          company_id?: string
          confidence_score?: number | null
          cost_saved?: boolean | null
          country?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          query?: string
          response?: string | null
          response_time?: number | null
          source_type?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      legal_case_account_mappings: {
        Row: {
          auto_create_journal_entries: boolean | null
          case_type: string
          client_retainer_liability_account_id: string | null
          company_id: string
          consultation_revenue_account_id: string | null
          court_fees_expense_account_id: string | null
          created_at: string
          created_by: string | null
          expert_witness_expense_account_id: string | null
          id: string
          is_active: boolean | null
          legal_expenses_account_id: string | null
          legal_fees_receivable_account_id: string | null
          legal_fees_revenue_account_id: string | null
          legal_research_expense_account_id: string | null
          settlements_expense_account_id: string | null
          settlements_payable_account_id: string | null
          updated_at: string
        }
        Insert: {
          auto_create_journal_entries?: boolean | null
          case_type: string
          client_retainer_liability_account_id?: string | null
          company_id: string
          consultation_revenue_account_id?: string | null
          court_fees_expense_account_id?: string | null
          created_at?: string
          created_by?: string | null
          expert_witness_expense_account_id?: string | null
          id?: string
          is_active?: boolean | null
          legal_expenses_account_id?: string | null
          legal_fees_receivable_account_id?: string | null
          legal_fees_revenue_account_id?: string | null
          legal_research_expense_account_id?: string | null
          settlements_expense_account_id?: string | null
          settlements_payable_account_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_create_journal_entries?: boolean | null
          case_type?: string
          client_retainer_liability_account_id?: string | null
          company_id?: string
          consultation_revenue_account_id?: string | null
          court_fees_expense_account_id?: string | null
          created_at?: string
          created_by?: string | null
          expert_witness_expense_account_id?: string | null
          id?: string
          is_active?: boolean | null
          legal_expenses_account_id?: string | null
          legal_fees_receivable_account_id?: string | null
          legal_fees_revenue_account_id?: string | null
          legal_research_expense_account_id?: string | null
          settlements_expense_account_id?: string | null
          settlements_payable_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_case_account_mappings_client_retainer_liability_acco_fkey"
            columns: ["client_retainer_liability_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_client_retainer_liability_acco_fkey"
            columns: ["client_retainer_liability_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_consultation_revenue_account_i_fkey"
            columns: ["consultation_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_consultation_revenue_account_i_fkey"
            columns: ["consultation_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_court_fees_expense_account_id_fkey"
            columns: ["court_fees_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_court_fees_expense_account_id_fkey"
            columns: ["court_fees_expense_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_expert_witness_expense_account_fkey"
            columns: ["expert_witness_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_expert_witness_expense_account_fkey"
            columns: ["expert_witness_expense_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_legal_expenses_account_id_fkey"
            columns: ["legal_expenses_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_legal_expenses_account_id_fkey"
            columns: ["legal_expenses_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_legal_fees_receivable_account__fkey"
            columns: ["legal_fees_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_legal_fees_receivable_account__fkey"
            columns: ["legal_fees_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_legal_fees_revenue_account_id_fkey"
            columns: ["legal_fees_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_legal_fees_revenue_account_id_fkey"
            columns: ["legal_fees_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_legal_research_expense_account_fkey"
            columns: ["legal_research_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_legal_research_expense_account_fkey"
            columns: ["legal_research_expense_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_settlements_expense_account_id_fkey"
            columns: ["settlements_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_settlements_expense_account_id_fkey"
            columns: ["settlements_expense_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_settlements_payable_account_id_fkey"
            columns: ["settlements_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_case_account_mappings_settlements_payable_account_id_fkey"
            columns: ["settlements_payable_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_case_activities: {
        Row: {
          activity_date: string | null
          activity_description: string | null
          activity_title: string
          activity_type: string
          case_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          related_correspondence_id: string | null
          related_document_id: string | null
          related_payment_id: string | null
        }
        Insert: {
          activity_date?: string | null
          activity_description?: string | null
          activity_title: string
          activity_type: string
          case_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          related_correspondence_id?: string | null
          related_document_id?: string | null
          related_payment_id?: string | null
        }
        Update: {
          activity_date?: string | null
          activity_description?: string | null
          activity_title?: string
          activity_type?: string
          case_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          related_correspondence_id?: string | null
          related_document_id?: string | null
          related_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_case_activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_case_auto_triggers: {
        Row: {
          auto_case_priority: string | null
          auto_case_type: string | null
          broken_promises_count: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          enable_broken_promises_trigger: boolean | null
          enable_overdue_amount_trigger: boolean | null
          enable_overdue_invoice_trigger: boolean | null
          id: string
          notify_on_auto_create: boolean | null
          overdue_amount_threshold: number | null
          overdue_days_threshold: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_case_priority?: string | null
          auto_case_type?: string | null
          broken_promises_count?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          enable_broken_promises_trigger?: boolean | null
          enable_overdue_amount_trigger?: boolean | null
          enable_overdue_invoice_trigger?: boolean | null
          id?: string
          notify_on_auto_create?: boolean | null
          overdue_amount_threshold?: number | null
          overdue_days_threshold?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_case_priority?: string | null
          auto_case_type?: string | null
          broken_promises_count?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          enable_broken_promises_trigger?: boolean | null
          enable_overdue_amount_trigger?: boolean | null
          enable_overdue_invoice_trigger?: boolean | null
          id?: string
          notify_on_auto_create?: boolean | null
          overdue_amount_threshold?: number | null
          overdue_days_threshold?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_case_auto_triggers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_case_correspondence: {
        Row: {
          attachments: Json | null
          case_id: string
          communication_date: string | null
          company_id: string
          content: string | null
          correspondence_type: string
          created_at: string
          created_by: string | null
          direction: string
          id: string
          is_confidential: boolean | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          requires_response: boolean | null
          response_deadline: string | null
          sender_email: string | null
          sender_name: string | null
          sender_phone: string | null
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          case_id: string
          communication_date?: string | null
          company_id: string
          content?: string | null
          correspondence_type: string
          created_at?: string
          created_by?: string | null
          direction: string
          id?: string
          is_confidential?: boolean | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          requires_response?: boolean | null
          response_deadline?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          case_id?: string
          communication_date?: string | null
          company_id?: string
          content?: string | null
          correspondence_type?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          is_confidential?: boolean | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          requires_response?: boolean | null
          response_deadline?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_case_correspondence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_case_documents: {
        Row: {
          access_level: string | null
          case_id: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          document_date: string | null
          document_title: string
          document_title_ar: string | null
          document_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_confidential: boolean | null
          is_original: boolean | null
          parent_document_id: string | null
          updated_at: string
          version_number: number | null
        }
        Insert: {
          access_level?: string | null
          case_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_date?: string | null
          document_title: string
          document_title_ar?: string | null
          document_type: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_confidential?: boolean | null
          is_original?: boolean | null
          parent_document_id?: string | null
          updated_at?: string
          version_number?: number | null
        }
        Update: {
          access_level?: string | null
          case_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_date?: string | null
          document_title?: string
          document_title_ar?: string | null
          document_type?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_confidential?: boolean | null
          is_original?: boolean | null
          parent_document_id?: string | null
          updated_at?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_case_payments: {
        Row: {
          amount: number
          case_id: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          payment_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          case_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payment_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          case_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_case_payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_cases: {
        Row: {
          billing_status: string | null
          case_direction: string | null
          case_number: string
          case_reference: string | null
          case_status: string
          case_title: string
          case_title_ar: string | null
          case_type: string
          case_value: number | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          company_id: string
          complaint_number: string | null
          contract_id: string | null
          court_fees: number | null
          court_name: string | null
          court_name_ar: string | null
          created_at: string
          created_by: string | null
          description: string | null
          filing_date: string | null
          hearing_date: string | null
          id: string
          is_confidential: boolean | null
          judge_name: string | null
          legal_fees: number | null
          legal_team: Json | null
          notes: string | null
          other_expenses: number | null
          outcome_amount: number | null
          outcome_amount_type: string | null
          outcome_date: string | null
          outcome_journal_entry_id: string | null
          outcome_notes: string | null
          outcome_payment_status: string | null
          outcome_type: string | null
          payment_direction: string | null
          police_report_number: string | null
          police_station: string | null
          primary_lawyer_id: string | null
          priority: string
          statute_limitations: string | null
          tags: Json | null
          total_costs: number | null
          updated_at: string
        }
        Insert: {
          billing_status?: string | null
          case_direction?: string | null
          case_number: string
          case_reference?: string | null
          case_status?: string
          case_title: string
          case_title_ar?: string | null
          case_type?: string
          case_value?: number | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_id: string
          complaint_number?: string | null
          contract_id?: string | null
          court_fees?: number | null
          court_name?: string | null
          court_name_ar?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          filing_date?: string | null
          hearing_date?: string | null
          id?: string
          is_confidential?: boolean | null
          judge_name?: string | null
          legal_fees?: number | null
          legal_team?: Json | null
          notes?: string | null
          other_expenses?: number | null
          outcome_amount?: number | null
          outcome_amount_type?: string | null
          outcome_date?: string | null
          outcome_journal_entry_id?: string | null
          outcome_notes?: string | null
          outcome_payment_status?: string | null
          outcome_type?: string | null
          payment_direction?: string | null
          police_report_number?: string | null
          police_station?: string | null
          primary_lawyer_id?: string | null
          priority?: string
          statute_limitations?: string | null
          tags?: Json | null
          total_costs?: number | null
          updated_at?: string
        }
        Update: {
          billing_status?: string | null
          case_direction?: string | null
          case_number?: string
          case_reference?: string | null
          case_status?: string
          case_title?: string
          case_title_ar?: string | null
          case_type?: string
          case_value?: number | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_id?: string
          complaint_number?: string | null
          contract_id?: string | null
          court_fees?: number | null
          court_name?: string | null
          court_name_ar?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          filing_date?: string | null
          hearing_date?: string | null
          id?: string
          is_confidential?: boolean | null
          judge_name?: string | null
          legal_fees?: number | null
          legal_team?: Json | null
          notes?: string | null
          other_expenses?: number | null
          outcome_amount?: number | null
          outcome_amount_type?: string | null
          outcome_date?: string | null
          outcome_journal_entry_id?: string | null
          outcome_notes?: string | null
          outcome_payment_status?: string | null
          outcome_type?: string | null
          payment_direction?: string | null
          police_report_number?: string | null
          police_station?: string | null
          primary_lawyer_id?: string | null
          priority?: string
          statute_limitations?: string | null
          tags?: Json | null
          total_costs?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_cases_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "legal_cases_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_cases_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_cases_outcome_journal_entry_id_fkey"
            columns: ["outcome_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_consultations: {
        Row: {
          company_id: string
          cost_usd: number | null
          country: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          query: string
          query_type: string | null
          response: string
          response_time_ms: number | null
          risk_score: number | null
          tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          cost_usd?: number | null
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          query: string
          query_type?: string | null
          response: string
          response_time_ms?: number | null
          risk_score?: number | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          cost_usd?: number | null
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          query?: string
          query_type?: string | null
          response?: string
          response_time_ms?: number | null
          risk_score?: number | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_consultations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_consultations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_consultations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      legal_document_generations: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          body: string | null
          company_id: string
          content: string
          country_law: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          document_number: string | null
          document_title: string | null
          document_type: string
          id: string
          metadata: Json | null
          recipient_address: string | null
          recipient_entity: string | null
          recipient_name: string | null
          rejection_reason: string | null
          related_contract_id: string | null
          related_customer_id: string | null
          related_vehicle_id: string | null
          status: string | null
          subject: string | null
          template_id: string | null
          template_used: string | null
          updated_at: string | null
          variables_data: Json | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          body?: string | null
          company_id: string
          content: string
          country_law?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          document_number?: string | null
          document_title?: string | null
          document_type: string
          id?: string
          metadata?: Json | null
          recipient_address?: string | null
          recipient_entity?: string | null
          recipient_name?: string | null
          rejection_reason?: string | null
          related_contract_id?: string | null
          related_customer_id?: string | null
          related_vehicle_id?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          template_used?: string | null
          updated_at?: string | null
          variables_data?: Json | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          body?: string | null
          company_id?: string
          content?: string
          country_law?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          document_number?: string | null
          document_title?: string | null
          document_type?: string
          id?: string
          metadata?: Json | null
          recipient_address?: string | null
          recipient_entity?: string | null
          recipient_name?: string | null
          rejection_reason?: string | null
          related_contract_id?: string | null
          related_customer_id?: string | null
          related_vehicle_id?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          template_used?: string | null
          updated_at?: string | null
          variables_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_legal_document_generations_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_legal_document_generations_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_legal_document_generations_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "fk_legal_document_generations_template_id"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "legal_document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      legal_document_templates: {
        Row: {
          body_ar: string
          body_en: string | null
          body_template: string | null
          category: string | null
          code: string
          company_id: string | null
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          footer_template: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name_ar: string
          name_en: string | null
          requires_approval: boolean | null
          subject_template: string | null
          template_key: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_ar: string
          body_en?: string | null
          body_template?: string | null
          category?: string | null
          code: string
          company_id?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          footer_template?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name_ar: string
          name_en?: string | null
          requires_approval?: boolean | null
          subject_template?: string | null
          template_key?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_ar?: string
          body_en?: string | null
          body_template?: string | null
          category?: string | null
          code?: string
          company_id?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          footer_template?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name_ar?: string
          name_en?: string | null
          requires_approval?: boolean | null
          subject_template?: string | null
          template_key?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_knowledge_base: {
        Row: {
          article_content: string
          article_number: string | null
          article_title: string | null
          category: string
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          law_name: string
          law_number: string | null
          law_year: number | null
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          article_content: string
          article_number?: string | null
          article_title?: string | null
          category: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          law_name: string
          law_number?: string | null
          law_year?: number | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          article_content?: string
          article_number?: string | null
          article_title?: string | null
          category?: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          law_name?: string
          law_number?: string | null
          law_year?: number | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_memo_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          memo_type: string
          template_content: string
          template_name: string
          template_name_ar: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          memo_type: string
          template_content: string
          template_name: string
          template_name_ar?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          memo_type?: string
          template_content?: string
          template_name?: string
          template_name_ar?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      legal_memos: {
        Row: {
          approved_by: string | null
          company_id: string
          content: string
          created_at: string
          created_by: string
          customer_id: string
          data_sources: Json | null
          generated_by_ai: boolean | null
          id: string
          memo_number: string
          memo_type: string
          recommendations: Json | null
          sent_at: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          company_id: string
          content: string
          created_at?: string
          created_by: string
          customer_id: string
          data_sources?: Json | null
          generated_by_ai?: boolean | null
          id?: string
          memo_number: string
          memo_type?: string
          recommendations?: Json | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          data_sources?: Json | null
          generated_by_ai?: boolean | null
          id?: string
          memo_number?: string
          memo_type?: string
          recommendations?: Json | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_account_mappings: {
        Row: {
          asset_account_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_account_id: string
          id: string
          is_active: boolean | null
          maintenance_type: string
          updated_at: string | null
        }
        Insert: {
          asset_account_id?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_account_id: string
          id?: string
          is_active?: boolean | null
          maintenance_type: string
          updated_at?: string | null
        }
        Update: {
          asset_account_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_account_id?: string
          id?: string
          is_active?: boolean | null
          maintenance_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_account_mappings_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_account_mappings_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_account_mappings_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_account_mappings_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_checklist: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          item_description: string | null
          item_name: string
          maintenance_id: string
          notes: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          item_description?: string | null
          item_name: string
          maintenance_id: string
          notes?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          item_description?: string | null
          item_name?: string
          maintenance_id?: string
          notes?: string | null
        }
        Relationships: []
      }
      module_settings: {
        Row: {
          company_id: string
          id: string
          is_enabled: boolean | null
          last_updated: string | null
          module_config: Json | null
          module_name: string
          updated_by: string | null
          version: string | null
        }
        Insert: {
          company_id: string
          id?: string
          is_enabled?: boolean | null
          last_updated?: string | null
          module_config?: Json | null
          module_name: string
          updated_by?: string | null
          version?: string | null
        }
        Update: {
          company_id?: string
          id?: string
          is_enabled?: boolean | null
          last_updated?: string | null
          module_config?: Json | null
          module_name?: string
          updated_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          company_id: string
          created_at: string
          email_notifications: boolean | null
          expiry_reminder_days: number | null
          id: string
          renewal_reminder_days: number | null
          sms_notifications: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email_notifications?: boolean | null
          expiry_reminder_days?: number | null
          id?: string
          renewal_reminder_days?: number | null
          sms_notifications?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email_notifications?: boolean | null
          expiry_reminder_days?: number | null
          id?: string
          renewal_reminder_days?: number | null
          sms_notifications?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          createdAt: string
          id: number
          isRead: number
          message: string
          relatedId: number | null
          relatedType: string | null
          title: string
          type: string
          userId: number
        }
        Insert: {
          createdAt?: string
          id?: number
          isRead?: number
          message: string
          relatedId?: number | null
          relatedType?: string | null
          title: string
          type: string
          userId: number
        }
        Update: {
          createdAt?: string
          id?: number
          isRead?: number
          message?: string
          relatedId?: number | null
          relatedType?: string | null
          title?: string
          type?: string
          userId?: number
        }
        Relationships: [
          {
            foreignKeyName: "notifications_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      odometer_readings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string | null
          odometer_reading: number
          reading_date: string
          reading_type: string
          recorded_by: string | null
          vehicle_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          odometer_reading: number
          reading_date?: string
          reading_type?: string
          recorded_by?: string | null
          vehicle_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          odometer_reading?: number
          reading_date?: string
          reading_type?: string
          recorded_by?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      orderItems: {
        Row: {
          createdAt: string
          id: number
          orderId: number
          partId: number
          partName: string
          partNumber: string | null
          price: number
          quantity: number
        }
        Insert: {
          createdAt?: string
          id?: number
          orderId: number
          partId: number
          partName: string
          partNumber?: string | null
          price: number
          quantity: number
        }
        Update: {
          createdAt?: string
          id?: number
          orderId?: number
          partId?: number
          partName?: string
          partNumber?: string | null
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "orderItems_orderId_fkey"
            columns: ["orderId"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orderItems_partId_fkey"
            columns: ["partId"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          createdAt: string
          customerEmail: string
          customerId: number | null
          customerName: string
          customerPhone: string | null
          id: number
          paymentMethod: string | null
          paymentStatus: string
          shippingAddress: string
          shippingCity: string
          shippingCost: number
          shippingMethod: string
          shippingZip: string
          shopId: number
          status: string
          subtotal: number
          total: number
          trackingNumber: string | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          customerEmail: string
          customerId?: number | null
          customerName: string
          customerPhone?: string | null
          id?: number
          paymentMethod?: string | null
          paymentStatus?: string
          shippingAddress: string
          shippingCity: string
          shippingCost: number
          shippingMethod: string
          shippingZip: string
          shopId: number
          status?: string
          subtotal: number
          total: number
          trackingNumber?: string | null
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          customerEmail?: string
          customerId?: number | null
          customerName?: string
          customerPhone?: string | null
          id?: number
          paymentMethod?: string | null
          paymentStatus?: string
          shippingAddress?: string
          shippingCity?: string
          shippingCost?: number
          shippingMethod?: string
          shippingZip?: string
          shopId?: number
          status?: string
          subtotal?: number
          total?: number
          trackingNumber?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customerId_fkey"
            columns: ["customerId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shopId_fkey"
            columns: ["shopId"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          brand: string | null
          category: string
          compatibleMakes: string | null
          compatibleModels: string | null
          compatibleYears: string | null
          condition: string
          createdAt: string
          description: string | null
          id: number
          imageUrl: string | null
          isActive: number
          lowStockThreshold: number
          name: string
          partNumber: string | null
          price: number
          shopId: number
          specifications: string | null
          stock: number
          updatedAt: string
        }
        Insert: {
          brand?: string | null
          category: string
          compatibleMakes?: string | null
          compatibleModels?: string | null
          compatibleYears?: string | null
          condition?: string
          createdAt?: string
          description?: string | null
          id?: number
          imageUrl?: string | null
          isActive?: number
          lowStockThreshold?: number
          name: string
          partNumber?: string | null
          price: number
          shopId: number
          specifications?: string | null
          stock?: number
          updatedAt?: string
        }
        Update: {
          brand?: string | null
          category?: string
          compatibleMakes?: string | null
          compatibleModels?: string | null
          compatibleYears?: string | null
          condition?: string
          createdAt?: string
          description?: string | null
          id?: number
          imageUrl?: string | null
          isActive?: number
          lowStockThreshold?: number
          name?: string
          partNumber?: string | null
          price?: number
          shopId?: number
          specifications?: string | null
          stock?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_shopId_fkey"
            columns: ["shopId"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_ai_analysis: {
        Row: {
          ai_reasoning: string | null
          analysis_model: string | null
          analysis_timestamp: string | null
          base_amount: number | null
          company_id: string | null
          confidence_score: number | null
          contract_reference: string | null
          created_at: string | null
          extracted_amounts: number[] | null
          extracted_contract_numbers: string[] | null
          extracted_customer_names: string[] | null
          extracted_dates: string[] | null
          id: string
          is_late_fee: boolean | null
          late_fee_amount: number | null
          payment_id: string | null
          payment_type: string
          period_month: number | null
          period_month_name: string | null
          period_year: number | null
          processing_time_ms: number | null
          suggested_actions: string[] | null
          updated_at: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          analysis_model?: string | null
          analysis_timestamp?: string | null
          base_amount?: number | null
          company_id?: string | null
          confidence_score?: number | null
          contract_reference?: string | null
          created_at?: string | null
          extracted_amounts?: number[] | null
          extracted_contract_numbers?: string[] | null
          extracted_customer_names?: string[] | null
          extracted_dates?: string[] | null
          id?: string
          is_late_fee?: boolean | null
          late_fee_amount?: number | null
          payment_id?: string | null
          payment_type: string
          period_month?: number | null
          period_month_name?: string | null
          period_year?: number | null
          processing_time_ms?: number | null
          suggested_actions?: string[] | null
          updated_at?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          analysis_model?: string | null
          analysis_timestamp?: string | null
          base_amount?: number | null
          company_id?: string | null
          confidence_score?: number | null
          contract_reference?: string | null
          created_at?: string | null
          extracted_amounts?: number[] | null
          extracted_contract_numbers?: string[] | null
          extracted_customer_names?: string[] | null
          extracted_dates?: string[] | null
          id?: string
          is_late_fee?: boolean | null
          late_fee_amount?: number | null
          payment_id?: string | null
          payment_type?: string
          period_month?: number | null
          period_month_name?: string | null
          period_year?: number | null
          processing_time_ms?: number | null
          suggested_actions?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_allocation_rules: {
        Row: {
          actions: Json
          company_id: string
          conditions: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          actions?: Json
          company_id: string
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          actions?: Json
          company_id?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_date: string
          allocation_method: string
          allocation_type: string
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_id: string
          target_id: string
          updated_at: string
        }
        Insert: {
          allocated_date?: string
          allocation_method?: string
          allocation_type: string
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_id: string
          target_id: string
          updated_at?: string
        }
        Update: {
          allocated_date?: string
          allocation_method?: string
          allocation_type?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_id?: string
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount: number
          attempt_date: string
          company_id: string
          created_at: string | null
          customer_id: string
          error_code: string | null
          failure_reason: string | null
          gateway_response: Json | null
          id: string
          invoice_id: string
          payment_method: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          attempt_date?: string
          company_id: string
          created_at?: string | null
          customer_id: string
          error_code?: string | null
          failure_reason?: string | null
          gateway_response?: Json | null
          id?: string
          invoice_id: string
          payment_method?: string | null
          status: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          attempt_date?: string
          company_id?: string
          created_at?: string | null
          customer_id?: string
          error_code?: string | null
          failure_reason?: string | null
          gateway_response?: Json | null
          id?: string
          invoice_id?: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      payment_behavior_analytics: {
        Row: {
          analyzed_at: string
          average_days_to_pay: number | null
          best_day_to_contact: string | null
          best_time_to_contact: string | null
          company_id: string
          created_at: string | null
          customer_id: string
          data_points_count: number | null
          id: string
          on_time_payment_rate: number | null
          payment_frequency: string | null
          preferred_payment_method: string | null
          prefers_reminders: boolean | null
          promise_keeping_rate: number | null
          response_rate: number | null
          typical_delay_days: number | null
          updated_at: string | null
        }
        Insert: {
          analyzed_at?: string
          average_days_to_pay?: number | null
          best_day_to_contact?: string | null
          best_time_to_contact?: string | null
          company_id: string
          created_at?: string | null
          customer_id: string
          data_points_count?: number | null
          id?: string
          on_time_payment_rate?: number | null
          payment_frequency?: string | null
          preferred_payment_method?: string | null
          prefers_reminders?: boolean | null
          promise_keeping_rate?: number | null
          response_rate?: number | null
          typical_delay_days?: number | null
          updated_at?: string | null
        }
        Update: {
          analyzed_at?: string
          average_days_to_pay?: number | null
          best_day_to_contact?: string | null
          best_time_to_contact?: string | null
          company_id?: string
          created_at?: string | null
          customer_id?: string
          data_points_count?: number | null
          id?: string
          on_time_payment_rate?: number | null
          payment_frequency?: string | null
          preferred_payment_method?: string | null
          prefers_reminders?: boolean | null
          promise_keeping_rate?: number | null
          response_rate?: number | null
          typical_delay_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_behavior_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_behavior_analytics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_behavior_analytics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      payment_contract_linking_attempts: {
        Row: {
          attempted_contract_identifiers: Json | null
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          linking_confidence: number | null
          linking_method: string | null
          matching_contracts: Json | null
          payment_id: string | null
          selected_contract_id: string | null
        }
        Insert: {
          attempted_contract_identifiers?: Json | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          linking_confidence?: number | null
          linking_method?: string | null
          matching_contracts?: Json | null
          payment_id?: string | null
          selected_contract_id?: string | null
        }
        Update: {
          attempted_contract_identifiers?: Json | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          linking_confidence?: number | null
          linking_method?: string | null
          matching_contracts?: Json | null
          payment_id?: string | null
          selected_contract_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_contract_linking_attempts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_contract_linking_attempts_selected_contract_id_fkey"
            columns: ["selected_contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "payment_contract_linking_attempts_selected_contract_id_fkey"
            columns: ["selected_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_contract_linking_attempts_selected_contract_id_fkey"
            columns: ["selected_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_contract_matching: {
        Row: {
          alternative_matches: Json | null
          company_id: string | null
          confidence_score: number | null
          contract_id: string | null
          created_at: string | null
          id: string
          match_method: string
          match_reason: string | null
          match_status: string | null
          payment_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string | null
          validation_warnings: string[] | null
        }
        Insert: {
          alternative_matches?: Json | null
          company_id?: string | null
          confidence_score?: number | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          match_method: string
          match_reason?: string | null
          match_status?: string | null
          payment_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          validation_warnings?: string[] | null
        }
        Update: {
          alternative_matches?: Json | null
          company_id?: string | null
          confidence_score?: number | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          match_method?: string
          match_reason?: string | null
          match_status?: string | null
          payment_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          validation_warnings?: string[] | null
        }
        Relationships: []
      }
      payment_installments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          paid_amount: number | null
          paid_date: string | null
          payment_plan_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          paid_amount?: number | null
          paid_date?: string | null
          payment_plan_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          paid_amount?: number | null
          paid_date?: string | null
          payment_plan_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "active_payment_plans_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_installments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          customer_id: string
          end_date: string
          frequency: string
          id: string
          invoice_id: string
          number_of_payments: number
          start_date: string
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          end_date: string
          frequency: string
          id?: string
          invoice_id: string
          number_of_payments: number
          start_date: string
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          end_date?: string
          frequency?: string
          id?: string
          invoice_id?: string
          number_of_payments?: number
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_plans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      payment_promises: {
        Row: {
          actual_paid_amount: number | null
          actual_paid_date: string | null
          company_id: string
          contact_method: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          invoice_id: string
          notes: string | null
          promise_date: string
          promised_amount: number
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_paid_amount?: number | null
          actual_paid_date?: string | null
          company_id: string
          contact_method?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          invoice_id: string
          notes?: string | null
          promise_date: string
          promised_amount: number
          status: string
          updated_at?: string | null
        }
        Update: {
          actual_paid_amount?: number | null
          actual_paid_date?: string | null
          company_id?: string
          contact_method?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          promise_date?: string
          promised_amount?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_promises_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_promises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_promises_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_promises_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_promises_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_promises_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          clicked_at: string | null
          company_id: string
          created_at: string | null
          customer_id: string
          id: string
          invoice_id: string
          message_body: string | null
          opened_at: string | null
          reminder_stage: string
          responded_at: string | null
          response_type: string | null
          send_method: string | null
          sent_by: string | null
          sent_date: string
          subject: string | null
          template_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          company_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          invoice_id: string
          message_body?: string | null
          opened_at?: string | null
          reminder_stage: string
          responded_at?: string | null
          response_type?: string | null
          send_method?: string | null
          sent_by?: string | null
          sent_date?: string
          subject?: string | null
          template_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          company_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          invoice_id?: string
          message_body?: string | null
          opened_at?: string | null
          reminder_stage?: string
          responded_at?: string | null
          response_type?: string | null
          send_method?: string | null
          sent_by?: string | null
          sent_date?: string
          subject?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_reminders_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string | null
          agreement_number: string | null
          allocation_status: string | null
          amount: number
          amount_paid: number | null
          bank_account: string | null
          bank_id: string | null
          check_number: string | null
          company_id: string
          contract_id: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_id: string | null
          days_overdue: number | null
          description_type: string | null
          due_date: string | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          late_fee_amount: number | null
          late_fee_days: number | null
          late_fine_amount: number | null
          late_fine_days_overdue: number | null
          late_fine_status: string | null
          late_fine_type: string | null
          late_fine_waiver_reason: string | null
          linking_confidence: number | null
          monthly_amount: number | null
          notes: string | null
          original_due_date: string | null
          payment_completion_status: string | null
          payment_date: string
          payment_method: string
          payment_month: string | null
          payment_number: string
          payment_status: string
          payment_type: string
          processing_notes: string | null
          processing_status: string | null
          reconciliation_status: string | null
          reference_number: string | null
          remaining_amount: number | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          account_id?: string | null
          agreement_number?: string | null
          allocation_status?: string | null
          amount: number
          amount_paid?: number | null
          bank_account?: string | null
          bank_id?: string | null
          check_number?: string | null
          company_id: string
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          days_overdue?: number | null
          description_type?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          late_fee_amount?: number | null
          late_fee_days?: number | null
          late_fine_amount?: number | null
          late_fine_days_overdue?: number | null
          late_fine_status?: string | null
          late_fine_type?: string | null
          late_fine_waiver_reason?: string | null
          linking_confidence?: number | null
          monthly_amount?: number | null
          notes?: string | null
          original_due_date?: string | null
          payment_completion_status?: string | null
          payment_date: string
          payment_method: string
          payment_month?: string | null
          payment_number: string
          payment_status?: string
          payment_type: string
          processing_notes?: string | null
          processing_status?: string | null
          reconciliation_status?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          account_id?: string | null
          agreement_number?: string | null
          allocation_status?: string | null
          amount?: number
          amount_paid?: number | null
          bank_account?: string | null
          bank_id?: string | null
          check_number?: string | null
          company_id?: string
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          days_overdue?: number | null
          description_type?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          late_fee_amount?: number | null
          late_fee_days?: number | null
          late_fine_amount?: number | null
          late_fine_days_overdue?: number | null
          late_fine_status?: string | null
          late_fine_type?: string | null
          late_fine_waiver_reason?: string | null
          linking_confidence?: number | null
          monthly_amount?: number | null
          notes?: string | null
          original_due_date?: string | null
          payment_completion_status?: string | null
          payment_date?: string
          payment_method?: string
          payment_month?: string | null
          payment_number?: string
          payment_status?: string
          payment_type?: string
          processing_notes?: string | null
          processing_status?: string | null
          reconciliation_status?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "fk_payments_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payments_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "top_rated_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_purchase_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_backup_20251107: {
        Row: {
          account_id: string | null
          agreement_number: string | null
          allocation_status: string | null
          amount: number | null
          bank_account: string | null
          bank_id: string | null
          check_number: string | null
          company_id: string | null
          contract_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          description_type: string | null
          due_date: string | null
          id: string | null
          invoice_id: string | null
          journal_entry_id: string | null
          late_fine_amount: number | null
          late_fine_days_overdue: number | null
          late_fine_status: string | null
          late_fine_type: string | null
          late_fine_waiver_reason: string | null
          linking_confidence: number | null
          notes: string | null
          original_due_date: string | null
          payment_date: string | null
          payment_method: string | null
          payment_number: string | null
          payment_status: string | null
          payment_type: string | null
          processing_notes: string | null
          processing_status: string | null
          reconciliation_status: string | null
          reference_number: string | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          account_id?: string | null
          agreement_number?: string | null
          allocation_status?: string | null
          amount?: number | null
          bank_account?: string | null
          bank_id?: string | null
          check_number?: string | null
          company_id?: string | null
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          description_type?: string | null
          due_date?: string | null
          id?: string | null
          invoice_id?: string | null
          journal_entry_id?: string | null
          late_fine_amount?: number | null
          late_fine_days_overdue?: number | null
          late_fine_status?: string | null
          late_fine_type?: string | null
          late_fine_waiver_reason?: string | null
          linking_confidence?: number | null
          notes?: string | null
          original_due_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_number?: string | null
          payment_status?: string | null
          payment_type?: string | null
          processing_notes?: string | null
          processing_status?: string | null
          reconciliation_status?: string | null
          reference_number?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          account_id?: string | null
          agreement_number?: string | null
          allocation_status?: string | null
          amount?: number | null
          bank_account?: string | null
          bank_id?: string | null
          check_number?: string | null
          company_id?: string | null
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          description_type?: string | null
          due_date?: string | null
          id?: string | null
          invoice_id?: string | null
          journal_entry_id?: string | null
          late_fine_amount?: number | null
          late_fine_days_overdue?: number | null
          late_fine_status?: string | null
          late_fine_type?: string | null
          late_fine_waiver_reason?: string | null
          linking_confidence?: number | null
          notes?: string | null
          original_due_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_number?: string | null
          payment_status?: string | null
          payment_type?: string | null
          processing_notes?: string | null
          processing_status?: string | null
          reconciliation_status?: string | null
          reference_number?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      payroll: {
        Row: {
          allowances: number | null
          bank_account: string | null
          basic_salary: number
          company_id: string
          created_at: string
          created_by: string | null
          deductions: number | null
          employee_id: string
          id: string
          journal_entry_id: string | null
          net_amount: number
          notes: string | null
          overtime_amount: number | null
          pay_period_end: string
          pay_period_start: string
          payment_method: string | null
          payroll_date: string
          payroll_number: string
          status: string
          tax_amount: number | null
          updated_at: string
        }
        Insert: {
          allowances?: number | null
          bank_account?: string | null
          basic_salary?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          employee_id: string
          id?: string
          journal_entry_id?: string | null
          net_amount?: number
          notes?: string | null
          overtime_amount?: number | null
          pay_period_end: string
          pay_period_start: string
          payment_method?: string | null
          payroll_date: string
          payroll_number: string
          status?: string
          tax_amount?: number | null
          updated_at?: string
        }
        Update: {
          allowances?: number | null
          bank_account?: string | null
          basic_salary?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          employee_id?: string
          id?: string
          journal_entry_id?: string | null
          net_amount?: number
          notes?: string | null
          overtime_amount?: number | null
          pay_period_end?: string
          pay_period_start?: string
          payment_method?: string | null
          payroll_date?: string
          payroll_number?: string
          status?: string
          tax_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payroll_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          journal_entry_id: string | null
          net_amount: number | null
          notes: string | null
          period_end: string
          period_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          total_amount: number | null
          total_deductions: number | null
          total_employees: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          net_amount?: number | null
          notes?: string | null
          period_end: string
          period_start: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_amount?: number | null
          total_deductions?: number | null
          total_employees?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          net_amount?: number | null
          notes?: string | null
          period_end?: string
          period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_amount?: number | null
          total_deductions?: number | null
          total_employees?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payroll_settings: {
        Row: {
          allow_negative_balance: boolean | null
          auto_calculate_overtime: boolean | null
          company_id: string
          created_at: string
          id: string
          late_penalty_per_hour: number | null
          overtime_rate: number | null
          pay_date: number | null
          payroll_frequency: string | null
          social_security_rate: number | null
          tax_rate: number | null
          updated_at: string
          working_days_per_month: number | null
          working_hours_per_day: number | null
        }
        Insert: {
          allow_negative_balance?: boolean | null
          auto_calculate_overtime?: boolean | null
          company_id: string
          created_at?: string
          id?: string
          late_penalty_per_hour?: number | null
          overtime_rate?: number | null
          pay_date?: number | null
          payroll_frequency?: string | null
          social_security_rate?: number | null
          tax_rate?: number | null
          updated_at?: string
          working_days_per_month?: number | null
          working_hours_per_day?: number | null
        }
        Update: {
          allow_negative_balance?: boolean | null
          auto_calculate_overtime?: boolean | null
          company_id?: string
          created_at?: string
          id?: string
          late_penalty_per_hour?: number | null
          overtime_rate?: number | null
          pay_date?: number | null
          payroll_frequency?: string | null
          social_security_rate?: number | null
          tax_rate?: number | null
          updated_at?: string
          working_days_per_month?: number | null
          working_hours_per_day?: number | null
        }
        Relationships: []
      }
      payroll_slips: {
        Row: {
          absent_days: number | null
          allowances: number | null
          bank_reference: string | null
          basic_salary: number
          created_at: string
          employee_id: string
          id: string
          late_days: number | null
          late_penalty: number | null
          net_salary: number | null
          notes: string | null
          other_deductions: number | null
          overtime_amount: number | null
          overtime_hours: number | null
          paid_at: string | null
          payment_method: string | null
          payroll_review_id: string
          period_end: string
          period_start: string
          present_days: number | null
          social_security_deduction: number | null
          status: string
          tax_deduction: number | null
          total_deductions: number | null
          total_earnings: number | null
          updated_at: string
          working_days: number | null
        }
        Insert: {
          absent_days?: number | null
          allowances?: number | null
          bank_reference?: string | null
          basic_salary?: number
          created_at?: string
          employee_id: string
          id?: string
          late_days?: number | null
          late_penalty?: number | null
          net_salary?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payroll_review_id: string
          period_end: string
          period_start: string
          present_days?: number | null
          social_security_deduction?: number | null
          status?: string
          tax_deduction?: number | null
          total_deductions?: number | null
          total_earnings?: number | null
          updated_at?: string
          working_days?: number | null
        }
        Update: {
          absent_days?: number | null
          allowances?: number | null
          bank_reference?: string | null
          basic_salary?: number
          created_at?: string
          employee_id?: string
          id?: string
          late_days?: number | null
          late_penalty?: number | null
          net_salary?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payroll_review_id?: string
          period_end?: string
          period_start?: string
          present_days?: number | null
          social_security_deduction?: number | null
          status?: string
          tax_deduction?: number | null
          total_deductions?: number | null
          total_earnings?: number | null
          updated_at?: string
          working_days?: number | null
        }
        Relationships: []
      }
      penalties: {
        Row: {
          amount: number
          company_id: string
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          location: string | null
          notes: string | null
          payment_status: string | null
          penalty_date: string
          penalty_number: string
          reason: string | null
          status: string | null
          updated_at: string | null
          vehicle_id: string | null
          vehicle_plate: string | null
          violation_type: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          payment_status?: string | null
          penalty_date: string
          penalty_number: string
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
          violation_type?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          payment_status?: string | null
          penalty_date?: string
          penalty_number?: string
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          vehicle_plate?: string | null
          violation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "penalties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "penalties_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "penalties_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_journal_entries: {
        Row: {
          company_id: string
          contract_id: string
          created_at: string | null
          entry_type: string
          id: string
          last_error: string | null
          max_retries: number | null
          metadata: Json | null
          next_retry_at: string | null
          priority: number | null
          processed_at: string | null
          retry_count: number | null
          status: string | null
        }
        Insert: {
          company_id: string
          contract_id: string
          created_at?: string | null
          entry_type?: string
          id?: string
          last_error?: string | null
          max_retries?: number | null
          metadata?: Json | null
          next_retry_at?: string | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
        }
        Update: {
          company_id?: string
          contract_id?: string
          created_at?: string | null
          entry_type?: string
          id?: string
          last_error?: string | null
          max_retries?: number | null
          metadata?: Json | null
          next_retry_at?: string | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pending_journal_entries_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pending_journal_entries_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "fk_pending_journal_entries_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pending_journal_entries_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
          recorded_at: string | null
          tags: Json | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string | null
          tags?: Json | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string | null
          tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_change_requests: {
        Row: {
          company_id: string
          created_at: string
          current_permissions: string[] | null
          current_roles: string[] | null
          employee_id: string
          expires_at: string
          id: string
          reason: string
          rejection_reason: string | null
          request_type: string
          requested_by: string
          requested_permissions: string[] | null
          requested_roles: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_permissions?: string[] | null
          current_roles?: string[] | null
          employee_id: string
          expires_at: string
          id?: string
          reason: string
          rejection_reason?: string | null
          request_type: string
          requested_by: string
          requested_permissions?: string[] | null
          requested_roles?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_permissions?: string[] | null
          current_roles?: string[] | null
          employee_id?: string
          expires_at?: string
          id?: string
          reason?: string
          rejection_reason?: string | null
          request_type?: string
          requested_by?: string
          requested_permissions?: string[] | null
          requested_roles?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          first_name: string
          first_name_ar: string | null
          id: string
          is_active: boolean | null
          is_demo_user: boolean | null
          language_preference: string | null
          last_name: string
          last_name_ar: string | null
          national_id: string | null
          phone: string | null
          position: string | null
          position_ar: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          first_name: string
          first_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          is_demo_user?: boolean | null
          language_preference?: string | null
          last_name: string
          last_name_ar?: string | null
          national_id?: string | null
          phone?: string | null
          position?: string | null
          position_ar?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          first_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          is_demo_user?: boolean | null
          language_preference?: string | null
          last_name?: string
          last_name_ar?: string | null
          national_id?: string | null
          phone?: string | null
          position?: string | null
          position_ar?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          address_ar: string | null
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          description_ar: string | null
          documents: string[] | null
          features: Json | null
          floor_number: number | null
          furnished: boolean | null
          id: string
          images: string[] | null
          is_active: boolean | null
          location_coordinates: Json | null
          manager_id: string | null
          owner_id: string | null
          parking_spaces: number | null
          property_code: string
          property_name: string
          property_name_ar: string | null
          property_status: string
          property_type: string
          rental_price: number | null
          sale_price: number | null
          total_floors: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          documents?: string[] | null
          features?: Json | null
          floor_number?: number | null
          furnished?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location_coordinates?: Json | null
          manager_id?: string | null
          owner_id?: string | null
          parking_spaces?: number | null
          property_code: string
          property_name: string
          property_name_ar?: string | null
          property_status?: string
          property_type?: string
          rental_price?: number | null
          sale_price?: number | null
          total_floors?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          documents?: string[] | null
          features?: Json | null
          floor_number?: number | null
          furnished?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location_coordinates?: Json | null
          manager_id?: string | null
          owner_id?: string | null
          parking_spaces?: number | null
          property_code?: string
          property_name?: string
          property_name_ar?: string | null
          property_status?: string
          property_type?: string
          rental_price?: number | null
          sale_price?: number | null
          total_floors?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_properties_owner"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "property_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_contracts: {
        Row: {
          account_id: string | null
          auto_renewal: boolean | null
          commission_amount: number | null
          company_id: string
          contract_number: string
          contract_type: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          deposit_amount: number | null
          end_date: string | null
          grace_period_days: number | null
          id: string
          insurance_required: boolean | null
          is_active: boolean | null
          journal_entry_id: string | null
          late_fee_rate: number | null
          maintenance_responsibility: string | null
          notes: string | null
          payment_day: number | null
          payment_frequency: string | null
          property_id: string
          renewal_period: number | null
          rental_amount: number | null
          security_deposit: number | null
          start_date: string
          status: string | null
          tenant_id: string | null
          terms: string | null
          terms_ar: string | null
          updated_at: string | null
          utilities_included: boolean | null
        }
        Insert: {
          account_id?: string | null
          auto_renewal?: boolean | null
          commission_amount?: number | null
          company_id: string
          contract_number: string
          contract_type?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deposit_amount?: number | null
          end_date?: string | null
          grace_period_days?: number | null
          id?: string
          insurance_required?: boolean | null
          is_active?: boolean | null
          journal_entry_id?: string | null
          late_fee_rate?: number | null
          maintenance_responsibility?: string | null
          notes?: string | null
          payment_day?: number | null
          payment_frequency?: string | null
          property_id: string
          renewal_period?: number | null
          rental_amount?: number | null
          security_deposit?: number | null
          start_date: string
          status?: string | null
          tenant_id?: string | null
          terms?: string | null
          terms_ar?: string | null
          updated_at?: string | null
          utilities_included?: boolean | null
        }
        Update: {
          account_id?: string | null
          auto_renewal?: boolean | null
          commission_amount?: number | null
          company_id?: string
          contract_number?: string
          contract_type?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deposit_amount?: number | null
          end_date?: string | null
          grace_period_days?: number | null
          id?: string
          insurance_required?: boolean | null
          is_active?: boolean | null
          journal_entry_id?: string | null
          late_fee_rate?: number | null
          maintenance_responsibility?: string | null
          notes?: string | null
          payment_day?: number | null
          payment_frequency?: string | null
          property_id?: string
          renewal_period?: number | null
          rental_amount?: number | null
          security_deposit?: number | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          terms?: string | null
          terms_ar?: string | null
          updated_at?: string | null
          utilities_included?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "property_contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contracts_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_maintenance: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          company_id: string
          completion_date: string | null
          completion_notes: string | null
          contractor_name: string | null
          contractor_phone: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          description_ar: string | null
          documents: string[] | null
          estimated_cost: number | null
          id: string
          images: string[] | null
          is_active: boolean | null
          location_details: string | null
          maintenance_number: string
          maintenance_type: string
          notes: string | null
          priority: string
          property_id: string
          quality_rating: number | null
          requested_date: string
          required_materials: string[] | null
          scheduled_date: string | null
          start_date: string | null
          status: string
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          company_id: string
          completion_date?: string | null
          completion_notes?: string | null
          contractor_name?: string | null
          contractor_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          documents?: string[] | null
          estimated_cost?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location_details?: string | null
          maintenance_number: string
          maintenance_type: string
          notes?: string | null
          priority?: string
          property_id: string
          quality_rating?: number | null
          requested_date?: string
          required_materials?: string[] | null
          scheduled_date?: string | null
          start_date?: string | null
          status?: string
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          company_id?: string
          completion_date?: string | null
          completion_notes?: string | null
          contractor_name?: string | null
          contractor_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          documents?: string[] | null
          estimated_cost?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location_details?: string | null
          maintenance_number?: string
          maintenance_type?: string
          notes?: string | null
          priority?: string
          property_id?: string
          quality_rating?: number | null
          requested_date?: string
          required_materials?: string[] | null
          scheduled_date?: string | null
          start_date?: string | null
          status?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_property_maintenance_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_owners: {
        Row: {
          address: string | null
          address_ar: string | null
          bank_account_info: Json | null
          civil_id: string | null
          commission_percentage: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          email: string | null
          full_name: string
          full_name_ar: string | null
          id: string
          is_active: boolean | null
          nationality: string | null
          notes: string | null
          owner_code: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          bank_account_info?: Json | null
          civil_id?: string | null
          commission_percentage?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name: string
          full_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          nationality?: string | null
          notes?: string | null
          owner_code: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          bank_account_info?: Json | null
          civil_id?: string | null
          commission_percentage?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string
          full_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          nationality?: string | null
          notes?: string | null
          owner_code?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_owners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          due_date: string
          id: string
          journal_entry_id: string | null
          late_fee: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_number: string
          payment_type: string
          property_contract_id: string
          reference_number: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          due_date: string
          id?: string
          journal_entry_id?: string | null
          late_fee?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_number: string
          payment_type?: string
          property_contract_id: string
          reference_number?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          due_date?: string
          id?: string
          journal_entry_id?: string | null
          late_fee?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_number?: string
          payment_type?: string
          property_contract_id?: string
          reference_number?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_payments_property_contract_id_fkey"
            columns: ["property_contract_id"]
            isOneToOne: false
            referencedRelation: "property_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          description: string
          description_ar: string | null
          id: string
          item_code: string | null
          notes: string | null
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          total_price: number
          unit_of_measure: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          description_ar?: string | null
          id?: string
          item_code?: string | null
          notes?: string | null
          purchase_order_id: string
          quantity?: number
          received_quantity?: number | null
          total_price?: number
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          description_ar?: string | null
          id?: string
          item_code?: string | null
          notes?: string | null
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          total_price?: number
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchase_order_items_order"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string
          currency: string
          delivery_address: string | null
          delivery_date: string | null
          email: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          phone: string | null
          status: string
          subtotal: number
          tax_amount: number
          terms_and_conditions: string | null
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          created_by: string
          currency?: string
          delivery_address?: string | null
          delivery_date?: string | null
          email?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          phone?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          delivery_address?: string | null
          delivery_date?: string | null
          email?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          phone?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchase_orders_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "top_rated_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchase_orders_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_purchase_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "fk_purchase_orders_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      qatar_legal_texts: {
        Row: {
          article_number: string | null
          article_text_ar: string
          article_text_en: string | null
          article_title_ar: string | null
          chapter_number: string | null
          chapter_title: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          keywords: string[] | null
          law_number: string | null
          law_type: string
          part_number: string | null
          part_title: string | null
          source_url: string | null
          title_ar: string
          title_en: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          article_number?: string | null
          article_text_ar: string
          article_text_en?: string | null
          article_title_ar?: string | null
          chapter_number?: string | null
          chapter_title?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          keywords?: string[] | null
          law_number?: string | null
          law_type: string
          part_number?: string | null
          part_title?: string | null
          source_url?: string | null
          title_ar: string
          title_en?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          article_number?: string | null
          article_text_ar?: string
          article_text_en?: string | null
          article_title_ar?: string | null
          chapter_number?: string | null
          chapter_title?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          keywords?: string[] | null
          law_number?: string | null
          law_type?: string
          part_number?: string | null
          part_title?: string | null
          source_url?: string | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      quotation_approval_log: {
        Row: {
          action: string
          client_ip: string | null
          client_user_agent: string | null
          comments: string | null
          company_id: string
          created_at: string
          id: string
          quotation_id: string
        }
        Insert: {
          action: string
          client_ip?: string | null
          client_user_agent?: string | null
          comments?: string | null
          company_id: string
          created_at?: string
          id?: string
          quotation_id: string
        }
        Update: {
          action?: string
          client_ip?: string | null
          client_user_agent?: string | null
          comments?: string | null
          company_id?: string
          created_at?: string
          id?: string
          quotation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_approval_log_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          approval_expires_at: string | null
          approval_token: string | null
          approved_at: string | null
          approved_by_client: boolean | null
          client_approval_url: string | null
          client_comments: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          duration: number
          id: string
          quotation_number: string
          quotation_type: string
          rate_per_unit: number
          status: string
          terms: string | null
          total_amount: number
          updated_at: string
          valid_until: string
          vehicle_id: string | null
        }
        Insert: {
          approval_expires_at?: string | null
          approval_token?: string | null
          approved_at?: string | null
          approved_by_client?: boolean | null
          client_approval_url?: string | null
          client_comments?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          duration?: number
          id?: string
          quotation_number: string
          quotation_type?: string
          rate_per_unit?: number
          status?: string
          terms?: string | null
          total_amount?: number
          updated_at?: string
          valid_until: string
          vehicle_id?: string | null
        }
        Update: {
          approval_expires_at?: string | null
          approval_token?: string | null
          approved_at?: string | null
          approved_by_client?: boolean | null
          client_approval_url?: string | null
          client_comments?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          duration?: number
          id?: string
          quotation_number?: string
          quotation_type?: string
          rate_per_unit?: number
          status?: string
          terms?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          operation_type: string
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          operation_type: string
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          operation_type?: string
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      regulatory_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          compliance_score: number | null
          created_at: string | null
          created_by: string | null
          file_attachments: string[] | null
          findings_count: number | null
          id: string
          jurisdiction: string
          rejection_reason: string | null
          report_data: Json
          report_subtype: string | null
          report_summary: string | null
          report_type: string
          reporting_period_end: string
          reporting_period_start: string
          status: string | null
          submission_date: string | null
          submission_deadline: string | null
          submission_method: string | null
          submission_reference: string | null
          updated_at: string | null
          violations_count: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          compliance_score?: number | null
          created_at?: string | null
          created_by?: string | null
          file_attachments?: string[] | null
          findings_count?: number | null
          id?: string
          jurisdiction: string
          rejection_reason?: string | null
          report_data: Json
          report_subtype?: string | null
          report_summary?: string | null
          report_type: string
          reporting_period_end: string
          reporting_period_start: string
          status?: string | null
          submission_date?: string | null
          submission_deadline?: string | null
          submission_method?: string | null
          submission_reference?: string | null
          updated_at?: string | null
          violations_count?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          compliance_score?: number | null
          created_at?: string | null
          created_by?: string | null
          file_attachments?: string[] | null
          findings_count?: number | null
          id?: string
          jurisdiction?: string
          rejection_reason?: string | null
          report_data?: Json
          report_subtype?: string | null
          report_summary?: string | null
          report_type?: string
          reporting_period_end?: string
          reporting_period_start?: string
          status?: string | null
          submission_date?: string | null
          submission_deadline?: string | null
          submission_method?: string | null
          submission_reference?: string | null
          updated_at?: string | null
          violations_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_history: {
        Row: {
          action: string
          contract_id: string | null
          created_at: string
          customer_id: string | null
          error_message: string | null
          id: string
          message_sent: string | null
          phone_number: string | null
          reminder_schedule_id: string
          reminder_type: string | null
          sent_at: string | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          action: string
          contract_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message_sent?: string | null
          phone_number?: string | null
          reminder_schedule_id: string
          reminder_type?: string | null
          sent_at?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          action?: string
          contract_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message_sent?: string | null
          phone_number?: string | null
          reminder_schedule_id?: string
          reminder_type?: string | null
          sent_at?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "reminder_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "reminder_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reminder_schedules: {
        Row: {
          channel: string | null
          clicked_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          customer_name: string | null
          delivery_status: string | null
          email_address: string | null
          id: string
          invoice_id: string
          last_error: string | null
          message_template: string | null
          message_variables: Json | null
          next_retry_at: string | null
          opened_at: string | null
          phone_number: string | null
          reminder_type: string
          responded_at: string | null
          retry_count: number | null
          scheduled_date: string
          scheduled_time: string | null
          send_cost: number | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string | null
          template_id: string | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          channel?: string | null
          clicked_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_name?: string | null
          delivery_status?: string | null
          email_address?: string | null
          id?: string
          invoice_id: string
          last_error?: string | null
          message_template?: string | null
          message_variables?: Json | null
          next_retry_at?: string | null
          opened_at?: string | null
          phone_number?: string | null
          reminder_type: string
          responded_at?: string | null
          retry_count?: number | null
          scheduled_date: string
          scheduled_time?: string | null
          send_cost?: number | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          channel?: string | null
          clicked_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_name?: string | null
          delivery_status?: string | null
          email_address?: string | null
          id?: string
          invoice_id?: string
          last_error?: string | null
          message_template?: string | null
          message_variables?: Json | null
          next_retry_at?: string | null
          opened_at?: string | null
          phone_number?: string | null
          reminder_type?: string
          responded_at?: string | null
          retry_count?: number | null
          scheduled_date?: string
          scheduled_time?: string | null
          send_cost?: number | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reminder_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "reminder_schedules_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_schedules_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "reminder_schedules_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reminder_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "reminder_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_performance_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_schedules_backup_20250101: {
        Row: {
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          error_message: string | null
          id: string | null
          invoice_id: string | null
          message_template: string | null
          message_variables: Json | null
          phone_number: string | null
          receipt_id: string | null
          reminder_type: string | null
          retry_count: number | null
          scheduled_date: string | null
          scheduled_time: string | null
          sent_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          error_message?: string | null
          id?: string | null
          invoice_id?: string | null
          message_template?: string | null
          message_variables?: Json | null
          phone_number?: string | null
          receipt_id?: string | null
          reminder_type?: string | null
          retry_count?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          error_message?: string | null
          id?: string | null
          invoice_id?: string | null
          message_template?: string | null
          message_variables?: Json | null
          phone_number?: string | null
          receipt_id?: string | null
          reminder_type?: string | null
          retry_count?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reminder_templates: {
        Row: {
          avoid_holidays: boolean | null
          avoid_weekends: boolean | null
          body: string
          channel: string
          clicked_count: number | null
          company_id: string
          conversion_rate: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          language: string | null
          name: string
          opened_count: number | null
          reminder_type: string | null
          response_count: number | null
          send_time_preference: string | null
          sent_count: number | null
          stage: string
          status: string
          subject: string
          template_name: string | null
          template_text: string | null
          tone: string | null
          updated_at: string | null
          variant: string | null
        }
        Insert: {
          avoid_holidays?: boolean | null
          avoid_weekends?: boolean | null
          body: string
          channel: string
          clicked_count?: number | null
          company_id: string
          conversion_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string | null
          name: string
          opened_count?: number | null
          reminder_type?: string | null
          response_count?: number | null
          send_time_preference?: string | null
          sent_count?: number | null
          stage: string
          status?: string
          subject: string
          template_name?: string | null
          template_text?: string | null
          tone?: string | null
          updated_at?: string | null
          variant?: string | null
        }
        Update: {
          avoid_holidays?: boolean | null
          avoid_weekends?: boolean | null
          body?: string
          channel?: string
          clicked_count?: number | null
          company_id?: string
          conversion_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string | null
          name?: string
          opened_count?: number | null
          reminder_type?: string | null
          response_count?: number | null
          send_time_preference?: string | null
          sent_count?: number | null
          stage?: string
          status?: string
          subject?: string
          template_name?: string | null
          template_text?: string | null
          tone?: string | null
          updated_at?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_templates_backup_20250101: {
        Row: {
          avoid_holidays: boolean | null
          avoid_weekends: boolean | null
          body: string | null
          channel: string | null
          clicked_count: number | null
          company_id: string | null
          conversion_rate: number | null
          created_at: string | null
          created_by: string | null
          id: string | null
          is_active: boolean | null
          is_default: boolean | null
          language: string | null
          name: string | null
          opened_count: number | null
          reminder_type: string | null
          response_count: number | null
          send_time_preference: string | null
          sent_count: number | null
          stage: string | null
          status: string | null
          subject: string | null
          template_name: string | null
          template_text: string | null
          tone: string | null
          updated_at: string | null
          variant: string | null
        }
        Insert: {
          avoid_holidays?: boolean | null
          avoid_weekends?: boolean | null
          body?: string | null
          channel?: string | null
          clicked_count?: number | null
          company_id?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string | null
          name?: string | null
          opened_count?: number | null
          reminder_type?: string | null
          response_count?: number | null
          send_time_preference?: string | null
          sent_count?: number | null
          stage?: string | null
          status?: string | null
          subject?: string | null
          template_name?: string | null
          template_text?: string | null
          tone?: string | null
          updated_at?: string | null
          variant?: string | null
        }
        Update: {
          avoid_holidays?: boolean | null
          avoid_weekends?: boolean | null
          body?: string | null
          channel?: string | null
          clicked_count?: number | null
          company_id?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string | null
          name?: string | null
          opened_count?: number | null
          reminder_type?: string | null
          response_count?: number | null
          send_time_preference?: string | null
          sent_count?: number | null
          stage?: string | null
          status?: string | null
          subject?: string | null
          template_name?: string | null
          template_text?: string | null
          tone?: string | null
          updated_at?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      rental_payment_receipts: {
        Row: {
          amount_due: number
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_name: string
          fine: number
          fiscal_year: number | null
          id: string
          invoice_id: string | null
          is_late: boolean | null
          month: string
          month_number: number | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_status: string
          pending_balance: number
          receipt_number: string | null
          reference_number: string | null
          rent_amount: number
          total_paid: number
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount_due?: number
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_name: string
          fine?: number
          fiscal_year?: number | null
          id?: string
          invoice_id?: string | null
          is_late?: boolean | null
          month: string
          month_number?: number | null
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          payment_status?: string
          pending_balance?: number
          receipt_number?: string | null
          reference_number?: string | null
          rent_amount: number
          total_paid: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount_due?: number
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_name?: string
          fine?: number
          fiscal_year?: number | null
          id?: string
          invoice_id?: string | null
          is_late?: boolean | null
          month?: string
          month_number?: number | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_status?: string
          pending_balance?: number
          receipt_number?: string | null
          reference_number?: string | null
          rent_amount?: number
          total_paid?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_payment_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payment_receipts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "rental_payment_receipts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payment_receipts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payment_receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payment_receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_payment_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payment_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "rental_payment_receipts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          filters: Json | null
          id: string
          is_default: boolean | null
          is_public: boolean | null
          layout: Json
          template_name: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          layout: Json
          template_name: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          layout?: Json
          template_name?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          lead_name: string
          lead_name_ar: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_name: string
          lead_name_ar?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_name?: string
          lead_name_ar?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunities: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          is_active: boolean | null
          lead_id: string | null
          notes: string | null
          opportunity_name: string
          opportunity_name_ar: string | null
          probability: number | null
          stage: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          notes?: string | null
          opportunity_name: string
          opportunity_name_ar?: string | null
          probability?: number | null
          stage?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          notes?: string | null
          opportunity_name?: string
          opportunity_name_ar?: string | null
          probability?: number | null
          stage?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivery_date: string | null
          id: string
          is_active: boolean | null
          items: Json | null
          notes: string | null
          order_date: string
          order_number: string
          quote_id: string | null
          status: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json | null
          notes?: string | null
          order_date?: string
          order_number: string
          quote_id?: string | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json | null
          notes?: string | null
          order_date?: string
          order_number?: string
          quote_id?: string | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "sales_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_quotes: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          is_active: boolean | null
          items: Json | null
          notes: string | null
          opportunity_id: string | null
          quote_number: string
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json | null
          notes?: string | null
          opportunity_id?: string | null
          quote_number: string
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json | null
          notes?: string | null
          opportunity_id?: string | null
          quote_number?: string
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_conversations: {
        Row: {
          company_id: string
          conversation_data: Json
          created_at: string
          id: string
          name: string
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          conversation_data: Json
          created_at?: string
          id?: string
          name: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          conversation_data?: Json
          created_at?: string
          id?: string
          name?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saved_csv_files: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          last_import_at: string | null
          last_import_status: string | null
          last_import_summary: Json | null
          metadata: Json | null
          original_file_name: string
          row_count: number | null
          status: string
          tags: string[] | null
          updated_at: string
          upload_method: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type?: string
          id?: string
          last_import_at?: string | null
          last_import_status?: string | null
          last_import_summary?: Json | null
          metadata?: Json | null
          original_file_name: string
          row_count?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          upload_method?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          last_import_at?: string | null
          last_import_status?: string | null
          last_import_summary?: Json | null
          metadata?: Json | null
          original_file_name?: string
          row_count?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          upload_method?: string | null
        }
        Relationships: []
      }
      scheduled_followups: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          followup_type: string
          id: string
          legal_case_id: string | null
          notes: string | null
          outcome: string | null
          outcome_notes: string | null
          priority: string
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          scheduled_date: string
          scheduled_time: string | null
          source: string | null
          source_reference: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          followup_type?: string
          id?: string
          legal_case_id?: string | null
          notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          priority?: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          source?: string | null
          source_reference?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          followup_type?: string
          id?: string
          legal_case_id?: string | null
          notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          priority?: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          source?: string | null
          source_reference?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_followups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "scheduled_followups_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "scheduled_followups_legal_case_id_fkey"
            columns: ["legal_case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_report_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          failed_count: number | null
          id: string
          report_type: string
          response_data: Json | null
          scheduled_time: string
          sent_count: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          report_type: string
          response_data?: Json | null
          scheduled_time?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          report_type?: string
          response_data?: Json | null
          scheduled_time?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          error_count: number | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_run_at: string | null
          next_run_at: string | null
          parameters: Json | null
          report_name: string
          report_type: string
          run_count: number | null
          schedule: Json
          success_count: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          parameters?: Json | null
          report_name: string
          report_type: string
          run_count?: number | null
          schedule: Json
          success_count?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          parameters?: Json | null
          report_name?: string
          report_type?: string
          run_count?: number | null
          schedule?: Json
          success_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ratings: {
        Row: {
          company_id: string
          created_at: string | null
          feedback: string | null
          id: string
          rated_by: string
          rating: number
          resolution_quality_rating: number | null
          response_time_rating: number | null
          staff_helpfulness_rating: number | null
          ticket_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          rated_by: string
          rating: number
          resolution_quality_rating?: number | null
          response_time_rating?: number | null
          staff_helpfulness_rating?: number | null
          ticket_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          rated_by?: string
          rating?: number
          resolution_quality_rating?: number | null
          response_time_rating?: number | null
          staff_helpfulness_rating?: number | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          createdAt: string
          description: string | null
          email: string | null
          id: number
          isActive: number
          logoUrl: string | null
          name: string
          phone: string | null
          updatedAt: string
          userId: number
        }
        Insert: {
          address?: string | null
          createdAt?: string
          description?: string | null
          email?: string | null
          id?: number
          isActive?: number
          logoUrl?: string | null
          name: string
          phone?: string | null
          updatedAt?: string
          userId: number
        }
        Update: {
          address?: string | null
          createdAt?: string
          description?: string | null
          email?: string | null
          id?: number
          isActive?: number
          logoUrl?: string | null
          name?: string
          phone?: string | null
          updatedAt?: string
          userId?: number
        }
        Relationships: [
          {
            foreignKeyName: "shops_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_cycle: string
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_companies: number | null
          max_contracts: number | null
          max_customers: number | null
          max_users: number | null
          max_vehicles: number | null
          name: string
          name_ar: string | null
          plan_code: string | null
          price: number
          price_monthly: number | null
          price_yearly: number | null
          storage_limit_gb: number | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_companies?: number | null
          max_contracts?: number | null
          max_customers?: number | null
          max_users?: number | null
          max_vehicles?: number | null
          name: string
          name_ar?: string | null
          plan_code?: string | null
          price?: number
          price_monthly?: number | null
          price_yearly?: number | null
          storage_limit_gb?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_companies?: number | null
          max_contracts?: number | null
          max_customers?: number | null
          max_users?: number | null
          max_vehicles?: number | null
          name?: string
          name_ar?: string | null
          plan_code?: string | null
          price?: number
          price_monthly?: number | null
          price_yearly?: number | null
          storage_limit_gb?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_transactions: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          company_id: string
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          payment_method: string | null
          processed_at: string | null
          status: string
          subscription_plan_id: string
          transaction_reference: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          company_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string
          subscription_plan_id: string
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          company_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string
          subscription_plan_id?: string
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_ticket_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      support_ticket_replies: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          ticket_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          ticket_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          ticket_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category_id: string
          closed_at: string | null
          company_id: string
          created_at: string | null
          created_by: string
          description: string
          first_response_at: string | null
          id: string
          priority: string
          resolved_at: string | null
          satisfaction_feedback: string | null
          satisfaction_rating: number | null
          status: string
          ticket_number: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category_id: string
          closed_at?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          description: string
          first_response_at?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          status?: string
          ticket_number: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category_id?: string
          closed_at?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string
          first_response_at?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          status?: string
          ticket_number?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          company_id: string | null
          created_at: string | null
          details: Json | null
          expires_at: string | null
          id: string
          message: string
          resolved_at: string | null
          severity: string
          status: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          company_id?: string | null
          created_at?: string | null
          details?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          resolved_at?: string | null
          severity?: string
          status?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          company_id?: string | null
          created_at?: string | null
          details?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          severity?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_analytics: {
        Row: {
          category: string
          created_at: string | null
          date_recorded: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          time_period: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          date_recorded?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          time_period?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          date_recorded?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          time_period?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action: string
          category: string
          company_id: string | null
          created_at: string | null
          duration_ms: number | null
          id: string
          ip_address: unknown
          level: string
          message: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          category: string
          company_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          ip_address?: unknown
          level?: string
          message: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string
          company_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          ip_address?: unknown
          level?: string
          message?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_dismissible: boolean | null
          message: string
          message_ar: string | null
          priority: string | null
          target_audience: string | null
          target_company_id: string | null
          title: string
          title_ar: string | null
          type: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          message: string
          message_ar?: string | null
          priority?: string | null
          target_audience?: string | null
          target_company_id?: string | null
          title: string
          title_ar?: string | null
          type?: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          message?: string
          message_ar?: string | null
          priority?: string | null
          target_audience?: string | null
          target_company_id?: string | null
          title?: string
          title_ar?: string | null
          type?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          description_ar: string | null
          id: string
          is_public: boolean | null
          requires_restart: boolean | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_public?: boolean | null
          requires_restart?: boolean | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_public?: boolean | null
          requires_restart?: boolean | null
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      task_activity_log: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklists: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          sort_order: number | null
          task_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          task_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          task_id: string
          title: string
          type: string
          user_id: string
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          task_id: string
          title: string
          type: string
          user_id: string
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          task_id?: string
          title?: string
          type?: string
          user_id?: string
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          checklist_items: Json | null
          company_id: string
          created_at: string | null
          created_by: string
          default_category: string | null
          default_description: string | null
          default_priority: string | null
          default_tags: string[] | null
          default_title: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          checklist_items?: Json | null
          company_id: string
          created_at?: string | null
          created_by: string
          default_category?: string | null
          default_description?: string | null
          default_priority?: string | null
          default_tags?: string[] | null
          default_title?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          checklist_items?: Json | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          default_category?: string | null
          default_description?: string | null
          default_priority?: string | null
          default_tags?: string[] | null
          default_title?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          category: string | null
          company_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string
          reminder_sent: boolean | null
          start_date: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          whatsapp_notification_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          category?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          reminder_sent?: boolean | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          whatsapp_notification_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          category?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          reminder_sent?: boolean | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          whatsapp_notification_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_variables: {
        Row: {
          company_id: string
          created_at: string | null
          default_value: string | null
          id: string
          variable_category: string | null
          variable_key: string
          variable_label: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_value?: string | null
          id?: string
          variable_category?: string | null
          variable_key: string
          variable_label: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_value?: string | null
          id?: string
          variable_category?: string | null
          variable_key?: string
          variable_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_variables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          civil_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_address: string | null
          current_address_ar: string | null
          date_of_birth: string | null
          documents: Json | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employer_name: string | null
          full_name: string
          full_name_ar: string | null
          id: string
          is_active: boolean | null
          monthly_income: number | null
          nationality: string | null
          notes: string | null
          occupation: string | null
          passport_number: string | null
          phone: string | null
          status: string
          tenant_code: string
          tenant_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          civil_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_address?: string | null
          current_address_ar?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_name?: string | null
          full_name: string
          full_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          monthly_income?: number | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          passport_number?: string | null
          phone?: string | null
          status?: string
          tenant_code: string
          tenant_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          civil_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_address?: string | null
          current_address_ar?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_name?: string | null
          full_name?: string
          full_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          monthly_income?: number | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          passport_number?: string | null
          phone?: string | null
          status?: string
          tenant_code?: string
          tenant_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_violation_payments: {
        Row: {
          amount: number
          bank_account: string | null
          check_number: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          payment_type: string
          reference_number: string | null
          status: string
          traffic_violation_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account?: string | null
          check_number?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number: string
          payment_type?: string
          reference_number?: string | null
          status?: string
          traffic_violation_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account?: string | null
          check_number?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          payment_type?: string
          reference_number?: string | null
          status?: string
          traffic_violation_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      traffic_violations: {
        Row: {
          company_id: string
          contract_id: string | null
          created_at: string
          fine_amount: number
          id: string
          issuing_authority: string | null
          location: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          status: string
          total_amount: number
          updated_at: string
          vehicle_id: string
          violation_date: string
          violation_description: string | null
          violation_number: string
          violation_time: string | null
          violation_type: string
        }
        Insert: {
          company_id: string
          contract_id?: string | null
          created_at?: string
          fine_amount?: number
          id?: string
          issuing_authority?: string | null
          location?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          vehicle_id: string
          violation_date: string
          violation_description?: string | null
          violation_number: string
          violation_time?: string | null
          violation_type: string
        }
        Update: {
          company_id?: string
          contract_id?: string | null
          created_at?: string
          fine_amount?: number
          id?: string
          issuing_authority?: string | null
          location?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          vehicle_id?: string
          violation_date?: string
          violation_description?: string | null
          violation_number?: string
          violation_time?: string | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_violations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_violations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "traffic_violations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_violations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_violations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          customer_id: string | null
          description: string
          id: string
          journal_entry_id: string | null
          reference_number: string | null
          status: string
          transaction_date: string
          transaction_number: string
          transaction_type: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          description: string
          id?: string
          journal_entry_id?: string | null
          reference_number?: string | null
          status?: string
          transaction_date: string
          transaction_number: string
          transaction_type: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          description?: string
          id?: string
          journal_entry_id?: string | null
          reference_number?: string | null
          status?: string
          transaction_date?: string
          transaction_number?: string
          transaction_type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_account_audit: {
        Row: {
          action_type: string
          company_id: string
          details: Json | null
          employee_id: string
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_at: string
          performed_by: string
        }
        Insert: {
          action_type: string
          company_id: string
          details?: Json | null
          employee_id: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by: string
        }
        Update: {
          action_type?: string
          company_id?: string
          details?: Json | null
          employee_id?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_account_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dashboard_layouts: {
        Row: {
          company_id: string
          created_at: string | null
          dashboard_id: string
          id: string
          layout_config: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dashboard_id: string
          id?: string
          layout_config?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dashboard_id?: string
          id?: string
          layout_config?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dashboard_layouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          read_at: string | null
          related_id: string | null
          related_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permissions: Json | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permissions?: Json | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_transfer_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          data_handling_strategy: Json
          error_message: string | null
          from_company_id: string
          id: string
          new_roles: string[] | null
          old_roles: string[] | null
          rollback_data: Json | null
          status: string
          to_company_id: string
          transfer_reason: string | null
          transferred_by: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data_handling_strategy?: Json
          error_message?: string | null
          from_company_id: string
          id?: string
          new_roles?: string[] | null
          old_roles?: string[] | null
          rollback_data?: Json | null
          status?: string
          to_company_id: string
          transfer_reason?: string | null
          transferred_by: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data_handling_strategy?: Json
          error_message?: string | null
          from_company_id?: string
          id?: string
          new_roles?: string[] | null
          old_roles?: string[] | null
          rollback_data?: Json | null
          status?: string
          to_company_id?: string
          transfer_reason?: string | null
          transferred_by?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          createdAt: string
          email: string | null
          id: number
          lastSignedIn: string
          loginMethod: string | null
          name: string | null
          openId: string
          role: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          email?: string | null
          id?: number
          lastSignedIn?: string
          loginMethod?: string | null
          name?: string | null
          openId: string
          role?: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          email?: string | null
          id?: number
          lastSignedIn?: string
          loginMethod?: string | null
          name?: string | null
          openId?: string
          role?: string
          updatedAt?: string
        }
        Relationships: []
      }
      vehicle_activity_log: {
        Row: {
          activity_date: string
          activity_time: string | null
          activity_type: string
          company_id: string
          cost_amount: number | null
          cost_center_id: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          mileage: number | null
          notes: string | null
          performed_by: string | null
          reference_document: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          activity_date?: string
          activity_time?: string | null
          activity_type: string
          company_id: string
          cost_amount?: number | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          mileage?: number | null
          notes?: string | null
          performed_by?: string | null
          reference_document?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          activity_date?: string
          activity_time?: string | null
          activity_type?: string
          company_id?: string
          cost_amount?: number | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          mileage?: number | null
          notes?: string | null
          performed_by?: string | null
          reference_document?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_activity_log_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_activity_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_message: string
          alert_title: string
          alert_type: string
          auto_generated: boolean | null
          company_id: string
          created_at: string | null
          due_date: string | null
          id: string
          is_acknowledged: boolean | null
          priority: string | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message: string
          alert_title: string
          alert_type: string
          auto_generated?: boolean | null
          company_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_acknowledged?: boolean | null
          priority?: string | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message?: string
          alert_title?: string
          alert_type?: string
          auto_generated?: boolean | null
          company_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_acknowledged?: boolean | null
          priority?: string | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_categories: {
        Row: {
          company_id: string
          created_at: string
          daily_rate: number | null
          deposit_amount: number | null
          description: string | null
          id: string
          is_active: boolean | null
          monthly_rate: number | null
          name: string
          name_ar: string | null
          updated_at: string
          weekly_rate: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          daily_rate?: number | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          monthly_rate?: number | null
          name: string
          name_ar?: string | null
          updated_at?: string
          weekly_rate?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          daily_rate?: number | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          monthly_rate?: number | null
          name?: string
          name_ar?: string | null
          updated_at?: string
          weekly_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_condition_reports: {
        Row: {
          company_id: string
          condition_items: Json
          contract_id: string | null
          created_at: string
          customer_signature: string | null
          damage_items: Json | null
          damage_points: Json | null
          dispatch_permit_id: string | null
          fuel_level: number | null
          id: string
          inspection_date: string
          inspection_type: string
          inspector_id: string
          inspector_signature: string | null
          mileage_reading: number | null
          notes: string | null
          overall_condition: string
          photos: Json | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          company_id: string
          condition_items?: Json
          contract_id?: string | null
          created_at?: string
          customer_signature?: string | null
          damage_items?: Json | null
          damage_points?: Json | null
          dispatch_permit_id?: string | null
          fuel_level?: number | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_id: string
          inspector_signature?: string | null
          mileage_reading?: number | null
          notes?: string | null
          overall_condition?: string
          photos?: Json | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          company_id?: string
          condition_items?: Json
          contract_id?: string | null
          created_at?: string
          customer_signature?: string | null
          damage_items?: Json | null
          damage_points?: Json | null
          dispatch_permit_id?: string | null
          fuel_level?: number | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_id?: string
          inspector_signature?: string | null
          mileage_reading?: number | null
          notes?: string | null
          overall_condition?: string
          photos?: Json | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_condition_reports_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "vehicle_condition_reports_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_condition_reports_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_dispatch_permits: {
        Row: {
          actual_km: number | null
          approval_signature: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          destination: string
          destination_ar: string | null
          driver_license: string | null
          driver_name: string | null
          driver_phone: string | null
          end_date: string
          end_time: string | null
          estimated_km: number | null
          fuel_allowance: number | null
          id: string
          notes: string | null
          permit_number: string
          priority: string
          purpose: string
          purpose_ar: string | null
          rejection_reason: string | null
          request_type: string
          requested_by: string
          start_date: string
          start_time: string | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          actual_km?: number | null
          approval_signature?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          destination: string
          destination_ar?: string | null
          driver_license?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          end_date: string
          end_time?: string | null
          estimated_km?: number | null
          fuel_allowance?: number | null
          id?: string
          notes?: string | null
          permit_number: string
          priority?: string
          purpose: string
          purpose_ar?: string | null
          rejection_reason?: string | null
          request_type: string
          requested_by: string
          start_date: string
          start_time?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          actual_km?: number | null
          approval_signature?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          destination?: string
          destination_ar?: string | null
          driver_license?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          end_date?: string
          end_time?: string | null
          estimated_km?: number | null
          fuel_allowance?: number | null
          id?: string
          notes?: string | null
          permit_number?: string
          priority?: string
          purpose?: string
          purpose_ar?: string | null
          rejection_reason?: string | null
          request_type?: string
          requested_by?: string
          start_date?: string
          start_time?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dispatch_permits_approved_by"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_dispatch_permits_requested_by"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_vehicle_dispatch_permits_vehicle_id"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          created_at: string | null
          document_name: string | null
          document_number: string | null
          document_type: string
          document_url: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          issue_date: string | null
          issuing_authority: string | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          document_name?: string | null
          document_number?: string | null
          document_type: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          issuing_authority?: string | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          document_name?: string | null
          document_number?: string | null
          document_type?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          issuing_authority?: string | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_groups: {
        Row: {
          company_id: string
          created_at: string
          default_cost_center_id: string | null
          default_depreciation_rate: number | null
          default_useful_life_years: number | null
          description: string | null
          group_color: string | null
          group_name: string
          group_name_ar: string | null
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_cost_center_id?: string | null
          default_depreciation_rate?: number | null
          default_useful_life_years?: number | null
          description?: string | null
          group_color?: string | null
          group_name: string
          group_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_cost_center_id?: string | null
          default_depreciation_rate?: number | null
          default_useful_life_years?: number | null
          description?: string | null
          group_color?: string | null
          group_name?: string
          group_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_inspections: {
        Row: {
          ac_condition: string | null
          battery_condition: string | null
          brake_condition: string | null
          company_id: string
          created_at: string
          created_by: string | null
          engine_condition: string | null
          estimated_repair_cost: number | null
          exterior_condition: string | null
          id: string
          identified_issues: string[] | null
          inspection_certificate_url: string | null
          inspection_date: string
          inspection_type: string
          inspector_name: string
          interior_condition: string | null
          is_passed: boolean | null
          lights_condition: string | null
          mileage_at_inspection: number | null
          next_inspection_due: string | null
          notes: string | null
          overall_condition: string
          photos: Json | null
          repair_recommendations: string[] | null
          safety_equipment_status: string | null
          tire_condition: string | null
          transmission_condition: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          ac_condition?: string | null
          battery_condition?: string | null
          brake_condition?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          engine_condition?: string | null
          estimated_repair_cost?: number | null
          exterior_condition?: string | null
          id?: string
          identified_issues?: string[] | null
          inspection_certificate_url?: string | null
          inspection_date: string
          inspection_type?: string
          inspector_name: string
          interior_condition?: string | null
          is_passed?: boolean | null
          lights_condition?: string | null
          mileage_at_inspection?: number | null
          next_inspection_due?: string | null
          notes?: string | null
          overall_condition?: string
          photos?: Json | null
          repair_recommendations?: string[] | null
          safety_equipment_status?: string | null
          tire_condition?: string | null
          transmission_condition?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          ac_condition?: string | null
          battery_condition?: string | null
          brake_condition?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          engine_condition?: string | null
          estimated_repair_cost?: number | null
          exterior_condition?: string | null
          id?: string
          identified_issues?: string[] | null
          inspection_certificate_url?: string | null
          inspection_date?: string
          inspection_type?: string
          inspector_name?: string
          interior_condition?: string | null
          is_passed?: boolean | null
          lights_condition?: string | null
          mileage_at_inspection?: number | null
          next_inspection_due?: string | null
          notes?: string | null
          overall_condition?: string
          photos?: Json | null
          repair_recommendations?: string[] | null
          safety_equipment_status?: string | null
          tire_condition?: string | null
          transmission_condition?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_installment_schedules: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          due_date: string
          id: string
          installment_id: string
          installment_number: number
          interest_amount: number | null
          invoice_id: string | null
          journal_entry_id: string | null
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_reference: string | null
          principal_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_id: string
          installment_number: number
          interest_amount?: number | null
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          principal_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_id?: string
          installment_number?: number
          interest_amount?: number | null
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          principal_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_installments: {
        Row: {
          agreement_date: string
          agreement_number: string
          company_id: string
          contract_type: string | null
          created_at: string
          created_by: string | null
          down_payment: number
          end_date: string
          id: string
          installment_amount: number
          interest_rate: number | null
          notes: string | null
          number_of_installments: number
          start_date: string
          status: string
          total_amount: number
          total_vehicles_count: number | null
          updated_at: string
          vehicle_id: string | null
          vendor_id: string
        }
        Insert: {
          agreement_date?: string
          agreement_number: string
          company_id: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          down_payment?: number
          end_date: string
          id?: string
          installment_amount?: number
          interest_rate?: number | null
          notes?: string | null
          number_of_installments?: number
          start_date: string
          status?: string
          total_amount?: number
          total_vehicles_count?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vendor_id: string
        }
        Update: {
          agreement_date?: string
          agreement_number?: string
          company_id?: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          down_payment?: number
          end_date?: string
          id?: string
          installment_amount?: number
          interest_rate?: number | null
          notes?: string | null
          number_of_installments?: number
          start_date?: string
          status?: string
          total_amount?: number
          total_vehicles_count?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_installments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_installments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_installments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      vehicle_insurance: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          coverage_amount: number | null
          coverage_type: string | null
          created_at: string | null
          deductible_amount: number | null
          end_date: string | null
          id: string
          insurance_company: string | null
          is_active: boolean | null
          notes: string | null
          policy_document_url: string | null
          policy_number: string | null
          premium_amount: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["insurance_status"] | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coverage_amount?: number | null
          coverage_type?: string | null
          created_at?: string | null
          deductible_amount?: number | null
          end_date?: string | null
          id?: string
          insurance_company?: string | null
          is_active?: boolean | null
          notes?: string | null
          policy_document_url?: string | null
          policy_number?: string | null
          premium_amount?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["insurance_status"] | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coverage_amount?: number | null
          coverage_type?: string | null
          created_at?: string | null
          deductible_amount?: number | null
          end_date?: string | null
          id?: string
          insurance_company?: string | null
          is_active?: boolean | null
          notes?: string | null
          policy_document_url?: string | null
          policy_number?: string | null
          premium_amount?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["insurance_status"] | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_insurance_policies: {
        Row: {
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          auto_renew: boolean | null
          company_id: string
          coverage_amount: number
          coverage_details: Json | null
          created_at: string | null
          deductible_amount: number | null
          documents: Json | null
          effective_date: string
          expiry_date: string
          id: string
          insurance_company: string
          is_active: boolean | null
          journal_entry_id: string | null
          policy_number: string
          policy_type: string
          premium_amount: number
          premium_frequency: string | null
          renewal_notice_days: number | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          auto_renew?: boolean | null
          company_id: string
          coverage_amount?: number
          coverage_details?: Json | null
          created_at?: string | null
          deductible_amount?: number | null
          documents?: Json | null
          effective_date: string
          expiry_date: string
          id?: string
          insurance_company: string
          is_active?: boolean | null
          journal_entry_id?: string | null
          policy_number: string
          policy_type: string
          premium_amount?: number
          premium_frequency?: string | null
          renewal_notice_days?: number | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          auto_renew?: boolean | null
          company_id?: string
          coverage_amount?: number
          coverage_details?: Json | null
          created_at?: string | null
          deductible_amount?: number | null
          documents?: Json | null
          effective_date?: string
          expiry_date?: string
          id?: string
          insurance_company?: string
          is_active?: boolean | null
          journal_entry_id?: string | null
          policy_number?: string
          policy_type?: string
          premium_amount?: number
          premium_frequency?: string | null
          renewal_notice_days?: number | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_maintenance: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          attachments: Json | null
          company_id: string
          completed_date: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          estimated_cost: number | null
          expense_account_id: string | null
          expense_recorded: boolean | null
          id: string
          invoice_id: string | null
          invoice_number: string | null
          journal_entry_id: string | null
          maintenance_number: string
          maintenance_type: string
          mileage_at_service: number | null
          notes: string | null
          parts_replaced: string[] | null
          payment_method: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"] | null
          scheduled_date: string | null
          service_provider: string | null
          service_provider_contact: string | null
          started_date: string | null
          status: Database["public"]["Enums"]["maintenance_status"] | null
          tax_amount: number | null
          total_cost_with_tax: number | null
          updated_at: string | null
          vehicle_id: string
          vendor_id: string | null
          warranty_until: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          company_id: string
          completed_date?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          estimated_cost?: number | null
          expense_account_id?: string | null
          expense_recorded?: boolean | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          journal_entry_id?: string | null
          maintenance_number: string
          maintenance_type: string
          mileage_at_service?: number | null
          notes?: string | null
          parts_replaced?: string[] | null
          payment_method?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          scheduled_date?: string | null
          service_provider?: string | null
          service_provider_contact?: string | null
          started_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          tax_amount?: number | null
          total_cost_with_tax?: number | null
          updated_at?: string | null
          vehicle_id: string
          vendor_id?: string | null
          warranty_until?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          company_id?: string
          completed_date?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          estimated_cost?: number | null
          expense_account_id?: string | null
          expense_recorded?: boolean | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          journal_entry_id?: string | null
          maintenance_number?: string
          maintenance_type?: string
          mileage_at_service?: number | null
          notes?: string | null
          parts_replaced?: string[] | null
          payment_method?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          scheduled_date?: string | null
          service_provider?: string | null
          service_provider_contact?: string | null
          started_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          tax_amount?: number | null
          total_cost_with_tax?: number | null
          updated_at?: string | null
          vehicle_id?: string
          vendor_id?: string | null
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "top_rated_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_purchase_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_operating_costs: {
        Row: {
          amount: number
          company_id: string
          cost_center_id: string | null
          cost_date: string
          cost_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          journal_entry_id: string | null
          receipt_number: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          company_id: string
          cost_center_id?: string | null
          cost_date?: string
          cost_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          receipt_number?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          cost_center_id?: string | null
          cost_date?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          receipt_number?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_pricing: {
        Row: {
          annual_rate: number
          annual_rate_max: number | null
          annual_rate_min: number | null
          cancellation_fee: number | null
          cleaning_fee: number | null
          created_at: string | null
          currency: string | null
          daily_rate: number
          daily_rate_max: number | null
          daily_rate_min: number | null
          effective_from: string | null
          effective_to: string | null
          excess_mileage_rate: number | null
          extra_km_charge: number | null
          fuel_policy: string | null
          id: string
          included_km_annual: number | null
          included_km_daily: number | null
          included_km_monthly: number | null
          included_km_weekly: number | null
          is_active: boolean | null
          late_return_hourly_rate: number | null
          mileage_limit_daily: number | null
          mileage_limit_monthly: number | null
          mileage_limit_weekly: number | null
          monthly_rate: number
          monthly_rate_max: number | null
          monthly_rate_min: number | null
          peak_season_multiplier: number | null
          security_deposit: number | null
          updated_at: string | null
          vehicle_id: string
          weekend_multiplier: number | null
          weekly_rate: number
          weekly_rate_max: number | null
          weekly_rate_min: number | null
        }
        Insert: {
          annual_rate?: number
          annual_rate_max?: number | null
          annual_rate_min?: number | null
          cancellation_fee?: number | null
          cleaning_fee?: number | null
          created_at?: string | null
          currency?: string | null
          daily_rate?: number
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          effective_from?: string | null
          effective_to?: string | null
          excess_mileage_rate?: number | null
          extra_km_charge?: number | null
          fuel_policy?: string | null
          id?: string
          included_km_annual?: number | null
          included_km_daily?: number | null
          included_km_monthly?: number | null
          included_km_weekly?: number | null
          is_active?: boolean | null
          late_return_hourly_rate?: number | null
          mileage_limit_daily?: number | null
          mileage_limit_monthly?: number | null
          mileage_limit_weekly?: number | null
          monthly_rate?: number
          monthly_rate_max?: number | null
          monthly_rate_min?: number | null
          peak_season_multiplier?: number | null
          security_deposit?: number | null
          updated_at?: string | null
          vehicle_id: string
          weekend_multiplier?: number | null
          weekly_rate?: number
          weekly_rate_max?: number | null
          weekly_rate_min?: number | null
        }
        Update: {
          annual_rate?: number
          annual_rate_max?: number | null
          annual_rate_min?: number | null
          cancellation_fee?: number | null
          cleaning_fee?: number | null
          created_at?: string | null
          currency?: string | null
          daily_rate?: number
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          effective_from?: string | null
          effective_to?: string | null
          excess_mileage_rate?: number | null
          extra_km_charge?: number | null
          fuel_policy?: string | null
          id?: string
          included_km_annual?: number | null
          included_km_daily?: number | null
          included_km_monthly?: number | null
          included_km_weekly?: number | null
          is_active?: boolean | null
          late_return_hourly_rate?: number | null
          mileage_limit_daily?: number | null
          mileage_limit_monthly?: number | null
          mileage_limit_weekly?: number | null
          monthly_rate?: number
          monthly_rate_max?: number | null
          monthly_rate_min?: number | null
          peak_season_multiplier?: number | null
          security_deposit?: number | null
          updated_at?: string | null
          vehicle_id?: string
          weekend_multiplier?: number | null
          weekly_rate?: number
          weekly_rate_max?: number | null
          weekly_rate_min?: number | null
        }
        Relationships: []
      }
      vehicle_reservations: {
        Row: {
          company_id: string
          created_at: string | null
          customer_id: string | null
          customer_name: string
          end_date: string
          hold_until: string
          id: string
          notes: string | null
          start_date: string
          status: string | null
          updated_at: string | null
          vehicle_id: string
          vehicle_make: string
          vehicle_model: string
          vehicle_plate: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          end_date: string
          hold_until: string
          id?: string
          notes?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
          vehicle_id: string
          vehicle_make: string
          vehicle_model: string
          vehicle_plate: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          end_date?: string
          hold_until?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string
          vehicle_make?: string
          vehicle_model?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "vehicle_reservations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_return_forms: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          damages_reported: string | null
          dispatch_permit_id: string
          fuel_level_percentage: number | null
          id: string
          items_returned: Json | null
          notes: string | null
          return_date: string
          return_location: string | null
          return_odometer_reading: number | null
          returned_by: string
          status: string
          updated_at: string
          vehicle_condition: string
          vehicle_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          damages_reported?: string | null
          dispatch_permit_id: string
          fuel_level_percentage?: number | null
          id?: string
          items_returned?: Json | null
          notes?: string | null
          return_date?: string
          return_location?: string | null
          return_odometer_reading?: number | null
          returned_by: string
          status?: string
          updated_at?: string
          vehicle_condition?: string
          vehicle_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          damages_reported?: string | null
          dispatch_permit_id?: string
          fuel_level_percentage?: number | null
          id?: string
          items_returned?: Json | null
          notes?: string | null
          return_date?: string
          return_location?: string | null
          return_odometer_reading?: number | null
          returned_by?: string
          status?: string
          updated_at?: string
          vehicle_condition?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_transfers: {
        Row: {
          approved_by: string | null
          company_id: string
          completed_date: string | null
          condition_notes: string | null
          created_at: string | null
          from_branch_id: string | null
          fuel_level: number | null
          id: string
          odometer_reading: number | null
          requested_by: string | null
          status: string | null
          to_branch_id: string
          transfer_date: string
          transfer_reason: string | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          approved_by?: string | null
          company_id: string
          completed_date?: string | null
          condition_notes?: string | null
          created_at?: string | null
          from_branch_id?: string | null
          fuel_level?: number | null
          id?: string
          odometer_reading?: number | null
          requested_by?: string | null
          status?: string | null
          to_branch_id: string
          transfer_date?: string
          transfer_reason?: string | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          approved_by?: string | null
          company_id?: string
          completed_date?: string | null
          condition_notes?: string | null
          created_at?: string | null
          from_branch_id?: string | null
          fuel_level?: number | null
          id?: string
          odometer_reading?: number | null
          requested_by?: string | null
          status?: string | null
          to_branch_id?: string
          transfer_date?: string
          transfer_reason?: string | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          accumulated_depreciation: number | null
          additional_features: string[] | null
          annual_depreciation_rate: number | null
          asset_classification: string | null
          asset_code: string | null
          assigned_driver_id: string | null
          body_type: string | null
          book_value: number | null
          branch_id: string | null
          cargo_capacity: number | null
          category_id: string | null
          color: string | null
          color_ar: string | null
          company_id: string
          cost_center_id: string | null
          created_at: string
          current_mileage: number | null
          daily_rate: number | null
          deposit_amount: number | null
          depreciation_method: string | null
          depreciation_rate: number | null
          enforce_minimum_price: boolean | null
          engine_number: string | null
          engine_size: string | null
          features: Json | null
          financing_type: string | null
          fixed_asset_id: string | null
          fuel_capacity: number | null
          fuel_card_number: string | null
          fuel_level: number | null
          fuel_type: string | null
          gps_device_id: string | null
          id: string
          images: Json | null
          insurance_end_date: string | null
          insurance_expiry: string | null
          insurance_policy: string | null
          insurance_policy_number: string | null
          insurance_premium_amount: number | null
          insurance_provider: string | null
          insurance_start_date: string | null
          is_active: boolean | null
          last_maintenance_date: string | null
          last_service_date: string | null
          last_service_mileage: number | null
          license_expiry: string | null
          loan_amount: number | null
          location: string | null
          make: string
          minimum_daily_rate: number | null
          minimum_monthly_rate: number | null
          minimum_rental_price: number | null
          minimum_weekly_rate: number | null
          model: string
          monthly_payment: number | null
          monthly_rate: number | null
          next_service_due: string | null
          next_service_mileage: number | null
          notes: string | null
          odometer_reading: number | null
          plate_number: string
          purchase_cost: number | null
          purchase_date: string | null
          purchase_invoice_number: string | null
          purchase_source: string | null
          registration_date: string | null
          registration_expiry: string | null
          registration_fees: number | null
          registration_number: string | null
          residual_value: number | null
          safety_features: string[] | null
          salvage_value: number | null
          seating_capacity: number | null
          service_interval_km: number | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          total_insurance_cost: number | null
          total_maintenance_cost: number | null
          total_operating_cost: number | null
          transmission_type: string | null
          updated_at: string
          useful_life_years: number | null
          vehicle_group_id: string | null
          vehicle_weight: number | null
          vendor_id: string | null
          vin: string | null
          vin_number: string | null
          warranty_end_date: string | null
          warranty_expiry: string | null
          warranty_provider: string | null
          warranty_start_date: string | null
          weekly_rate: number | null
          year: number
        }
        Insert: {
          accumulated_depreciation?: number | null
          additional_features?: string[] | null
          annual_depreciation_rate?: number | null
          asset_classification?: string | null
          asset_code?: string | null
          assigned_driver_id?: string | null
          body_type?: string | null
          book_value?: number | null
          branch_id?: string | null
          cargo_capacity?: number | null
          category_id?: string | null
          color?: string | null
          color_ar?: string | null
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          current_mileage?: number | null
          daily_rate?: number | null
          deposit_amount?: number | null
          depreciation_method?: string | null
          depreciation_rate?: number | null
          enforce_minimum_price?: boolean | null
          engine_number?: string | null
          engine_size?: string | null
          features?: Json | null
          financing_type?: string | null
          fixed_asset_id?: string | null
          fuel_capacity?: number | null
          fuel_card_number?: string | null
          fuel_level?: number | null
          fuel_type?: string | null
          gps_device_id?: string | null
          id?: string
          images?: Json | null
          insurance_end_date?: string | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          insurance_policy_number?: string | null
          insurance_premium_amount?: number | null
          insurance_provider?: string | null
          insurance_start_date?: string | null
          is_active?: boolean | null
          last_maintenance_date?: string | null
          last_service_date?: string | null
          last_service_mileage?: number | null
          license_expiry?: string | null
          loan_amount?: number | null
          location?: string | null
          make: string
          minimum_daily_rate?: number | null
          minimum_monthly_rate?: number | null
          minimum_rental_price?: number | null
          minimum_weekly_rate?: number | null
          model: string
          monthly_payment?: number | null
          monthly_rate?: number | null
          next_service_due?: string | null
          next_service_mileage?: number | null
          notes?: string | null
          odometer_reading?: number | null
          plate_number: string
          purchase_cost?: number | null
          purchase_date?: string | null
          purchase_invoice_number?: string | null
          purchase_source?: string | null
          registration_date?: string | null
          registration_expiry?: string | null
          registration_fees?: number | null
          registration_number?: string | null
          residual_value?: number | null
          safety_features?: string[] | null
          salvage_value?: number | null
          seating_capacity?: number | null
          service_interval_km?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          total_insurance_cost?: number | null
          total_maintenance_cost?: number | null
          total_operating_cost?: number | null
          transmission_type?: string | null
          updated_at?: string
          useful_life_years?: number | null
          vehicle_group_id?: string | null
          vehicle_weight?: number | null
          vendor_id?: string | null
          vin?: string | null
          vin_number?: string | null
          warranty_end_date?: string | null
          warranty_expiry?: string | null
          warranty_provider?: string | null
          warranty_start_date?: string | null
          weekly_rate?: number | null
          year: number
        }
        Update: {
          accumulated_depreciation?: number | null
          additional_features?: string[] | null
          annual_depreciation_rate?: number | null
          asset_classification?: string | null
          asset_code?: string | null
          assigned_driver_id?: string | null
          body_type?: string | null
          book_value?: number | null
          branch_id?: string | null
          cargo_capacity?: number | null
          category_id?: string | null
          color?: string | null
          color_ar?: string | null
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          current_mileage?: number | null
          daily_rate?: number | null
          deposit_amount?: number | null
          depreciation_method?: string | null
          depreciation_rate?: number | null
          enforce_minimum_price?: boolean | null
          engine_number?: string | null
          engine_size?: string | null
          features?: Json | null
          financing_type?: string | null
          fixed_asset_id?: string | null
          fuel_capacity?: number | null
          fuel_card_number?: string | null
          fuel_level?: number | null
          fuel_type?: string | null
          gps_device_id?: string | null
          id?: string
          images?: Json | null
          insurance_end_date?: string | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          insurance_policy_number?: string | null
          insurance_premium_amount?: number | null
          insurance_provider?: string | null
          insurance_start_date?: string | null
          is_active?: boolean | null
          last_maintenance_date?: string | null
          last_service_date?: string | null
          last_service_mileage?: number | null
          license_expiry?: string | null
          loan_amount?: number | null
          location?: string | null
          make?: string
          minimum_daily_rate?: number | null
          minimum_monthly_rate?: number | null
          minimum_rental_price?: number | null
          minimum_weekly_rate?: number | null
          model?: string
          monthly_payment?: number | null
          monthly_rate?: number | null
          next_service_due?: string | null
          next_service_mileage?: number | null
          notes?: string | null
          odometer_reading?: number | null
          plate_number?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          purchase_invoice_number?: string | null
          purchase_source?: string | null
          registration_date?: string | null
          registration_expiry?: string | null
          registration_fees?: number | null
          registration_number?: string | null
          residual_value?: number | null
          safety_features?: string[] | null
          salvage_value?: number | null
          seating_capacity?: number | null
          service_interval_km?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          total_insurance_cost?: number | null
          total_maintenance_cost?: number | null
          total_operating_cost?: number | null
          transmission_type?: string | null
          updated_at?: string
          useful_life_years?: number | null
          vehicle_group_id?: string | null
          vehicle_weight?: number | null
          vendor_id?: string | null
          vin?: string | null
          vin_number?: string | null
          warranty_end_date?: string | null
          warranty_expiry?: string | null
          warranty_provider?: string | null
          warranty_start_date?: string | null
          weekly_rate?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_vehicles_assigned_driver"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vehicles_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_accounts: {
        Row: {
          account_id: string
          account_type: string
          company_id: string
          created_at: string
          id: string
          is_default: boolean | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          account_id: string
          account_type?: string
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          account_id?: string
          account_type?: string
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendor_accounts_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendor_accounts_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendor_accounts_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "top_rated_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendor_accounts_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_purchase_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "fk_vendor_accounts_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_categories: {
        Row: {
          category_name: string
          category_name_ar: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category_name: string
          category_name_ar?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category_name?: string
          category_name_ar?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_contacts: {
        Row: {
          company_id: string
          contact_name: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          phone: string | null
          position: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          company_id: string
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          phone?: string | null
          position?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          company_id?: string
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          phone?: string | null
          position?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "top_rated_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_purchase_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_documents: {
        Row: {
          company_id: string
          created_at: string
          document_name: string
          document_type: string
          document_url: string
          expiry_date: string | null
          file_size: number | null
          id: string
          notes: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_name: string
          document_type: string
          document_url: string
          expiry_date?: string | null
          file_size?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_name?: string
          document_type?: string
          document_url?: string
          expiry_date?: string | null
          file_size?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "top_rated_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_purchase_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payments: {
        Row: {
          amount: number
          bank_id: string | null
          company_id: string
          created_at: string
          created_by: string
          currency: string
          description: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          purchase_order_id: string | null
          reference_number: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          bank_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number: string
          purchase_order_id?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          bank_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          purchase_order_id?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendor_payments_bank"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendor_payments_purchase_order"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendor_payments_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "top_rated_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendor_payments_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_purchase_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "fk_vendor_payments_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_performance: {
        Row: {
          company_id: string
          created_at: string
          id: string
          measured_at: string
          notes: string | null
          on_time_delivery_rate: number | null
          quality_score: number | null
          rating: number | null
          response_time_hours: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          on_time_delivery_rate?: number | null
          quality_score?: number | null
          rating?: number | null
          response_time_hours?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          on_time_delivery_rate?: number | null
          quality_score?: number | null
          rating?: number | null
          response_time_hours?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_performance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_performance_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "top_rated_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_performance_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_purchase_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_performance_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          address_ar: string | null
          category_id: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          current_balance: number | null
          email: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          payment_terms: number | null
          phone: string | null
          tax_number: string | null
          updated_at: string
          vendor_code: string
          vendor_name: string
          vendor_name_ar: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          category_id?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          vendor_code: string
          vendor_name: string
          vendor_name_ar?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          category_id?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          vendor_code?: string
          vendor_name?: string
          vendor_name_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connection_status: {
        Row: {
          auto_reconnect: boolean | null
          company_id: string
          created_at: string
          delay_between_messages_seconds: number | null
          id: string
          is_connected: boolean | null
          last_connected_at: string | null
          last_disconnected_at: string | null
          last_heartbeat: string | null
          last_message_sent_at: string | null
          max_messages_per_hour: number | null
          service_running: boolean | null
          session_path: string | null
          total_sent_this_month: number | null
          total_sent_this_week: number | null
          total_sent_today: number | null
          updated_at: string
          whatsapp_name: string | null
          whatsapp_number: string | null
        }
        Insert: {
          auto_reconnect?: boolean | null
          company_id: string
          created_at?: string
          delay_between_messages_seconds?: number | null
          id?: string
          is_connected?: boolean | null
          last_connected_at?: string | null
          last_disconnected_at?: string | null
          last_heartbeat?: string | null
          last_message_sent_at?: string | null
          max_messages_per_hour?: number | null
          service_running?: boolean | null
          session_path?: string | null
          total_sent_this_month?: number | null
          total_sent_this_week?: number | null
          total_sent_today?: number | null
          updated_at?: string
          whatsapp_name?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          auto_reconnect?: boolean | null
          company_id?: string
          created_at?: string
          delay_between_messages_seconds?: number | null
          id?: string
          is_connected?: boolean | null
          last_connected_at?: string | null
          last_disconnected_at?: string | null
          last_heartbeat?: string | null
          last_message_sent_at?: string | null
          max_messages_per_hour?: number | null
          service_running?: boolean | null
          session_path?: string | null
          total_sent_this_month?: number | null
          total_sent_this_week?: number | null
          total_sent_today?: number | null
          updated_at?: string
          whatsapp_name?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connection_status_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_logs: {
        Row: {
          company_id: string
          content: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message_type: string
          recipient_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          company_id: string
          content?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_type: string
          recipient_id: string
          sent_at?: string | null
          status: string
        }
        Update: {
          company_id?: string
          content?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_type?: string
          recipient_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          alert_threshold: number | null
          company_id: string
          created_at: string | null
          daily_report_days: number[] | null
          daily_report_enabled: boolean | null
          daily_report_time: string | null
          id: string
          instant_alerts_enabled: boolean | null
          monthly_report_day: number | null
          monthly_report_enabled: boolean | null
          monthly_report_time: string | null
          recipients: Json | null
          ultramsg_instance_id: string | null
          ultramsg_token: string | null
          updated_at: string | null
          weekly_report_day: number | null
          weekly_report_enabled: boolean | null
          weekly_report_time: string | null
        }
        Insert: {
          alert_threshold?: number | null
          company_id: string
          created_at?: string | null
          daily_report_days?: number[] | null
          daily_report_enabled?: boolean | null
          daily_report_time?: string | null
          id?: string
          instant_alerts_enabled?: boolean | null
          monthly_report_day?: number | null
          monthly_report_enabled?: boolean | null
          monthly_report_time?: string | null
          recipients?: Json | null
          ultramsg_instance_id?: string | null
          ultramsg_token?: string | null
          updated_at?: string | null
          weekly_report_day?: number | null
          weekly_report_enabled?: boolean | null
          weekly_report_time?: string | null
        }
        Update: {
          alert_threshold?: number | null
          company_id?: string
          created_at?: string | null
          daily_report_days?: number[] | null
          daily_report_enabled?: boolean | null
          daily_report_time?: string | null
          id?: string
          instant_alerts_enabled?: boolean | null
          monthly_report_day?: number | null
          monthly_report_enabled?: boolean | null
          monthly_report_time?: string | null
          recipients?: Json | null
          ultramsg_instance_id?: string | null
          ultramsg_token?: string | null
          updated_at?: string | null
          weekly_report_day?: number | null
          weekly_report_enabled?: boolean | null
          weekly_report_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_configurations: {
        Row: {
          auto_assign_enabled: boolean | null
          company_id: string
          created_at: string | null
          default_workflow_id: string | null
          escalation_rules: Json | null
          id: string
          notification_settings: Json | null
          source_type: Database["public"]["Enums"]["request_source"]
          updated_at: string | null
        }
        Insert: {
          auto_assign_enabled?: boolean | null
          company_id: string
          created_at?: string | null
          default_workflow_id?: string | null
          escalation_rules?: Json | null
          id?: string
          notification_settings?: Json | null
          source_type: Database["public"]["Enums"]["request_source"]
          updated_at?: string | null
        }
        Update: {
          auto_assign_enabled?: boolean | null
          company_id?: string
          created_at?: string | null
          default_workflow_id?: string | null
          escalation_rules?: Json | null
          id?: string
          notification_settings?: Json | null
          source_type?: Database["public"]["Enums"]["request_source"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_configurations_default_workflow_id_fkey"
            columns: ["default_workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_history: {
        Row: {
          action: string
          comments: string | null
          created_at: string | null
          id: string
          new_status: string | null
          performed_by: string | null
          previous_status: string | null
          step_number: number | null
          workflow_id: string
        }
        Insert: {
          action: string
          comments?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          performed_by?: string | null
          previous_status?: string | null
          step_number?: number | null
          workflow_id: string
        }
        Update: {
          action?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          performed_by?: string | null
          previous_status?: string | null
          step_number?: number | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          company_id: string | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          name: string
          steps: Json
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          name: string
          steps?: Json
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          steps?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_step: number | null
          entity_id: string
          entity_type: string
          id: string
          status: string | null
          steps: Json
          updated_at: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step?: number | null
          entity_id: string
          entity_type: string
          id?: string
          status?: string | null
          steps?: Json
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          status?: string | null
          steps?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ab_test_comparison: {
        Row: {
          avg_click_rate: number | null
          avg_conversion_rate: number | null
          avg_open_rate: number | null
          avg_response_rate: number | null
          channel: string | null
          stage: string | null
          template_count: number | null
          total_sent: number | null
          variant: string | null
        }
        Relationships: []
      }
      active_payment_plans_summary: {
        Row: {
          company_id: string | null
          customer_id: string | null
          customer_name: string | null
          end_date: string | null
          frequency: string | null
          id: string | null
          invoice_id: string | null
          number_of_payments: number | null
          overdue_installments: number | null
          paid_installments: number | null
          start_date: string | null
          status: string | null
          total_amount: number | null
          total_installments: number | null
          total_paid_amount: number | null
          total_plan_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_plans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      bank_reconciliation_summary: {
        Row: {
          company_id: string | null
          total_amount: number | null
          total_payments: number | null
        }
        Relationships: []
      }
      contract_payment_summary: {
        Row: {
          company_id: string | null
          contract_amount: number | null
          contract_id: string | null
          has_outstanding_payments: boolean | null
          outstanding_amount: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_contracts_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts_complete: {
        Row: {
          account_id: string | null
          auto_renew_enabled: boolean | null
          balance_due: number | null
          company_id: string | null
          computed_status: string | null
          contract_amount: number | null
          contract_date: string | null
          contract_number: string | null
          contract_type: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_first_name: string | null
          created_by_last_name: string | null
          created_via: string | null
          customer_address: string | null
          customer_email: string | null
          customer_first_name: string | null
          customer_first_name_ar: string | null
          customer_id: string | null
          customer_last_name: string | null
          customer_last_name_ar: string | null
          customer_phone: string | null
          days_overdue: number | null
          days_until_expiration: number | null
          description: string | null
          duration_months: number | null
          end_date: string | null
          expired_at: string | null
          id: string | null
          journal_entry_id: string | null
          last_payment_check_date: string | null
          last_payment_date: string | null
          last_renewal_check: string | null
          late_fine_amount: number | null
          license_plate: string | null
          make: string | null
          model: string | null
          monthly_amount: number | null
          overdue_amount: number | null
          paid_amount: number | null
          payment_status: string | null
          renewal_terms: Json | null
          start_date: string | null
          status: string | null
          suspension_reason: string | null
          terms: string | null
          total_amount: number | null
          total_invoices: number | null
          total_paid: number | null
          unpaid_amount: number | null
          updated_at: string | null
          vehicle_color: string | null
          vehicle_id: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_plate_number: string | null
          vehicle_returned: boolean | null
          vehicle_status: string | null
          vehicle_vin: string | null
          vehicle_year: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customer_payment_score_summary: {
        Row: {
          broken_promises_deduction: number | null
          calculated_at: string | null
          category: string | null
          company_id: string | null
          customer_id: string | null
          disputes_deduction: number | null
          early_payments_bonus: number | null
          failed_payments_deduction: number | null
          late_payments_deduction: number | null
          other_bonuses: number | null
          score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_scores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_scores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      index_maintenance_recommendations: {
        Row: {
          action: string | null
          indexname: unknown
          recommendation_type: string | null
          schemaname: unknown
          tablename: unknown
          usage_count: number | null
        }
        Relationships: []
      }
      index_usage_stats: {
        Row: {
          index_scans: number | null
          indexname: unknown
          schemaname: unknown
          tablename: unknown
          tuples_fetched: number | null
          tuples_read: number | null
        }
        Relationships: []
      }
      inventory_aging_analysis: {
        Row: {
          aging_category: string | null
          category_name: string | null
          company_id: string | null
          days_since_last_movement: number | null
          item_code: string | null
          item_id: string | null
          item_name: string | null
          last_movement_at: string | null
          quantity_available: number | null
          quantity_on_hand: number | null
          sku: string | null
          tied_up_value: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_low_stock_items: {
        Row: {
          category_name: string | null
          company_id: string | null
          id: string | null
          item_code: string | null
          item_name: string | null
          min_stock_level: number | null
          quantity_available: number | null
          reorder_point: number | null
          reorder_quantity: number | null
          shortage: number | null
          sku: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movement_summary: {
        Row: {
          company_id: string | null
          estimated_value: number | null
          first_movement_date: string | null
          item_code: string | null
          item_id: string | null
          item_name: string | null
          item_name_ar: string | null
          last_movement_date: string | null
          movement_count: number | null
          movement_type: string | null
          total_absolute_quantity: number | null
          total_quantity: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_pending_purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          confirmed_at: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_address: string | null
          email: string | null
          expected_delivery_date: string | null
          id: string | null
          internal_reference: string | null
          item_count: number | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          payment_terms: string | null
          sent_at: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_pending_replenishments: {
        Row: {
          category_name: string | null
          company_id: string | null
          created_at: string | null
          current_stock: number | null
          id: string | null
          item_code: string | null
          item_name: string | null
          priority_rank: number | null
          request_number: string | null
          requested_quantity: number | null
          sku: string | null
          urgency_level: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_replenishment_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_purchase_order_summary: {
        Row: {
          average_order_value: number | null
          company_id: string | null
          order_count: number | null
          order_month: string | null
          status: string | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reorder_recommendations: {
        Row: {
          company_id: string | null
          cost_price: number | null
          item_code: string | null
          item_id: string | null
          item_name: string | null
          item_name_ar: string | null
          last_vendor_id: string | null
          last_vendor_name: string | null
          min_stock_level: number | null
          pending_po_quantity: number | null
          reorder_point: number | null
          reorder_quantity: number | null
          shortage: number | null
          sku: string | null
          suggested_order_quantity: number | null
          total_available: number | null
          total_on_hand: number | null
          total_reserved: number | null
          unit_of_measure: string | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_alerts: {
        Row: {
          alert_priority: number | null
          alert_type: string | null
          category_name: string | null
          company_id: string | null
          item_code: string | null
          item_id: string | null
          item_name: string | null
          last_movement_at: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          quantity_available: number | null
          quantity_on_hand: number | null
          quantity_reserved: number | null
          reorder_point: number | null
          reorder_quantity: number | null
          shortage_quantity: number | null
          sku: string | null
          suggested_order_quantity: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_suppliers_summary: {
        Row: {
          address: string | null
          average_lead_time_days: number | null
          category_name: string | null
          city: string | null
          commercial_register: string | null
          company_id: string | null
          company_name: string | null
          company_name_ar: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          delivery_terms: string | null
          email: string | null
          evaluation_period: string | null
          id: string | null
          is_active: boolean | null
          is_preferred: boolean | null
          lead_time_days: number | null
          minimum_order_value: number | null
          notes: string | null
          order_accuracy_rate: number | null
          payment_terms: string | null
          phone: string | null
          price_competitiveness_score: number | null
          quality_score: number | null
          rating: number | null
          tax_number: string | null
          total_order_value: number | null
          total_orders: number | null
          updated_at: string | null
          website: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_summary: {
        Row: {
          company_id: string | null
          from_warehouse_id: string | null
          from_warehouse_name: string | null
          status: string | null
          to_warehouse_id: string | null
          to_warehouse_name: string | null
          total_quantity_received: number | null
          total_quantity_requested: number | null
          total_quantity_shipped: number | null
          transfer_count: number | null
          transfer_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_warehouse_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_turnover_analysis: {
        Row: {
          category_name: string | null
          company_id: string | null
          current_stock: number | null
          first_movement_date: string | null
          item_code: string | null
          item_id: string | null
          item_name: string | null
          last_movement_date: string | null
          movements_last_90_days: number | null
          purchase_quantity_last_90_days: number | null
          quantity_available: number | null
          sales_quantity_last_90_days: number | null
          sku: string | null
          turnover_category: string | null
          turnover_ratio: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_valuation: {
        Row: {
          company_id: string | null
          cost_price: number | null
          item_code: string | null
          item_id: string | null
          item_name: string | null
          quantity_available: number | null
          quantity_on_hand: number | null
          quantity_reserved: number | null
          total_cost_value: number | null
          total_selling_value: number | null
          unit_price: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_generations_view: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          body: string | null
          category: string | null
          company_id: string | null
          country_law: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description_ar: string | null
          description_en: string | null
          document_number: string | null
          document_title: string | null
          document_type: string | null
          id: string | null
          metadata: Json | null
          recipient_address: string | null
          recipient_entity: string | null
          recipient_name: string | null
          rejection_reason: string | null
          related_contract_id: string | null
          related_customer_id: string | null
          related_vehicle_id: string | null
          status: string | null
          subject: string | null
          template_id: string | null
          template_name_ar: string | null
          template_name_en: string | null
          template_used: string | null
          updated_at: string | null
          variables_data: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_legal_document_generations_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_legal_document_generations_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_legal_document_generations_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "fk_legal_document_generations_template_id"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "legal_document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      maintenance_cost_summary: {
        Row: {
          average_maintenance_cost: number | null
          company_id: string | null
          completed_maintenance_count: number | null
          last_maintenance_date: string | null
          make: string | null
          model: string | null
          plate_number: string | null
          total_cost_with_tax: number | null
          total_maintenance_cost: number | null
          total_maintenance_count: number | null
          total_tax_amount: number | null
          vehicle_id: string | null
        }
        Relationships: []
      }
      mv_customer_summary: {
        Row: {
          active_contracts: number | null
          company_id: string | null
          customer_code: string | null
          customer_id: string | null
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          display_name: string | null
          last_contract_date: string | null
          total_contracts: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customers_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      overdue_payment_promises: {
        Row: {
          actual_paid_amount: number | null
          actual_paid_date: string | null
          company_id: string | null
          contact_method: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          days_overdue: number | null
          id: string | null
          invoice_amount: number | null
          invoice_id: string | null
          invoice_number: string | null
          notes: string | null
          promise_date: string | null
          promised_amount: number | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_promises_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_promises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_promises_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_promises_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_promises_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_promises_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_timeline_invoices"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      payment_method_statistics: {
        Row: {
          company_id: string | null
          payment_method: string | null
          total_amount: number | null
          total_transactions: number | null
        }
        Relationships: []
      }
      payment_timeline_invoices: {
        Row: {
          company_id: string | null
          due_date: string | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_number: string | null
          payment_status: string | null
          total_amount: number | null
          total_paid: number | null
        }
        Relationships: []
      }
      payroll_financial_analysis: {
        Row: {
          allowances: number | null
          basic_salary: number | null
          company_id: string | null
          cost_center_name: string | null
          cost_center_name_ar: string | null
          deductions: number | null
          department: string | null
          employee_number: string | null
          first_name: string | null
          first_name_ar: string | null
          id: string | null
          integration_status: string | null
          journal_entry_id: string | null
          journal_entry_number: string | null
          journal_entry_status: string | null
          last_name: string | null
          last_name_ar: string | null
          net_amount: number | null
          overtime_amount: number | null
          payroll_date: string | null
          payroll_number: string | null
          position: string | null
          status: string | null
          tax_amount: number | null
        }
        Relationships: []
      }
      reminder_statistics: {
        Row: {
          date: string | null
          failed: number | null
          reminder_type: string | null
          success_rate: number | null
          successful: number | null
          total_sent: number | null
        }
        Relationships: []
      }
      sales_inventory_availability: {
        Row: {
          barcode: string | null
          category_id: string | null
          category_name: string | null
          company_id: string | null
          cost_price: number | null
          item_code: string | null
          item_id: string | null
          item_name: string | null
          item_name_ar: string | null
          last_movement_at: string | null
          min_stock_level: number | null
          quantity_available: number | null
          quantity_on_hand: number | null
          quantity_reserved: number | null
          reorder_point: number | null
          sku: string | null
          stock_status: string | null
          unit_of_measure: string | null
          unit_price: number | null
          warehouse_id: string | null
          warehouse_name: string | null
          warehouse_name_ar: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_aging_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_turnover_analysis"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_valuation"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_fulfillment_status: {
        Row: {
          company_id: string | null
          customer_id: string | null
          delivery_date: string | null
          fulfillment_status: string | null
          notes: string | null
          order_date: string | null
          order_id: string | null
          order_number: string | null
          order_total: number | null
          status: string | null
          total_items: number | null
        }
        Insert: {
          company_id?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          fulfillment_status?: never
          notes?: string | null
          order_date?: string | null
          order_id?: string | null
          order_number?: string | null
          order_total?: number | null
          status?: string | null
          total_items?: never
        }
        Update: {
          company_id?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          fulfillment_status?: never
          notes?: string | null
          order_date?: string | null
          order_id?: string | null
          order_number?: string | null
          order_total?: number | null
          status?: string | null
          total_items?: never
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      sales_pipeline_metrics: {
        Row: {
          avg_opportunity_value: number | null
          company_id: string | null
          lead_count: number | null
          lead_value: number | null
          lost_count: number | null
          lost_value: number | null
          negotiation_count: number | null
          negotiation_value: number | null
          proposal_count: number | null
          proposal_value: number | null
          qualified_count: number | null
          qualified_value: number | null
          total_pipeline_value: number | null
          won_count: number | null
          won_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      security_policy_violations: {
        Row: {
          affected_users: string[] | null
          count: number | null
          violation_type: string | null
        }
        Relationships: []
      }
      table_size_stats: {
        Row: {
          index_size: string | null
          schemaname: unknown
          table_size: string | null
          tablename: unknown
          total_size: string | null
        }
        Relationships: []
      }
      template_performance_summary: {
        Row: {
          channel: string | null
          click_rate: number | null
          clicked_count: number | null
          company_id: string | null
          conversion_rate: number | null
          id: string | null
          name: string | null
          open_rate: number | null
          opened_count: number | null
          response_count: number | null
          response_rate: number | null
          sent_count: number | null
          stage: string | null
          status: string | null
        }
        Insert: {
          channel?: string | null
          click_rate?: never
          clicked_count?: number | null
          company_id?: string | null
          conversion_rate?: number | null
          id?: string | null
          name?: string | null
          open_rate?: never
          opened_count?: number | null
          response_count?: number | null
          response_rate?: never
          sent_count?: number | null
          stage?: string | null
          status?: string | null
        }
        Update: {
          channel?: string | null
          click_rate?: never
          clicked_count?: number | null
          company_id?: string | null
          conversion_rate?: number | null
          id?: string | null
          name?: string | null
          open_rate?: never
          opened_count?: number | null
          response_count?: number | null
          response_rate?: never
          sent_count?: number | null
          stage?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      top_rated_vendors: {
        Row: {
          category_name: string | null
          category_name_ar: string | null
          company_id: string | null
          id: string | null
          measured_at: string | null
          on_time_delivery_rate: number | null
          quality_score: number | null
          rank_by_rating: number | null
          rating: number | null
          response_time_hours: number | null
          vendor_code: string | null
          vendor_name: string | null
          vendor_name_ar: string | null
        }
        Relationships: []
      }
      v_account_linking_stats: {
        Row: {
          company_id: string | null
          customer_linkable: number | null
          detail_accounts: number | null
          employee_linkable: number | null
          header_accounts: number | null
          system_accounts: number | null
          total_accounts: number | null
          total_linkable: number | null
          vendor_linkable: number | null
        }
        Relationships: []
      }
      v_deploy_readiness: {
        Row: {
          all_checks_passed: boolean | null
          bundle_size_kb: number | null
          coverage_percent: number | null
          created_at: string | null
          environment: string | null
          gate_status: string | null
          run_id: string | null
          triggered_by: string | null
        }
        Relationships: []
      }
      v_linkable_accounts: {
        Row: {
          account_code: string | null
          account_level: number | null
          account_name: string | null
          account_name_ar: string | null
          account_subtype: string | null
          account_type: string | null
          balance_type: string | null
          can_link_customers: boolean | null
          can_link_employees: boolean | null
          can_link_vendors: boolean | null
          company_id: string | null
          created_at: string | null
          current_balance: number | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_default: boolean | null
          is_header: boolean | null
          is_system: boolean | null
          link_count: number | null
          parent_account_code: string | null
          parent_account_id: string | null
          primary_link_type: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          account_code?: string | null
          account_level?: number | null
          account_name?: string | null
          account_name_ar?: string | null
          account_subtype?: string | null
          account_type?: string | null
          balance_type?: string | null
          can_link_customers?: boolean | null
          can_link_employees?: boolean | null
          can_link_vendors?: boolean | null
          company_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_header?: boolean | null
          is_system?: boolean | null
          link_count?: never
          parent_account_code?: string | null
          parent_account_id?: string | null
          primary_link_type?: never
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string | null
          account_level?: number | null
          account_name?: string | null
          account_name_ar?: string | null
          account_subtype?: string | null
          account_type?: string | null
          balance_type?: string | null
          can_link_customers?: boolean | null
          can_link_employees?: boolean | null
          can_link_vendors?: boolean | null
          company_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_header?: boolean | null
          is_system?: boolean | null
          link_count?: never
          parent_account_code?: string | null
          parent_account_id?: string | null
          primary_link_type?: never
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "v_linkable_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pending_waivers: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string | null
          reason: string | null
          requested_by: string | null
          rule_id: string | null
          rule_name: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          reason?: string | null
          requested_by?: string | null
          rule_id?: string | null
          rule_name?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          reason?: string | null
          requested_by?: string | null
          rule_id?: string | null
          rule_name?: string | null
        }
        Relationships: []
      }
      v_recent_failures: {
        Row: {
          actor: string | null
          created_at: string | null
          details: Json | null
          id: string | null
          pr_number: number | null
          run_id: string | null
          stage: string | null
          violations: Json | null
        }
        Relationships: []
      }
      v_report_schedule_status: {
        Row: {
          failed_last_7_days: number | null
          last_failed_run: string | null
          last_successful_run: string | null
          report_type: string | null
          successful_last_7_days: number | null
        }
        Relationships: []
      }
      vendor_purchase_performance: {
        Row: {
          avg_delivery_days: number | null
          avg_order_value: number | null
          cancelled_orders: number | null
          company_id: string | null
          completed_orders: number | null
          contact_person: string | null
          email: string | null
          first_order_date: string | null
          is_active_vendor: boolean | null
          last_order_date: string | null
          on_time_deliveries: number | null
          on_time_delivery_rate: number | null
          phone: string | null
          total_deliveries: number | null
          total_orders: number | null
          total_purchase_value: number | null
          vendor_code: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_name_ar: string | null
        }
        Relationships: []
      }
      // AI Matching Views (added 2025-01-10)
      pending_contract_matches: {
        Row: {
          ai_match_confidence: number | null
          ai_match_status: string | null
          company_id: string
          document_id: string
          document_name: string
          document_type: string
          match_notes: string | null
          processing_status: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          uploader_name: string | null
          contract_number: string | null
          customer_name: string | null
          vehicle_plate: string | null
        }
        Relationships: []
      }
      contract_match_statistics: {
        Row: {
          ai_matched_count: number | null
          avg_confidence: number | null
          company_id: string
          manual_override_count: number | null
          not_matched_count: number | null
          pending_count: number | null
          review_required_count: number | null
          total_documents: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_vehicles_to_installment:
        | {
            Args: { installment_id_param: string; vehicle_ids_param: string[] }
            Returns: Json
          }
        | {
            Args: {
              p_installment_id: string
              p_vehicle_amounts?: number[]
              p_vehicle_ids: string[]
            }
            Returns: undefined
          }
      admin_add_user_role: {
        Args: { p_company_id: string; p_role: string; p_user_id: string }
        Returns: boolean
      }
      admin_update_user_role_company: {
        Args: { p_company_id: string; p_role: string; p_user_id: string }
        Returns: boolean
      }
      allocate_inventory_stock: {
        Args: { p_item_id: string; p_quantity: number; p_warehouse_id: string }
        Returns: boolean
      }
      analyze_account_deletion_enhanced: {
        Args: { account_id_param: string }
        Returns: Json
      }
      analyze_account_dependencies: {
        Args: { account_id_param: string }
        Returns: Json
      }
      analyze_system_performance: {
        Args: { company_id_param: string; hours_back?: number }
        Returns: Json
      }
      analyze_table_indexes: {
        Args: { table_name: string }
        Returns: {
          columns: string[]
          index_name: string
          index_type: string
          last_used: string
          usage_count: number
        }[]
      }
      apply_contract_amendment: {
        Args: { p_amendment_id: string }
        Returns: Json
      }
      auto_create_customer_accounts: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: Json
      }
      auto_create_monthly_payment_receipts: {
        Args: never
        Returns: {
          created_count: number
          skipped_count: number
        }[]
      }
      backfill_all_contract_invoices: {
        Args: { target_company_id: string }
        Returns: Json
      }
      backfill_contract_invoices: {
        Args: { p_company_id: string; p_contract_id?: string }
        Returns: {
          contract_id: string
          contract_number: string
          invoices_created: number
          invoices_skipped: number
          months_processed: number
        }[]
      }
      bulk_delete_company_accounts: {
        Args: {
          deletion_reason?: string
          include_system_accounts?: boolean
          target_company_id: string
        }
        Returns: Json
      }
      calculate_account_level:
        | { Args: { account_code: string }; Returns: number }
        | { Args: { account_id_param: string }; Returns: number }
      calculate_account_level_from_code: {
        Args: { account_code_param: string }
        Returns: number
      }
      calculate_all_vehicle_costs: {
        Args: { company_id_param: string }
        Returns: {
          insurance_cost: number
          maintenance_cost: number
          operating_cost: number
          plate_number: string
          status: string
          vehicle_id: string
        }[]
      }
      calculate_contract_amount: {
        Args: { contract_id_param: string }
        Returns: undefined
      }
      calculate_contract_late_fees: { Args: never; Returns: number }
      calculate_contract_total_paid: {
        Args: { p_contract_id: string }
        Returns: number
      }
      calculate_customer_outstanding_balance: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: {
          credit_available: number
          current_balance: number
          days_overdue: number
          overdue_amount: number
        }[]
      }
      calculate_employee_salary: {
        Args: {
          employee_id_param: string
          period_end_param: string
          period_start_param: string
        }
        Returns: {
          absent_days: number
          allowances: number
          basic_salary: number
          late_days: number
          late_penalty: number
          net_salary: number
          overtime_amount: number
          overtime_hours: number
          present_days: number
          total_deductions: number
          total_earnings: number
          working_days: number
        }[]
      }
      calculate_financial_health_score: {
        Args: { company_id_param: string }
        Returns: {
          efficiency_score: number
          liquidity_score: number
          overall_score: number
          profitability_score: number
          solvency_score: number
        }[]
      }
      calculate_fuel_efficiency: {
        Args: {
          end_date?: string
          start_date?: string
          vehicle_id_param: string
        }
        Returns: {
          average_cost_per_liter: number
          fuel_efficiency_km_per_liter: number
          total_distance_km: number
          total_fuel_cost: number
          total_fuel_liters: number
        }[]
      }
      calculate_inventory_valuation: {
        Args: {
          p_category_id?: string
          p_company_id: string
          p_warehouse_id?: string
        }
        Returns: {
          category_id: string
          category_name: string
          potential_profit: number
          total_cost_value: number
          total_items: number
          total_quantity: number
          total_selling_value: number
          warehouse_id: string
          warehouse_name: string
        }[]
      }
      calculate_late_fee:
        | {
            Args: {
              p_due_date: string
              p_monthly_amount: number
              p_payment_date: string
            }
            Returns: {
              days_overdue: number
              late_fee_amount: number
              late_fee_days: number
            }[]
          }
        | {
            Args: {
              p_days_overdue: number
              p_invoice_id: string
              p_rule_id?: string
            }
            Returns: number
          }
      calculate_payment_due_dates: {
        Args: { contract_id_param: string }
        Returns: {
          amount: number
          due_date: string
          installment_number: number
          status: string
        }[]
      }
      calculate_rental_delay_fine: {
        Args: { monthly_rent_param: number; payment_date_param: string }
        Returns: {
          days_late: number
          fine: number
        }[]
      }
      calculate_smart_late_fee: {
        Args: {
          p_daily_rate?: number
          p_days_overdue: number
          p_monthly_cap?: number
        }
        Returns: Json
      }
      calculate_vehicle_total_costs: {
        Args: { vehicle_id_param: string }
        Returns: undefined
      }
      can_access_contract_documents: {
        Args: { _action?: string; _company_id?: string; _user_id: string }
        Returns: boolean
      }
      cascade_delete_account_with_children: {
        Args: { account_id_param: string; force_delete?: boolean }
        Returns: Json
      }
      change_journal_entry_status: {
        Args: {
          p_entry_id: string
          p_new_status: string
          p_notes?: string
          p_user_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      check_and_fix_user_data_integrity: { Args: never; Returns: Json }
      check_budget_overruns: {
        Args: { budget_id_param: string }
        Returns: number
      }
      check_budget_variances: {
        Args: { company_id_param: string }
        Returns: undefined
      }
      check_company_quotas: {
        Args: { company_id_param: string }
        Returns: Json
      }
      check_contract_creation_requirements: {
        Args: { company_id_param: string }
        Returns: Json
      }
      check_contract_payment_status: {
        Args: { contract_id_param: string }
        Returns: {
          days_overdue: number
          is_overdue: boolean
          last_payment_date: string
          overdue_amount: number
        }[]
      }
      check_customer_credit_status: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: {
          can_extend_credit: boolean
          credit_available: number
          credit_score: number
          payment_history_score: number
          risk_level: string
        }[]
      }
      check_customer_eligibility_realtime: {
        Args: { customer_id_param: string }
        Returns: Json
      }
      check_deploy_allowed: { Args: { p_run_id: string }; Returns: boolean }
      check_document_expiry_alerts: {
        Args: never
        Returns: {
          alert_type: string
          company_id: string
          contract_id: string
          contract_number: string
          customer_id: string
          customer_name: string
          days_until_expiry: number
          document_type: string
          expiry_date: string
        }[]
      }
      check_duplicate_customer: {
        Args: {
          p_commercial_register?: string
          p_company_id: string
          p_company_name?: string
          p_customer_type: string
          p_email?: string
          p_exclude_customer_id?: string
          p_national_id?: string
          p_passport_number?: string
          p_phone?: string
        }
        Returns: Json
      }
      check_existing_accounts_summary: {
        Args: { company_id_param: string }
        Returns: Json
      }
      check_missing_invoices_report: {
        Args: { p_company_id?: string; p_contract_id?: string }
        Returns: {
          contract_end_date: string
          contract_id: string
          contract_number: string
          contract_start_date: string
          customer_name: string
          existing_invoices: number
          expected_invoices: number
          missing_invoices: number
          missing_months: string[]
          monthly_amount: number
        }[]
      }
      check_payment_reminders: {
        Args: never
        Returns: {
          company_id: string
          customer_id: string
          customer_name: string
          invoice_id: string
          invoice_number: string
          message_template: string
          message_variables: Json
          phone_number: string
          reminder_id: string
          reminder_type: string
          scheduled_date: string
          scheduled_time: string
        }[]
      }
      check_rate_limit: {
        Args: {
          max_attempts?: number
          operation_type: string
          window_minutes?: number
        }
        Returns: boolean
      }
      check_session_timeout: { Args: never; Returns: boolean }
      check_vehicle_availability_fixed: {
        Args: {
          end_date_param: string
          exclude_contract_id_param?: string
          start_date_param: string
          vehicle_id_param: string
        }
        Returns: Json
      }
      check_vehicle_availability_realtime: {
        Args: {
          end_date_param: string
          exclude_contract_id_param?: string
          start_date_param: string
          vehicle_id_param: string
        }
        Returns: Json
      }
      cleanup_all_account_references: {
        Args: { target_company_id: string }
        Returns: Json
      }
      cleanup_completed_jobs: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      cleanup_contract_issues: {
        Args: { company_id_param: string }
        Returns: Json
      }
      cleanup_inactive_accounts: {
        Args: { days_old?: number; target_company_id: string }
        Returns: number
      }
      cleanup_old_events: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      cleanup_old_logs: { Args: never; Returns: number }
      cleanup_orphaned_account_references: {
        Args: { company_id_param: string }
        Returns: Json
      }
      cleanup_orphaned_contract_files: { Args: never; Returns: number }
      cleanup_orphaned_contract_logs: { Args: never; Returns: number }
      column_exists: {
        Args: { column_name: string; table_name: string }
        Returns: boolean
      }
      comprehensive_delete_account: {
        Args: {
          account_id_param: string
          deletion_mode?: string
          transfer_to_account_id_param?: string
          user_id_param?: string
        }
        Returns: Json
      }
      comprehensive_hierarchy_check: {
        Args: { target_company_id: string }
        Returns: Json
      }
      copy_default_accounts_to_company: {
        Args: { target_company_id: string }
        Returns: undefined
      }
      copy_default_accounts_to_company_fixed: {
        Args: { target_company_id: string }
        Returns: undefined
      }
      copy_default_cost_centers_to_company: {
        Args: { target_company_id: string }
        Returns: Json
      }
      copy_selected_accounts_to_company: {
        Args: { selected_account_codes: string[]; target_company_id: string }
        Returns: undefined
      }
      create_bank_transaction_journal_entry: {
        Args: { transaction_id_param: string }
        Returns: string
      }
      create_bank_transaction_journal_entry_from_record: {
        Args: {
          transaction_record: Database["public"]["Tables"]["bank_transactions"]["Row"]
        }
        Returns: string
      }
      create_condition_report_for_permit: {
        Args: { inspection_type_param?: string; permit_id_param: string }
        Returns: string
      }
      create_contract_cancellation_journal_entry: {
        Args: {
          cancellation_date_param: string
          cancellation_reason?: string
          contract_id_param: string
        }
        Returns: string
      }
      create_contract_document_with_rollback: {
        Args: {
          p_company_id?: string
          p_condition_report_id?: string
          p_contract_id: string
          p_document_name: string
          p_document_type: string
          p_file_path?: string
          p_file_size?: number
          p_is_required?: boolean
          p_mime_type?: string
          p_notes?: string
        }
        Returns: string
      }
      create_contract_invoice: {
        Args: { contract_id_param: string; invoice_period?: string }
        Returns: string
      }
      create_contract_journal_entry: {
        Args: { contract_id_param: string }
        Returns: string
      }
      create_contract_journal_entry_enhanced: {
        Args: {
          amount_param?: number
          contract_id_param: string
          entry_type_param?: string
          user_id_param?: string
        }
        Returns: Json
      }
      create_contract_journal_entry_safe: {
        Args: { contract_id_param: string }
        Returns: string
      }
      create_contract_journal_entry_with_data: {
        Args: {
          amount_param?: number
          contract_data: Json
          entry_type_param?: string
          user_id_param?: string
        }
        Returns: Json
      }
      create_contract_payment_schedule: {
        Args: {
          contract_id_param: string
          installment_plan?: string
          number_of_installments?: number
        }
        Returns: number
      }
      create_contract_safe:
        | {
            Args: {
              company_id_param: string
              contract_data: Json
              customer_id_param: string
            }
            Returns: Json
          }
        | {
            Args: { contract_data: Json; user_id_param?: string }
            Returns: Json
          }
        | {
            Args: {
              contract_amount_param?: number
              contract_date_param?: string
              contract_type_param?: string
              cost_center_id_param?: string
              customer_id_param: string
              description_param?: string
              end_date_param?: string
              monthly_amount_param?: number
              start_date_param?: string
              status_param?: string
              terms_param?: string
              vehicle_id_param?: string
            }
            Returns: Json
          }
      create_contract_with_journal_entry:
        | { Args: { contract_data: Json }; Returns: Json }
        | {
            Args: {
              p_company_id: string
              p_contract_amount?: number
              p_contract_type?: string
              p_cost_center_id?: string
              p_created_by?: string
              p_customer_id: string
              p_description?: string
              p_end_date?: string
              p_monthly_amount?: number
              p_start_date?: string
              p_terms?: string
              p_vehicle_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_contract_amount?: number
              p_contract_date?: string
              p_contract_number?: string
              p_contract_type?: string
              p_cost_center_id?: string
              p_created_by?: string
              p_customer_id: string
              p_description?: string
              p_end_date?: string
              p_monthly_amount?: number
              p_start_date?: string
              p_terms?: string
              p_vehicle_id?: string
            }
            Returns: Json
          }
      create_contract_with_journal_entry_enhanced: {
        Args: {
          p_company_id: string
          p_contract_amount?: number
          p_contract_type?: string
          p_cost_center_id?: string
          p_created_by?: string
          p_customer_id: string
          p_description?: string
          p_end_date?: string
          p_monthly_amount?: number
          p_start_date?: string
          p_terms?: string
          p_vehicle_id?: string
        }
        Returns: Json
      }
      create_contract_with_journal_entry_ultra_fast: {
        Args: {
          p_company_id: string
          p_contract_amount?: number
          p_contract_type?: string
          p_cost_center_id?: string
          p_created_by?: string
          p_customer_id: string
          p_description?: string
          p_end_date?: string
          p_monthly_amount?: number
          p_start_date?: string
          p_terms?: string
          p_vehicle_id?: string
        }
        Returns: Json
      }
      create_contract_with_transaction: {
        Args: {
          p_additional_data?: Json
          p_company_id: string
          p_created_by?: string
          p_customer_id: string
          p_end_date: string
          p_rental_duration: number
          p_rental_type: string
          p_security_deposit?: number
          p_start_date: string
          p_total_amount: number
          p_vehicle_id: string
        }
        Returns: Json
      }
      create_customer_financial_account: {
        Args: { p_company_id: string; p_customer_id: string }
        Returns: Json
      }
      create_customer_financial_account_enhanced: {
        Args: { customer_id_param: string; user_id_param?: string }
        Returns: Json
      }
      create_customer_financial_account_fixed: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: string
      }
      create_customer_with_contract: {
        Args: {
          p_company_id: string
          p_first_name: string
          p_last_name: string
          p_monthly_amount: number
        }
        Returns: Json
      }
      create_default_customer_accounts_fixed: {
        Args: { company_id_param: string }
        Returns: undefined
      }
      create_default_leave_types_for_company: {
        Args: { target_company_id: string }
        Returns: undefined
      }
      create_deferred_revenue_journal_entry: {
        Args: {
          contract_id_param: string
          monthly_amount_param: number
          period_end_date: string
          period_start_date: string
        }
        Returns: string
      }
      create_depreciation_journal_entry: {
        Args: {
          asset_id_param: string
          depreciation_amount_param: number
          depreciation_date_param: string
        }
        Returns: string
      }
      create_insurance_journal_entry: {
        Args: { policy_id_param: string }
        Returns: string
      }
      create_invoice_discount_journal_entry: {
        Args: {
          discount_amount_param: number
          discount_reason?: string
          invoice_id_param: string
        }
        Returns: string
      }
      create_invoice_journal_entry: {
        Args: { invoice_id_param: string }
        Returns: string
      }
      create_journal_entry_with_transaction: {
        Args: {
          p_company_id: string
          p_created_by?: string
          p_description: string
          p_entry_date: string
          p_entry_number: string
          p_lines: Json
          p_reference?: string
        }
        Returns: Json
      }
      create_legal_case_from_receipt: {
        Args: { p_receipt_id: string }
        Returns: string
      }
      create_maintenance_expense_entry: {
        Args: { company_id_param: string; maintenance_id_param: string }
        Returns: string
      }
      create_maintenance_journal_entry: {
        Args: { maintenance_id_param: string }
        Returns: string
      }
      create_openai_edge_function: { Args: never; Returns: undefined }
      create_payment_bank_transaction: {
        Args: { payment_id_param: string }
        Returns: string
      }
      create_payment_journal_entry_enhanced: {
        Args: { payment_id_param: string; user_id_param?: string }
        Returns: Json
      }
      create_payment_schedule_invoices:
        | {
            Args: {
              p_contract_id: string
              p_installment_plan?: string
              p_number_of_installments?: number
            }
            Returns: {
              amount: number
              due_date: string
              installment_number: number
              invoice_id: string
              schedule_id: string
            }[]
          }
        | {
            Args: {
              p_contract_id: string
              p_first_payment_date?: string
              p_installment_plan?: string
              p_number_of_installments?: number
            }
            Returns: {
              amount: number
              due_date: string
              installment_number: number
              invoice_id: string
              schedule_id: string
            }[]
          }
      create_payment_with_transaction: {
        Args: {
          p_amount: number
          p_company_id: string
          p_contract_id: string
          p_created_by?: string
          p_customer_id: string
          p_notes?: string
          p_payment_date: string
          p_payment_method: string
          p_payment_type?: string
          p_reference?: string
        }
        Returns: Json
      }
      create_payroll_journal_entry: {
        Args: { payroll_id_param: string }
        Returns: string
      }
      create_penalty_journal_entry: {
        Args: { penalty_id_param: string }
        Returns: string
      }
      create_periodic_invoice_safely: {
        Args: { contract_id_param: string }
        Returns: string
      }
      create_property_contract_journal_entry: {
        Args: { contract_id_param: string }
        Returns: string
      }
      create_property_payment_journal_entry: {
        Args: { payment_id_param: string }
        Returns: string
      }
      create_rental_payment_receipt: {
        Args: {
          p_company_id: string
          p_created_by: string
          p_customer_id: string
          p_customer_name: string
          p_fine: number
          p_month: string
          p_payment_date: string
          p_rent_amount: number
          p_total_paid: number
        }
        Returns: Json
      }
      create_sample_system_logs: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      create_smart_account: {
        Args: {
          account_name_ar_param?: string
          account_name_param: string
          account_type_param?: string
          auto_generate_code?: boolean
          company_id_param: string
          parent_account_id_param?: string
        }
        Returns: string
      }
      create_system_alert: {
        Args: {
          alert_type_param: string
          company_id_param: string
          details_param?: Json
          expires_hours?: number
          message_param: string
          severity_param: string
          title_param: string
        }
        Returns: string
      }
      create_traffic_payment_journal_entry: {
        Args: { payment_id_param: string }
        Returns: string
      }
      create_vehicle_fixed_asset_entry: {
        Args: { vehicle_id_param: string }
        Returns: string
      }
      create_vehicle_installment_schedule: {
        Args: {
          p_company_id: string
          p_down_payment: number
          p_installment_amount: number
          p_installment_id: string
          p_interest_rate?: number
          p_number_of_installments: number
          p_start_date?: string
          p_total_amount: number
        }
        Returns: number
      }
      create_vehicle_purchase_journal_entry: {
        Args: { vehicle_id_param: string }
        Returns: string
      }
      create_vendor_financial_account: {
        Args: {
          company_id_param: string
          vendor_data?: Json
          vendor_id_param: string
        }
        Returns: string
      }
      deactivate_expired_demo_sessions: { Args: never; Returns: undefined }
      deallocate_inventory_stock: {
        Args: { p_item_id: string; p_quantity: number; p_warehouse_id: string }
        Returns: boolean
      }
      decrypt_sensitive_data: {
        Args: { encrypted_data: string }
        Returns: string
      }
      delete_all_accounts_v2: {
        Args: { company_id: string; force_system: boolean; reason: string }
        Returns: Json
      }
      detect_and_create_legal_cases_for_unpaid_months: {
        Args: never
        Returns: {
          cases_created: number
        }[]
      }
      determine_payment_completion_status: {
        Args: {
          p_amount_paid: number
          p_days_overdue: number
          p_monthly_amount: number
        }
        Returns: string
      }
      diagnose_account_deletion_failures: {
        Args: { target_company_id: string }
        Returns: Json
      }
      direct_delete_all_accounts: {
        Args: { include_system_accounts?: boolean; target_company_id: string }
        Returns: Json
      }
      distribute_vehicle_installment_amount: {
        Args: {
          p_installment_id: string
          p_total_amount: number
          p_vehicle_amounts?: Json
        }
        Returns: undefined
      }
      encrypt_sensitive_data: { Args: { data: string }; Returns: string }
      enhanced_bulk_delete_company_accounts: {
        Args: {
          deletion_reason?: string
          include_system_accounts?: boolean
          target_company_id: string
        }
        Returns: Json
      }
      enhanced_complete_account_deletion: {
        Args: {
          deletion_reason?: string
          force_complete_reset?: boolean
          include_inactive_accounts?: boolean
          include_system_accounts?: boolean
          target_company_id: string
        }
        Returns: Json
      }
      enhanced_delete_customer_and_relations: {
        Args: { target_company_id: string; target_customer_id: string }
        Returns: Json
      }
      ensure_essential_account_mappings: {
        Args: { company_id_param: string }
        Returns: Json
      }
      expire_old_waivers: { Args: never; Returns: number }
      export_ledger_data: {
        Args: {
          company_id_param: string
          export_format?: string
          filters?: Json
        }
        Returns: string
      }
      find_account_by_name_fixed: {
        Args: {
          account_type_param?: string
          company_id_param: string
          search_name: string
        }
        Returns: string
      }
      find_cash_account_fixed: {
        Args: { company_id_param: string }
        Returns: string
      }
      find_contract_by_identifiers: {
        Args: {
          p_agreement_number?: string
          p_company_id: string
          p_contract_number?: string
          p_customer_id?: string
        }
        Returns: {
          confidence: number
          contract_id: string
          contract_number: string
        }[]
      }
      find_receivable_account_fixed: {
        Args: { company_id_param: string }
        Returns: string
      }
      find_revenue_account_fixed: {
        Args: { company_id_param: string }
        Returns: string
      }
      fix_chart_hierarchy: {
        Args: { target_company_id: string }
        Returns: Json
      }
      fix_invoice_due_dates: {
        Args: never
        Returns: {
          message: string
          updated_count: number
        }[]
      }
      fix_missing_invoices_for_contracts: {
        Args: {
          p_company_id?: string
          p_contract_id?: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          contract_id: string
          contract_number: string
          customer_name: string
          error_message: string
          invoices_created: number
          invoices_skipped: number
          months_covered: string
          status: string
          total_amount: number
        }[]
      }
      fix_payment_schedule_due_dates: {
        Args: never
        Returns: {
          message: string
          updated_count: number
        }[]
      }
      fix_pending_payments: {
        Args: { target_company_id?: string }
        Returns: {
          action_taken: string
          new_status: string
          old_status: string
          payment_id: string
          payment_number: string
        }[]
      }
      force_delete_all_accounts: {
        Args: {
          cleanup_first?: boolean
          include_system_accounts?: boolean
          target_company_id: string
        }
        Returns: Json
      }
      format_qatar_phone: { Args: { phone: string }; Returns: string }
      generate_amendment_number: {
        Args: { p_company_id: string; p_contract_id: string }
        Returns: string
      }
      generate_approval_request_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_approval_token: { Args: never; Returns: string }
      generate_cash_flow_analysis: {
        Args: {
          company_id_param: string
          end_date_param?: string
          start_date_param?: string
        }
        Returns: {
          financing_cash_flow: number
          investing_cash_flow: number
          net_cash_flow: number
          operating_cash_flow: number
          total_inflow: number
          total_outflow: number
        }[]
      }
      generate_contract_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_contracts_report: {
        Args: {
          company_id_param: string
          end_date_param?: string
          start_date_param?: string
          status_filter?: string
        }
        Returns: {
          contract_amount: number
          contract_id: string
          contract_number: string
          contract_type: string
          customer_name: string
          days_remaining: number
          end_date: string
          monthly_amount: number
          outstanding_amount: number
          start_date: string
          status: string
          total_invoiced: number
          total_paid: number
        }[]
      }
      generate_customer_code:
        | {
            Args: { company_id_param: string; customer_type_param: string }
            Returns: string
          }
        | {
            Args: {
              p_company_id: string
              p_customer_type: Database["public"]["Enums"]["customer_type"]
            }
            Returns: string
          }
      generate_customer_statement_data: {
        Args: {
          company_id_param: string
          customer_id_param: string
          end_date_param?: string
          start_date_param?: string
        }
        Returns: {
          closing_balance: number
          opening_balance: number
          overdue_amount: number
          statement_period: string
          total_charges: number
          total_payments: number
          transaction_count: number
        }[]
      }
      generate_dispatch_permit_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_employee_account_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_goods_receipt_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_grouped_reminder_message: {
        Args: {
          p_company_id: string
          p_customer_name: string
          p_invoice_count: number
          p_invoices_data: Json
          p_reminder_type: string
          p_total_amount: number
        }
        Returns: string
      }
      generate_historical_invoices_safe: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          amount_out: number
          contract_id_out: string
          contract_number_out: string
          invoice_date_out: string
          invoice_number_out: string
          message_out: string
          status_out: string
        }[]
      }
      generate_invoice_for_contract_month: {
        Args: { p_contract_id: string; p_invoice_month: string }
        Returns: string
      }
      generate_invoices_from_payment_schedule: {
        Args: { p_contract_id: string }
        Returns: number
      }
      generate_journal_entry_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_legal_case_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_legal_memo_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_maintenance_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_monthly_invoices_for_date: {
        Args: { p_company_id: string; p_invoice_month: string }
        Returns: {
          contract_id: string
          invoice_id: string
          invoice_number: string
          status: string
        }[]
      }
      generate_monthly_reminders_for_unpaid_receipts: {
        Args: never
        Returns: {
          reminders_created: number
        }[]
      }
      generate_monthly_trends: {
        Args: { company_id_param: string; months_back?: number }
        Returns: {
          month_year: string
          net_profit: number
          profit_margin: number
          total_expenses: number
          total_revenue: number
        }[]
      }
      generate_optimized_policy_sql: {
        Args: never
        Returns: {
          create_sql: string
          drop_sql: string
          policy_name: string
          table_name: string
        }[]
      }
      generate_payment_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_penalty_number: {
        Args: { p_company_id?: string }
        Returns: string
      }
      generate_purchase_order_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_reminder_schedule_for_invoice: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      generate_reminder_schedule_for_receipt: {
        Args: { p_receipt_id: string; p_reminder_stage: string }
        Returns: string
      }
      generate_reminder_schedules: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      generate_secure_password: { Args: never; Returns: string }
      generate_tenant_code: {
        Args: { company_id_param: string; tenant_type_param: string }
        Returns: string
      }
      generate_ticket_number: { Args: never; Returns: string }
      generate_traffic_payment_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_vehicle_alerts: { Args: never; Returns: undefined }
      generate_vendor_payment_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      get_account_balances: {
        Args: {
          account_type_filter?: string
          as_of_date?: string
          company_id_param: string
        }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          account_name_ar: string
          account_type: string
          balance_type: string
          closing_balance: number
          opening_balance: number
          total_credits: number
          total_debits: number
        }[]
      }
      get_account_by_type: {
        Args: { account_type_code: string; company_id_param: string }
        Returns: string
      }
      get_account_deletion_preview: {
        Args: { account_id_param: string }
        Returns: Json
      }
      get_accounts_by_type_fixed: {
        Args: { account_type_param: string; company_id_param: string }
        Returns: {
          account_code: string
          account_name: string
          account_name_ar: string
          current_balance: number
          id: string
          is_header: boolean
        }[]
      }
      get_all_accounts_deletion_preview: {
        Args: { force_delete_system?: boolean; target_company_id: string }
        Returns: Json
      }
      get_all_customers_outstanding_balance: {
        Args: { company_id_param: string }
        Returns: {
          customer_id: string
          customer_name: string
          last_payment_date: string
          monthly_rent: number
          months_behind: number
          outstanding_balance: number
          total_paid: number
        }[]
      }
      get_available_customer_accounts: {
        Args: { company_id_param: string }
        Returns: {
          account_code: string
          account_name: string
          account_name_ar: string
          id: string
          is_available: boolean
          parent_account_name: string
        }[]
      }
      get_available_customer_accounts_v2: {
        Args: { target_company_id: string }
        Returns: {
          account_code: string
          account_name: string
          account_name_ar: string
          id: string
          is_available: boolean
          parent_account_name: string
        }[]
      }
      get_available_vehicles_for_contracts: {
        Args: {
          company_id_param: string
          contract_end_date?: string
          contract_start_date?: string
        }
        Returns: {
          color: string
          company_id: string
          daily_rate: number
          enforce_minimum_price: boolean
          id: string
          make: string
          minimum_rental_price: number
          model: string
          monthly_rate: number
          plate_number: string
          status: Database["public"]["Enums"]["vehicle_status"]
          weekly_rate: number
          year: number
        }[]
      }
      get_available_vendor_accounts: {
        Args: { company_id_param: string }
        Returns: {
          account_code: string
          account_name: string
          account_name_ar: string
          account_type: string
          id: string
          is_available: boolean
          parent_account_name: string
        }[]
      }
      get_category_analysis: {
        Args: { p_company_id: string }
        Returns: {
          average_turnover: number
          category_name: string
          item_count: number
          percentage_of_total_value: number
          total_value: number
        }[]
      }
      get_chart_statistics: {
        Args: { company_id_param: string }
        Returns: Json
      }
      get_company_currency_symbol: {
        Args: { p_company_id: string }
        Returns: string
      }
      get_compliance_dashboard_summary: {
        Args: { p_company_id: string }
        Returns: {
          active_validations: number
          compliance_score: number
          high_risk_entities: number
          overdue_reports: number
          pending_actions: number
          total_rules: number
        }[]
      }
      get_contract_complete: {
        Args: { p_company_id: string; p_contract_id: string }
        Returns: {
          contract_id: string
          contract_number: string
          customer_first_name: string
          customer_last_name: string
          end_date: string
          monthly_amount: number
          start_date: string
          status: string
          total_invoices: number
          unpaid_amount: number
        }[]
      }
      get_contract_operations_history: {
        Args: { contract_id_param: string }
        Returns: {
          notes: string
          operation_details: Json
          operation_id: string
          operation_type: string
          performed_at: string
          performed_by_name: string
        }[]
      }
      get_contract_template_by_type: {
        Args: { p_company_id: string; p_contract_type: string }
        Returns: {
          account_id: string
          account_mappings: Json
          approval_required: boolean
          approval_workflow_id: string
          contract_type: string
          created_at: string
          duration_days: number
          id: string
          is_active: boolean
          template_name: string
          template_name_ar: string
          terms: string
        }[]
      }
      get_contracts_pending_approval: {
        Args: { company_id_param: string }
        Returns: {
          contract_amount: number
          contract_id: string
          contract_number: string
          created_at: string
          customer_name: string
          pending_steps: number
        }[]
      }
      get_cost_center_analysis: {
        Args: { company_id_param: string; date_from?: string; date_to?: string }
        Returns: {
          center_code: string
          center_name: string
          center_name_ar: string
          cost_center_id: string
          entry_count: number
          net_amount: number
          total_credits: number
          total_debits: number
        }[]
      }
      get_customer_account_statement_by_code: {
        Args: {
          p_company_id: string
          p_customer_code: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: {
          credit_amount: number
          debit_amount: number
          description: string
          reference_number: string
          running_balance: number
          source_table: string
          transaction_date: string
          transaction_id: string
          transaction_type: string
        }[]
      }
      get_customer_best_name: {
        Args: { p_customer_id: string }
        Returns: string
      }
      get_customer_complete: {
        Args: { p_company_id: string; p_customer_id: string }
        Returns: {
          active_contracts: number
          customer_id: string
          first_name: string
          last_name: string
          total_contracts: number
          total_invoices: number
        }[]
      }
      get_customer_contract_summary: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: Json
      }
      get_customer_default_account: {
        Args: { p_account_type?: string; p_customer_id: string }
        Returns: string
      }
      get_customer_default_cost_center: {
        Args: { customer_id_param: string }
        Returns: string
      }
      get_customer_outstanding_balance: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: {
          contract_end_date: string
          contract_start_date: string
          expected_total: number
          last_payment_date: string
          monthly_rent: number
          months_expected: number
          months_paid: number
          outstanding_balance: number
          total_paid: number
          unpaid_month_count: number
        }[]
      }
      get_customer_payment_history: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: {
          amount: number
          contract_number: string
          notes: string
          payment_date: string
          payment_id: string
          payment_method: string
          reference_number: string
          status: string
        }[]
      }
      get_customer_rental_payment_totals: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: {
          last_payment_date: string
          partial_payment_count: number
          receipt_count: number
          total_due: number
          total_fines: number
          total_payments: number
          total_pending: number
          total_rent: number
        }[]
      }
      get_customer_unpaid_months: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: {
          days_overdue: number
          expected_date: string
          is_overdue: boolean
          month_name: string
          month_number: number
        }[]
      }
      get_dashboard_stats: { Args: { p_company_id: string }; Returns: Json }
      get_effective_company_id: { Args: never; Returns: string }
      get_eligible_contracts_for_renewal: {
        Args: { company_id_param: string }
        Returns: {
          contract_amount: number
          contract_id: string
          contract_number: string
          customer_name: string
          days_since_expiry: number
          end_date: string
          outstanding_amount: number
          total_paid: number
          vehicle_info: string
        }[]
      }
      get_enhanced_accounts_deletion_preview: {
        Args: { force_delete_system?: boolean; target_company_id: string }
        Returns: Json
      }
      get_entry_allowed_accounts: {
        Args: { company_id_param: string }
        Returns: {
          account_code: string
          account_level: number
          account_name: string
          account_name_ar: string
          account_type: string
          balance_type: string
          id: string
          parent_account_name: string
        }[]
      }
      get_financial_summary: {
        Args: { company_id_param: string; date_from?: string; date_to?: string }
        Returns: {
          net_income: number
          total_assets: number
          total_equity: number
          total_expenses: number
          total_liabilities: number
          total_revenue: number
          unbalanced_entries_count: number
        }[]
      }
      get_grouped_reminders_for_today: {
        Args: never
        Returns: {
          company_id: string
          customer_id: string
          customer_name: string
          invoice_count: number
          invoices_data: Json
          phone_number: string
          reminder_type: string
          total_amount: number
        }[]
      }
      get_inconsistent_accounts: {
        Args: never
        Returns: {
          employee_company_id: string
          employee_email: string
          employee_id: string
          has_system_access: boolean
          profile_company_id: string
          role_count: number
          user_id: string
        }[]
      }
      get_inventory_overview_metrics: {
        Args: {
          p_category_id?: string
          p_company_id: string
          p_warehouse_id?: string
        }
        Returns: {
          accuracy_rate: number
          excess_stock_items: number
          fulfillment_rate: number
          holding_cost: number
          low_stock_items: number
          out_of_stock_items: number
          stockout_cost: number
          total_items: number
          total_value: number
          turnover_rate: number
        }[]
      }
      get_inventory_trends: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          movement_count: number
          new_items: number
          out_of_stock_items: number
          period: string
          total_value: number
        }[]
      }
      get_item_movement_summary: {
        Args: { p_days?: number; p_item_id: string; p_warehouse_id?: string }
        Returns: {
          avg_quantity: number
          movement_count: number
          movement_type: string
          total_cost: number
          total_quantity: number
        }[]
      }
      get_item_performance_metrics: {
        Args: {
          p_category_id?: string
          p_company_id: string
          p_warehouse_id?: string
        }
        Returns: {
          avg_monthly_usage: number
          category: string
          current_stock: number
          days_of_supply: number
          excess_stock_value: number
          item_code: string
          item_id: string
          item_name: string
          last_movement_date: string
          movement_count: number
          reorder_point: number
          safety_stock: number
          stockouts: number
          total_value: number
          turnover_rate: number
        }[]
      }
      get_late_fine_settings: {
        Args: { p_company_id: string }
        Returns: {
          company_id: string
          created_at: string
          fine_rate: number
          fine_type: string
          grace_period_days: number
          id: string
          is_active: boolean
          max_fine_amount: number
          updated_at: string
        }[]
      }
      get_learning_stats: {
        Args: { p_company_id: string; p_days?: number }
        Returns: Json
      }
      get_legal_account_mapping: {
        Args: {
          account_type_param: string
          case_type_param: string
          company_id_param: string
        }
        Returns: string
      }
      get_linkable_accounts: {
        Args: { p_company_id: string; p_link_type?: string }
        Returns: {
          account_code: string
          account_level: number
          account_name: string
          account_name_ar: string
          can_link_customers: boolean
          can_link_employees: boolean
          can_link_vendors: boolean
          id: string
        }[]
      }
      get_maintenance_cost_center: {
        Args: { company_id_param: string }
        Returns: string
      }
      get_mapped_account_enhanced: {
        Args: { account_type_code_param: string; company_id_param: string }
        Returns: string
      }
      get_mapped_account_id:
        | {
            Args: { account_type_code: string; company_id_param: string }
            Returns: string
          }
        | {
            Args: { account_type_code_param: string; company_id_param: string }
            Returns: string
          }
      get_next_job: {
        Args: never
        Returns: {
          data: Json
          id: string
          job_type: string
          name: string
        }[]
      }
      get_payment_analytics: {
        Args: {
          company_id_param: string
          end_date_param?: string
          start_date_param?: string
        }
        Returns: {
          by_bank: Json
          by_cost_center: Json
          by_payment_type: Json
          net_cash_flow: number
          total_payments: number
          total_receipts: number
        }[]
      }
      get_payment_linking_stats: {
        Args: { p_company_id: string }
        Returns: {
          linked_payments: number
          linking_percentage: number
          total_payments: number
          unlinked_payments: number
        }[]
      }
      get_payments_without_invoices_stats: {
        Args: { target_company_id: string }
        Returns: Json
      }
      get_pending_approvals_for_user: {
        Args: { p_user_id: string; p_user_roles: string[] }
        Returns: {
          created_at: string
          current_step: number
          entity_id: string
          entity_type: string
          step_name: string
          workflow_id: string
        }[]
      }
      get_pending_payments_stats: {
        Args: { target_company_id: string }
        Returns: {
          low_confidence: number
          needs_manual_review: number
          total_pending: number
          unlinked_with_customer: number
          unlinked_without_customer: number
        }[]
      }
      get_pending_reminders_for_today: {
        Args: never
        Returns: {
          customer_name: string
          invoice_number: string
          message_text: string
          phone_number: string
          reminder_id: string
          reminder_type: string
        }[]
      }
      get_recent_events: {
        Args: { p_company_id: string; p_event_type?: string; p_limit?: number }
        Returns: {
          created_at: string
          data: Json
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          user_id: string
        }[]
      }
      get_reminder_template: {
        Args: { p_company_id: string; p_reminder_type: string }
        Returns: string
      }
      get_reporting_accounts: {
        Args: { company_id_param: string }
        Returns: {
          account_code: string
          account_level: number
          account_name: string
          account_name_ar: string
          account_type: string
          balance_type: string
          id: string
          parent_account_name: string
        }[]
      }
      get_revenue_account_for_invoice: { Args: never; Returns: string }
      get_smart_payment_stats: { Args: { p_company_id: string }; Returns: Json }
      get_trial_balance: {
        Args: { as_of_date?: string; company_id_param: string }
        Returns: {
          account_code: string
          account_id: string
          account_level: number
          account_name: string
          account_name_ar: string
          account_type: string
          credit_balance: number
          debit_balance: number
        }[]
      }
      get_upcoming_compliance_deadlines: {
        Args: { p_company_id: string; p_days_ahead?: number }
        Returns: {
          days_until_due: number
          due_date: string
          event_title: string
          event_type: string
          id: string
          priority: string
          responsible_user_id: string
        }[]
      }
      get_user_company: { Args: { _user_id: string }; Returns: string }
      get_user_company_direct: { Args: { user_uuid: string }; Returns: string }
      get_user_company_fixed: {
        Args: { input_user_id: string }
        Returns: string
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_company_safe: {
        Args: { user_id_param?: string }
        Returns: string
      }
      get_user_company_secure: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_user_company_secure_cached: {
        Args: { _user_id: string }
        Returns: string
      }
      get_warehouse_performance_metrics: {
        Args: { p_company_id: string }
        Returns: {
          accuracy_rate: number
          average_days_of_supply: number
          last_count_date: string
          movement_count: number
          total_items: number
          total_value: number
          utilization_rate: number
          warehouse_id: string
          warehouse_name: string
        }[]
      }
      get_whatsapp_statistics: {
        Args: never
        Returns: {
          cancelled_count: number
          failed_count: number
          pending_count: number
          sent_count: number
          total_reminders: number
          unique_customers: number
          unique_invoices: number
        }[]
      }
      handle_incomplete_user_account: {
        Args: {
          p_company_id: string
          p_employee_id: string
          p_roles: string[]
          p_user_id: string
        }
        Returns: Json
      }
      has_feature_access: {
        Args: { company_id_param: string; feature_code_param: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_cached: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_secure: {
        Args: {
          role_name: Database["public"]["Enums"]["user_role"]
          user_id_param: string
        }
        Returns: boolean
      }
      initialize_employee_leave_balances: {
        Args: { employee_id_param: string }
        Returns: undefined
      }
      is_aggregate_account: {
        Args: { account_id_param: string }
        Returns: boolean
      }
      is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      is_company_manager: { Args: { p_company_id: string }; Returns: boolean }
      is_in_transfer_context: { Args: never; Returns: boolean }
      is_super_admin:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean }
      log_account_deletion: {
        Args: {
          p_affected_records?: Json
          p_company_id: string
          p_deleted_account_code: string
          p_deleted_account_id: string
          p_deleted_account_name: string
          p_deletion_reason?: string
          p_deletion_type: string
          p_transfer_to_account_id?: string
        }
        Returns: string
      }
      log_contract_creation_step: {
        Args: {
          attempt_num?: number
          company_id_param: string
          contract_id_param?: string
          error_msg?: string
          exec_time?: number
          meta?: Json
          status_param?: string
          step_name?: string
        }
        Returns: undefined
      }
      log_cto_audit: {
        Args: {
          p_actor: string
          p_branch?: string
          p_commit_sha?: string
          p_details?: Json
          p_duration_ms?: number
          p_pr_number?: number
          p_run_id: string
          p_severity?: string
          p_stage: string
          p_status: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          details?: Json
          event_type: string
          resource_id?: string
          resource_type: string
        }
        Returns: undefined
      }
      log_suspicious_access: {
        Args: {
          _access_type: string
          _company_id: string
          _table_name: string
          _user_id: string
        }
        Returns: undefined
      }
      log_system_event: {
        Args: {
          action_param: string
          category_param: string
          company_id_param: string
          level_param: string
          message_param: string
          metadata_param?: Json
          resource_id_param?: string
          resource_type_param?: string
          user_id_param: string
        }
        Returns: string
      }
      log_user_account_action: {
        Args: {
          action_type_param: string
          details_param?: Json
          employee_id_param: string
          new_values_param?: Json
          old_values_param?: Json
          performed_by_param: string
        }
        Returns: undefined
      }
      mark_broken_promises: { Args: never; Returns: undefined }
      monitor_contract_health: {
        Args: { company_id_param: string }
        Returns: {
          contract_id: string
          issue_description: string
          issue_type: string
          recommended_action: string
          severity: string
        }[]
      }
      monitor_user_data_quality: {
        Args: never
        Returns: {
          check_name: string
          count_found: number
          description: string
          status: string
        }[]
      }
      normalize_phone: { Args: { phone_input: string }; Returns: string }
      normalize_plate: { Args: { plate_input: string }; Returns: string }
      parse_date: { Args: { date_input: string }; Returns: string }
      prepare_company_backup: {
        Args: { backup_type_param?: string; company_id_param: string }
        Returns: string
      }
      process_failed_journal_entries: { Args: never; Returns: undefined }
      process_monthly_depreciation: {
        Args: { company_id_param: string; depreciation_date_param?: string }
        Returns: number
      }
      process_overdue_invoices: {
        Args: never
        Returns: {
          days_overdue: number
          fee_amount: number
          invoice_id: string
          invoice_number: string
          status: string
        }[]
      }
      process_pending_journal_entries: { Args: never; Returns: Json }
      process_pending_reminders: {
        Args: never
        Returns: {
          failed_count: number
          processed_count: number
        }[]
      }
      process_vehicle_depreciation: {
        Args: { company_id_param: string; depreciation_date_param?: string }
        Returns: number
      }
      process_vehicle_depreciation_monthly: {
        Args: { company_id_param: string; depreciation_date_param?: string }
        Returns: {
          accumulated_depreciation: number
          journal_entry_id: string
          monthly_depreciation: number
          vehicle_id: string
          vehicle_number: string
        }[]
      }
      queue_daily_reminders: {
        Args: never
        Returns: {
          queued_count: number
          skipped_count: number
        }[]
      }
      recalculate_account_levels: {
        Args: { target_company_id: string }
        Returns: number
      }
      recalculate_all_contract_amounts: {
        Args: { company_id_param: string }
        Returns: {
          contract_id: string
          contract_number: string
          duration_months: number
          monthly_amount: number
          new_amount: number
          old_amount: number
          status: string
        }[]
      }
      recalculate_bank_balance: {
        Args: { bank_id_param: string }
        Returns: number
      }
      record_learning_interaction: {
        Args: {
          p_cache_hit?: boolean
          p_company_id: string
          p_confidence_score?: number
          p_context_data?: Json
          p_intent?: string
          p_query: string
          p_response: string
          p_response_time_ms?: number
          p_session_id: string
          p_sources_used?: Json
          p_user_id: string
        }
        Returns: string
      }
      record_performance_metric: {
        Args: {
          company_id_param: string
          metric_name_param: string
          metric_unit_param?: string
          metric_value_param: number
          tags_param?: Json
        }
        Returns: string
      }
      // AI Matching Functions (added 2025-01-10)
      record_ai_match_result: {
        Args: {
          p_confidence: number
          p_contract_id: string
          p_document_id: string
          p_status?: string
        }
        Returns: Json
      }
      override_contract_match: {
        Args: {
          p_document_id: string
          p_new_contract_id: string
          p_notes?: string
          p_user_id: string
        }
        Returns: Json
      }
      redistribute_vehicles_to_contracts: {
        Args: { p_company_id: string }
        Returns: {
          message: string
          updated_contracts: number
        }[]
      }
      refresh_company_stats_cache: { Args: never; Returns: undefined }
      refresh_customer_summary: { Args: never; Returns: undefined }
      regenerate_all_cancelled_contract_invoices: {
        Args: never
        Returns: {
          contract_id: string
          contract_number: string
          end_date: string
          error_message: string
          invoices_created: number
          start_date: string
          success: boolean
          total_amount: number
        }[]
      }
      regenerate_invoices_for_contract: {
        Args: { p_company_id: string; p_contract_id: string }
        Returns: {
          contract_number: string
          end_date: string
          invoices_created: number
          start_date: string
          total_amount: number
        }[]
      }
      reset_company_chart_for_complete_template: {
        Args: { target_company_id: string; template_name?: string }
        Returns: Json
      }
      reverse_journal_entry: {
        Args: {
          entry_id: string
          reversal_reason: string
          reversed_by_user: string
        }
        Returns: string
      }
      reverse_payment_bank_transaction: {
        Args: { payment_id_param: string }
        Returns: string
      }
      run_compliance_validation: {
        Args: {
          p_company_id: string
          p_entity_id: string
          p_entity_type: string
        }
        Returns: {
          action_required: boolean
          risk_assessment: string
          rule_category: string
          rule_id: string
          rule_name: string
          validation_result: string
          validation_score: number
        }[]
      }
      run_monthly_invoice_generation: {
        Args: never
        Returns: {
          company_id: string
          company_name: string
          invoices_created: number
          invoices_skipped: number
        }[]
      }
      safe_cleanup_account_references: {
        Args: { target_account_id: string }
        Returns: Json
      }
      scheduled_contract_maintenance: { Args: never; Returns: undefined }
      search_accounts_fixed: {
        Args: {
          account_type_filter?: string
          company_id_param: string
          search_term?: string
        }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          current_balance: number
          id: string
          is_active: boolean
        }[]
      }
      search_contracts_fixed: {
        Args: {
          customer_filter?: string
          limit_param?: number
          offset_param?: number
          search_company_id: string
          search_term?: string
          status_filter?: string
          vehicle_filter?: string
        }
        Returns: {
          contract_amount: number
          contract_number: string
          created_at: string
          customer_name: string
          end_date: string
          id: string
          start_date: string
          status: string
          vehicle_plate: string
        }[]
      }
      send_followup_reminders: { Args: never; Returns: undefined }
      simple_account_diagnosis: {
        Args: { target_company_id: string }
        Returns: Json
      }
      simple_cleanup_references: {
        Args: { target_company_id: string }
        Returns: Json
      }
      smart_backfill_contract_invoices: {
        Args: {
          p_company_id: string
          p_contract_id?: string
          p_update_wrong_dates?: boolean
        }
        Returns: {
          contract_number: string
          invoices_created: number
          invoices_skipped: number
          invoices_updated: number
          message: string
          result_contract_id: string
        }[]
      }
      soft_delete_account: {
        Args: { account_id_param: string }
        Returns: boolean
      }
      suggest_next_account_code: {
        Args: {
          account_type_param?: string
          company_id_param: string
          parent_account_id_param?: string
        }
        Returns: string
      }
      sync_document_expiry_alerts: { Args: never; Returns: number }
      system_health_check: { Args: never; Returns: Json }
      test_account_name_ambiguity_fix: { Args: never; Returns: string }
      test_ambiguity_fix: { Args: never; Returns: Json }
      transfer_user_to_company: {
        Args: {
          p_data_handling_strategy?: Json
          p_from_company_id: string
          p_new_roles: string[]
          p_to_company_id: string
          p_transfer_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      trigger_daily_report: { Args: never; Returns: undefined }
      trigger_weekly_report: { Args: never; Returns: undefined }
      update_account_balances_from_entries: { Args: never; Returns: undefined }
      update_account_levels_manually: {
        Args: { company_id_param: string }
        Returns: undefined
      }
      update_ai_performance_metrics: {
        Args: { company_id_param: string }
        Returns: undefined
      }
      update_all_company_budgets: {
        Args: { company_id_param: string }
        Returns: number
      }
      update_approval_request_status: {
        Args: { request_id_param: string }
        Returns: undefined
      }
      update_budget_actual_amounts: {
        Args: { budget_id_param: string }
        Returns: undefined
      }
      update_company_usage_stats: {
        Args: { company_id_param: string }
        Returns: undefined
      }
      update_contract_statuses: { Args: never; Returns: undefined }
      update_customer_aging_analysis: {
        Args: { company_id_param: string; customer_id_param: string }
        Returns: undefined
      }
      update_delinquent_customers: {
        Args: { p_company_id?: string }
        Returns: {
          added_count: number
          processed_count: number
          removed_count: number
          updated_count: number
        }[]
      }
      update_dispatch_permit_status: {
        Args: {
          change_reason?: string
          location?: string
          new_status: string
          odometer_reading?: number
          permit_id_param: string
        }
        Returns: undefined
      }
      update_installment_status: { Args: never; Returns: undefined }
      update_interaction_feedback: {
        Args: {
          p_accurate?: boolean
          p_comments?: string
          p_helpful?: boolean
          p_interaction_id: string
          p_rating?: number
          p_relevant?: boolean
        }
        Returns: boolean
      }
      update_job_status: {
        Args: {
          p_error?: string
          p_job_id: string
          p_progress?: number
          p_result?: Json
          p_status: string
        }
        Returns: undefined
      }
      update_payment_schedule_status: { Args: never; Returns: number }
      update_vehicle_installment_status: { Args: never; Returns: number }
      upsert_late_fine_settings: {
        Args: {
          p_company_id: string
          p_fine_rate: number
          p_fine_type: string
          p_grace_period_days: number
          p_is_active: boolean
          p_max_fine_amount: number
        }
        Returns: string
      }
      url_encode: { Args: { data: string }; Returns: string }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_company_id: { Args: never; Returns: string }
      user_has_access_to_company_fixed: {
        Args: { input_user_id: string; target_company_id: string }
        Returns: boolean
      }
      validate_account_for_transactions: {
        Args: { account_id_param: string }
        Returns: {
          account_level: number
          error_message: string
          error_message_ar: string
          is_header: boolean
          is_valid: boolean
        }[]
      }
      validate_account_hierarchy: {
        Args: never
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          issue_description: string
          issue_type: string
        }[]
      }
      validate_account_level_for_entries: {
        Args: { account_id_param: string }
        Returns: boolean
      }
      validate_account_structure_fixed: {
        Args: { company_id_param: string }
        Returns: {
          check_name: string
          count_value: number
          message: string
          status: string
        }[]
      }
      validate_chart_hierarchy: {
        Args: { company_id_param: string }
        Returns: Json
      }
      validate_company_access_secure: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      validate_contract_data: { Args: { contract_data: Json }; Returns: Json }
      validate_contract_data_fixed: {
        Args: { contract_data: Json }
        Returns: Json
      }
      validate_contract_exists: {
        Args: { contract_id_param: string }
        Returns: boolean
      }
      validate_contract_realtime: {
        Args: { contract_data: Json }
        Returns: Json
      }
      validate_customer_phone_numbers: {
        Args: never
        Returns: {
          customer_id: string
          customer_name: string
          issue: string
          phone_number: string
        }[]
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      validate_rls_policies: {
        Args: never
        Returns: {
          has_restrictive_policies: boolean
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      validate_user_input: {
        Args: { input_text: string; max_length?: number }
        Returns: boolean
      }
      validate_user_transfer: {
        Args: {
          p_from_company_id: string
          p_to_company_id: string
          p_user_id: string
        }
        Returns: Json
      }
      verify_account_deletion_integrity: {
        Args: { company_id_param: string }
        Returns: Json
      }
    }
    Enums: {
      approval_priority: "low" | "medium" | "high" | "urgent"
      approval_status: "pending" | "approved" | "rejected" | "cancelled"
      customer_type: "individual" | "corporate"
      insurance_status: "active" | "expired" | "cancelled" | "pending"
      maintenance_priority: "low" | "medium" | "high" | "urgent"
      maintenance_status: "pending" | "in_progress" | "completed" | "cancelled"
      payment_method:
        | "cash"
        | "check"
        | "bank_transfer"
        | "credit_card"
        | "debit_card"
      payment_status: "pending" | "completed" | "cancelled" | "failed"
      request_source:
        | "payroll"
        | "contract"
        | "payment"
        | "expense"
        | "purchase"
        | "leave_request"
        | "vehicle_maintenance"
        | "budget"
        | "other"
      transaction_type: "payment" | "receipt"
      user_role:
        | "super_admin"
        | "company_admin"
        | "manager"
        | "accountant"
        | "fleet_manager"
        | "sales_agent"
        | "employee"
      vehicle_status:
        | "available"
        | "rented"
        | "maintenance"
        | "out_of_service"
        | "reserved"
        | "accident"
        | "stolen"
        | "police_station"
        | "reserved_employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      approval_priority: ["low", "medium", "high", "urgent"],
      approval_status: ["pending", "approved", "rejected", "cancelled"],
      customer_type: ["individual", "corporate"],
      insurance_status: ["active", "expired", "cancelled", "pending"],
      maintenance_priority: ["low", "medium", "high", "urgent"],
      maintenance_status: ["pending", "in_progress", "completed", "cancelled"],
      payment_method: [
        "cash",
        "check",
        "bank_transfer",
        "credit_card",
        "debit_card",
      ],
      payment_status: ["pending", "completed", "cancelled", "failed"],
      request_source: [
        "payroll",
        "contract",
        "payment",
        "expense",
        "purchase",
        "leave_request",
        "vehicle_maintenance",
        "budget",
        "other",
      ],
      transaction_type: ["payment", "receipt"],
      user_role: [
        "super_admin",
        "company_admin",
        "manager",
        "accountant",
        "fleet_manager",
        "sales_agent",
        "employee",
      ],
      vehicle_status: [
        "available",
        "rented",
        "maintenance",
        "out_of_service",
        "reserved",
        "accident",
        "stolen",
        "police_station",
        "reserved_employee",
      ],
    },
  },
} as const

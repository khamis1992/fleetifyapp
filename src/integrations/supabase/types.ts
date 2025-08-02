export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
          company_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      chart_of_accounts: {
        Row: {
          account_code: string
          account_level: number | null
          account_name: string
          account_name_ar: string | null
          account_subtype: string | null
          account_type: string
          balance_type: string
          company_id: string
          created_at: string
          current_balance: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_header: boolean | null
          is_system: boolean | null
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
          company_id: string
          created_at?: string
          current_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_header?: boolean | null
          is_system?: boolean | null
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
          company_id?: string
          created_at?: string
          current_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_header?: boolean | null
          is_system?: boolean | null
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
        ]
      }
      companies: {
        Row: {
          address: string | null
          address_ar: string | null
          allowed_radius: number | null
          auto_checkout_enabled: boolean | null
          city: string | null
          commercial_register: string | null
          country: string | null
          created_at: string
          currency: string | null
          current_plan_id: string | null
          customer_account_settings: Json | null
          email: string | null
          id: string
          license_number: string | null
          logo_url: string | null
          name: string
          name_ar: string | null
          office_latitude: number | null
          office_longitude: number | null
          phone: string | null
          settings: Json | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          allowed_radius?: number | null
          auto_checkout_enabled?: boolean | null
          city?: string | null
          commercial_register?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          current_plan_id?: string | null
          customer_account_settings?: Json | null
          email?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name: string
          name_ar?: string | null
          office_latitude?: number | null
          office_longitude?: number | null
          phone?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          allowed_radius?: number | null
          auto_checkout_enabled?: boolean | null
          city?: string | null
          commercial_register?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          current_plan_id?: string | null
          customer_account_settings?: Json | null
          email?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name?: string
          name_ar?: string | null
          office_latitude?: number | null
          office_longitude?: number | null
          phone?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
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
        ]
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
      contract_templates: {
        Row: {
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
        Relationships: []
      }
      contracts: {
        Row: {
          account_id: string | null
          auto_renew_enabled: boolean | null
          company_id: string
          contract_amount: number
          contract_date: string
          contract_number: string
          contract_type: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          end_date: string
          expired_at: string | null
          id: string
          journal_entry_id: string | null
          last_payment_check_date: string | null
          last_renewal_check: string | null
          monthly_amount: number
          renewal_terms: Json | null
          start_date: string
          status: string
          suspension_reason: string | null
          terms: string | null
          updated_at: string
          vehicle_id: string | null
          vehicle_returned: boolean | null
        }
        Insert: {
          account_id?: string | null
          auto_renew_enabled?: boolean | null
          company_id: string
          contract_amount?: number
          contract_date: string
          contract_number: string
          contract_type?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          end_date: string
          expired_at?: string | null
          id?: string
          journal_entry_id?: string | null
          last_payment_check_date?: string | null
          last_renewal_check?: string | null
          monthly_amount?: number
          renewal_terms?: Json | null
          start_date: string
          status?: string
          suspension_reason?: string | null
          terms?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_returned?: boolean | null
        }
        Update: {
          account_id?: string | null
          auto_renew_enabled?: boolean | null
          company_id?: string
          contract_amount?: number
          contract_date?: string
          contract_number?: string
          contract_type?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          end_date?: string
          expired_at?: string | null
          id?: string
          journal_entry_id?: string | null
          last_payment_check_date?: string | null
          last_renewal_check?: string | null
          monthly_amount?: number
          renewal_terms?: Json | null
          start_date?: string
          status?: string
          suspension_reason?: string | null
          terms?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_returned?: boolean | null
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
            foreignKeyName: "contracts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
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
          manager_id?: string | null
          parent_center_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_accounts: {
        Row: {
          account_id: string
          company_id: string
          created_at: string
          customer_id: string
          id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      customers: {
        Row: {
          address: string | null
          address_ar: string | null
          alternative_phone: string | null
          blacklist_reason: string | null
          city: string | null
          company_id: string
          company_name: string | null
          company_name_ar: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
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
          notes: string | null
          passport_number: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          alternative_phone?: string | null
          blacklist_reason?: string | null
          city?: string | null
          company_id: string
          company_name?: string | null
          company_name_ar?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
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
          notes?: string | null
          passport_number?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          alternative_phone?: string | null
          blacklist_reason?: string | null
          city?: string | null
          company_id?: string
          company_name?: string | null
          company_name_ar?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
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
            foreignKeyName: "fixed_assets_depreciation_account_id_fkey"
            columns: ["depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
          journal_entry_id: string | null
          notes: string | null
          paid_amount: number | null
          payment_status: string
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
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string
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
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string
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
          reversal_entry_id: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: string
          total_credit: number
          total_debit: number
          updated_at: string
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
          reversal_entry_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
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
          reversal_entry_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
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
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
            foreignKeyName: "legal_case_account_mappings_consultation_revenue_account_i_fkey"
            columns: ["consultation_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
            foreignKeyName: "legal_case_account_mappings_expert_witness_expense_account_fkey"
            columns: ["expert_witness_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
            foreignKeyName: "legal_case_account_mappings_legal_fees_receivable_account__fkey"
            columns: ["legal_fees_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
            foreignKeyName: "legal_case_account_mappings_legal_research_expense_account_fkey"
            columns: ["legal_research_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
            foreignKeyName: "legal_case_account_mappings_settlements_payable_account_id_fkey"
            columns: ["settlements_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
          legal_fees: number | null
          legal_team: Json | null
          notes: string | null
          other_expenses: number | null
          primary_lawyer_id: string | null
          priority: string
          statute_limitations: string | null
          tags: Json | null
          total_costs: number | null
          updated_at: string
        }
        Insert: {
          billing_status?: string | null
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
          legal_fees?: number | null
          legal_team?: Json | null
          notes?: string | null
          other_expenses?: number | null
          primary_lawyer_id?: string | null
          priority?: string
          statute_limitations?: string | null
          tags?: Json | null
          total_costs?: number | null
          updated_at?: string
        }
        Update: {
          billing_status?: string | null
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
          legal_fees?: number | null
          legal_team?: Json | null
          notes?: string | null
          other_expenses?: number | null
          primary_lawyer_id?: string | null
          priority?: string
          statute_limitations?: string | null
          tags?: Json | null
          total_costs?: number | null
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
            foreignKeyName: "maintenance_account_mappings_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
      payments: {
        Row: {
          account_id: string | null
          amount: number
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
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          payment_status: string
          payment_type: string
          reference_number: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
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
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          payment_status?: string
          payment_type: string
          reference_number?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
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
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          payment_status?: string
          payment_type?: string
          reference_number?: string | null
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
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
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
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
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
          balance_due: number | null
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          due_date: string | null
          id: string
          journal_entry_id: string | null
          location: string | null
          paid_amount: number | null
          payment_status: string | null
          penalty_date: string
          penalty_number: string
          penalty_type: string
          reason: string
          reason_ar: string | null
          status: string
          updated_at: string
          vehicle_plate: string | null
          violation_type: string | null
        }
        Insert: {
          amount?: number
          balance_due?: number | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_date?: string | null
          id?: string
          journal_entry_id?: string | null
          location?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          penalty_date: string
          penalty_number: string
          penalty_type?: string
          reason: string
          reason_ar?: string | null
          status?: string
          updated_at?: string
          vehicle_plate?: string | null
          violation_type?: string | null
        }
        Update: {
          amount?: number
          balance_due?: number | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_date?: string | null
          id?: string
          journal_entry_id?: string | null
          location?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          penalty_date?: string
          penalty_number?: string
          penalty_type?: string
          reason?: string
          reason_ar?: string | null
          status?: string
          updated_at?: string
          vehicle_plate?: string | null
          violation_type?: string | null
        }
        Relationships: []
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
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
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
        Relationships: []
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
        Relationships: [
          {
            foreignKeyName: "traffic_violation_payments_traffic_violation_id_fkey"
            columns: ["traffic_violation_id"]
            isOneToOne: false
            referencedRelation: "penalties"
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
          created_at: string
          customer_signature: string | null
          damage_items: Json | null
          dispatch_permit_id: string
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
          created_at?: string
          customer_signature?: string | null
          damage_items?: Json | null
          dispatch_permit_id: string
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
          created_at?: string
          customer_signature?: string | null
          damage_items?: Json | null
          dispatch_permit_id?: string
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
        Relationships: []
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
          document_name: string
          document_number: string | null
          document_type: string
          document_url: string
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
          document_name: string
          document_number?: string | null
          document_type: string
          document_url: string
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
          document_name?: string
          document_number?: string | null
          document_type?: string
          document_url?: string
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
      vehicle_insurance: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          coverage_amount: number | null
          coverage_type: string
          created_at: string | null
          deductible_amount: number | null
          end_date: string
          id: string
          insurance_company: string
          is_active: boolean | null
          notes: string | null
          policy_document_url: string | null
          policy_number: string
          premium_amount: number
          start_date: string
          status: Database["public"]["Enums"]["insurance_status"] | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coverage_amount?: number | null
          coverage_type: string
          created_at?: string | null
          deductible_amount?: number | null
          end_date: string
          id?: string
          insurance_company: string
          is_active?: boolean | null
          notes?: string | null
          policy_document_url?: string | null
          policy_number: string
          premium_amount: number
          start_date: string
          status?: Database["public"]["Enums"]["insurance_status"] | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coverage_amount?: number | null
          coverage_type?: string
          created_at?: string | null
          deductible_amount?: number | null
          end_date?: string
          id?: string
          insurance_company?: string
          is_active?: boolean | null
          notes?: string | null
          policy_document_url?: string | null
          policy_number?: string
          premium_amount?: number
          start_date?: string
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
          manufacturer: string | null
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
          transmission: string | null
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
          manufacturer?: string | null
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
          transmission?: string | null
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
          manufacturer?: string | null
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
          transmission?: string | null
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
            foreignKeyName: "fk_vendor_accounts_vendor"
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
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          address_ar: string | null
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
        Relationships: []
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
    }
    Views: {
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
    }
    Functions: {
      analyze_system_performance: {
        Args: { company_id_param: string; hours_back?: number }
        Returns: Json
      }
      calculate_account_level: {
        Args: { account_id: string }
        Returns: number
      }
      calculate_customer_outstanding_balance: {
        Args: { customer_id_param: string; company_id_param: string }
        Returns: {
          current_balance: number
          overdue_amount: number
          days_overdue: number
          credit_available: number
        }[]
      }
      calculate_employee_salary: {
        Args: {
          employee_id_param: string
          period_start_param: string
          period_end_param: string
        }
        Returns: {
          basic_salary: number
          allowances: number
          overtime_amount: number
          total_earnings: number
          late_penalty: number
          total_deductions: number
          net_salary: number
          working_days: number
          present_days: number
          late_days: number
          absent_days: number
          overtime_hours: number
        }[]
      }
      calculate_financial_health_score: {
        Args: { company_id_param: string }
        Returns: {
          profitability_score: number
          liquidity_score: number
          efficiency_score: number
          solvency_score: number
          overall_score: number
        }[]
      }
      calculate_fuel_efficiency: {
        Args: {
          vehicle_id_param: string
          start_date?: string
          end_date?: string
        }
        Returns: {
          total_fuel_liters: number
          total_distance_km: number
          fuel_efficiency_km_per_liter: number
          average_cost_per_liter: number
          total_fuel_cost: number
        }[]
      }
      calculate_vehicle_total_costs: {
        Args: { vehicle_id_param: string }
        Returns: undefined
      }
      check_and_fix_user_data_integrity: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
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
          is_overdue: boolean
          overdue_amount: number
          days_overdue: number
          last_payment_date: string
        }[]
      }
      check_customer_credit_status: {
        Args: { customer_id_param: string; company_id_param: string }
        Returns: {
          credit_score: number
          risk_level: string
          credit_available: number
          payment_history_score: number
          can_extend_credit: boolean
        }[]
      }
      check_customer_eligibility_realtime: {
        Args: { customer_id_param: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          operation_type: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_session_timeout: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_vehicle_availability_fixed: {
        Args: {
          vehicle_id_param: string
          start_date_param: string
          end_date_param: string
          exclude_contract_id_param?: string
        }
        Returns: Json
      }
      check_vehicle_availability_realtime: {
        Args: {
          vehicle_id_param: string
          start_date_param: string
          end_date_param: string
          exclude_contract_id_param?: string
        }
        Returns: Json
      }
      cleanup_contract_issues: {
        Args: { company_id_param: string }
        Returns: Json
      }
      cleanup_inactive_accounts: {
        Args: { target_company_id: string; days_old?: number }
        Returns: number
      }
      cleanup_old_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_orphaned_contract_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
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
        Args: { permit_id_param: string; inspection_type_param?: string }
        Returns: string
      }
      create_contract_cancellation_journal_entry: {
        Args: {
          contract_id_param: string
          cancellation_date_param: string
          cancellation_reason?: string
        }
        Returns: string
      }
      create_contract_invoice: {
        Args: { contract_id_param: string; invoice_period?: string }
        Returns: string
      }
      create_contract_journal_entry_enhanced: {
        Args: {
          contract_id_param: string
          user_id_param?: string
          entry_type_param?: string
          amount_param?: number
        }
        Returns: Json
      }
      create_contract_journal_entry_safe: {
        Args: { contract_id_param: string }
        Returns: string
      }
      create_contract_safe: {
        Args: { contract_data: Json; user_id_param?: string }
        Returns: Json
      }
      create_customer_financial_account_enhanced: {
        Args: { customer_id_param: string; user_id_param?: string }
        Returns: Json
      }
      create_customer_financial_account_fixed: {
        Args: { customer_id_param: string; company_id_param: string }
        Returns: string
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
          period_start_date: string
          period_end_date: string
          monthly_amount_param: number
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
          invoice_id_param: string
          discount_amount_param: number
          discount_reason?: string
        }
        Returns: string
      }
      create_invoice_journal_entry: {
        Args: { invoice_id_param: string }
        Returns: string
      }
      create_maintenance_expense_entry: {
        Args: { maintenance_id_param: string; company_id_param: string }
        Returns: string
      }
      create_maintenance_journal_entry: {
        Args: { maintenance_id_param: string }
        Returns: string
      }
      create_payment_bank_transaction: {
        Args: { payment_id_param: string }
        Returns: string
      }
      create_payment_journal_entry_enhanced: {
        Args: { payment_id_param: string; user_id_param?: string }
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
      create_system_alert: {
        Args: {
          company_id_param: string
          alert_type_param: string
          severity_param: string
          title_param: string
          message_param: string
          details_param?: Json
          expires_hours?: number
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
      create_vehicle_purchase_journal_entry: {
        Args: { vehicle_id_param: string }
        Returns: string
      }
      create_vendor_financial_account: {
        Args: {
          vendor_id_param: string
          company_id_param: string
          vendor_data?: Json
        }
        Returns: string
      }
      decrypt_sensitive_data: {
        Args: { encrypted_data: string }
        Returns: string
      }
      encrypt_sensitive_data: {
        Args: { data: string }
        Returns: string
      }
      ensure_essential_account_mappings: {
        Args: { company_id_param: string }
        Returns: Json
      }
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
          company_id_param: string
          search_name: string
          account_type_param?: string
        }
        Returns: string
      }
      find_cash_account_fixed: {
        Args: { company_id_param: string }
        Returns: string
      }
      find_receivable_account_fixed: {
        Args: { company_id_param: string }
        Returns: string
      }
      find_revenue_account_fixed: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_approval_request_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_cash_flow_analysis: {
        Args: {
          company_id_param: string
          start_date_param?: string
          end_date_param?: string
        }
        Returns: {
          total_inflow: number
          total_outflow: number
          net_cash_flow: number
          operating_cash_flow: number
          investing_cash_flow: number
          financing_cash_flow: number
        }[]
      }
      generate_contract_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_contracts_report: {
        Args: {
          company_id_param: string
          start_date_param?: string
          end_date_param?: string
          status_filter?: string
        }
        Returns: {
          contract_id: string
          contract_number: string
          customer_name: string
          contract_type: string
          contract_amount: number
          monthly_amount: number
          start_date: string
          end_date: string
          status: string
          days_remaining: number
          total_invoiced: number
          total_paid: number
          outstanding_amount: number
        }[]
      }
      generate_customer_statement_data: {
        Args: {
          customer_id_param: string
          company_id_param: string
          start_date_param?: string
          end_date_param?: string
        }
        Returns: {
          statement_period: string
          opening_balance: number
          total_charges: number
          total_payments: number
          closing_balance: number
          transaction_count: number
          overdue_amount: number
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
      generate_journal_entry_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_legal_case_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_maintenance_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_monthly_trends: {
        Args: { company_id_param: string; months_back?: number }
        Returns: {
          month_year: string
          total_revenue: number
          total_expenses: number
          net_profit: number
          profit_margin: number
        }[]
      }
      generate_payment_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_purchase_order_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_secure_password: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_traffic_payment_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_vehicle_alerts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_vendor_payment_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      get_account_balances: {
        Args: {
          company_id_param: string
          as_of_date?: string
          account_type_filter?: string
        }
        Returns: {
          account_id: string
          account_code: string
          account_name: string
          account_name_ar: string
          account_type: string
          balance_type: string
          opening_balance: number
          total_debits: number
          total_credits: number
          closing_balance: number
        }[]
      }
      get_account_by_type: {
        Args: { company_id_param: string; account_type_code: string }
        Returns: string
      }
      get_accounts_by_type_fixed: {
        Args: { company_id_param: string; account_type_param: string }
        Returns: {
          id: string
          account_code: string
          account_name: string
          account_name_ar: string
          current_balance: number
          is_header: boolean
        }[]
      }
      get_available_customer_accounts: {
        Args: { company_id_param: string }
        Returns: {
          id: string
          account_code: string
          account_name: string
          account_name_ar: string
          parent_account_name: string
          is_available: boolean
        }[]
      }
      get_available_vehicles_for_contracts: {
        Args: { company_id_param: string }
        Returns: {
          id: string
          plate_number: string
          make: string
          model: string
          year: number
          status: string
          daily_rate: number
          weekly_rate: number
          monthly_rate: number
        }[]
      }
      get_contract_operations_history: {
        Args: { contract_id_param: string }
        Returns: {
          operation_id: string
          operation_type: string
          operation_details: Json
          performed_by_name: string
          performed_at: string
          notes: string
        }[]
      }
      get_contracts_pending_approval: {
        Args: { company_id_param: string }
        Returns: {
          contract_id: string
          contract_number: string
          contract_amount: number
          customer_name: string
          created_at: string
          pending_steps: number
        }[]
      }
      get_cost_center_analysis: {
        Args: { company_id_param: string; date_from?: string; date_to?: string }
        Returns: {
          cost_center_id: string
          center_code: string
          center_name: string
          center_name_ar: string
          total_debits: number
          total_credits: number
          net_amount: number
          entry_count: number
        }[]
      }
      get_customer_default_cost_center: {
        Args: { customer_id_param: string }
        Returns: string
      }
      get_eligible_contracts_for_renewal: {
        Args: { company_id_param: string }
        Returns: {
          contract_id: string
          contract_number: string
          customer_name: string
          vehicle_info: string
          end_date: string
          contract_amount: number
          total_paid: number
          outstanding_amount: number
          days_since_expiry: number
        }[]
      }
      get_entry_allowed_accounts: {
        Args: { company_id_param: string }
        Returns: {
          id: string
          account_code: string
          account_name: string
          account_name_ar: string
          account_type: string
          account_level: number
          balance_type: string
          parent_account_name: string
        }[]
      }
      get_financial_summary: {
        Args: { company_id_param: string; date_from?: string; date_to?: string }
        Returns: {
          total_assets: number
          total_liabilities: number
          total_equity: number
          total_revenue: number
          total_expenses: number
          net_income: number
          unbalanced_entries_count: number
        }[]
      }
      get_inconsistent_accounts: {
        Args: Record<PropertyKey, never>
        Returns: {
          employee_id: string
          employee_email: string
          user_id: string
          has_system_access: boolean
          employee_company_id: string
          profile_company_id: string
          role_count: number
        }[]
      }
      get_legal_account_mapping: {
        Args: {
          company_id_param: string
          case_type_param: string
          account_type_param: string
        }
        Returns: string
      }
      get_maintenance_cost_center: {
        Args: { company_id_param: string }
        Returns: string
      }
      get_mapped_account_enhanced: {
        Args: { company_id_param: string; account_type_code_param: string }
        Returns: string
      }
      get_mapped_account_id: {
        Args: { company_id_param: string; account_type_code: string }
        Returns: string
      }
      get_payment_analytics: {
        Args: {
          company_id_param: string
          start_date_param?: string
          end_date_param?: string
        }
        Returns: {
          total_receipts: number
          total_payments: number
          net_cash_flow: number
          by_cost_center: Json
          by_payment_type: Json
          by_bank: Json
        }[]
      }
      get_reporting_accounts: {
        Args: { company_id_param: string }
        Returns: {
          id: string
          account_code: string
          account_name: string
          account_name_ar: string
          account_type: string
          account_level: number
          balance_type: string
          parent_account_name: string
        }[]
      }
      get_trial_balance: {
        Args: { company_id_param: string; as_of_date?: string }
        Returns: {
          account_id: string
          account_code: string
          account_name: string
          account_name_ar: string
          account_type: string
          account_level: number
          debit_balance: number
          credit_balance: number
        }[]
      }
      get_user_company: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_company_fixed: {
        Args: { input_user_id: string }
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
      handle_incomplete_user_account: {
        Args: {
          p_user_id: string
          p_employee_id: string
          p_company_id: string
          p_roles: string[]
        }
        Returns: Json
      }
      has_feature_access: {
        Args: { company_id_param: string; feature_code_param: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      has_role_cached: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      has_role_secure: {
        Args: {
          user_id_param: string
          role_name: Database["public"]["Enums"]["user_role"]
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
      log_contract_creation_step: {
        Args: {
          company_id_param: string
          contract_id_param: string
          step_name: string
          status_param: string
          attempt_num?: number
          error_msg?: string
          exec_time?: number
          meta?: Json
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          event_type: string
          resource_type: string
          resource_id?: string
          details?: Json
        }
        Returns: undefined
      }
      log_suspicious_access: {
        Args: {
          _user_id: string
          _table_name: string
          _company_id: string
          _access_type: string
        }
        Returns: undefined
      }
      log_system_event: {
        Args: {
          company_id_param: string
          user_id_param: string
          level_param: string
          category_param: string
          action_param: string
          message_param: string
          metadata_param?: Json
          resource_type_param?: string
          resource_id_param?: string
        }
        Returns: string
      }
      log_user_account_action: {
        Args: {
          employee_id_param: string
          action_type_param: string
          performed_by_param: string
          details_param?: Json
          old_values_param?: Json
          new_values_param?: Json
        }
        Returns: undefined
      }
      monitor_contract_health: {
        Args: { company_id_param: string }
        Returns: {
          contract_id: string
          issue_type: string
          issue_description: string
          severity: string
          recommended_action: string
        }[]
      }
      monitor_user_data_quality: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          count_found: number
          description: string
        }[]
      }
      prepare_company_backup: {
        Args: { company_id_param: string; backup_type_param?: string }
        Returns: string
      }
      process_failed_journal_entries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_monthly_depreciation: {
        Args: { company_id_param: string; depreciation_date_param?: string }
        Returns: number
      }
      process_pending_journal_entries: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_vehicle_depreciation: {
        Args: { company_id_param: string; depreciation_date_param?: string }
        Returns: number
      }
      process_vehicle_depreciation_monthly: {
        Args: { company_id_param: string; depreciation_date_param?: string }
        Returns: {
          vehicle_id: string
          vehicle_number: string
          monthly_depreciation: number
          accumulated_depreciation: number
          journal_entry_id: string
        }[]
      }
      recalculate_bank_balance: {
        Args: { bank_id_param: string }
        Returns: number
      }
      record_performance_metric: {
        Args: {
          company_id_param: string
          metric_name_param: string
          metric_value_param: number
          metric_unit_param?: string
          tags_param?: Json
        }
        Returns: string
      }
      refresh_company_stats_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      scheduled_contract_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      search_accounts_fixed: {
        Args: {
          company_id_param: string
          search_term?: string
          account_type_filter?: string
        }
        Returns: {
          id: string
          account_code: string
          account_name: string
          account_type: string
          current_balance: number
          is_active: boolean
        }[]
      }
      search_contracts_fixed: {
        Args: {
          search_company_id: string
          search_term?: string
          status_filter?: string
          customer_filter?: string
          vehicle_filter?: string
          limit_param?: number
          offset_param?: number
        }
        Returns: {
          id: string
          contract_number: string
          customer_name: string
          vehicle_plate: string
          contract_amount: number
          status: string
          start_date: string
          end_date: string
          created_at: string
        }[]
      }
      soft_delete_account: {
        Args: { account_id_param: string }
        Returns: boolean
      }
      system_health_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_account_name_ambiguity_fix: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_ambiguity_fix: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_account_balances_from_entries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_account_levels_manually: {
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
      update_contract_statuses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_customer_aging_analysis: {
        Args: { customer_id_param: string; company_id_param: string }
        Returns: undefined
      }
      update_dispatch_permit_status: {
        Args: {
          permit_id_param: string
          new_status: string
          change_reason?: string
          location?: string
          odometer_reading?: number
        }
        Returns: undefined
      }
      user_belongs_to_company: {
        Args: { _user_id: string; _company_id: string }
        Returns: boolean
      }
      user_has_access_to_company_fixed: {
        Args: { input_user_id: string; target_company_id: string }
        Returns: boolean
      }
      validate_account_for_transactions: {
        Args: { account_id_param: string }
        Returns: {
          is_valid: boolean
          error_message: string
          error_message_ar: string
          account_level: number
          is_header: boolean
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
          status: string
          message: string
          count_value: number
        }[]
      }
      validate_company_access_secure: {
        Args: { _user_id: string; _company_id: string }
        Returns: boolean
      }
      validate_contract_data: {
        Args: { contract_data: Json }
        Returns: Json
      }
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
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      validate_user_input: {
        Args: { input_text: string; max_length?: number }
        Returns: boolean
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
      ],
    },
  },
} as const

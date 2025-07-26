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
        Relationships: []
      }
      contracts: {
        Row: {
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
          id: string
          journal_entry_id: string | null
          monthly_amount: number
          start_date: string
          status: string
          terms: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
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
          id?: string
          journal_entry_id?: string | null
          monthly_amount?: number
          start_date: string
          status?: string
          terms?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
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
          id?: string
          journal_entry_id?: string | null
          monthly_amount?: number
          start_date?: string
          status?: string
          terms?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
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
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          parent_center_id?: string | null
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
          credit_limit: number | null
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          date_of_birth: string | null
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
          credit_limit?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          date_of_birth?: string | null
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
          credit_limit?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          date_of_birth?: string | null
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
        ]
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
          cost_center_id: string | null
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          id: string
          journal_entry_id: string
          line_description: string | null
          line_number: number
        }
        Insert: {
          account_id: string
          cost_center_id?: string | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          journal_entry_id: string
          line_description?: string | null
          line_number: number
        }
        Update: {
          account_id?: string
          cost_center_id?: string | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          journal_entry_id?: string
          line_description?: string | null
          line_number?: number
        }
        Relationships: [
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
      payments: {
        Row: {
          amount: number
          bank_account: string | null
          bank_id: string | null
          check_number: string | null
          company_id: string
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
          payment_type: string
          reference_number: string | null
          status: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          bank_account?: string | null
          bank_id?: string | null
          check_number?: string | null
          company_id: string
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
          payment_type: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string | null
          bank_id?: string | null
          check_number?: string | null
          company_id?: string
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
          payment_type?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
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
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          maintenance_number: string
          maintenance_type: string
          mileage_at_service: number | null
          notes: string | null
          parts_replaced: string[] | null
          priority: Database["public"]["Enums"]["maintenance_priority"] | null
          scheduled_date: string | null
          service_provider: string | null
          service_provider_contact: string | null
          started_date: string | null
          status: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at: string | null
          vehicle_id: string
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
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          maintenance_number: string
          maintenance_type: string
          mileage_at_service?: number | null
          notes?: string | null
          parts_replaced?: string[] | null
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          scheduled_date?: string | null
          service_provider?: string | null
          service_provider_contact?: string | null
          started_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at?: string | null
          vehicle_id: string
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
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          maintenance_number?: string
          maintenance_type?: string
          mileage_at_service?: number | null
          notes?: string | null
          parts_replaced?: string[] | null
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          scheduled_date?: string | null
          service_provider?: string | null
          service_provider_contact?: string | null
          started_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at?: string | null
          vehicle_id?: string
          warranty_until?: string | null
        }
        Relationships: []
      }
      vehicle_pricing: {
        Row: {
          annual_rate: number
          annual_rate_max: number | null
          annual_rate_min: number | null
          created_at: string | null
          currency: string | null
          daily_rate: number
          daily_rate_max: number | null
          daily_rate_min: number | null
          effective_from: string | null
          effective_to: string | null
          extra_km_charge: number | null
          id: string
          included_km_annual: number | null
          included_km_daily: number | null
          included_km_monthly: number | null
          included_km_weekly: number | null
          is_active: boolean | null
          monthly_rate: number
          monthly_rate_max: number | null
          monthly_rate_min: number | null
          security_deposit: number | null
          updated_at: string | null
          vehicle_id: string
          weekly_rate: number
          weekly_rate_max: number | null
          weekly_rate_min: number | null
        }
        Insert: {
          annual_rate?: number
          annual_rate_max?: number | null
          annual_rate_min?: number | null
          created_at?: string | null
          currency?: string | null
          daily_rate?: number
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          effective_from?: string | null
          effective_to?: string | null
          extra_km_charge?: number | null
          id?: string
          included_km_annual?: number | null
          included_km_daily?: number | null
          included_km_monthly?: number | null
          included_km_weekly?: number | null
          is_active?: boolean | null
          monthly_rate?: number
          monthly_rate_max?: number | null
          monthly_rate_min?: number | null
          security_deposit?: number | null
          updated_at?: string | null
          vehicle_id: string
          weekly_rate?: number
          weekly_rate_max?: number | null
          weekly_rate_min?: number | null
        }
        Update: {
          annual_rate?: number
          annual_rate_max?: number | null
          annual_rate_min?: number | null
          created_at?: string | null
          currency?: string | null
          daily_rate?: number
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          effective_from?: string | null
          effective_to?: string | null
          extra_km_charge?: number | null
          id?: string
          included_km_annual?: number | null
          included_km_daily?: number | null
          included_km_monthly?: number | null
          included_km_weekly?: number | null
          is_active?: boolean | null
          monthly_rate?: number
          monthly_rate_max?: number | null
          monthly_rate_min?: number | null
          security_deposit?: number | null
          updated_at?: string | null
          vehicle_id?: string
          weekly_rate?: number
          weekly_rate_max?: number | null
          weekly_rate_min?: number | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          accumulated_depreciation: number | null
          annual_depreciation_rate: number | null
          body_type: string | null
          book_value: number | null
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
          engine_number: string | null
          features: Json | null
          fixed_asset_id: string | null
          fuel_level: number | null
          fuel_type: string | null
          id: string
          images: Json | null
          insurance_expiry: string | null
          insurance_policy: string | null
          is_active: boolean | null
          last_maintenance_date: string | null
          last_service_mileage: number | null
          license_expiry: string | null
          location: string | null
          make: string
          model: string
          monthly_rate: number | null
          next_service_mileage: number | null
          notes: string | null
          odometer_reading: number | null
          plate_number: string
          purchase_cost: number | null
          purchase_date: string | null
          registration_number: string | null
          residual_value: number | null
          seating_capacity: number | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          transmission: string | null
          updated_at: string
          useful_life_years: number | null
          vin: string | null
          vin_number: string | null
          weekly_rate: number | null
          year: number
        }
        Insert: {
          accumulated_depreciation?: number | null
          annual_depreciation_rate?: number | null
          body_type?: string | null
          book_value?: number | null
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
          engine_number?: string | null
          features?: Json | null
          fixed_asset_id?: string | null
          fuel_level?: number | null
          fuel_type?: string | null
          id?: string
          images?: Json | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          is_active?: boolean | null
          last_maintenance_date?: string | null
          last_service_mileage?: number | null
          license_expiry?: string | null
          location?: string | null
          make: string
          model: string
          monthly_rate?: number | null
          next_service_mileage?: number | null
          notes?: string | null
          odometer_reading?: number | null
          plate_number: string
          purchase_cost?: number | null
          purchase_date?: string | null
          registration_number?: string | null
          residual_value?: number | null
          seating_capacity?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          transmission?: string | null
          updated_at?: string
          useful_life_years?: number | null
          vin?: string | null
          vin_number?: string | null
          weekly_rate?: number | null
          year: number
        }
        Update: {
          accumulated_depreciation?: number | null
          annual_depreciation_rate?: number | null
          body_type?: string | null
          book_value?: number | null
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
          engine_number?: string | null
          features?: Json | null
          fixed_asset_id?: string | null
          fuel_level?: number | null
          fuel_type?: string | null
          id?: string
          images?: Json | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          is_active?: boolean | null
          last_maintenance_date?: string | null
          last_service_mileage?: number | null
          license_expiry?: string | null
          location?: string | null
          make?: string
          model?: string
          monthly_rate?: number | null
          next_service_mileage?: number | null
          notes?: string | null
          odometer_reading?: number | null
          plate_number?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          registration_number?: string | null
          residual_value?: number | null
          seating_capacity?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          transmission?: string | null
          updated_at?: string
          useful_life_years?: number | null
          vin?: string | null
          vin_number?: string | null
          weekly_rate?: number | null
          year?: number
        }
        Relationships: [
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
    }
    Views: {
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
      calculate_account_level: {
        Args: { account_id: string }
        Returns: number
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
      check_budget_overruns: {
        Args: { budget_id_param: string }
        Returns: number
      }
      copy_default_accounts_to_company: {
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
      create_contract_cancellation_journal_entry: {
        Args: {
          contract_id_param: string
          cancellation_date_param: string
          cancellation_reason?: string
        }
        Returns: string
      }
      create_contract_journal_entry: {
        Args: { contract_id_param: string }
        Returns: string
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
      create_maintenance_journal_entry: {
        Args: { maintenance_id_param: string }
        Returns: string
      }
      create_payment_bank_transaction: {
        Args: { payment_id_param: string }
        Returns: string
      }
      create_payment_journal_entry: {
        Args: { payment_id_param: string }
        Returns: string
      }
      create_payroll_journal_entry: {
        Args: { payroll_id_param: string }
        Returns: string
      }
      create_penalty_journal_entry: {
        Args: { penalty_id_param: string }
        Returns: string
      }
      export_ledger_data: {
        Args: {
          company_id_param: string
          export_format?: string
          filters?: Json
        }
        Returns: string
      }
      generate_employee_account_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_journal_entry_number: {
        Args: { company_id_param: string }
        Returns: string
      }
      generate_maintenance_number: {
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
      get_maintenance_cost_center: {
        Args: { company_id_param: string }
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
          by_payment_method: Json
          by_bank: Json
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
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      initialize_employee_leave_balances: {
        Args: { employee_id_param: string }
        Returns: undefined
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
      process_monthly_depreciation: {
        Args: { company_id_param: string; depreciation_date_param?: string }
        Returns: number
      }
      process_vehicle_depreciation: {
        Args: { company_id_param: string; depreciation_date_param?: string }
        Returns: number
      }
      reverse_journal_entry: {
        Args: {
          entry_id: string
          reversal_reason: string
          reversed_by_user: string
        }
        Returns: string
      }
      update_account_levels_manually: {
        Args: { company_id_param: string }
        Returns: undefined
      }
      update_all_company_budgets: {
        Args: { company_id_param: string }
        Returns: number
      }
      update_budget_actual_amounts: {
        Args: { budget_id_param: string }
        Returns: undefined
      }
      user_belongs_to_company: {
        Args: { _user_id: string; _company_id: string }
        Returns: boolean
      }
    }
    Enums: {
      customer_type: "individual" | "corporate"
      insurance_status: "active" | "expired" | "cancelled" | "pending"
      maintenance_priority: "low" | "medium" | "high" | "urgent"
      maintenance_status: "pending" | "in_progress" | "completed" | "cancelled"
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
      customer_type: ["individual", "corporate"],
      insurance_status: ["active", "expired", "cancelled", "pending"],
      maintenance_priority: ["low", "medium", "high", "urgent"],
      maintenance_status: ["pending", "in_progress", "completed", "cancelled"],
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

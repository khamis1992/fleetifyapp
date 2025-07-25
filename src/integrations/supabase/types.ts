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
      companies: {
        Row: {
          address: string | null
          address_ar: string | null
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
          phone: string | null
          settings: Json | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
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
          phone?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_ar?: string | null
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
          phone?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
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
      vehicles: {
        Row: {
          category_id: string | null
          color: string | null
          color_ar: string | null
          company_id: string
          created_at: string
          daily_rate: number | null
          deposit_amount: number | null
          features: Json | null
          fuel_level: number | null
          id: string
          images: Json | null
          insurance_expiry: string | null
          insurance_policy: string | null
          is_active: boolean | null
          license_expiry: string | null
          location: string | null
          make: string
          model: string
          monthly_rate: number | null
          notes: string | null
          odometer_reading: number | null
          plate_number: string
          registration_number: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at: string
          vin_number: string | null
          weekly_rate: number | null
          year: number
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          color_ar?: string | null
          company_id: string
          created_at?: string
          daily_rate?: number | null
          deposit_amount?: number | null
          features?: Json | null
          fuel_level?: number | null
          id?: string
          images?: Json | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          is_active?: boolean | null
          license_expiry?: string | null
          location?: string | null
          make: string
          model: string
          monthly_rate?: number | null
          notes?: string | null
          odometer_reading?: number | null
          plate_number: string
          registration_number?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string
          vin_number?: string | null
          weekly_rate?: number | null
          year: number
        }
        Update: {
          category_id?: string | null
          color?: string | null
          color_ar?: string | null
          company_id?: string
          created_at?: string
          daily_rate?: number | null
          deposit_amount?: number | null
          features?: Json | null
          fuel_level?: number | null
          id?: string
          images?: Json | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          is_active?: boolean | null
          license_expiry?: string | null
          location?: string | null
          make?: string
          model?: string
          monthly_rate?: number | null
          notes?: string | null
          odometer_reading?: number | null
          plate_number?: string
          registration_number?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      user_belongs_to_company: {
        Args: { _user_id: string; _company_id: string }
        Returns: boolean
      }
    }
    Enums: {
      customer_type: "individual" | "corporate"
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

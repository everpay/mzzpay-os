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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          available_balance: number
          balance: number
          created_at: string
          currency: string
          id: string
          merchant_id: string
          pending_balance: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          balance?: number
          created_at?: string
          currency: string
          id?: string
          merchant_id: string
          pending_balance?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          merchant_id?: string
          pending_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      card_velocity: {
        Row: {
          card_last4: string | null
          created_at: string
          customer_identifier: string
          id: string
          merchant_id: string
          provider: string
          transaction_count: number
          transaction_date: string
        }
        Insert: {
          card_last4?: string | null
          created_at?: string
          customer_identifier: string
          id?: string
          merchant_id: string
          provider: string
          transaction_count?: number
          transaction_date?: string
        }
        Update: {
          card_last4?: string | null
          created_at?: string
          customer_identifier?: string
          id?: string
          merchant_id?: string
          provider?: string
          transaction_count?: number
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_velocity_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address: Json | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          merchant_id: string
          updated_at: string
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          merchant_id: string
          updated_at?: string
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          merchant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount: number
          chargeflow_id: string | null
          chargeflow_payload: Json | null
          created_at: string
          currency: string
          customer_email: string | null
          description: string | null
          evidence_due_date: string | null
          id: string
          merchant_id: string
          outcome: string | null
          provider: string | null
          reason: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          chargeflow_id?: string | null
          chargeflow_payload?: Json | null
          created_at?: string
          currency: string
          customer_email?: string | null
          description?: string | null
          evidence_due_date?: string | null
          id?: string
          merchant_id: string
          outcome?: string | null
          provider?: string | null
          reason?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          chargeflow_id?: string | null
          chargeflow_payload?: Json | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          description?: string | null
          evidence_due_date?: string | null
          id?: string
          merchant_id?: string
          outcome?: string | null
          provider?: string | null
          reason?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key: string
          merchant_id: string
          response: Json | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          key: string
          merchant_id: string
          response?: Json | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key?: string
          merchant_id?: string
          response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_id: string | null
          customer_name: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          items: Json | null
          merchant_id: string
          notes: string | null
          paid_at: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email: string
          customer_id?: string | null
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json | null
          merchant_id: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json | null
          merchant_id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          entry_type: string
          id: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency: string
          entry_type: string
          id?: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          entry_type?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          api_key_hash: string | null
          business_currency: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          name: string
          phone_number: string | null
          updated_at: string
          user_id: string
          webhook_url: string | null
          website_urls: string[] | null
        }
        Insert: {
          api_key_hash?: string | null
          business_currency?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name: string
          phone_number?: string | null
          updated_at?: string
          user_id: string
          webhook_url?: string | null
          website_urls?: string[] | null
        }
        Update: {
          api_key_hash?: string | null
          business_currency?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
          website_urls?: string[] | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_last4: string | null
          created_at: string
          customer_id: string
          exp_month: string | null
          exp_year: string | null
          id: string
          is_default: boolean
          updated_at: string
          vgs_alias: string
        }
        Insert: {
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          customer_id: string
          exp_month?: string | null
          exp_year?: string | null
          id?: string
          is_default?: boolean
          updated_at?: string
          vgs_alias: string
        }
        Update: {
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          customer_id?: string
          exp_month?: string | null
          exp_year?: string | null
          id?: string
          is_default?: boolean
          updated_at?: string
          vgs_alias?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_markup: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          markup_flat: number
          markup_flat_currency: string
          markup_percent: number
          rail: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          markup_flat?: number
          markup_flat_currency?: string
          markup_percent?: number
          rail: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          markup_flat?: number
          markup_flat_currency?: string
          markup_percent?: number
          rail?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          merchant_id: string
          payload: Json
          provider: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          merchant_id: string
          payload?: Json
          provider: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          merchant_id?: string
          payload?: Json
          provider?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_fees: {
        Row: {
          created_at: string
          description: string | null
          fee_type: string
          flat_fee: number | null
          flat_fee_currency: string | null
          id: string
          is_active: boolean
          provider: string
          rail: string | null
          rate_percent: number | null
          region: string
          updated_at: string
          volume_tier: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          fee_type: string
          flat_fee?: number | null
          flat_fee_currency?: string | null
          id?: string
          is_active?: boolean
          provider: string
          rail?: string | null
          rate_percent?: number | null
          region?: string
          updated_at?: string
          volume_tier?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          fee_type?: string
          flat_fee?: number | null
          flat_fee_currency?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          rail?: string | null
          rate_percent?: number | null
          region?: string
          updated_at?: string
          volume_tier?: string | null
        }
        Relationships: []
      }
      rolling_reserves: {
        Row: {
          amount: number
          created_at: string
          currency: string
          held_at: string
          id: string
          merchant_id: string
          release_at: string
          released_at: string | null
          reserve_percent: number
          status: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          held_at?: string
          id?: string
          merchant_id: string
          release_at?: string
          released_at?: string | null
          reserve_percent?: number
          status?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          held_at?: string
          id?: string
          merchant_id?: string
          release_at?: string
          released_at?: string | null
          reserve_percent?: number
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rolling_reserves_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rolling_reserves_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_bank_accounts: {
        Row: {
          account_holder_name: string
          account_last4: string
          created_at: string
          currency: string
          id: string
          institution_number: string
          is_default: boolean
          merchant_id: string
          nickname: string | null
          transit_number: string
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_last4: string
          created_at?: string
          currency?: string
          id?: string
          institution_number: string
          is_default?: boolean
          merchant_id: string
          nickname?: string | null
          transit_number: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_last4?: string
          created_at?: string
          currency?: string
          id?: string
          institution_number?: string
          is_default?: boolean
          merchant_id?: string
          nickname?: string | null
          transit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_bank_accounts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          interval: string
          interval_count: number
          merchant_id: string
          name: string
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          description?: string | null
          id?: string
          interval: string
          interval_count?: number
          merchant_id: string
          name: string
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          interval?: string
          interval_count?: number
          merchant_id?: string
          name?: string
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          customer_id: string
          id: string
          payment_method_id: string
          plan_id: string
          status: string
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          customer_id: string
          id?: string
          payment_method_id: string
          plan_id: string
          status?: string
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          customer_id?: string
          id?: string
          payment_method_id?: string
          plan_id?: string
          status?: string
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      surcharge_audit_logs: {
        Row: {
          changed_by: string
          created_at: string | null
          id: string
          merchant_id: string
          new_settings: Json | null
          old_settings: Json | null
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          id?: string
          merchant_id: string
          new_settings?: Json | null
          old_settings?: Json | null
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          id?: string
          merchant_id?: string
          new_settings?: Json | null
          old_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "surcharge_audit_logs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      surcharge_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          fixed_fee: number | null
          id: string
          max_fee_cap: number | null
          merchant_id: string
          percentage_fee: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          fixed_fee?: number | null
          id?: string
          max_fee_cap?: number | null
          merchant_id: string
          percentage_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          fixed_fee?: number | null
          id?: string
          max_fee_cap?: number | null
          merchant_id?: string
          percentage_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surcharge_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          description: string | null
          fx_rate: number | null
          id: string
          idempotency_key: string | null
          merchant_id: string
          provider: string
          provider_ref: string | null
          settlement_amount: number | null
          settlement_currency: string | null
          status: string
          surcharge_amount: number
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          customer_email?: string | null
          description?: string | null
          fx_rate?: number | null
          id?: string
          idempotency_key?: string | null
          merchant_id: string
          provider: string
          provider_ref?: string | null
          settlement_amount?: number | null
          settlement_currency?: string | null
          status?: string
          surcharge_amount?: number
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          description?: string | null
          fx_rate?: number | null
          id?: string
          idempotency_key?: string | null
          merchant_id?: string
          provider?: string
          provider_ref?: string | null
          settlement_amount?: number | null
          settlement_currency?: string | null
          status?: string
          surcharge_amount?: number
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "reseller"
        | "developer"
        | "compliance_officer"
        | "support"
        | "agent"
        | "employee"
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
      app_role: [
        "super_admin",
        "admin",
        "reseller",
        "developer",
        "compliance_officer",
        "support",
        "agent",
        "employee",
      ],
    },
  },
} as const

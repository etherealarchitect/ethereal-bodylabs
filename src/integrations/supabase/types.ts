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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage_events: {
        Row: {
          created_at: string
          error: string | null
          feature: string
          id: number
          latency_ms: number | null
          model: string
          run_id: string | null
          status: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          feature: string
          id?: number
          latency_ms?: number | null
          model: string
          run_id?: string | null
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          feature?: string
          id?: number
          latency_ms?: number | null
          model?: string
          run_id?: string | null
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      alice_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alice_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "alice_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      alice_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          created_by: string | null
          cta_href: string | null
          cta_label: string | null
          expires_at: string | null
          id: string
          level: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          expires_at?: string | null
          id?: string
          level?: string
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          cta_href?: string | null
          cta_label?: string | null
          expires_at?: string | null
          id?: string
          level?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blood_reports: {
        Row: {
          analysis_md: string | null
          collected_on: string | null
          created_at: string
          error: string | null
          file_mime: string | null
          file_name: string | null
          file_path: string
          id: string
          lab_name: string | null
          markers: Json | null
          status: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_md?: string | null
          collected_on?: string | null
          created_at?: string
          error?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_path: string
          id?: string
          lab_name?: string | null
          markers?: Json | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_md?: string | null
          collected_on?: string | null
          created_at?: string
          error?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_path?: string
          id?: string
          lab_name?: string | null
          markers?: Json | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_push_tokens: {
        Row: {
          created_at: string
          environment: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      dose_compounds: {
        Row: {
          category: string | null
          common_brand: string | null
          created_at: string
          default_method: string | null
          default_unit: string | null
          half_life_hours: number | null
          id: string
          name: string
          notes: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          common_brand?: string | null
          created_at?: string
          default_method?: string | null
          default_unit?: string | null
          half_life_hours?: number | null
          id?: string
          name: string
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          common_brand?: string | null
          created_at?: string
          default_method?: string | null
          default_unit?: string | null
          half_life_hours?: number | null
          id?: string
          name?: string
          notes?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dose_logs: {
        Row: {
          compound_name: string
          created_at: string
          dose_amount: number
          dose_unit: string
          id: string
          injection_site: string | null
          method: string
          notes: string | null
          schedule_id: string | null
          scheduled_at: string | null
          status: string
          taken_at: string | null
          user_id: string
        }
        Insert: {
          compound_name: string
          created_at?: string
          dose_amount: number
          dose_unit: string
          id?: string
          injection_site?: string | null
          method: string
          notes?: string | null
          schedule_id?: string | null
          scheduled_at?: string | null
          status?: string
          taken_at?: string | null
          user_id: string
        }
        Update: {
          compound_name?: string
          created_at?: string
          dose_amount?: number
          dose_unit?: string
          id?: string
          injection_site?: string | null
          method?: string
          notes?: string | null
          schedule_id?: string | null
          scheduled_at?: string | null
          status?: string
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dose_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "dose_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      dose_schedules: {
        Row: {
          active: boolean
          compound_id: string | null
          compound_name: string
          created_at: string
          dose_amount: number
          dose_unit: string
          end_date: string | null
          frequency_type: string
          id: string
          injection_site: string | null
          interval_days: number | null
          method: string
          notes: string | null
          start_date: string
          time_of_day: string | null
          updated_at: string
          user_id: string
          weekdays: number[] | null
        }
        Insert: {
          active?: boolean
          compound_id?: string | null
          compound_name: string
          created_at?: string
          dose_amount: number
          dose_unit: string
          end_date?: string | null
          frequency_type?: string
          id?: string
          injection_site?: string | null
          interval_days?: number | null
          method: string
          notes?: string | null
          start_date?: string
          time_of_day?: string | null
          updated_at?: string
          user_id: string
          weekdays?: number[] | null
        }
        Update: {
          active?: boolean
          compound_id?: string | null
          compound_name?: string
          created_at?: string
          dose_amount?: number
          dose_unit?: string
          end_date?: string | null
          frequency_type?: string
          id?: string
          injection_site?: string | null
          interval_days?: number | null
          method?: string
          notes?: string | null
          start_date?: string
          time_of_day?: string | null
          updated_at?: string
          user_id?: string
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "dose_schedules_compound_id_fkey"
            columns: ["compound_id"]
            isOneToOne: false
            referencedRelation: "dose_compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          equipment: string | null
          id: string
          muscle_group: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_templates: {
        Row: {
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          favorite: boolean
          id: string
          kcal: number | null
          name: string
          notes: string | null
          protein_g: number | null
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          favorite?: boolean
          id?: string
          kcal?: number | null
          name: string
          notes?: string | null
          protein_g?: number | null
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          favorite?: boolean
          id?: string
          kcal?: number | null
          name?: string
          notes?: string | null
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          carbs_g: number | null
          created_at: string
          eaten_at: string
          fat_g: number | null
          id: string
          kcal: number | null
          name: string
          notes: string | null
          protein_g: number | null
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string
          eaten_at?: string
          fat_g?: number | null
          id?: string
          kcal?: number | null
          name: string
          notes?: string | null
          protein_g?: number | null
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          created_at?: string
          eaten_at?: string
          fat_g?: number | null
          id?: string
          kcal?: number | null
          name?: string
          notes?: string | null
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          body_fat_pct: number | null
          created_at: string
          id: string
          notes: string | null
          taken_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          taken_at?: string
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          taken_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      passkey_challenges: {
        Row: {
          challenge: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          purpose: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          purpose: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          purpose?: string
          user_id?: string | null
        }
        Relationships: []
      }
      passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[]
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[]
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[]
          user_id?: string
        }
        Relationships: []
      }
      physique_collages: {
        Row: {
          created_at: string
          current_photo_id: string | null
          current_taken_at: string
          id: string
          start_photo_id: string | null
          start_taken_at: string
          storage_path: string
          user_id: string
          weeks_apart: number | null
        }
        Insert: {
          created_at?: string
          current_photo_id?: string | null
          current_taken_at: string
          id?: string
          start_photo_id?: string | null
          start_taken_at: string
          storage_path: string
          user_id: string
          weeks_apart?: number | null
        }
        Update: {
          created_at?: string
          current_photo_id?: string | null
          current_taken_at?: string
          id?: string
          start_photo_id?: string | null
          start_taken_at?: string
          storage_path?: string
          user_id?: string
          weeks_apart?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "physique_collages_current_photo_id_fkey"
            columns: ["current_photo_id"]
            isOneToOne: false
            referencedRelation: "physique_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physique_collages_start_photo_id_fkey"
            columns: ["start_photo_id"]
            isOneToOne: false
            referencedRelation: "physique_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      physique_photos: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          pose: string | null
          storage_path: string
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          pose?: string | null
          storage_path: string
          taken_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          pose?: string | null
          storage_path?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          avatar_url: string | null
          birth_year: number | null
          created_at: string
          display_name: string | null
          goal: string | null
          handle: string | null
          height_cm: number | null
          id: string
          kcal_target: number | null
          onboarding_complete: boolean
          protein_target_g: number | null
          sex: string | null
          starting_weight_kg: number | null
          target_weight_kg: number | null
          timezone: string | null
          training_days_per_week: number | null
          units: string
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          goal?: string | null
          handle?: string | null
          height_cm?: number | null
          id: string
          kcal_target?: number | null
          onboarding_complete?: boolean
          protein_target_g?: number | null
          sex?: string | null
          starting_weight_kg?: number | null
          target_weight_kg?: number | null
          timezone?: string | null
          training_days_per_week?: number | null
          units?: string
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          goal?: string | null
          handle?: string | null
          height_cm?: number | null
          id?: string
          kcal_target?: number | null
          onboarding_complete?: boolean
          protein_target_g?: number | null
          sex?: string | null
          starting_weight_kg?: number | null
          target_weight_kg?: number | null
          timezone?: string | null
          training_days_per_week?: number | null
          units?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_days: {
        Row: {
          created_at: string
          day_index: number
          exercises: Json
          focus: string | null
          id: string
          program_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          exercises?: Json
          focus?: string | null
          id?: string
          program_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          exercises?: Json
          focus?: string | null
          id?: string
          program_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          active: boolean
          created_at: string
          days_per_week: number
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          weeks: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          days_per_week?: number
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          weeks?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          days_per_week?: number
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          weeks?: number
        }
        Relationships: []
      }
      protocol_items: {
        Row: {
          category: string | null
          created_at: string
          date: string
          done: boolean
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          apple_original_transaction_id: string | null
          apple_product_id: string | null
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          source: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_original_transaction_id?: string | null
          apple_product_id?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          source?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_original_transaction_id?: string | null
          apple_product_id?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          source?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          label: string | null
          last_used_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          awarded_at: string
          code: string
          description: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          code: string
          description?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          code?: string
          description?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          reminder_time: string
          reminders_enabled: boolean
          theme: string
          timezone: string | null
          updated_at: string
          user_id: string
          weekly_report_day: number
        }
        Insert: {
          created_at?: string
          reminder_time?: string
          reminders_enabled?: boolean
          theme?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
          weekly_report_day?: number
        }
        Update: {
          created_at?: string
          reminder_time?: string
          reminders_enabled?: boolean
          theme?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
          weekly_report_day?: number
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
          created_at: string
          exercise_id: string | null
          exercise_name: string
          id: string
          position: number
          reps: number | null
          rpe: number | null
          tempo: string | null
          user_id: string
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          position?: number
          reps?: number | null
          rpe?: number | null
          tempo?: string | null
          user_id: string
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          position?: number
          reps?: number | null
          rpe?: number | null
          tempo?: string | null
          user_id?: string
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          date: string
          duration_min: number | null
          id: string
          notes: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

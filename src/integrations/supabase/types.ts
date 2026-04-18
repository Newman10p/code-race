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
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          created_at: string
          current_question_index: number
          current_round: number
          duration_minutes: number
          host_id: string
          id: string
          pin_code: string
          quiz_id: string
          round_paused: boolean
          round_started_at: string | null
          status: string
          tournament_mode: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_question_index?: number
          current_round?: number
          duration_minutes?: number
          host_id: string
          id?: string
          pin_code: string
          quiz_id: string
          round_paused?: boolean
          round_started_at?: string | null
          status?: string
          tournament_mode?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_question_index?: number
          current_round?: number
          duration_minutes?: number
          host_id?: string
          id?: string
          pin_code?: string
          quiz_id?: string
          round_paused?: boolean
          round_started_at?: string | null
          status?: string
          tournament_mode?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_answers: {
        Row: {
          answer: Json | null
          flagged_tab_switch: boolean
          id: string
          is_correct: boolean | null
          participant_id: string
          points_awarded: number
          question_id: string
          submitted_at: string
        }
        Insert: {
          answer?: Json | null
          flagged_tab_switch?: boolean
          id?: string
          is_correct?: boolean | null
          participant_id: string
          points_awarded?: number
          question_id: string
          submitted_at?: string
        }
        Update: {
          answer?: Json | null
          flagged_tab_switch?: boolean
          id?: string
          is_correct?: boolean | null
          participant_id?: string
          points_awarded?: number
          question_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          current_score: number
          dq_reason: string | null
          eliminated_round: number | null
          id: string
          is_disqualified: boolean
          is_flagged: boolean
          round_reached: number
          session_id: string
          strike_count: number
          student_name: string
          tab_switch_count: number
        }
        Insert: {
          created_at?: string
          current_score?: number
          dq_reason?: string | null
          eliminated_round?: number | null
          id?: string
          is_disqualified?: boolean
          is_flagged?: boolean
          round_reached?: number
          session_id: string
          strike_count?: number
          student_name: string
          tab_switch_count?: number
        }
        Update: {
          created_at?: string
          current_score?: number
          dq_reason?: string | null
          eliminated_round?: number | null
          id?: string
          is_disqualified?: boolean
          is_flagged?: boolean
          round_reached?: number
          session_id?: string
          strike_count?: number
          student_name?: string
          tab_switch_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          content: string
          correct_option: number | null
          created_at: string
          id: string
          options: Json | null
          order_index: number
          points: number
          quiz_id: string
          round_number: number
          solution: string | null
          starter_code: string | null
          time_limit: number
          type: string
        }
        Insert: {
          content: string
          correct_option?: number | null
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          quiz_id: string
          round_number?: number
          solution?: string | null
          starter_code?: string | null
          time_limit?: number
          type?: string
        }
        Update: {
          content?: string
          correct_option?: number | null
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          quiz_id?: string
          round_number?: number
          solution?: string | null
          starter_code?: string | null
          time_limit?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_rounds: {
        Row: {
          created_at: string
          cutoff_type: string
          cutoff_value: number
          duration_seconds: number
          id: string
          name: string
          quiz_id: string
          round_number: number
        }
        Insert: {
          created_at?: string
          cutoff_type?: string
          cutoff_value?: number
          duration_seconds?: number
          id?: string
          name?: string
          quiz_id: string
          round_number: number
        }
        Update: {
          created_at?: string
          cutoff_type?: string
          cutoff_value?: number
          duration_seconds?: number
          id?: string
          name?: string
          quiz_id?: string
          round_number?: number
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          folder_id: string
          id: string
          title: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          folder_id: string
          id?: string
          title: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          folder_id?: string
          id?: string
          title?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

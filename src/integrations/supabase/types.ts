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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          created_at: string
          id: string
          reason: string
          result: string | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_name: string
          created_at?: string
          id?: string
          reason: string
          result?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          created_at?: string
          id?: string
          reason?: string
          result?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
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
          audience: string
          body: string
          created_at: string
          id: string
          is_active: boolean
          setter_id: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          setter_id: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          setter_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_appearance: {
        Row: {
          accent: string
          animations: string
          bubble_style: string
          density: string
          sound: string
          theme: string
          updated_at: string
          user_id: string
          wallpaper: string
        }
        Insert: {
          accent?: string
          animations?: string
          bubble_style?: string
          density?: string
          sound?: string
          theme?: string
          updated_at?: string
          user_id: string
          wallpaper?: string
        }
        Update: {
          accent?: string
          animations?: string
          bubble_style?: string
          density?: string
          sound?: string
          theme?: string
          updated_at?: string
          user_id?: string
          wallpaper?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_name?: string
          sender_role?: string
        }
        Relationships: []
      }
      chat_requests: {
        Row: {
          created_at: string
          id: string
          reason: string
          recipient_id: string
          recipient_name: string | null
          requester_id: string
          requester_name: string
          responded_at: string | null
          status: Database["public"]["Enums"]["collab_request_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string
          recipient_id: string
          recipient_name?: string | null
          requester_id: string
          requester_name: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["collab_request_status"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          recipient_id?: string
          recipient_name?: string | null
          requester_id?: string
          requester_name?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["collab_request_status"]
        }
        Relationships: []
      }
      collab_group_members: {
        Row: {
          created_at: string
          display_name: string | null
          group_id: string
          id: string
          role: Database["public"]["Enums"]["collab_group_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          group_id: string
          id?: string
          role?: Database["public"]["Enums"]["collab_group_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          group_id?: string
          id?: string
          role?: Database["public"]["Enums"]["collab_group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "collab_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_groups: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          organization_id: string | null
          patron_user_id: string | null
          privacy: Database["public"]["Enums"]["collab_group_privacy"]
          status: Database["public"]["Enums"]["collab_group_status"]
          theme: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          organization_id?: string | null
          patron_user_id?: string | null
          privacy?: Database["public"]["Enums"]["collab_group_privacy"]
          status?: Database["public"]["Enums"]["collab_group_status"]
          theme?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string | null
          patron_user_id?: string | null
          privacy?: Database["public"]["Enums"]["collab_group_privacy"]
          status?: Database["public"]["Enums"]["collab_group_status"]
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_messages: {
        Row: {
          attachment_url: string | null
          body: string
          code_filename: string | null
          code_language: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          group_id: string
          id: string
          is_pinned: boolean
          kind: string
          reply_to_id: string | null
          sender_id: string
          sender_name: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          code_filename?: string | null
          code_language?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          group_id: string
          id?: string
          is_pinned?: boolean
          kind?: string
          reply_to_id?: string | null
          sender_id: string
          sender_name: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          code_filename?: string | null
          code_language?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          group_id?: string
          id?: string
          is_pinned?: boolean
          kind?: string
          reply_to_id?: string | null
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "collab_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "collab_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "collab_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_reports: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          evidence: string | null
          evidence_submitted_by_reporter: boolean
          id: string
          reporter_id: string
          reporter_name: string
          resolution: string | null
          severity: string
          status: Database["public"]["Enums"]["collab_report_status"]
          target_id: string | null
          target_type: string
          target_user_id: string | null
          target_user_name: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description?: string | null
          evidence?: string | null
          evidence_submitted_by_reporter?: boolean
          id?: string
          reporter_id: string
          reporter_name: string
          resolution?: string | null
          severity?: string
          status?: Database["public"]["Enums"]["collab_report_status"]
          target_id?: string | null
          target_type: string
          target_user_id?: string | null
          target_user_name?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          evidence?: string | null
          evidence_submitted_by_reporter?: boolean
          id?: string
          reporter_id?: string
          reporter_name?: string
          resolution?: string | null
          severity?: string
          status?: Database["public"]["Enums"]["collab_report_status"]
          target_id?: string | null
          target_type?: string
          target_user_id?: string | null
          target_user_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collab_settings: {
        Row: {
          allow_blocking: boolean
          allow_discoverable_groups: boolean
          allow_private_chat: boolean
          allow_reporting: boolean
          allow_student_groups: boolean
          freeze_group_creation: boolean
          freeze_group_messaging: boolean
          id: boolean
          max_requests_per_hour: number
          request_policy: string
          require_admin_approval: boolean
          require_mutual_approval: boolean
          updated_at: string
        }
        Insert: {
          allow_blocking?: boolean
          allow_discoverable_groups?: boolean
          allow_private_chat?: boolean
          allow_reporting?: boolean
          allow_student_groups?: boolean
          freeze_group_creation?: boolean
          freeze_group_messaging?: boolean
          id?: boolean
          max_requests_per_hour?: number
          request_policy?: string
          require_admin_approval?: boolean
          require_mutual_approval?: boolean
          updated_at?: string
        }
        Update: {
          allow_blocking?: boolean
          allow_discoverable_groups?: boolean
          allow_private_chat?: boolean
          allow_reporting?: boolean
          allow_student_groups?: boolean
          freeze_group_creation?: boolean
          freeze_group_messaging?: boolean
          id?: boolean
          max_requests_per_hour?: number
          request_policy?: string
          require_admin_approval?: boolean
          require_mutual_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      criteria_rubrics: {
        Row: {
          created_at: string
          dimensions: Json
          id: string
          is_published: boolean
          passing_score: number
          project_description: string
          setter_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dimensions?: Json
          id?: string
          is_published?: boolean
          passing_score?: number
          project_description?: string
          setter_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dimensions?: Json
          id?: string
          is_published?: boolean
          passing_score?: number
          project_description?: string
          setter_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      criteria_submissions: {
        Row: {
          content: string
          created_at: string
          dimension_scores: Json
          feedback: string
          id: string
          learner_name: string
          link_url: string | null
          rubric_id: string
          scored_at: string | null
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          dimension_scores?: Json
          feedback?: string
          id?: string
          learner_name?: string
          link_url?: string | null
          rubric_id: string
          scored_at?: string | null
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          dimension_scores?: Json
          feedback?: string
          id?: string
          learner_name?: string
          link_url?: string | null
          rubric_id?: string
          scored_at?: string | null
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "criteria_submissions_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "criteria_rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_a_name: string | null
          user_b: string
          user_b_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_a_name?: string | null
          user_b: string
          user_b_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_a_name?: string | null
          user_b?: string
          user_b_name?: string | null
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          ciphertext: string
          conversation_id: string
          created_at: string
          id: string
          iv: string
          sender_ephemeral_key: Json | null
          sender_id: string
        }
        Insert: {
          ciphertext: string
          conversation_id: string
          created_at?: string
          id?: string
          iv: string
          sender_ephemeral_key?: Json | null
          sender_id: string
        }
        Update: {
          ciphertext?: string
          conversation_id?: string
          created_at?: string
          id?: string
          iv?: string
          sender_ephemeral_key?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          setter_id: string
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          setter_id: string
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          setter_id?: string
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          front: string
          id: string
          order_index: number
          set_id: string
        }
        Insert: {
          back: string
          created_at?: string
          front: string
          id?: string
          order_index?: number
          set_id: string
        }
        Update: {
          back?: string
          created_at?: string
          front?: string
          id?: string
          order_index?: number
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
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
      learner_saved_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_saved_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lesson_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_saved_sets: {
        Row: {
          id: string
          saved_at: string
          set_id: string
          user_id: string
        }
        Insert: {
          id?: string
          saved_at?: string
          set_id: string
          user_id: string
        }
        Update: {
          id?: string
          saved_at?: string
          set_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_saved_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          setter_id: string
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          setter_id: string
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          setter_id?: string
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          concept_markdown: string
          course_id: string
          created_at: string
          hint: string | null
          id: string
          image_url: string | null
          language: string
          objective: string
          order_index: number
          solution: string
          starter_code: string
          test_cases: Json
          test_mode: string
          title: string
          updated_at: string
        }
        Insert: {
          concept_markdown?: string
          course_id: string
          created_at?: string
          hint?: string | null
          id?: string
          image_url?: string | null
          language?: string
          objective?: string
          order_index?: number
          solution?: string
          starter_code?: string
          test_cases?: Json
          test_mode?: string
          title: string
          updated_at?: string
        }
        Update: {
          concept_markdown?: string
          course_id?: string
          created_at?: string
          hint?: string | null
          id?: string
          image_url?: string | null
          language?: string
          objective?: string
          order_index?: number
          solution?: string
          starter_code?: string
          test_cases?: Json
          test_mode?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lesson_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          organization_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string
          id: string
          location: string | null
          notes: string | null
          patron_email: string
          patron_name: string
          patron_phone: string | null
          patron_user_id: string | null
          school_name: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          location?: string | null
          notes?: string | null
          patron_email: string
          patron_name: string
          patron_phone?: string | null
          patron_user_id?: string | null
          school_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          notes?: string | null
          patron_email?: string
          patron_name?: string
          patron_phone?: string | null
          patron_user_id?: string | null
          school_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          test_results: Json | null
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
          test_results?: Json | null
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
          test_results?: Json | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          theme_color: string
          tutorial_completed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          theme_color?: string
          tutorial_completed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          theme_color?: string
          tutorial_completed_at?: string | null
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
          language: string
          options: Json | null
          order_index: number
          points: number
          quiz_id: string
          round_number: number
          solution: string | null
          starter_code: string | null
          test_cases: Json
          test_mode: string
          time_limit: number
          type: string
          visible_test_count: number
        }
        Insert: {
          content: string
          correct_option?: number | null
          created_at?: string
          id?: string
          language?: string
          options?: Json | null
          order_index?: number
          points?: number
          quiz_id: string
          round_number?: number
          solution?: string | null
          starter_code?: string | null
          test_cases?: Json
          test_mode?: string
          time_limit?: number
          type?: string
          visible_test_count?: number
        }
        Update: {
          content?: string
          correct_option?: number | null
          created_at?: string
          id?: string
          language?: string
          options?: Json | null
          order_index?: number
          points?: number
          quiz_id?: string
          round_number?: number
          solution?: string | null
          starter_code?: string | null
          test_cases?: Json
          test_mode?: string
          time_limit?: number
          type?: string
          visible_test_count?: number
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
          is_evaluation: boolean
          title: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          folder_id: string
          id?: string
          is_evaluation?: boolean
          title: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          folder_id?: string
          id?: string
          is_evaluation?: boolean
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
      shared_resources: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          resource_id: string
          resource_type: string
          shared_by: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          resource_id: string
          resource_type: string
          shared_by: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          resource_id?: string
          resource_type?: string
          shared_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_public_keys: {
        Row: {
          algorithm: string
          created_at: string
          fingerprint: string
          public_key: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          algorithm?: string
          created_at?: string
          fingerprint: string
          public_key: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          fingerprint?: string
          public_key?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
      accept_patron_invite: { Args: { _org: string }; Returns: boolean }
      blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      in_conversation: { Args: { _conv: string }; Returns: boolean }
      is_group_manager: { Args: { _group: string }; Returns: boolean }
      is_group_member: { Args: { _group: string }; Returns: boolean }
      is_my_org_member: { Args: { _user: string }; Returns: boolean }
      is_org_creator: { Args: { _org: string }; Returns: boolean }
      is_org_patron: { Args: { _org: string }; Returns: boolean }
      is_shared_with_me: {
        Args: { _id: string; _type: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      my_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role: "setter" | "learner" | "admin" | "patron"
      collab_group_privacy:
        | "invite_only"
        | "request_to_join"
        | "discoverable"
        | "private"
      collab_group_role: "owner" | "moderator" | "member" | "patron"
      collab_group_status: "pending" | "active" | "frozen" | "archived"
      collab_report_status:
        | "new"
        | "under_review"
        | "escalated"
        | "action_taken"
        | "resolved"
        | "dismissed"
      collab_request_status: "pending" | "accepted" | "declined"
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
      app_role: ["setter", "learner", "admin", "patron"],
      collab_group_privacy: [
        "invite_only",
        "request_to_join",
        "discoverable",
        "private",
      ],
      collab_group_role: ["owner", "moderator", "member", "patron"],
      collab_group_status: ["pending", "active", "frozen", "archived"],
      collab_report_status: [
        "new",
        "under_review",
        "escalated",
        "action_taken",
        "resolved",
        "dismissed",
      ],
      collab_request_status: ["pending", "accepted", "declined"],
    },
  },
} as const

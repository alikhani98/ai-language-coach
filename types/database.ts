export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DbRecord = Record<string, unknown>;
type EmptyObject = { [K in never]: never };

export type Database = {
  public: {
    Tables: {
      admin_audit_logs: {
        Row: { id: string; admin_user_id: string | null; target_user_id: string | null; action: string; metadata: Json; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      learning_memory: {
        Row: { user_id: string; schema_version: number; as_of: string; snapshot: Json; updated_at: string };
        Insert: { user_id: string; schema_version?: number; as_of: string; snapshot: Json; updated_at?: string };
        Update: { user_id?: string; schema_version?: number; as_of?: string; snapshot?: Json; updated_at?: string };
        Relationships: [];
      };
      users_profile: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "active" | "suspended" | "rejected";
          approved_at: string | null;
          approved_by: string | null;
          level: string;
          goal: string;
          daily_minutes: number;
          timezone: string;
          interface_language: string;
          theme_preference: string;
          created_at: string;
        } & DbRecord;
        Insert: {
          id?: string;
          user_id: string;
          level: string;
          goal: string;
          daily_minutes?: number;
          timezone?: string;
          interface_language?: string;
          theme_preference?: string;
          created_at?: string;
        } & DbRecord;
        Update: {
          id?: string;
          user_id?: string;
          status?: "pending" | "active" | "suspended" | "rejected";
          approved_at?: string | null;
          approved_by?: string | null;
          level?: string;
          goal?: string;
          daily_minutes?: number;
          timezone?: string;
          interface_language?: string;
          theme_preference?: string;
          created_at?: string;
        } & DbRecord;
        Relationships: [];
      };
      daily_lessons: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          words: Json;
          sentence: string;
          reading_text: string;
          speaking_task: string;
          completed: boolean;
          generation_status: string;
          created_at: string;
        } & DbRecord;
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          words: Json;
          sentence: string;
          reading_text: string;
          speaking_task: string;
          completed?: boolean;
          generation_status?: string;
          created_at?: string;
        } & DbRecord;
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          words?: Json;
          sentence?: string;
          reading_text?: string;
          speaking_task?: string;
          completed?: boolean;
          generation_status?: string;
          created_at?: string;
        } & DbRecord;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          messages: Json;
          feedback: string | null;
          status: string;
          active_request_id: string | null;
          active_generation_started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        } & DbRecord;
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          messages?: Json;
          feedback?: string | null;
          status?: string;
          active_request_id?: string | null;
          active_generation_started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        } & DbRecord;
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          messages?: Json;
          feedback?: string | null;
          status?: string;
          active_request_id?: string | null;
          active_generation_started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        } & DbRecord;
        Relationships: [];
      };
      conversation_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: string;
          content: string;
          corrections: Json;
          request_id: string | null;
          created_at: string;
        } & DbRecord;
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: string;
          content: string;
          corrections?: Json;
          request_id?: string | null;
          created_at?: string;
        } & DbRecord;
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: string;
          content?: string;
          corrections?: Json;
          request_id?: string | null;
          created_at?: string;
        } & DbRecord;
        Relationships: [];
      };
      mistakes: {
        Row: {
          id: string;
          user_id: string;
          wrong_sentence: string;
          correct_sentence: string;
          explanation: string;
          category: string;
          source_message_id: string | null;
          correction_index: number | null;
          dismissed_at: string | null;
          created_at: string;
        } & DbRecord;
        Insert: {
          id?: string;
          user_id: string;
          wrong_sentence: string;
          correct_sentence: string;
          explanation: string;
          category: string;
          source_message_id?: string | null;
          correction_index?: number | null;
          dismissed_at?: string | null;
          created_at?: string;
        } & DbRecord;
        Update: {
          id?: string;
          user_id?: string;
          wrong_sentence?: string;
          correct_sentence?: string;
          explanation?: string;
          category?: string;
          source_message_id?: string | null;
          correction_index?: number | null;
          dismissed_at?: string | null;
          created_at?: string;
        } & DbRecord;
        Relationships: [];
      };
      practice_logs: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          duration: number;
          created_at: string;
        } & DbRecord;
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          duration: number;
          created_at?: string;
        } & DbRecord;
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: string;
          duration?: number;
          created_at?: string;
        } & DbRecord;
        Relationships: [];
      };
    };
    Views: EmptyObject;
    Functions: {
      is_app_admin: { Args: EmptyObject; Returns: boolean };
      has_active_account: { Args: EmptyObject; Returns: boolean };
      admin_change_user: { Args: { p_target: string; p_action: string; p_profile?: Json | null }; Returns: undefined };
      admin_users: { Args: { p_search?: string; p_status?: string; p_page?: number }; Returns: Json };
      admin_user_detail: { Args: { p_target: string }; Returns: Json };
      admin_audit: { Args: { p_page?: number }; Returns: Json };
      refresh_learning_memory: { Args: EmptyObject; Returns: Json };
      valid_learning_memory: { Args: { value: Json }; Returns: boolean };
      learning_memory_area: {
        Args: { category: string; original: string; corrected: string; explanation: string };
        Returns: string;
      };
      insert_assistant_conversation_message: {
        Args: {
          p_conversation_id: string;
          p_content: string;
          p_corrections: Json;
          p_request_id: string;
        };
        Returns: string | null;
      };
    };
    Enums: EmptyObject;
    CompositeTypes: EmptyObject;
  };
};

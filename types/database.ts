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
      users_profile: {
        Row: {
          id: string;
          user_id: string;
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

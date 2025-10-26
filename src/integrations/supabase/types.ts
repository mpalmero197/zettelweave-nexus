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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          duration: number | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          mime_type: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          mime_type: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          mime_type?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          source_id: string
          source_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          source_id: string
          source_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          source_id?: string
          source_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      catalyst_chapters: {
        Row: {
          content: string | null
          created_at: string
          document_id: string
          id: string
          level: number
          order_index: number
          parent_id: string | null
          title: string
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          document_id: string
          id?: string
          level?: number
          order_index?: number
          parent_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          document_id?: string
          id?: string
          level?: number
          order_index?: number
          parent_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalyst_chapters_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "catalyst_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalyst_chapters_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "catalyst_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      catalyst_citations: {
        Row: {
          authors: Json | null
          citation_type: string
          created_at: string
          document_id: string
          doi: string | null
          id: string
          issue: string | null
          metadata: Json | null
          pages: string | null
          publication_year: number | null
          publisher: string | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
          volume: string | null
        }
        Insert: {
          authors?: Json | null
          citation_type: string
          created_at?: string
          document_id: string
          doi?: string | null
          id?: string
          issue?: string | null
          metadata?: Json | null
          pages?: string | null
          publication_year?: number | null
          publisher?: string | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
          volume?: string | null
        }
        Update: {
          authors?: Json | null
          citation_type?: string
          created_at?: string
          document_id?: string
          doi?: string | null
          id?: string
          issue?: string | null
          metadata?: Json | null
          pages?: string | null
          publication_year?: number | null
          publisher?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalyst_citations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "catalyst_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      catalyst_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          selected_items: Json | null
          selected_source: string
          title: string
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          selected_items?: Json | null
          selected_source: string
          title: string
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          selected_items?: Json | null
          selected_source?: string
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      catalyst_writing_goals: {
        Row: {
          chapter_id: string | null
          created_at: string
          deadline: string | null
          document_id: string
          id: string
          target_words: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          deadline?: string | null
          document_id: string
          id?: string
          target_words: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          deadline?: string | null
          document_id?: string
          id?: string
          target_words?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalyst_writing_goals_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "catalyst_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalyst_writing_goals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "catalyst_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      collaboration_sessions: {
        Row: {
          active_users: Json
          content_id: string
          content_type: Database["public"]["Enums"]["shareable_content_type"]
          created_at: string
          ended_at: string | null
          host_user_id: string
          id: string
          updated_at: string
        }
        Insert: {
          active_users?: Json
          content_id: string
          content_type: Database["public"]["Enums"]["shareable_content_type"]
          created_at?: string
          ended_at?: string | null
          host_user_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          active_users?: Json
          content_id?: string
          content_type?: Database["public"]["Enums"]["shareable_content_type"]
          created_at?: string
          ended_at?: string | null
          host_user_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          layout_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          mime_type: string
          permanent_delete_at: string | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          mime_type: string
          permanent_delete_at?: string | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          mime_type?: string
          permanent_delete_at?: string | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          status: Database["public"]["Enums"]["friend_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["friend_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["friend_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id_1: string
          user_id_2: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: []
      }
      notebooks: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          attachments: string[] | null
          content: string
          content_embedding: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_favorite: boolean | null
          notebook_id: string | null
          permanent_delete_at: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          content?: string
          content_embedding?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_favorite?: boolean | null
          notebook_id?: string | null
          permanent_delete_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          content_embedding?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_favorite?: boolean | null
          notebook_id?: string | null
          permanent_delete_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about_me: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_visible: boolean | null
          last_activity_at: string | null
          updated_at: string
          user_id: string
          user_status: Database["public"]["Enums"]["user_status"] | null
        }
        Insert: {
          about_me?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_visible?: boolean | null
          last_activity_at?: string | null
          updated_at?: string
          user_id: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
        }
        Update: {
          about_me?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_visible?: boolean | null
          last_activity_at?: string | null
          updated_at?: string
          user_id?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
        }
        Relationships: []
      }
      recordings: {
        Row: {
          created_at: string
          deleted_at: string | null
          duration: number | null
          file_size: number | null
          id: string
          metadata: Json | null
          recording_type: string
          storage_path: string
          thumbnail_url: string | null
          title: string
          transcription: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          recording_type: string
          storage_path: string
          thumbnail_url?: string | null
          title: string
          transcription?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          recording_type?: string
          storage_path?: string
          thumbnail_url?: string | null
          title?: string
          transcription?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shared_content: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["shareable_content_type"]
          created_at: string
          id: string
          owner_id: string
          permission: Database["public"]["Enums"]["sharing_permission"]
          shared_with_user_id: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["shareable_content_type"]
          created_at?: string
          id?: string
          owner_id: string
          permission?: Database["public"]["Enums"]["sharing_permission"]
          shared_with_user_id: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["shareable_content_type"]
          created_at?: string
          id?: string
          owner_id?: string
          permission?: Database["public"]["Enums"]["sharing_permission"]
          shared_with_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          auto_delete_days: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_delete_days?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_delete_days?: number
          created_at?: string
          id?: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zettel_cards: {
        Row: {
          attachments: string[] | null
          category: string
          content: string
          content_embedding: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_favorite: boolean | null
          linked_cards: string[] | null
          notebook_id: string | null
          number: string
          permanent_delete_at: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          attachments?: string[] | null
          category: string
          content: string
          content_embedding?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          linked_cards?: string[] | null
          notebook_id?: string | null
          number: string
          permanent_delete_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          attachments?: string[] | null
          category?: string
          content?: string
          content_embedding?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          linked_cards?: string[] | null
          notebook_id?: string | null
          number?: string
          permanent_delete_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zettel_cards_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { _user_id_1: string; _user_id_2: string }
        Returns: boolean
      }
      auto_delete_expired_items: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      clear_all_card_links: { Args: never; Returns: number }
      find_similar_notes: {
        Args: {
          max_results?: number
          similarity_threshold?: number
          target_id: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          similarity: number
          title: string
        }[]
      }
      find_similar_zettel_cards: {
        Args: {
          max_results?: number
          similarity_threshold?: number
          target_id: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          similarity: number
          title: string
        }[]
      }
      get_all_users: {
        Args: never
        Returns: {
          banned_until: string
          created_at: string
          display_name: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
          roles: Database["public"]["Enums"]["app_role"][]
        }[]
      }
      get_all_visible_users: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          has_pending_request: boolean
          is_friend: boolean
          last_activity_at: string
          user_id: string
          user_status: Database["public"]["Enums"]["user_status"]
        }[]
      }
      get_my_friends: {
        Args: never
        Returns: {
          friend_avatar_url: string
          friend_display_name: string
          friend_email: string
          friend_user_id: string
          friendship_created_at: string
          last_activity_at: string
          user_status: Database["public"]["Enums"]["user_status"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_security_event: {
        Args: {
          p_event_details?: Json
          p_event_type: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      search_users: {
        Args: { _search_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          has_pending_request: boolean
          is_friend: boolean
          last_activity_at: string
          user_id: string
          user_status: Database["public"]["Enums"]["user_status"]
        }[]
      }
      update_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      friend_request_status: "pending" | "accepted" | "declined"
      shareable_content_type:
        | "card"
        | "note"
        | "scratchpad"
        | "stickynote"
        | "notebook"
      sharing_permission: "view" | "edit"
      user_status: "online" | "busy" | "away" | "dnd" | "offline"
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
      app_role: ["admin", "moderator", "user"],
      friend_request_status: ["pending", "accepted", "declined"],
      shareable_content_type: [
        "card",
        "note",
        "scratchpad",
        "stickynote",
        "notebook",
      ],
      sharing_permission: ["view", "edit"],
      user_status: ["online", "busy", "away", "dnd", "offline"],
    },
  },
} as const

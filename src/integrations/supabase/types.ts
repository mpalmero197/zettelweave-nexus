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
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
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
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
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
      auto_delete_expired_items: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
        Args: Record<PropertyKey, never>
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
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
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
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const

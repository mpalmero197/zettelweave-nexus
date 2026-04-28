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
      admin_error_review_state: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          last_notified_at: string
          last_notified_error_signature: string | null
          last_notified_new_count: number
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          last_notified_at?: string
          last_notified_error_signature?: string | null
          last_notified_new_count?: number
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          last_notified_at?: string
          last_notified_error_signature?: string | null
          last_notified_new_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_licenses: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_findings: {
        Row: {
          action_taken: boolean
          agent_id: string
          content: string | null
          created_at: string
          finding_type: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          metadata: Json | null
          relevance_score: number | null
          run_id: string | null
          source_id: string | null
          source_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_taken?: boolean
          agent_id: string
          content?: string | null
          created_at?: string
          finding_type: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          metadata?: Json | null
          relevance_score?: number | null
          run_id?: string | null
          source_id?: string | null
          source_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_taken?: boolean
          agent_id?: string
          content?: string | null
          created_at?: string
          finding_type?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          metadata?: Json | null
          relevance_score?: number | null
          run_id?: string | null
          source_id?: string | null
          source_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_findings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_notifications: {
        Row: {
          action_url: string | null
          agent_id: string | null
          created_at: string
          finding_id: string | null
          id: string
          is_read: boolean
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          agent_id?: string | null
          created_at?: string
          finding_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          notification_type?: string
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          agent_id?: string | null
          created_at?: string
          finding_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notifications_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "agent_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          completed_at: string | null
          error_message: string | null
          id: string
          items_found: number | null
          items_processed: number | null
          results: Json | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_found?: number | null
          items_processed?: number | null
          results?: Json | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_found?: number | null
          items_processed?: number | null
          results?: Json | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_type: string
          config: Json
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          run_frequency_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_type: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          run_frequency_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_type?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          run_frequency_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_code_patches: {
        Row: {
          ai_model: string | null
          applied_at: string | null
          applied_by: string | null
          apply_error: string | null
          branch_name: string | null
          commit_sha: string | null
          created_at: string
          created_by: string | null
          error_report_id: string | null
          explanation: string
          file_path: string
          id: string
          new_content: string
          original_content: string | null
          original_sha: string | null
          pr_url: string | null
          status: string
        }
        Insert: {
          ai_model?: string | null
          applied_at?: string | null
          applied_by?: string | null
          apply_error?: string | null
          branch_name?: string | null
          commit_sha?: string | null
          created_at?: string
          created_by?: string | null
          error_report_id?: string | null
          explanation: string
          file_path: string
          id?: string
          new_content: string
          original_content?: string | null
          original_sha?: string | null
          pr_url?: string | null
          status?: string
        }
        Update: {
          ai_model?: string | null
          applied_at?: string | null
          applied_by?: string | null
          apply_error?: string | null
          branch_name?: string | null
          commit_sha?: string | null
          created_at?: string
          created_by?: string | null
          error_report_id?: string | null
          explanation?: string
          file_path?: string
          id?: string
          new_content?: string
          original_content?: string | null
          original_sha?: string | null
          pr_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_code_patches_error_report_id_fkey"
            columns: ["error_report_id"]
            isOneToOne: false
            referencedRelation: "error_reports"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cache_predictions: {
        Row: {
          confidence_score: number | null
          day_of_week: number
          hour_of_day: number
          id: string
          last_updated: string
          resource_ids: string[]
          resource_type: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          day_of_week: number
          hour_of_day: number
          id?: string
          last_updated?: string
          resource_ids: string[]
          resource_type: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          day_of_week?: number
          hour_of_day?: number
          id?: string
          last_updated?: string
          resource_ids?: string[]
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          client_email: string | null
          client_name: string | null
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          event_category: string | null
          event_date: string
          event_time: string | null
          id: string
          is_all_day: boolean | null
          is_recurring: boolean | null
          location: string | null
          recurrence_rule: string | null
          reminder_minutes: number | null
          source_id: string
          source_type: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_category?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          source_id: string
          source_type: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_category?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          source_id?: string
          source_type?: string
          status?: string | null
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
          status: string
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
          status?: string
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
          status?: string
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
      catalyst_collaborators: {
        Row: {
          accepted_at: string | null
          collaborator_id: string
          created_at: string
          document_id: string
          id: string
          invited_at: string
          owner_id: string
          permission: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          collaborator_id: string
          created_at?: string
          document_id: string
          id?: string
          invited_at?: string
          owner_id: string
          permission?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          collaborator_id?: string
          created_at?: string
          document_id?: string
          id?: string
          invited_at?: string
          owner_id?: string
          permission?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalyst_collaborators_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "catalyst_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      catalyst_comments: {
        Row: {
          anchor_text: string | null
          created_at: string
          document_id: string
          id: string
          position_end: number | null
          position_start: number | null
          resolved: boolean
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_text?: string | null
          created_at?: string
          document_id: string
          id?: string
          position_end?: number | null
          position_start?: number | null
          resolved?: boolean
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_text?: string | null
          created_at?: string
          document_id?: string
          id?: string
          position_end?: number | null
          position_start?: number | null
          resolved?: boolean
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalyst_comments_document_id_fkey"
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
          deleted_at: string | null
          id: string
          is_master_document: boolean | null
          permanent_delete_at: string | null
          selected_items: Json | null
          selected_source: string
          theme_id: string
          title: string
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_master_document?: boolean | null
          permanent_delete_at?: string | null
          selected_items?: Json | null
          selected_source: string
          theme_id?: string
          title: string
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_master_document?: boolean | null
          permanent_delete_at?: string | null
          selected_items?: Json | null
          selected_source?: string
          theme_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      catalyst_snapshots: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          title: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          title?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          title?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalyst_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "catalyst_documents"
            referencedColumns: ["id"]
          },
        ]
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
          sender_display_name: string | null
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          receiver_id: string
          sender_display_name?: string | null
          sender_id?: string | null
          sender_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          receiver_id?: string
          sender_display_name?: string | null
          sender_id?: string | null
          sender_type?: string
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
      cookie_consent_analytics: {
        Row: {
          analytics: boolean
          browser: string | null
          country: string | null
          created_at: string
          device_type: string | null
          functional: boolean
          id: string
          marketing: boolean
          necessary: boolean
          session_id: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          analytics?: boolean
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          functional?: boolean
          id?: string
          marketing?: boolean
          necessary?: boolean
          session_id: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          analytics?: boolean
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          functional?: boolean
          id?: string
          marketing?: boolean
          necessary?: boolean
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
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
      documents: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          is_favorite: boolean
          preview: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          is_favorite?: boolean
          preview?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          is_favorite?: boolean
          preview?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      domain_restrictions: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string
          id: string
          reason: string | null
          restriction_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain: string
          id?: string
          reason?: string | null
          restriction_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          reason?: string | null
          restriction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      error_reports: {
        Row: {
          column_number: number | null
          error_message: string
          error_signature: string
          error_type: string
          filename: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          line_number: number | null
          occurrence_count: number
          severity: string
          stack_trace: string | null
          status: string
          url: string | null
          user_agent: string | null
        }
        Insert: {
          column_number?: number | null
          error_message: string
          error_signature: string
          error_type: string
          filename?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          line_number?: number | null
          occurrence_count?: number
          severity?: string
          stack_trace?: string | null
          status?: string
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          column_number?: number | null
          error_message?: string
          error_signature?: string
          error_type?: string
          filename?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          line_number?: number | null
          occurrence_count?: number
          severity?: string
          stack_trace?: string | null
          status?: string
          url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      feature_request_votes: {
        Row: {
          created_at: string
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          created_at: string
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string | null
          votes: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
          votes?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          votes?: number
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
      import_history: {
        Row: {
          card_id: string | null
          file_hash: string
          file_name: string
          file_path: string
          id: string
          imported_at: string
          metadata: Json | null
          source_type: string
          user_id: string
        }
        Insert: {
          card_id?: string | null
          file_hash: string
          file_name: string
          file_path: string
          id?: string
          imported_at?: string
          metadata?: Json | null
          source_type: string
          user_id: string
        }
        Update: {
          card_id?: string | null
          file_hash?: string
          file_name?: string
          file_path?: string
          id?: string
          imported_at?: string
          metadata?: Json | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      in_app_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          item_id: string | null
          item_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          item_id?: string | null
          item_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          item_id?: string | null
          item_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      item_presence: {
        Row: {
          id: string
          is_editing: boolean
          item_id: string
          item_type: Database["public"]["Enums"]["shared_item_type"]
          last_seen_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_editing?: boolean
          item_id: string
          item_type: Database["public"]["Enums"]["shared_item_type"]
          last_seen_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_editing?: boolean
          item_id?: string
          item_type?: Database["public"]["Enums"]["shared_item_type"]
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_gaps: {
        Row: {
          created_at: string
          description: string
          detailed_explanation: string | null
          id: string
          interest: string
          resources: Json | null
          scan_id: string | null
          severity: string
          source_materials: Json | null
          status: string
          topic: string
          updated_at: string
          user_id: string
          what_you_know: string | null
          what_you_need_to_learn: string | null
        }
        Insert: {
          created_at?: string
          description: string
          detailed_explanation?: string | null
          id?: string
          interest?: string
          resources?: Json | null
          scan_id?: string | null
          severity?: string
          source_materials?: Json | null
          status?: string
          topic: string
          updated_at?: string
          user_id: string
          what_you_know?: string | null
          what_you_need_to_learn?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          detailed_explanation?: string | null
          id?: string
          interest?: string
          resources?: Json | null
          scan_id?: string | null
          severity?: string
          source_materials?: Json | null
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
          what_you_know?: string | null
          what_you_need_to_learn?: string | null
        }
        Relationships: []
      }
      master_document_subjects: {
        Row: {
          catalyst_document_id: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          keywords: string[] | null
          last_synthesized_at: string | null
          source_count: number | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          catalyst_document_id?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          keywords?: string[] | null
          last_synthesized_at?: string | null
          source_count?: number | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          catalyst_document_id?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          keywords?: string[] | null
          last_synthesized_at?: string | null
          source_count?: number | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_document_subjects_catalyst_document_id_fkey"
            columns: ["catalyst_document_id"]
            isOneToOne: false
            referencedRelation: "catalyst_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      mind_maps: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean
          layout_mode: string | null
          map_data: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          layout_mode?: string | null
          map_data?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          layout_mode?: string | null
          map_data?: Json
          title?: string
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
          cover_color: string | null
          created_at: string
          deleted_at: string | null
          encrypted_content: string | null
          encryption_iv: string | null
          icon: string | null
          id: string
          is_encrypted: boolean | null
          is_favorite: boolean | null
          notebook_id: string | null
          permanent_delete_at: string | null
          position_x: number | null
          position_y: number | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          content?: string
          content_embedding?: string | null
          cover_color?: string | null
          created_at?: string
          deleted_at?: string | null
          encrypted_content?: string | null
          encryption_iv?: string | null
          icon?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_favorite?: boolean | null
          notebook_id?: string | null
          permanent_delete_at?: string | null
          position_x?: number | null
          position_y?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          content_embedding?: string | null
          cover_color?: string | null
          created_at?: string
          deleted_at?: string | null
          encrypted_content?: string | null
          encryption_iv?: string | null
          icon?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_favorite?: boolean | null
          notebook_id?: string | null
          permanent_delete_at?: string | null
          position_x?: number | null
          position_y?: number | null
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
      object_relation_values: {
        Row: {
          id: string
          object_id: string
          relation_id: string
          value_boolean: boolean | null
          value_date: string | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          id?: string
          object_id: string
          relation_id: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          id?: string
          object_id?: string
          relation_id?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_relation_values_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "space_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_relation_values_relation_id_fkey"
            columns: ["relation_id"]
            isOneToOne: false
            referencedRelation: "relation_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      object_sets: {
        Row: {
          created_at: string
          filters: Json | null
          group_by_relation_id: string | null
          icon: string | null
          id: string
          name: string
          object_type_id: string | null
          sorts: Json | null
          space_id: string
          updated_at: string
          user_id: string
          view_type: string | null
          visible_relations: Json | null
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          group_by_relation_id?: string | null
          icon?: string | null
          id?: string
          name: string
          object_type_id?: string | null
          sorts?: Json | null
          space_id: string
          updated_at?: string
          user_id: string
          view_type?: string | null
          visible_relations?: Json | null
        }
        Update: {
          created_at?: string
          filters?: Json | null
          group_by_relation_id?: string | null
          icon?: string | null
          id?: string
          name?: string
          object_type_id?: string | null
          sorts?: Json | null
          space_id?: string
          updated_at?: string
          user_id?: string
          view_type?: string | null
          visible_relations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "object_sets_group_by_relation_id_fkey"
            columns: ["group_by_relation_id"]
            isOneToOne: false
            referencedRelation: "relation_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_sets_object_type_id_fkey"
            columns: ["object_type_id"]
            isOneToOne: false
            referencedRelation: "object_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_sets_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      object_types: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_builtin: boolean | null
          name: string
          space_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_builtin?: boolean | null
          name: string
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_builtin?: boolean | null
          name?: string
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_types_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_insights: {
        Row: {
          category: string
          competitor_reference: string | null
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          priority: string | null
          recommendation: string | null
          reviewed_at: string | null
          source_reference: string | null
          status: string | null
          title: string
          utility_score: number | null
        }
        Insert: {
          category: string
          competitor_reference?: string | null
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          recommendation?: string | null
          reviewed_at?: string | null
          source_reference?: string | null
          status?: string | null
          title: string
          utility_score?: number | null
        }
        Update: {
          category?: string
          competitor_reference?: string | null
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          recommendation?: string | null
          reviewed_at?: string | null
          source_reference?: string | null
          status?: string | null
          title?: string
          utility_score?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_me: string | null
          auto_master_docs: boolean | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          engagement_nudges_enabled: boolean
          id: string
          is_visible: boolean | null
          last_activity_at: string | null
          last_nudge_sent_at: string | null
          updated_at: string
          user_id: string
          user_status: Database["public"]["Enums"]["user_status"] | null
        }
        Insert: {
          about_me?: string | null
          auto_master_docs?: boolean | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          engagement_nudges_enabled?: boolean
          id?: string
          is_visible?: boolean | null
          last_activity_at?: string | null
          last_nudge_sent_at?: string | null
          updated_at?: string
          user_id: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
        }
        Update: {
          about_me?: string | null
          auto_master_docs?: boolean | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          engagement_nudges_enabled?: boolean
          id?: string
          is_visible?: boolean | null
          last_activity_at?: string | null
          last_nudge_sent_at?: string | null
          updated_at?: string
          user_id?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          can_assign_tasks: boolean
          collaborator_id: string
          created_at: string
          hierarchy_level: number
          id: string
          invited_at: string
          owner_id: string
          project_id: string
          role: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          can_assign_tasks?: boolean
          collaborator_id: string
          created_at?: string
          hierarchy_level?: number
          id?: string
          invited_at?: string
          owner_id: string
          project_id: string
          role?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          can_assign_tasks?: boolean
          collaborator_id?: string
          created_at?: string
          hierarchy_level?: number
          id?: string
          invited_at?: string
          owner_id?: string
          project_id?: string
          role?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          sort_order: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          due_date: string
          id: string
          is_favorite: boolean
          name: string
          notes: string | null
          parent_task_id: string | null
          priority: string
          project_id: string | null
          repeat_type: string
          repeat_until: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          due_date: string
          id?: string
          is_favorite?: boolean
          name: string
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          project_id?: string | null
          repeat_type?: string
          repeat_until?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          due_date?: string
          id?: string
          is_favorite?: boolean
          name?: string
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          project_id?: string | null
          repeat_type?: string
          repeat_until?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          budget_spent: number | null
          client_email: string | null
          client_name: string | null
          color: string | null
          created_at: string
          custom_titles: Json
          description: string | null
          due_date: string | null
          icon: string | null
          id: string
          industry: string | null
          is_archived: boolean | null
          is_favorite: boolean | null
          name: string
          priority: string
          start_date: string | null
          status: string
          tags: string[] | null
          title_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          budget_spent?: number | null
          client_email?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          custom_titles?: Json
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          industry?: string | null
          is_archived?: boolean | null
          is_favorite?: boolean | null
          name: string
          priority?: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          budget_spent?: number | null
          client_email?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          custom_titles?: Json
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          industry?: string | null
          is_archived?: boolean | null
          is_favorite?: boolean | null
          name?: string
          priority?: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_captures: {
        Row: {
          content: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_funnel_leads: {
        Row: {
          coupon_code: string | null
          created_at: string
          email: string
          id: string
          priorities: string[] | null
          satisfaction: string | null
          tools_used: string[] | null
          usage_duration: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          email: string
          id?: string
          priorities?: string[] | null
          satisfaction?: string | null
          tools_used?: string[] | null
          usage_duration?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          email?: string
          id?: string
          priorities?: string[] | null
          satisfaction?: string | null
          tools_used?: string[] | null
          usage_duration?: string | null
        }
        Relationships: []
      }
      reading_list: {
        Row: {
          author: string | null
          book_key: string
          cover_id: number | null
          created_at: string | null
          id: string
          notes: string | null
          rating: number | null
          status: string | null
          subjects: Json | null
          title: string
          updated_at: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          author?: string | null
          book_key: string
          cover_id?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          status?: string | null
          subjects?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          author?: string | null
          book_key?: string
          cover_id?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          status?: string | null
          subjects?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
          year?: number | null
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
      relation_definitions: {
        Row: {
          created_at: string
          formula_expression: string | null
          id: string
          is_builtin: boolean | null
          name: string
          options: Json | null
          relation_type: string
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          formula_expression?: string | null
          id?: string
          is_builtin?: boolean | null
          name: string
          options?: Json | null
          relation_type?: string
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          formula_expression?: string | null
          id?: string
          is_builtin?: boolean | null
          name?: string
          options?: Json | null
          relation_type?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relation_definitions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          id: string
          is_sent: boolean
          item_id: string
          item_title: string
          item_type: string
          offset_minutes: number
          remind_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_sent?: boolean
          item_id: string
          item_title?: string
          item_type: string
          offset_minutes?: number
          remind_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_sent?: boolean
          item_id?: string
          item_title?: string
          item_type?: string
          offset_minutes?: number
          remind_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_courses: {
        Row: {
          certificate_earned: boolean
          certificate_url: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          duration: string | null
          id: string
          is_free: boolean | null
          notes: string | null
          provider: string | null
          status: string | null
          syllabus: Json | null
          title: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          certificate_earned?: boolean
          certificate_url?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: string | null
          id?: string
          is_free?: boolean | null
          notes?: string | null
          provider?: string | null
          status?: string | null
          syllabus?: Json | null
          title: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          certificate_earned?: boolean
          certificate_url?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: string | null
          id?: string
          is_free?: boolean | null
          notes?: string | null
          provider?: string | null
          status?: string | null
          syllabus?: Json | null
          title?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      scratchpad_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
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
      seo_applied_techniques: {
        Row: {
          action_type: string
          applied_at: string
          category: string
          classification: string
          confidence: number | null
          description: string
          id: string
          run_id: string | null
          source_url: string | null
          technique_signature: string
          title: string
        }
        Insert: {
          action_type: string
          applied_at?: string
          category: string
          classification: string
          confidence?: number | null
          description: string
          id?: string
          run_id?: string | null
          source_url?: string | null
          technique_signature: string
          title: string
        }
        Update: {
          action_type?: string
          applied_at?: string
          category?: string
          classification?: string
          confidence?: number | null
          description?: string
          id?: string
          run_id?: string | null
          source_url?: string | null
          technique_signature?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_applied_techniques_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_improvement_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_change_log: {
        Row: {
          after_data: Json | null
          applied_technique_id: string | null
          before_data: Json | null
          created_at: string
          id: string
          reverted_at: string | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          after_data?: Json | null
          applied_technique_id?: string | null
          before_data?: Json | null
          created_at?: string
          id?: string
          reverted_at?: string | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          after_data?: Json | null
          applied_technique_id?: string | null
          before_data?: Json | null
          created_at?: string
          id?: string
          reverted_at?: string | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_change_log_applied_technique_id_fkey"
            columns: ["applied_technique_id"]
            isOneToOne: false
            referencedRelation: "seo_applied_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_engine_settings: {
        Row: {
          categories: Json
          created_at: string
          enabled: boolean
          id: number
          last_run_at: string | null
          max_auto_per_run: number
          max_queued_per_run: number
          next_scheduled_at: string | null
          updated_at: string
        }
        Insert: {
          categories?: Json
          created_at?: string
          enabled?: boolean
          id?: number
          last_run_at?: string | null
          max_auto_per_run?: number
          max_queued_per_run?: number
          next_scheduled_at?: string | null
          updated_at?: string
        }
        Update: {
          categories?: Json
          created_at?: string
          enabled?: boolean
          id?: number
          last_run_at?: string | null
          max_auto_per_run?: number
          max_queued_per_run?: number
          next_scheduled_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_faq_entries: {
        Row: {
          active: boolean
          answer: string
          created_at: string
          id: string
          question: string
          route_pattern: string
          sort_order: number
          source_technique_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer: string
          created_at?: string
          id?: string
          question: string
          route_pattern: string
          sort_order?: number
          source_technique_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer?: string
          created_at?: string
          id?: string
          question?: string
          route_pattern?: string
          sort_order?: number
          source_technique_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_faq_entries_source_technique_id_fkey"
            columns: ["source_technique_id"]
            isOneToOne: false
            referencedRelation: "seo_applied_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_improvement_runs: {
        Row: {
          applied_count: number
          error: string | null
          finished_at: string | null
          id: string
          queued_count: number
          raw_research: Json | null
          skipped_count: number
          started_at: string
          status: string
          techniques_found: number
          triggered_by: string
        }
        Insert: {
          applied_count?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          queued_count?: number
          raw_research?: Json | null
          skipped_count?: number
          started_at?: string
          status?: string
          techniques_found?: number
          triggered_by?: string
        }
        Update: {
          applied_count?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          queued_count?: number
          raw_research?: Json | null
          skipped_count?: number
          started_at?: string
          status?: string
          techniques_found?: number
          triggered_by?: string
        }
        Relationships: []
      }
      seo_jsonld: {
        Row: {
          active: boolean
          created_at: string
          id: string
          route_pattern: string
          schema_json: Json
          schema_type: string
          source_technique_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          route_pattern: string
          schema_json: Json
          schema_type: string
          source_technique_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          route_pattern?: string
          schema_json?: Json
          schema_type?: string
          source_technique_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_jsonld_source_technique_id_fkey"
            columns: ["source_technique_id"]
            isOneToOne: false
            referencedRelation: "seo_applied_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_llms_content: {
        Row: {
          id: number
          llms_full_txt: string
          llms_txt: string
          source_technique_id: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          llms_full_txt?: string
          llms_txt?: string
          source_technique_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          llms_full_txt?: string
          llms_txt?: string
          source_technique_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_llms_content_source_technique_id_fkey"
            columns: ["source_technique_id"]
            isOneToOne: false
            referencedRelation: "seo_applied_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_overrides: {
        Row: {
          active: boolean
          created_at: string
          field: string
          id: string
          route_pattern: string
          source_technique_id: string | null
          updated_at: string
          value: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          field: string
          id?: string
          route_pattern: string
          source_technique_id?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          active?: boolean
          created_at?: string
          field?: string
          id?: string
          route_pattern?: string
          source_technique_id?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_overrides_source_technique_id_fkey"
            columns: ["source_technique_id"]
            isOneToOne: false
            referencedRelation: "seo_applied_techniques"
            referencedColumns: ["id"]
          },
        ]
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
      shared_items: {
        Row: {
          cloned_item_id: string | null
          created_at: string
          id: string
          item_id: string
          item_type: Database["public"]["Enums"]["shared_item_type"]
          last_viewed_at: string | null
          message: string | null
          owner_id: string
          permission: Database["public"]["Enums"]["share_permission"]
          recipient_id: string
          share_mode: Database["public"]["Enums"]["share_mode"]
          status: Database["public"]["Enums"]["share_status"]
          updated_at: string
        }
        Insert: {
          cloned_item_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_type: Database["public"]["Enums"]["shared_item_type"]
          last_viewed_at?: string | null
          message?: string | null
          owner_id: string
          permission?: Database["public"]["Enums"]["share_permission"]
          recipient_id: string
          share_mode?: Database["public"]["Enums"]["share_mode"]
          status?: Database["public"]["Enums"]["share_status"]
          updated_at?: string
        }
        Update: {
          cloned_item_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: Database["public"]["Enums"]["shared_item_type"]
          last_viewed_at?: string | null
          message?: string | null
          owner_id?: string
          permission?: Database["public"]["Enums"]["share_permission"]
          recipient_id?: string
          share_mode?: Database["public"]["Enums"]["share_mode"]
          status?: Database["public"]["Enums"]["share_status"]
          updated_at?: string
        }
        Relationships: []
      }
      space_collaborators: {
        Row: {
          accepted_at: string | null
          collaborator_id: string
          created_at: string
          id: string
          invited_at: string
          owner_id: string
          permission: string
          space_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          collaborator_id: string
          created_at?: string
          id?: string
          invited_at?: string
          owner_id: string
          permission?: string
          space_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          collaborator_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          owner_id?: string
          permission?: string
          space_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      space_linked_items: {
        Row: {
          added_by: string
          created_at: string
          id: string
          item_id: string
          item_type: Database["public"]["Enums"]["shared_item_type"]
          notes: string | null
          position: number
          space_id: string
          user_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          item_id: string
          item_type: Database["public"]["Enums"]["shared_item_type"]
          notes?: string | null
          position?: number
          space_id: string
          user_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: Database["public"]["Enums"]["shared_item_type"]
          notes?: string | null
          position?: number
          space_id?: string
          user_id?: string
        }
        Relationships: []
      }
      space_object_activity: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          object_id: string
          space_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          object_id: string
          space_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          object_id?: string
          space_id?: string
        }
        Relationships: []
      }
      space_object_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          object_id: string
          parent_id: string | null
          resolved: boolean
          space_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          object_id: string
          parent_id?: string | null
          resolved?: boolean
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          object_id?: string
          parent_id?: string | null
          resolved?: boolean
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_object_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "space_object_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      space_objects: {
        Row: {
          content: string | null
          created_at: string
          deleted_at: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          is_favorite: boolean | null
          name: string
          object_type_id: string
          space_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_favorite?: boolean | null
          name?: string
          object_type_id: string
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_favorite?: boolean | null
          name?: string
          object_type_id?: string
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_objects_object_type_id_fkey"
            columns: ["object_type_id"]
            isOneToOne: false
            referencedRelation: "object_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_objects_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_widgets: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          order_index: number | null
          space_id: string
          user_id: string
          widget_type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          order_index?: number | null
          space_id: string
          user_id: string
          widget_type: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          order_index?: number | null
          space_id?: string
          user_id?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_widgets_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_product_id: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_product_id: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_product_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      synthesis_queue: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          trigger_item_id: string | null
          trigger_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          trigger_item_id?: string | null
          trigger_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          trigger_item_id?: string | null
          trigger_type?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_time: number | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          estimated_time: number | null
          id: string
          is_active: boolean | null
          is_completed: boolean | null
          list: string | null
          notes: string | null
          parent_task_id: string | null
          priority: string | null
          recurrence_pattern: string | null
          start_time: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_time?: number | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          list?: string | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string | null
          recurrence_pattern?: string | null
          start_time?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_time?: number | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          list?: string | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string | null
          recurrence_pattern?: string | null
          start_time?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_test_history: {
        Row: {
          created_at: string
          duration_ms: number
          failed: number
          id: string
          passed: number
          results: Json
          total_tests: number
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          duration_ms: number
          failed: number
          id?: string
          passed: number
          results: Json
          total_tests: number
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number
          failed?: number
          id?: string
          passed?: number
          results?: Json
          total_tests?: number
          triggered_by?: string | null
        }
        Relationships: []
      }
      type_relations: {
        Row: {
          id: string
          is_required: boolean | null
          object_type_id: string
          order_index: number | null
          relation_id: string
        }
        Insert: {
          id?: string
          is_required?: boolean | null
          object_type_id: string
          order_index?: number | null
          relation_id: string
        }
        Update: {
          id?: string
          is_required?: boolean | null
          object_type_id?: string
          order_index?: number | null
          relation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "type_relations_object_type_id_fkey"
            columns: ["object_type_id"]
            isOneToOne: false
            referencedRelation: "object_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "type_relations_relation_id_fkey"
            columns: ["relation_id"]
            isOneToOne: false
            referencedRelation: "relation_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          day_of_week: number
          hour_of_day: number
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          day_of_week: number
          hour_of_day: number
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          day_of_week?: number
          hour_of_day?: number
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          config: Json
          connected_at: string
          id: string
          integration_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          connected_at?: string
          id?: string
          integration_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          connected_at?: string
          id?: string
          integration_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          auto_delete_days: number
          created_at: string
          encryption_enabled: boolean | null
          encryption_key_salt: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_delete_days?: number
          created_at?: string
          encryption_enabled?: boolean | null
          encryption_key_salt?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_delete_days?: number
          created_at?: string
          encryption_enabled?: boolean | null
          encryption_key_salt?: string | null
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
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          results: Json | null
          results_count: number | null
          started_at: string
          status: Database["public"]["Enums"]["workflow_status"]
          user_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          results?: Json | null
          results_count?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          user_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          results?: Json | null
          results_count?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_results: {
        Row: {
          content: string
          created_at: string
          execution_id: string
          id: string
          metadata: Json | null
          relevance_score: number | null
          saved_as_card_id: string | null
          saved_as_note_id: string | null
          saved_to_notebook_id: string | null
          source_url: string | null
          title: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          content: string
          created_at?: string
          execution_id: string
          id?: string
          metadata?: Json | null
          relevance_score?: number | null
          saved_as_card_id?: string | null
          saved_as_note_id?: string | null
          saved_to_notebook_id?: string | null
          source_url?: string | null
          title: string
          user_id: string
          workflow_id: string
        }
        Update: {
          content?: string
          created_at?: string
          execution_id?: string
          id?: string
          metadata?: Json | null
          relevance_score?: number | null
          saved_as_card_id?: string | null
          saved_as_note_id?: string | null
          saved_to_notebook_id?: string | null
          source_url?: string | null
          title?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_results_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_results_saved_as_card_id_fkey"
            columns: ["saved_as_card_id"]
            isOneToOne: false
            referencedRelation: "zettel_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_results_saved_as_note_id_fkey"
            columns: ["saved_as_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_results_saved_to_notebook_id_fkey"
            columns: ["saved_to_notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_results_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          execution_count: number
          id: string
          last_executed_at: string | null
          name: string
          next_execution_at: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          updated_at: string
          user_id: string
          workflow_type: Database["public"]["Enums"]["workflow_type"]
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          last_executed_at?: string | null
          name: string
          next_execution_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
          user_id: string
          workflow_type?: Database["public"]["Enums"]["workflow_type"]
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          last_executed_at?: string | null
          name?: string
          next_execution_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
          user_id?: string
          workflow_type?: Database["public"]["Enums"]["workflow_type"]
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
          encrypted_content: string | null
          encryption_iv: string | null
          id: string
          image_url: string | null
          is_encrypted: boolean | null
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
          encrypted_content?: string | null
          encryption_iv?: string | null
          id?: string
          image_url?: string | null
          is_encrypted?: boolean | null
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
          encrypted_content?: string | null
          encryption_iv?: string | null
          id?: string
          image_url?: string | null
          is_encrypted?: boolean | null
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
      calculate_next_execution: {
        Args: { base_time: string; workflow_config: Json }
        Returns: string
      }
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
      has_premium_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_share_access: {
        Args: {
          _item_id: string
          _item_type: Database["public"]["Enums"]["shared_item_type"]
          _required?: Database["public"]["Enums"]["share_permission"]
        }
        Returns: boolean
      }
      has_space_access: {
        Args: { _required?: string; _space_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_domain_banned: { Args: { email_address: string }; Returns: boolean }
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
      report_error: {
        Args: {
          p_column_number?: number
          p_error_message: string
          p_error_signature: string
          p_error_type: string
          p_filename?: string
          p_line_number?: number
          p_severity?: string
          p_stack_trace?: string
          p_url?: string
          p_user_agent?: string
        }
        Returns: string
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
      toggle_feature_vote: { Args: { _feature_id: string }; Returns: boolean }
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
      share_mode: "copy" | "collaborate"
      share_permission: "view" | "edit"
      share_status: "pending" | "accepted" | "declined"
      shareable_content_type:
        | "card"
        | "note"
        | "scratchpad"
        | "stickynote"
        | "notebook"
      shared_item_type:
        | "zettel_card"
        | "note"
        | "file"
        | "mind_map"
        | "catalyst_document"
        | "sticky_note"
        | "scratchpad"
        | "space"
        | "space_object"
      sharing_permission: "view" | "edit"
      user_status: "online" | "busy" | "away" | "dnd" | "offline"
      workflow_status: "active" | "paused" | "completed" | "failed"
      workflow_type: "monitor_topic" | "periodic_search" | "keyword_alert"
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
      share_mode: ["copy", "collaborate"],
      share_permission: ["view", "edit"],
      share_status: ["pending", "accepted", "declined"],
      shareable_content_type: [
        "card",
        "note",
        "scratchpad",
        "stickynote",
        "notebook",
      ],
      shared_item_type: [
        "zettel_card",
        "note",
        "file",
        "mind_map",
        "catalyst_document",
        "sticky_note",
        "scratchpad",
        "space",
        "space_object",
      ],
      sharing_permission: ["view", "edit"],
      user_status: ["online", "busy", "away", "dnd", "offline"],
      workflow_status: ["active", "paused", "completed", "failed"],
      workflow_type: ["monitor_topic", "periodic_search", "keyword_alert"],
    },
  },
} as const

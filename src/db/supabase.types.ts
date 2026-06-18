/**
 * Supabase Database types — regenerate when schema changes:
 * npx supabase gen types typescript --project-id <ref> > src/db/supabase.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          plan: "free" | "pro" | "team";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          plan?: "free" | "pro" | "team";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          plan?: "free" | "pro" | "team";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      contexts: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          color: string;
          description: string | null;
          position: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          color: string;
          description?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          color?: string;
          description?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          workspace_id: string;
          context_id: string;
          name: string;
          description: string | null;
          color: string | null;
          position: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          context_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          context_id?: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      group_links: {
        Row: {
          id: string;
          workspace_id: string;
          group_id: string;
          label: string | null;
          url: string;
          kind: "url" | "folder";
          position: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          group_id: string;
          label?: string | null;
          url: string;
          kind?: "url" | "folder";
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          group_id?: string;
          label?: string | null;
          url?: string;
          kind?: "url" | "folder";
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          context_id: string;
          group_id: string | null;
          title: string;
          description: string | null;
          state: "todo" | "in_progress" | "testing" | "done";
          is_today: boolean;
          start_date: string | null;
          end_date: string | null;
          position: number;
          recurrence: "none" | "daily" | "weekly";
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          assignee_id: string | null;
          created_by_id: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          context_id: string;
          group_id?: string | null;
          title: string;
          description?: string | null;
          state?: "todo" | "in_progress" | "testing" | "done";
          is_today?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          position?: number;
          recurrence?: "none" | "daily" | "weekly";
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          assignee_id?: string | null;
          created_by_id?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          context_id?: string;
          group_id?: string | null;
          title?: string;
          description?: string | null;
          state?: "todo" | "in_progress" | "testing" | "done";
          is_today?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          position?: number;
          recurrence?: "none" | "daily" | "weekly";
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          assignee_id?: string | null;
          created_by_id?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      task_comments: {
        Row: {
          id: string;
          workspace_id: string;
          task_id: string;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          task_id: string;
          author_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          task_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean };
      get_workspace_role: {
        Args: { ws_id: string };
        Returns: "owner" | "admin" | "member";
      };
      create_workspace: {
        Args: { workspace_name: string };
        Returns: {
          id: string;
          name: string;
          slug: string | null;
          plan: "free" | "pro" | "team";
        }[];
      };
      list_workspace_members: {
        Args: { p_workspace_id: string };
        Returns: {
          user_id: string;
          email: string;
          display_name: string | null;
          role: "owner" | "admin" | "member";
          created_at: string;
        }[];
      };
      invite_workspace_member: {
        Args: {
          p_workspace_id: string;
          p_email: string;
          p_role?: "owner" | "admin" | "member";
        };
        Returns: {
          user_id: string;
          email: string;
          display_name: string | null;
          role: "owner" | "admin" | "member";
          created_at: string;
        }[];
      };
      remove_workspace_member: {
        Args: { p_workspace_id: string; p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      task_state: "todo" | "in_progress" | "testing" | "done";
      task_recurrence: "none" | "daily" | "weekly";
      group_link_kind: "url" | "folder";
      workspace_role: "owner" | "admin" | "member";
      workspace_plan: "free" | "pro" | "team";
    };
  };
};

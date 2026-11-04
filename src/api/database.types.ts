// Типы базы для supabase-js. Формат совпадает с тем, что генерирует
// `npx supabase gen types typescript --project-id <id>`, — после создания
// проекта файл можно перегенерировать этой командой и сравнить.
//
// Это контракт между базой и фронтом: если меняется миграция, меняется и этот файл.

export type AppRole = 'manager' | 'executor';
export type TaskStatus = 'new' | 'in_progress' | 'review' | 'accepted' | 'rework';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: AppRole;
          created_at: string;
        };
        Insert: never; // профили создаёт только триггер на auth.users
        Update: never; // через API менять нельзя (нет гранта)
        Relationships: [];
      };
      objects: {
        Row: {
          id: string;
          name: string;
          address: string;
          created_by: string;
          created_at: string;
        };
        Insert: { name: string; address: string };
        Update: { name?: string; address?: string };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          object_id: string;
          assignee_id: string;
          status: TaskStatus;
          author_id: string;
          created_at: string;
          updated_at: string;
        };
        // status, author_id, created_at клиент не передаёт: их ставит база
        Insert: {
          title: string;
          description?: string;
          object_id: string;
          assignee_id: string;
        };
        Update: {
          title?: string;
          description?: string;
          object_id?: string;
          assignee_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_object_id_fkey';
            columns: ['object_id'];
            isOneToOne: false;
            referencedRelation: 'objects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_history: {
        Row: {
          id: number;
          task_id: string;
          from_status: TaskStatus | null; // null = задача создана
          to_status: TaskStatus;
          changed_by: string;
          comment: string | null;
          created_at: string;
        };
        Insert: never; // пишет только триггер
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'task_history_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      change_task_status: {
        Args: { p_task_id: string; p_to: TaskStatus; p_comment?: string | null };
        Returns: Database['public']['Tables']['tasks']['Row'];
      };
      is_manager: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
      task_status: TaskStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type CrmObject = Database['public']['Tables']['objects']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskHistoryEntry = Database['public']['Tables']['task_history']['Row'];

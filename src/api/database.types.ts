export type AppRole = 'manager' | 'executor';
export type TaskStatus = 'new' | 'in_progress' | 'review' | 'accepted' | 'rework';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ObjectStatus = 'planning' | 'active' | 'paused' | 'completed';
export type ExpenseCategory = 'materials' | 'labor' | 'equipment' | 'transport' | 'other';

export type ObjectWrite = {
  name: string;
  address: string;
  status?: ObjectStatus;
  client?: string;
  description?: string;
  budget?: number;
  start_date?: string | null;
  end_date?: string | null;
};

export type ExpenseWrite = {
  object_id: string;
  category: ExpenseCategory;
  amount: number;
  spent_on: string;
  description?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: AppRole;
          phone: string;
          position: string;
          created_at: string;
        };
        Insert: never;
        Update: { full_name?: string; phone?: string; position?: string };
        Relationships: [];
      };
      objects: {
        Row: {
          id: string;
          name: string;
          address: string;
          status: ObjectStatus;
          client: string;
          description: string;
          budget: number;
          start_date: string | null;
          end_date: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: ObjectWrite;
        Update: Partial<ObjectWrite>;
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
          priority: TaskPriority;
          due_date: string | null;
          author_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description?: string;
          object_id: string;
          assignee_id: string;
          priority?: TaskPriority;
          due_date?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          object_id?: string;
          assignee_id?: string;
          priority?: TaskPriority;
          due_date?: string | null;
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
          from_status: TaskStatus | null;
          to_status: TaskStatus;
          changed_by: string;
          comment: string | null;
          created_at: string;
        };
        Insert: never;
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
      task_comments: {
        Row: {
          id: number;
          task_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: { task_id: string; body: string };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'task_comments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          object_id: string;
          category: ExpenseCategory;
          amount: number;
          spent_on: string;
          description: string;
          created_by: string;
          created_at: string;
        };
        Insert: ExpenseWrite;
        Update: Partial<ExpenseWrite>;
        Relationships: [
          {
            foreignKeyName: 'expenses_object_id_fkey';
            columns: ['object_id'];
            isOneToOne: false;
            referencedRelation: 'objects';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      object_summary: {
        Row: {
          object_id: string;
          tasks_total: number;
          tasks_done: number;
          tasks_review: number;
          tasks_overdue: number;
          spent: number;
        };
        Relationships: [];
      };
    };
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
      task_priority: TaskPriority;
      object_status: ObjectStatus;
      expense_category: ExpenseCategory;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type CrmObject = Database['public']['Tables']['objects']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskHistoryEntry = Database['public']['Tables']['task_history']['Row'];
export type ObjectSummary = Database['public']['Views']['object_summary']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];
export type TaskComment = Database['public']['Tables']['task_comments']['Row'];

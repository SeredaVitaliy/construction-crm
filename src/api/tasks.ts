import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { TaskPriority, TaskStatus } from './database.types';

export type TaskInput = {
  title: string;
  description: string;
  object_id: string;
  assignee_id: string;
  priority: TaskPriority;
  due_date: string | null;
};

const TASK_LIST_FIELDS =
  'id, title, status, priority, due_date, created_at, updated_at, object_id, assignee_id, object:objects(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, email)';

export async function fetchTasks() {
  return unwrap(await supabase.from('tasks').select(TASK_LIST_FIELDS).order('created_at', { ascending: false }));
}

export async function fetchTasksByObject(objectId: string) {
  return unwrap(
    await supabase
      .from('tasks')
      .select(TASK_LIST_FIELDS)
      .eq('object_id', objectId)
      .order('created_at', { ascending: false }),
  );
}

export type TaskListItem = NonNullable<Awaited<ReturnType<typeof fetchTasks>>>[number];

export async function fetchTask(id: string) {
  return unwrap(
    await supabase
      .from('tasks')
      .select(
        '*, object:objects(id, name, address), assignee:profiles!tasks_assignee_id_fkey(id, full_name, email, phone, position), author:profiles!tasks_author_id_fkey(full_name)',
      )
      .eq('id', id)
      .maybeSingle(),
  );
}

export type TaskDetails = NonNullable<Awaited<ReturnType<typeof fetchTask>>>;

export async function fetchTaskHistory(taskId: string) {
  return unwrap(
    await supabase
      .from('task_history')
      .select('*, author:profiles!task_history_changed_by_fkey(full_name)')
      .eq('task_id', taskId)
      .order('id'),
  );
}

export type HistoryItem = NonNullable<Awaited<ReturnType<typeof fetchTaskHistory>>>[number];

export async function fetchRecentHistory(limit = 12) {
  return unwrap(
    await supabase
      .from('task_history')
      .select('*, author:profiles!task_history_changed_by_fkey(full_name), task:tasks(id, title)')
      .order('created_at', { ascending: false })
      .limit(limit),
  );
}

export type RecentHistoryItem = NonNullable<Awaited<ReturnType<typeof fetchRecentHistory>>>[number];

export async function fetchTaskComments(taskId: string) {
  return unwrap(
    await supabase
      .from('task_comments')
      .select('*, author:profiles!task_comments_author_id_fkey(id, full_name, role)')
      .eq('task_id', taskId)
      .order('created_at'),
  );
}

export type CommentItem = NonNullable<Awaited<ReturnType<typeof fetchTaskComments>>>[number];

export async function fetchRecentComments(limit = 8) {
  return unwrap(
    await supabase
      .from('task_comments')
      .select('*, author:profiles!task_comments_author_id_fkey(id, full_name), task:tasks(id, title)')
      .order('created_at', { ascending: false })
      .limit(limit),
  );
}

export type RecentCommentItem = NonNullable<Awaited<ReturnType<typeof fetchRecentComments>>>[number];

export async function addTaskComment(taskId: string, body: string) {
  return unwrap(await supabase.from('task_comments').insert({ task_id: taskId, body }).select('id').single());
}

export async function deleteTaskComment(id: number) {
  unwrap(await supabase.from('task_comments').delete().eq('id', id));
}

export async function createTask(input: TaskInput) {
  return unwrap(await supabase.from('tasks').insert(input).select('id').single());
}

export async function updateTask(id: string, input: TaskInput) {
  return unwrap(await supabase.from('tasks').update(input).eq('id', id).select('id').single());
}

export async function deleteTask(id: string) {
  unwrap(await supabase.from('tasks').delete().eq('id', id));
}

export async function changeTaskStatus(taskId: string, to: TaskStatus, comment?: string) {
  return unwrap(
    await supabase.rpc('change_task_status', {
      p_task_id: taskId,
      p_to: to,
      p_comment: comment?.trim() || null,
    }),
  );
}

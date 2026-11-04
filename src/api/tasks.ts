import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { TaskStatus } from './database.types';

export type TaskInput = {
  title: string;
  description: string;
  object_id: string;
  assignee_id: string;
};

// У tasks две ссылки на profiles (исполнитель и автор), поэтому имя связи указано явно
const TASK_LIST_FIELDS =
  'id, title, status, created_at, object_id, assignee_id, object:objects(id, name), assignee:profiles!tasks_assignee_id_fkey(full_name)';

export async function fetchTasksByObject(objectId: string) {
  return unwrap(
    await supabase.from('tasks').select(TASK_LIST_FIELDS).eq('object_id', objectId).order('created_at'),
  );
}

export async function fetchTasksByAssignee(userId: string) {
  return unwrap(
    await supabase
      .from('tasks')
      .select(TASK_LIST_FIELDS)
      .eq('assignee_id', userId)
      .order('created_at', { ascending: false }),
  );
}

export type TaskListItem = NonNullable<Awaited<ReturnType<typeof fetchTasksByObject>>>[number];

export async function fetchTask(id: string) {
  return unwrap(
    await supabase
      .from('tasks')
      .select(
        '*, object:objects(id, name, address), assignee:profiles!tasks_assignee_id_fkey(full_name), author:profiles!tasks_author_id_fkey(full_name)',
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
      .order('id'), // по id: у шагов одной транзакции одинаковое время
  );
}

export type HistoryItem = NonNullable<Awaited<ReturnType<typeof fetchTaskHistory>>>[number];

// status и author_id не передаём: их ставит база
export async function createTask(input: TaskInput) {
  return unwrap(await supabase.from('tasks').insert(input).select('id').single());
}

export async function updateTask(id: string, input: TaskInput) {
  return unwrap(await supabase.from('tasks').update(input).eq('id', id).select('id').single());
}

export async function deleteTask(id: string) {
  unwrap(await supabase.from('tasks').delete().eq('id', id));
}

// Единственный способ сменить статус. Все правила проверяет база.
export async function changeTaskStatus(taskId: string, to: TaskStatus, comment?: string) {
  return unwrap(
    await supabase.rpc('change_task_status', {
      p_task_id: taskId,
      p_to: to,
      p_comment: comment?.trim() || null,
    }),
  );
}

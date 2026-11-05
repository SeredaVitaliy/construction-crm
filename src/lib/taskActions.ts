import type { Profile, Task, TaskStatus } from '@/api/database.types';

export type TaskAction = {
  to: TaskStatus;
  label: string;
  needsComment: boolean;
  danger?: boolean;
};

type Rule = TaskAction & { from: TaskStatus; who: 'assignee' | 'manager' };

const RULES: Rule[] = [
  { from: 'new', to: 'in_progress', who: 'assignee', label: 'Взять в работу', needsComment: false },
  { from: 'in_progress', to: 'review', who: 'assignee', label: 'Отправить на проверку', needsComment: false },
  { from: 'review', to: 'accepted', who: 'manager', label: 'Принять', needsComment: false },
  { from: 'review', to: 'rework', who: 'manager', label: 'Вернуть на доработку', needsComment: true, danger: true },
  { from: 'rework', to: 'in_progress', who: 'assignee', label: 'Взять в работу', needsComment: false },
];

export function getAvailableActions(
  task: Pick<Task, 'status' | 'assignee_id'>,
  profile: Pick<Profile, 'id' | 'role'>,
): TaskAction[] {
  return RULES.filter((rule) => {
    if (rule.from !== task.status) return false;
    if (rule.who === 'manager') return profile.role === 'manager';
    return task.assignee_id === profile.id;
  }).map(({ to, label, needsComment, danger }) => ({ to, label, needsComment, danger }));
}

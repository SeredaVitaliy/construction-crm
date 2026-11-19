import type { PostgrestError } from '@supabase/supabase-js';

export function errorText(error: PostgrestError | Error | null | undefined): string {
  if (!error) return 'Неизвестная ошибка';
  const code = 'code' in error ? error.code : undefined;
  switch (code) {
    case '23503':
      return 'Нельзя удалить: есть связанные задачи или расходы. Сначала удалите или перенесите их.';
    case '23514':
      return error.message.includes('_check')
        ? 'Проверьте значения: дата окончания не раньше начала, суммы — положительные'
        : error.message;
    case '42501':
      return error.message.startsWith('permission denied') ? 'Недостаточно прав для этого действия' : error.message;
    case 'PGRST116':
      return 'Запись не найдена или нет доступа';
    default:
      return error.message;
  }
}

export function unwrap<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw new Error(errorText(res.error));
  return res.data;
}

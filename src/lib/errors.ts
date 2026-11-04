import type { PostgrestError } from '@supabase/supabase-js';

// Ошибки триггеров приходят уже на русском — показываем как есть.
// Системные ошибки Postgres переводим в понятный пользователю текст.
export function errorText(error: PostgrestError | Error | null | undefined): string {
  if (!error) return 'Неизвестная ошибка';
  const code = 'code' in error ? error.code : undefined;
  switch (code) {
    case '23503':
      return 'Нельзя удалить: есть связанные задачи. Сначала удалите или перенесите их.';
    case '42501':
      return error.message.startsWith('permission denied')
        ? 'Недостаточно прав для этого действия'
        : error.message;
    case 'PGRST116':
      return 'Запись не найдена или нет доступа';
    default:
      return error.message;
  }
}

// supabase-js не бросает исключения, а возвращает { data, error }.
// Этот помощник превращает error в исключение, чтобы в компонентах был обычный try/catch.
export function unwrap<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw new Error(errorText(res.error));
  return res.data;
}

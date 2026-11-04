import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/api/database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (см. .env.example)');
}

// Во фронте только публичный ключ. Он безопасен, потому что сам по себе
// ничего не разрешает: все права проверяет база (RLS + гранты + триггеры).
export const supabase = createClient<Database>(url, anonKey);

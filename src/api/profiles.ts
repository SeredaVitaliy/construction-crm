import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';

export async function fetchProfile(id: string) {
  return unwrap(await supabase.from('profiles').select('*').eq('id', id).single());
}

export async function fetchExecutors() {
  return unwrap(
    await supabase.from('profiles').select('id, full_name, email').eq('role', 'executor').order('full_name'),
  );
}

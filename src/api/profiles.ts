import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';

export type ProfileInput = { full_name: string; phone: string; position: string };

export async function fetchProfile(id: string) {
  return unwrap(await supabase.from('profiles').select('*').eq('id', id).single());
}

export async function fetchProfiles() {
  return unwrap(await supabase.from('profiles').select('*').order('full_name'));
}

export async function fetchExecutors() {
  return unwrap(
    await supabase.from('profiles').select('id, full_name, email').eq('role', 'executor').order('full_name'),
  );
}

export async function updateProfile(id: string, input: ProfileInput) {
  return unwrap(await supabase.from('profiles').update(input).eq('id', id).select('*').single());
}

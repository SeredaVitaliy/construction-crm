import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';

export type ObjectInput = { name: string; address: string };

// Без фильтров: что вернуть исполнителю, решает RLS
export async function fetchObjects() {
  return unwrap(await supabase.from('objects').select('*').order('created_at'));
}

export async function fetchObject(id: string) {
  return unwrap(await supabase.from('objects').select('*').eq('id', id).maybeSingle());
}

export async function createObject(input: ObjectInput) {
  return unwrap(await supabase.from('objects').insert(input).select().single());
}

export async function updateObject(id: string, input: ObjectInput) {
  return unwrap(await supabase.from('objects').update(input).eq('id', id).select().single());
}

export async function deleteObject(id: string) {
  unwrap(await supabase.from('objects').delete().eq('id', id));
}

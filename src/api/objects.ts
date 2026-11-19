import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { CrmObject, ObjectSummary, ObjectWrite } from './database.types';

export type ObjectInput = ObjectWrite;
export type ObjectWithSummary = CrmObject & { summary: ObjectSummary };

const EMPTY_SUMMARY = { tasks_total: 0, tasks_done: 0, tasks_review: 0, tasks_overdue: 0, spent: 0 };

export async function fetchObjects() {
  return unwrap(await supabase.from('objects').select('*').order('created_at'));
}

export async function fetchObjectsWithSummary(): Promise<ObjectWithSummary[]> {
  const [objects, summary] = await Promise.all([
    supabase.from('objects').select('*').order('created_at'),
    supabase.from('object_summary').select('*'),
  ]);
  const rows = unwrap(summary) ?? [];
  const byId = new Map(rows.map((r) => [r.object_id, r]));
  return (unwrap(objects) ?? []).map((o) => ({
    ...o,
    budget: Number(o.budget),
    summary: { ...EMPTY_SUMMARY, object_id: o.id, ...byId.get(o.id), spent: Number(byId.get(o.id)?.spent ?? 0) },
  }));
}

export async function fetchObject(id: string): Promise<ObjectWithSummary | null> {
  const [object, summary] = await Promise.all([
    supabase.from('objects').select('*').eq('id', id).maybeSingle(),
    supabase.from('object_summary').select('*').eq('object_id', id).maybeSingle(),
  ]);
  const o = unwrap(object);
  if (!o) return null;
  const s = unwrap(summary);
  return {
    ...o,
    budget: Number(o.budget),
    summary: { ...EMPTY_SUMMARY, object_id: o.id, ...s, spent: Number(s?.spent ?? 0) },
  };
}

export async function createObject(input: ObjectInput) {
  return unwrap(await supabase.from('objects').insert(input).select('id').single());
}

export async function updateObject(id: string, input: Partial<ObjectInput>) {
  return unwrap(await supabase.from('objects').update(input).eq('id', id).select('id').single());
}

export async function deleteObject(id: string) {
  unwrap(await supabase.from('objects').delete().eq('id', id));
}

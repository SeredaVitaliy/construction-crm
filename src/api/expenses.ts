import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { ExpenseWrite } from './database.types';

export type ExpenseInput = ExpenseWrite;

const FIELDS = '*, object:objects(id, name)';

export async function fetchExpenses(objectId?: string) {
  let q = supabase.from('expenses').select(FIELDS).order('spent_on', { ascending: false });
  if (objectId) q = q.eq('object_id', objectId);
  const rows = unwrap(await q) ?? [];
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export type ExpenseItem = Awaited<ReturnType<typeof fetchExpenses>>[number];

export async function createExpense(input: ExpenseInput) {
  return unwrap(await supabase.from('expenses').insert(input).select('id').single());
}

export async function updateExpense(id: string, input: ExpenseInput) {
  return unwrap(await supabase.from('expenses').update(input).eq('id', id).select('id').single());
}

export async function deleteExpense(id: string) {
  unwrap(await supabase.from('expenses').delete().eq('id', id));
}

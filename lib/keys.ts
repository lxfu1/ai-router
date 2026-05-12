import type { ApiKey } from '@/types'
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

export function createKey(name: string, balance: number): ApiKey {
  const keyValue = `sk-router-${uuidv4().replace(/-/g, '')}`;
  const result = db
    .prepare('INSERT INTO api_keys (key_value, name, balance) VALUES (?, ?, ?)')
    .run(keyValue, name, balance);
  return db
    .prepare('SELECT * FROM api_keys WHERE id = ?')
    .get(result.lastInsertRowid) as ApiKey;
}

export function validateKey(keyValue: string): ApiKey | null {
  const key = db
    .prepare('SELECT * FROM api_keys WHERE key_value = ? AND enabled = 1')
    .get(keyValue) as ApiKey | undefined;
  if (!key) return null;
  if (key.balance > 0 && key.used_balance >= key.balance) return null;
  return key;
}

export function deductBalance(keyId: number, cost: number) {
  db.prepare(
    `UPDATE api_keys SET used_balance = used_balance + ?, updated_at = datetime('now') WHERE id = ?`
  ).run(cost, keyId);
}

export function getAllKeys(): ApiKey[] {
  return db
    .prepare('SELECT * FROM api_keys ORDER BY created_at DESC')
    .all() as ApiKey[];
}

export function toggleKey(id: number, enabled: boolean) {
  db.prepare(
    `UPDATE api_keys SET enabled = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(enabled ? 1 : 0, id);
}

export function deleteKey(id: number) {
  db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
}

export function updateKeyBalance(id: number, balance: number) {
  db.prepare(
    `UPDATE api_keys SET balance = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(balance, id);
}

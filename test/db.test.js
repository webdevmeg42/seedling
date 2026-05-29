import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/db.js';

describe('db', () => {
  it('creates all 9 expected tables', () => {
    const db = createDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r.name);

    assert.deepStrictEqual(tables, [
      'customers',
      'daily_order_summary',
      'order_items',
      'order_totals',
      'orders',
      'products',
      'reporting_orders',
      'staging_clean',
      'staging_raw',
    ]);
  });

  it('enables foreign key constraints', () => {
    const db = createDb();
    const { foreign_keys } = db.prepare('PRAGMA foreign_keys').get();
    assert.strictEqual(foreign_keys, 1);
  });

  it('enforces foreign key constraints on insert', () => {
    const db = createDb();
    assert.throws(
      () => db.prepare("INSERT INTO orders (id, customer_id, status, created_at) VALUES (1, 999, 'pending', '2024-01-01')").run(),
      /FOREIGN KEY constraint failed/
    );
  });
});

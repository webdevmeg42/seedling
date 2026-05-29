import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/db.js';
import { normalize } from '../../src/transformer/normalize.js';

describe('transformer/normalize', () => {
  let db;
  let normalizeCount;

  before(() => {
    db = createDb();
    db.exec(`
      INSERT INTO customers VALUES (1, 'Test User', 'test@example.com', '2024-01-01T00:00:00.000Z');
      INSERT INTO products VALUES (1, 'Widget', 'Electronics', 10.00);
      INSERT INTO orders VALUES (1, 1, 'delivered', '2024-01-15T00:00:00.000Z');
      INSERT INTO orders VALUES (2, 1, 'cancelled', '2024-01-16T00:00:00.000Z');
      INSERT INTO order_items VALUES (1, 1, 1, 2, 10.00);
      INSERT INTO order_items VALUES (2, 1, 1, 1, 10.00);
      INSERT INTO order_items VALUES (3, 2, 1, 3, 10.00);
    `);
    normalizeCount = normalize(db);
  });

  it('creates one order_total per order that has items', () => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM order_totals').get();
    assert.strictEqual(count, 2);
  });

  it('records correct line_count for order 1', () => {
    const row = db.prepare('SELECT * FROM order_totals WHERE order_id = 1').get();
    assert.strictEqual(row.line_count, 2);
  });

  it('computes correct subtotal for order 1 (qty 2 + qty 1 at $10 = $30)', () => {
    const row = db.prepare('SELECT * FROM order_totals WHERE order_id = 1').get();
    assert.strictEqual(row.subtotal, 30.0);
  });

  it('computes correct tax for order 1 (8.5% of $30 = $2.55)', () => {
    const row = db.prepare('SELECT * FROM order_totals WHERE order_id = 1').get();
    assert.ok(Math.abs(row.tax - 2.55) < 0.001);
  });

  it('computes correct total for order 1 ($30 + $2.55 = $32.55)', () => {
    const row = db.prepare('SELECT * FROM order_totals WHERE order_id = 1').get();
    assert.ok(Math.abs(row.total - 32.55) < 0.001);
  });

  it('includes cancelled orders in order_totals (totals are factual, not filtered)', () => {
    const row = db.prepare('SELECT * FROM order_totals WHERE order_id = 2').get();
    assert.ok(row !== undefined);
    assert.strictEqual(row.subtotal, 30.0);
  });

  it('returns the count of order_totals rows written', () => {
    assert.strictEqual(normalizeCount, 2);
  });
});

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/db.js';
import { normalize } from '../../src/transformer/normalize.js';
import { aggregate } from '../../src/transformer/aggregate.js';

describe('transformer/aggregate', () => {
  let db;
  let aggregateCount;

  before(() => {
    db = createDb();
    db.exec(`
      INSERT INTO customers VALUES (1, 'Test User', 'test@example.com', '2024-01-01T00:00:00.000Z');
      INSERT INTO products VALUES (1, 'Widget', 'Electronics', 10.00);
      INSERT INTO orders VALUES (1, 1, 'delivered', '2024-01-01T00:00:00.000Z');
      INSERT INTO orders VALUES (2, 1, 'cancelled', '2024-01-01T00:00:00.000Z');
      INSERT INTO orders VALUES (3, 1, 'shipped',   '2024-01-02T00:00:00.000Z');
      INSERT INTO orders VALUES (4, 1, 'pending',   '2024-01-03T00:00:00.000Z');
      INSERT INTO order_items VALUES (1, 1, 1, 1, 10.00);
      INSERT INTO order_items VALUES (2, 2, 1, 1, 10.00);
      INSERT INTO order_items VALUES (3, 3, 1, 1, 10.00);
      INSERT INTO order_items VALUES (4, 4, 1, 1, 10.00);
    `);
    normalize(db);
    aggregateCount = aggregate(db);
  });

  it('produces one summary row per date that has non-cancelled orders', () => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM daily_order_summary').get();
    assert.strictEqual(count, 3);
  });

  it('excludes cancelled orders from order_count on 2024-01-01', () => {
    const row = db.prepare("SELECT * FROM daily_order_summary WHERE date = '2024-01-01'").get();
    assert.strictEqual(row.order_count, 1);
  });

  it('excludes cancelled orders from total_revenue on 2024-01-01', () => {
    const row = db.prepare("SELECT * FROM daily_order_summary WHERE date = '2024-01-01'").get();
    assert.ok(Math.abs(row.total_revenue - 10.85) < 0.01);
  });

  it('computes correct total_revenue for a single-order date', () => {
    const row = db.prepare("SELECT * FROM daily_order_summary WHERE date = '2024-01-02'").get();
    assert.ok(Math.abs(row.total_revenue - 10.85) < 0.01);
  });

  it('computes correct avg_order_value for single-order date', () => {
    const row = db.prepare("SELECT * FROM daily_order_summary WHERE date = '2024-01-02'").get();
    assert.ok(Math.abs(row.avg_order_value - 10.85) < 0.01);
  });

  it('returns the count of daily_order_summary rows written', () => {
    assert.strictEqual(aggregateCount, 3);
  });
});

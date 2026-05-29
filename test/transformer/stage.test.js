import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/db.js';
import { normalize } from '../../src/transformer/normalize.js';
import { stage } from '../../src/transformer/stage.js';

describe('transformer/stage', () => {
  let db;
  let result;

  before(() => {
    db = createDb();
    db.exec(`
      INSERT INTO customers VALUES (1, 'Test User', 'test@example.com', '2024-01-01T00:00:00.000Z');
      INSERT INTO products VALUES (1, 'Widget', 'Electronics', 10.00);
      INSERT INTO orders VALUES (1, 1, 'delivered', '2024-01-15T00:00:00.000Z');
      INSERT INTO orders VALUES (2, 1, 'shipped',   '2024-01-16T00:00:00.000Z');
      INSERT INTO order_items VALUES (1, 1, 1, 2, 10.00);
      INSERT INTO order_items VALUES (2, 2, 1, 1, 10.00);
      INSERT INTO order_items VALUES (3, 2, 1, 0, 10.00);
    `);
    normalize(db);
    result = stage(db);
  });

  it('copies all order_items into staging_raw (one row per item)', () => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM staging_raw').get();
    assert.strictEqual(count, 3);
  });

  it('flags the invalid item (quantity = 0) in staging_raw', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM staging_raw WHERE is_valid = 0')
      .get();
    assert.strictEqual(count, 1);
  });

  it('does not delete the invalid item from staging_raw (preserve raw data)', () => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM staging_raw').get();
    assert.strictEqual(count, 3);
  });

  it('staging_clean contains only valid rows', () => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM staging_clean').get();
    assert.strictEqual(count, 2);
  });

  it('staging_clean row count is less than staging_raw row count', () => {
    assert.ok(result.cleanCount < result.rawCount);
  });

  it('reporting_orders has one row per non-cancelled order', () => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM reporting_orders').get();
    assert.strictEqual(count, 2);
  });

  it('reporting_orders includes customer name', () => {
    const row = db.prepare('SELECT * FROM reporting_orders WHERE order_id = 1').get();
    assert.strictEqual(row.customer_name, 'Test User');
  });

  it('reporting_orders does not include cancelled orders', () => {
    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM reporting_orders WHERE order_status = 'cancelled'")
      .get();
    assert.strictEqual(count, 0);
  });

  it('result object contains rawCount, cleanCount, and invalidCount', () => {
    assert.strictEqual(result.rawCount, 3);
    assert.strictEqual(result.cleanCount, 2);
    assert.strictEqual(result.invalidCount, 1);
  });
});

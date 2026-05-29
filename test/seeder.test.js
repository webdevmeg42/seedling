import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/db.js';
import { seed } from '../src/seeder/index.js';

describe('seeder', () => {
  let db;

  before(() => {
    db = createDb();
    seed(db, { count: 10 });
  });

  it('inserts 10 customers', () => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM customers').get();
    assert.strictEqual(count, 10);
  });

  it('inserts 20 products', () => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM products').get();
    assert.strictEqual(count, 20);
  });

  it('inserts the requested number of orders', () => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    assert.strictEqual(count, 10);
  });

  it('inserts order_items for every order', () => {
    const orders = db.prepare('SELECT COUNT(DISTINCT id) as count FROM orders').get().count;
    const ordersWithItems = db
      .prepare('SELECT COUNT(DISTINCT order_id) as count FROM order_items')
      .get().count;
    assert.strictEqual(ordersWithItems, orders);
  });

  it('has no null required fields in customers', () => {
    const { count } = db
      .prepare(
        'SELECT COUNT(*) as count FROM customers WHERE name IS NULL OR email IS NULL OR created_at IS NULL'
      )
      .get();
    assert.strictEqual(count, 0);
  });

  it('has no null required fields in orders', () => {
    const { count } = db
      .prepare(
        'SELECT COUNT(*) as count FROM orders WHERE customer_id IS NULL OR status IS NULL OR created_at IS NULL'
      )
      .get();
    assert.strictEqual(count, 0);
  });

  it('all order customer_ids reference valid customers', () => {
    const { count } = db
      .prepare(
        'SELECT COUNT(*) as count FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE c.id IS NULL'
      )
      .get();
    assert.strictEqual(count, 0);
  });

  it('all order_items reference valid orders', () => {
    const { count } = db
      .prepare(
        'SELECT COUNT(*) as count FROM order_items oi LEFT JOIN orders o ON o.id = oi.order_id WHERE o.id IS NULL'
      )
      .get();
    assert.strictEqual(count, 0);
  });
});

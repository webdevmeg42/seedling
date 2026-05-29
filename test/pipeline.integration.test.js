import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/db.js';
import { run } from '../src/pipeline.js';

describe('pipeline integration', () => {
  let db;
  let report;

  before(() => {
    db = createDb();
    report = run(db, { count: 50 });
  });

  it('validator report shows 0 failures', () => {
    assert.strictEqual(
      report.failed,
      0,
      JSON.stringify(report.checks.filter((c) => !c.passed))
    );
  });

  it('reporting_orders contains no cancelled orders', () => {
    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM reporting_orders WHERE order_status = 'cancelled'")
      .get();
    assert.strictEqual(count, 0);
  });

  it('daily_order_summary total revenue matches non-cancelled order_totals total', () => {
    const summaryRevenue =
      db
        .prepare('SELECT ROUND(SUM(total_revenue), 2) as total FROM daily_order_summary')
        .get().total ?? 0;
    const orderRevenue =
      db
        .prepare(
          "SELECT ROUND(SUM(ot.total), 2) as total FROM order_totals ot JOIN orders o ON o.id = ot.order_id WHERE o.status != 'cancelled'"
        )
        .get().total ?? 0;
    assert.strictEqual(summaryRevenue, orderRevenue);
  });
});

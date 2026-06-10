export function validate(db) {
  const checks = [];
  const getCount = (sql) => db.prepare(sql).get().count;

  function check(name, fn) {
    try {
      fn();
      checks.push({ name, passed: true });
    } catch (err) {
      checks.push({ name, passed: false, message: err.message });
    }
  }

  check('order_totals_row_count', () => {
    const ordersWithItems = getCount('SELECT COUNT(DISTINCT order_id) as count FROM order_items');
    const totals = getCount('SELECT COUNT(*) as count FROM order_totals');
    if (totals !== ordersWithItems) {
      throw new Error(`order_totals has ${totals} rows but ${ordersWithItems} orders have items`);
    }
  });

  check('daily_summary_revenue_reconciles', () => {
    const summaryRevenue =
      db.prepare('SELECT ROUND(SUM(total_revenue), 2) as total FROM daily_order_summary').get()
        .total ?? 0;
    const orderRevenue =
      db
        .prepare(
          "SELECT ROUND(SUM(ot.total), 2) as total FROM order_totals ot JOIN orders o ON o.id = ot.order_id WHERE o.status != 'cancelled'"
        )
        .get().total ?? 0;
    if (summaryRevenue !== orderRevenue) {
      throw new Error(
        `daily_order_summary total ${summaryRevenue} != order_totals non-cancelled total ${orderRevenue}`
      );
    }
  });

  check('no_null_totals', () => {
    const count = getCount(
      'SELECT COUNT(*) as count FROM order_totals WHERE subtotal IS NULL OR tax IS NULL OR total IS NULL'
    );
    if (count > 0) { throw new Error(`${count} rows in order_totals have NULL values`); }
  });

  check('referential_integrity_order_items', () => {
    const count = getCount(
      'SELECT COUNT(*) as count FROM order_items oi LEFT JOIN orders o ON o.id = oi.order_id WHERE o.id IS NULL'
    );
    if (count > 0) { throw new Error(`${count} order_items rows reference non-existent orders`); }
  });

  check('staging_clean_lte_staging_raw', () => {
    const rawCount = getCount('SELECT COUNT(*) as count FROM staging_raw');
    const cleanCount = getCount('SELECT COUNT(*) as count FROM staging_clean');
    if (cleanCount > rawCount) {
      throw new Error(`staging_clean (${cleanCount}) has more rows than staging_raw (${rawCount})`);
    }
  });

  check('reporting_orders_excludes_cancelled', () => {
    const count = getCount(
      "SELECT COUNT(*) as count FROM reporting_orders WHERE order_status = 'cancelled'"
    );
    if (count > 0) { throw new Error(`reporting_orders contains ${count} cancelled orders`); }
  });

  const failed = checks.filter((c) => !c.passed).length;
  return { passed: checks.length - failed, failed, checks };
}

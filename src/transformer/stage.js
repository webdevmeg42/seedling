export function stage(db) {
  db.exec('BEGIN');
  try {
    // Pass 1: copy one row per order_item (joined with order fields) into staging_raw
    db.exec(`
      INSERT INTO staging_raw
        (order_id, order_item_id, customer_id, product_id, quantity, unit_price,
         order_status, order_created_at, load_ts, is_valid)
      SELECT
        o.id,
        oi.id,
        o.customer_id,
        oi.product_id,
        oi.quantity,
        oi.unit_price,
        o.status,
        o.created_at,
        datetime('now'),
        1
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
    `);

    // Pass 2: mark rows invalid where data quality checks fail
    db.exec(`
      UPDATE staging_raw
      SET is_valid = 0
      WHERE order_id IS NULL
         OR unit_price <= 0
         OR quantity <= 0
    `);

    // Pass 3: write valid rows to staging_clean
    db.exec(`
      INSERT INTO staging_clean
        (order_id, order_item_id, customer_id, product_id, quantity, unit_price,
         order_status, order_created_at)
      SELECT
        order_id, order_item_id, customer_id, product_id, quantity, unit_price,
        order_status, order_created_at
      FROM staging_raw
      WHERE is_valid = 1
    `);

    // Pass 4: build reporting_orders — one row per non-cancelled order with clean items
    db.exec(`
      INSERT INTO reporting_orders
        (order_id, customer_id, customer_name, customer_email,
         order_status, order_created_at, line_count, subtotal, tax, total)
      SELECT
        sc.order_id,
        sc.customer_id,
        c.name,
        c.email,
        sc.order_status,
        sc.order_created_at,
        ot.line_count,
        ot.subtotal,
        ot.tax,
        ot.total
      FROM (
        SELECT DISTINCT order_id, customer_id, order_status, order_created_at
        FROM staging_clean
        WHERE order_status != 'cancelled'
      ) sc
      JOIN customers c   ON c.id  = sc.customer_id
      JOIN order_totals ot ON ot.order_id = sc.order_id
    `);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const rawCount   = db.prepare('SELECT COUNT(*) as count FROM staging_raw').get().count;
  const cleanCount = db.prepare('SELECT COUNT(*) as count FROM staging_clean').get().count;

  return { rawCount, cleanCount, invalidCount: rawCount - cleanCount };
}

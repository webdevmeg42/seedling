export function normalize(db) {
  db.exec(`
    INSERT INTO order_totals (order_id, line_count, subtotal, tax, total)
    SELECT
      o.id                                          AS order_id,
      COUNT(oi.id)                                  AS line_count,
      SUM(oi.quantity * oi.unit_price)              AS subtotal,
      SUM(oi.quantity * oi.unit_price) * 0.085      AS tax,
      SUM(oi.quantity * oi.unit_price) * 1.085      AS total
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
  `);

  return db.prepare('SELECT COUNT(*) as count FROM order_totals').get().count;
}

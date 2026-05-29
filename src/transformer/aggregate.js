export function aggregate(db) {
  db.exec(`
    INSERT INTO daily_order_summary (date, order_count, total_revenue, avg_order_value)
    SELECT
      DATE(o.created_at)    AS date,
      COUNT(o.id)           AS order_count,
      SUM(ot.total)         AS total_revenue,
      AVG(ot.total)         AS avg_order_value
    FROM orders o
    JOIN order_totals ot ON ot.order_id = o.id
    WHERE o.status != 'cancelled'
    GROUP BY DATE(o.created_at)
  `);

  return db.prepare('SELECT COUNT(*) as count FROM daily_order_summary').get().count;
}

import { DatabaseSync } from 'node:sqlite';

export function withTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function createDb(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  bootstrap(db);
  return db;
}

function bootstrap(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id          INTEGER PRIMARY KEY,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY,
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      unit_price  REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id          INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      status      TEXT    NOT NULL,
      created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id          INTEGER PRIMARY KEY,
      order_id    INTEGER NOT NULL REFERENCES orders(id),
      product_id  INTEGER NOT NULL REFERENCES products(id),
      quantity    INTEGER NOT NULL,
      unit_price  REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_totals (
      order_id    INTEGER PRIMARY KEY REFERENCES orders(id),
      line_count  INTEGER NOT NULL,
      subtotal    REAL    NOT NULL,
      tax         REAL    NOT NULL,
      total       REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_order_summary (
      date             TEXT PRIMARY KEY,
      order_count      INTEGER NOT NULL,
      total_revenue    REAL    NOT NULL,
      avg_order_value  REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staging_raw (
      id              INTEGER PRIMARY KEY,
      order_id        INTEGER,
      order_item_id   INTEGER,
      customer_id     INTEGER,
      product_id      INTEGER,
      quantity        INTEGER,
      unit_price      REAL,
      order_status    TEXT,
      order_created_at TEXT,
      load_ts         TEXT    NOT NULL,
      is_valid        INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS staging_clean (
      id               INTEGER PRIMARY KEY,
      order_id         INTEGER NOT NULL,
      order_item_id    INTEGER NOT NULL,
      customer_id      INTEGER NOT NULL,
      product_id       INTEGER NOT NULL,
      quantity         INTEGER NOT NULL,
      unit_price       REAL    NOT NULL,
      order_status     TEXT    NOT NULL,
      order_created_at TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reporting_orders (
      order_id         INTEGER PRIMARY KEY,
      customer_id      INTEGER NOT NULL,
      customer_name    TEXT    NOT NULL,
      customer_email   TEXT    NOT NULL,
      order_status     TEXT    NOT NULL,
      order_created_at TEXT    NOT NULL,
      line_count       INTEGER NOT NULL,
      subtotal         REAL    NOT NULL,
      tax              REAL    NOT NULL,
      total            REAL    NOT NULL
    );
  `);
}

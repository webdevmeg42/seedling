import { withTransaction } from '../db.js';

const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Hank', 'Iris', 'Jake'];
const LAST_NAMES = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore'];
const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
const PRODUCT_NAMES = ['Widget', 'Gadget', 'Doohickey', 'Gizmo', 'Contraption', 'Device', 'Module', 'Unit'];
const NON_CANCELLED_STATUSES = ['pending', 'processing', 'shipped', 'delivered'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function isoDate(daysAgo) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString();
}

export function seed(db, { count = 50 } = {}) {
  const insertCustomer = db.prepare(
    'INSERT INTO customers (id, name, email, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertProduct = db.prepare(
    'INSERT INTO products (id, name, category, unit_price) VALUES (?, ?, ?, ?)'
  );
  const insertOrder = db.prepare(
    'INSERT INTO orders (id, customer_id, status, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertItem = db.prepare(
    'INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
  );
  const getProductPrice = db.prepare('SELECT unit_price FROM products WHERE id = ?');

  const NUM_CUSTOMERS = 10;
  const NUM_PRODUCTS = 20;

  withTransaction(db, () => {
    for (let i = 1; i <= NUM_CUSTOMERS; i++) {
      insertCustomer.run(
        i,
        `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        `user${i}@example.com`,
        isoDate(rand(0, 365))
      );
    }

    for (let i = 1; i <= NUM_PRODUCTS; i++) {
      insertProduct.run(i, `${pick(PRODUCT_NAMES)} ${i}`, pick(CATEGORIES), rand(500, 9999) / 100);
    }

    let itemId = 1;
    for (let orderId = 1; orderId <= count; orderId++) {
      const customerId = rand(1, NUM_CUSTOMERS);
      const status = Math.random() < 0.2 ? 'cancelled' : pick(NON_CANCELLED_STATUSES);
      insertOrder.run(orderId, customerId, status, isoDate(rand(0, 90)));

      const itemCount = rand(1, 5);
      for (let j = 0; j < itemCount; j++) {
        const productId = rand(1, NUM_PRODUCTS);
        const { unit_price } = getProductPrice.get(productId);
        insertItem.run(itemId++, orderId, productId, rand(1, 10), unit_price);
      }
    }
  });
}

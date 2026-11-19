import { query } from '../config/db.js';

export async function getCartForUpdate(client, cartId) {
  const result = await client.query('SELECT id FROM carts WHERE id = $1 FOR UPDATE', [cartId]);
  return result.rows[0] || null;
}

export async function getItemsForCheckout(client, cartId) {
  const result = await client.query(
    `SELECT ci.product_id AS id, ci.size, ci.quantity, p.sku, p.name, p.category, p.price, p.tax_rate,
            COALESCE(to_jsonb(p)->>'description', '') AS description,
            p.image_url, COALESCE(ps.quantity, 0) AS stock_quantity
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id AND p.active = TRUE
       LEFT JOIN product_sizes ps ON ps.product_id = ci.product_id AND ps.size = ci.size
      WHERE ci.cart_id = $1
      ORDER BY p.id, ci.size
      FOR UPDATE OF ci, p`,
    [cartId]
  );
  return result.rows;
}

export async function getCartItemCount(client, cartId) {
  const result = await client.query(
    'SELECT COUNT(*)::integer AS count FROM cart_items WHERE cart_id = $1',
    [cartId]
  );
  return result.rows[0].count;
}

export async function createCustomer(client, customer) {
  const result = await client.query(
    `INSERT INTO customers (id, name, email, phone, address, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id`,
    [customer.id, customer.name, customer.email || null, customer.phone, customer.address]
  );
  return result.rows[0].id;
}

export async function createOrder(client, order) {
  await client.query(
    `INSERT INTO orders
       (id, order_number, customer_id, account_id, payment_method, status, subtotal, discount_total, tax_total, total, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      order.id, order.orderNumber, order.customerId, order.accountId, order.paymentMethod, order.status,
      order.subtotal, order.discount, order.tax, order.total
    ]
  );

  for (const item of order.items) {
    await client.query(
      `INSERT INTO order_items (id, order_id, product_id, size, quantity, unit_price, line_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [item.orderItemId, order.id, item.id, item.size, item.quantity, item.price, item.lineTotal]
    );

    await client.query(
      'UPDATE product_sizes SET quantity = quantity - $3 WHERE product_id = $1 AND size = $2',
      [item.id, item.size, item.quantity]
    );
    const stockResult = await client.query(
      'SELECT COALESCE(SUM(quantity), 0)::integer AS quantity FROM product_sizes WHERE product_id = $1',
      [item.id]
    );
    const stock = stockResult.rows[0].quantity;
    await client.query('UPDATE products SET stock_quantity = $2, updated_at = NOW() WHERE id = $1', [item.id, stock]);
    await client.query(
      `INSERT INTO inventory (product_id, quantity, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (product_id) DO UPDATE
         SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
      [item.id, stock]
    );
  }

  await client.query(
    `INSERT INTO payments
       (id, sale_id, order_id, method, amount, reference, status, created_at)
     VALUES ($1, NULL, $2, $3, $4, $5, $6, NOW())`,
    [order.paymentId, order.id, order.paymentMethod, order.total, order.paymentReference, order.paymentStatus]
  );
  await client.query('DELETE FROM cart_items WHERE cart_id = $1', [order.cartId]);
}

export async function getOrder(orderId, accountId = null) {
  const result = await query(
    `SELECT o.id, o.order_number AS "orderNumber", o.payment_method AS "paymentMethod",
            o.status, o.subtotal, o.discount_total AS discount, o.tax_total AS tax, o.total,
            o.created_at AS "createdAt", p.name, p.category, oi.size, oi.quantity, oi.unit_price AS price,
            oi.line_total AS "lineTotal"
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
      WHERE o.id = $1
        AND ($2::uuid IS NULL OR o.account_id = $2)
      ORDER BY p.name`,
    [orderId, accountId]
  );
  if (!result.rows.length) return null;
  const first = result.rows[0];
  return {
    id: first.id,
    orderNumber: first.orderNumber,
    paymentMethod: first.paymentMethod,
    status: first.status,
    subtotal: Number(first.subtotal),
    discount: Number(first.discount),
    tax: Number(first.tax),
    total: Number(first.total),
    createdAt: first.createdAt,
    items: result.rows.map((row) => ({
      name: row.name,
      category: row.category,
      size: row.size,
      quantity: row.quantity,
      price: Number(row.price),
      lineTotal: Number(row.lineTotal)
    }))
  };
}

export async function listOrdersForAccount(accountId) {
  const result = await query(
    `SELECT o.id, o.order_number AS "orderNumber", o.payment_method AS "paymentMethod",
            o.status, o.subtotal, o.discount_total AS discount, o.tax_total AS tax, o.total,
            o.created_at AS "createdAt", p.name, p.category, oi.size, oi.quantity,
            oi.unit_price AS price, oi.line_total AS "lineTotal"
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.account_id = $1
      ORDER BY o.created_at DESC, p.name`,
    [accountId]
  );
  const orders = new Map();
  for (const row of result.rows) {
    if (!orders.has(row.id)) {
      orders.set(row.id, {
        id: row.id,
        orderNumber: row.orderNumber,
        paymentMethod: row.paymentMethod,
        status: row.status,
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        tax: Number(row.tax),
        total: Number(row.total),
        createdAt: row.createdAt,
        items: []
      });
    }
    if (row.name) {
      orders.get(row.id).items.push({
        name: row.name,
        category: row.category,
        size: row.size,
        quantity: row.quantity,
        price: Number(row.price),
        lineTotal: Number(row.lineTotal)
      });
    }
  }
  return [...orders.values()];
}

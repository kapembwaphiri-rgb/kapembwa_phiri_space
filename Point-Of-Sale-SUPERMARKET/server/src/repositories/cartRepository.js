import { query, withTransaction } from '../config/db.js';

export async function getCartItems(cartId) {
  const result = await query(
    `SELECT ci.product_id AS id, ci.quantity, p.sku, p.name, p.category, p.price,
            COALESCE(to_jsonb(p)->>'description', '') AS description,
            p.image_url, COALESCE(i.quantity, p.stock_quantity, 0) AS stock_quantity,
            COALESCE(i.reorder_level, 10) AS reorder_level
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id AND p.active = TRUE
       LEFT JOIN inventory i ON i.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY p.name, p.id`,
    [cartId]
  );
  return result.rows;
}

export async function addItem(cartId, productId, amount) {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO carts (id, created_at, updated_at)
       VALUES ($1, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
      [cartId]
    );
    const productResult = await client.query(
      `SELECT p.id, p.name, COALESCE(i.quantity, p.stock_quantity, 0) AS stock
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.id = $1 AND p.active = TRUE
        FOR UPDATE OF p`,
      [productId]
    );
    const product = productResult.rows[0];
    if (!product) return { error: 'not_found' };

    const currentResult = await client.query(
      'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 FOR UPDATE',
      [cartId, productId]
    );
    const quantity = Number(currentResult.rows[0]?.quantity || 0) + amount;
    if (quantity > Number(product.stock)) return { error: 'insufficient_stock', productName: product.name };

    await client.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (cart_id, product_id) DO UPDATE
         SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
      [cartId, productId, quantity]
    );
    return { success: true };
  });
}

export async function setItemQuantity(cartId, productId, quantity) {
  return withTransaction(async (client) => {
    const productResult = await client.query(
      `SELECT p.name, COALESCE(i.quantity, p.stock_quantity, 0) AS stock
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.id = $1 AND p.active = TRUE
        FOR UPDATE OF p`,
      [productId]
    );
    const product = productResult.rows[0];
    if (!product) return { error: 'not_found' };
    if (quantity > Number(product.stock)) return { error: 'insufficient_stock', productName: product.name };

    const result = await client.query(
      `UPDATE cart_items SET quantity = $3, updated_at = NOW()
        WHERE cart_id = $1 AND product_id = $2`,
      [cartId, productId, quantity]
    );
    return result.rowCount ? { success: true } : { error: 'cart_item_not_found' };
  });
}

export async function removeItem(cartId, productId) {
  const result = await query(
    'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
    [cartId, productId]
  );
  return result.rowCount > 0;
}

export async function clearItems(cartId) {
  await query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
}

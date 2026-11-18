import { query, withTransaction } from '../config/db.js';

export async function getCartItems(cartId) {
  const result = await query(
    `SELECT ci.product_id AS id, ci.size, ci.quantity, p.sku, p.name, p.category, p.price,
            COALESCE(to_jsonb(p)->>'description', '') AS description,
            p.image_url, COALESCE(ps.quantity, 0) AS stock_quantity,
            COALESCE(i.reorder_level, 10) AS reorder_level
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id AND p.active = TRUE
       LEFT JOIN product_sizes ps ON ps.product_id = ci.product_id AND ps.size = ci.size
       LEFT JOIN inventory i ON i.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY p.name, p.id`,
    [cartId]
  );
  return result.rows;
}

export async function addItem(cartId, productId, amount, size = 'ONE_SIZE') {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO carts (id, created_at, updated_at)
       VALUES ($1, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
      [cartId]
    );
    const productResult = await client.query(
      'SELECT id, name FROM products WHERE id = $1 AND active = TRUE FOR UPDATE',
      [productId]
    );
    const product = productResult.rows[0];
    if (!product) return { error: 'not_found' };

    const variantResult = await client.query(
      'SELECT quantity FROM product_sizes WHERE product_id = $1 AND size = $2 FOR UPDATE',
      [productId, size]
    );
    const variant = variantResult.rows[0];
    if (!variant) return { error: 'size_unavailable', productName: product.name, size };

    const currentResult = await client.query(
      'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size = $3 FOR UPDATE',
      [cartId, productId, size]
    );
    const quantity = Number(currentResult.rows[0]?.quantity || 0) + amount;
    if (quantity > Number(variant.quantity)) return { error: 'insufficient_stock', productName: product.name, size };

    await client.query(
      `INSERT INTO cart_items (cart_id, product_id, size, quantity, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (cart_id, product_id, size) DO UPDATE
         SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
      [cartId, productId, size, quantity]
    );
    return { success: true };
  });
}

export async function setItemQuantity(cartId, productId, quantity, size = 'ONE_SIZE') {
  return withTransaction(async (client) => {
    const productResult = await client.query(
      'SELECT name FROM products WHERE id = $1 AND active = TRUE FOR UPDATE',
      [productId]
    );
    const product = productResult.rows[0];
    if (!product) return { error: 'not_found' };
    const variantResult = await client.query(
      'SELECT quantity FROM product_sizes WHERE product_id = $1 AND size = $2 FOR UPDATE',
      [productId, size]
    );
    const variant = variantResult.rows[0];
    if (!variant) return { error: 'size_unavailable', productName: product.name, size };
    if (quantity > Number(variant.quantity)) return { error: 'insufficient_stock', productName: product.name, size };

    const result = await client.query(
      `UPDATE cart_items SET quantity = $4, updated_at = NOW()
        WHERE cart_id = $1 AND product_id = $2 AND size = $3`,
      [cartId, productId, size, quantity]
    );
    return result.rowCount ? { success: true } : { error: 'cart_item_not_found' };
  });
}

export async function removeItem(cartId, productId, size = 'ONE_SIZE') {
  const result = await query(
    'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size = $3',
    [cartId, productId, size]
  );
  return result.rowCount > 0;
}

export async function clearItems(cartId) {
  await query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
}

import { query, withTransaction } from '../config/db.js';

const productColumns = `
  p.*,
  COALESCE(to_jsonb(p)->>'description', '') AS description,
  COALESCE(i.quantity, p.stock_quantity, 0) AS stock,
  COALESCE(i.quantity, p.stock_quantity, 0) AS quantity,
  COALESCE(i.reorder_level, 10) AS reorder_level,
  COALESCE((
    SELECT json_agg(json_build_object('size', ps.size, 'quantity', ps.quantity)
      ORDER BY CASE ps.size
        WHEN 'XS' THEN 1 WHEN 'S' THEN 2 WHEN 'M' THEN 3 WHEN 'L' THEN 4
        WHEN 'XL' THEN 5 WHEN 'XXL' THEN 6 ELSE 7 END)
      FROM product_sizes ps
     WHERE ps.product_id = p.id
  ), '[]'::json) AS sizes,
  COALESCE((
    SELECT json_agg(pi.image_url ORDER BY pi.sort_order, pi.id)
      FROM product_images pi
     WHERE pi.product_id = p.id
  ), '[]'::json) AS images
`;

export async function listProducts({ search = '', category } = {}) {
  const values = [];
  const conditions = ['p.active = TRUE'];
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length} OR COALESCE(to_jsonb(p)->>'description', '') ILIKE $${values.length})`);
  }
  if (category) {
    values.push(category);
    conditions.push(`p.category = $${values.length}`);
  }

  const result = await query(
    `SELECT ${productColumns}
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.created_at DESC, p.id`,
    values
  );
  return result.rows;
}

export async function findProductById(id) {
  const result = await query(
    `SELECT ${productColumns}
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.id = $1 AND p.active = TRUE`,
    [id]
  );
  return result.rows[0] || null;
}

export function createProduct(product) {
  return withTransaction(async (client) => {
    const stock = product.sizes.reduce((total, variant) => total + variant.quantity, 0);
    const result = await client.query(
      `INSERT INTO products
         (id, sku, name, description, category, price, image_url, stock_quantity, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), NOW())
       RETURNING *`,
      [
        product.id, product.sku, product.name, product.description, product.category,
        product.price, product.imageUrl, stock
      ]
    );
    await client.query(
      `INSERT INTO inventory (product_id, quantity, reorder_level, updated_at)
       VALUES ($1, $2, $3, NOW())`,
      [product.id, stock, product.reorderLevel]
    );
    for (const variant of product.sizes) {
      await client.query(
        'INSERT INTO product_sizes (product_id, size, quantity) VALUES ($1, $2, $3)',
        [product.id, variant.size, variant.quantity]
      );
    }
    for (const [sortOrder, imageUrl] of product.images.entries()) {
      await client.query(
        'INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3)',
        [product.id, imageUrl, sortOrder]
      );
    }
    return {
      ...result.rows[0],
      description: product.description,
      stock,
      quantity: stock,
      reorder_level: product.reorderLevel,
      sizes: product.sizes,
      images: product.images
    };
  });
}

export async function updateProduct(id, changes) {
  return withTransaction(async (client) => {
    const columns = {
      sku: 'sku',
      name: 'name',
      description: 'description',
      category: 'category',
      price: 'price',
      imageUrl: 'image_url'
    };
    const values = [];
    const assignments = [];
    for (const [key, column] of Object.entries(columns)) {
      if (Object.hasOwn(changes, key)) {
        values.push(changes[key]);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    const sizeStock = Object.hasOwn(changes, 'sizes')
      ? changes.sizes.reduce((total, variant) => total + variant.quantity, 0)
      : Object.hasOwn(changes, 'stock') ? changes.stock : undefined;
    if (sizeStock !== undefined) {
      values.push(sizeStock);
      assignments.push(`stock_quantity = $${values.length}`);
    }
    if (!assignments.length && !Object.hasOwn(changes, 'reorderLevel') && !Object.hasOwn(changes, 'sizes')) {
      const current = await client.query(
        `SELECT ${productColumns}
           FROM products p
           LEFT JOIN inventory i ON i.product_id = p.id
          WHERE p.id = $1 AND p.active = TRUE`,
        [id]
      );
      return current.rows[0] || null;
    }

    assignments.push('updated_at = NOW()');
    values.push(id);
    const result = await client.query(
      `UPDATE products SET ${assignments.join(', ')}
        WHERE id = $${values.length} AND active = TRUE
        RETURNING *`,
      values
    );
    if (!result.rows[0]) return null;

    if (Object.hasOwn(changes, 'images')) {
      await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      for (const [sortOrder, imageUrl] of changes.images.entries()) {
        await client.query(
          'INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3)',
          [id, imageUrl, sortOrder]
        );
      }
    }

    if (Object.hasOwn(changes, 'sizes')) {
      const selectedSizes = changes.sizes.map((variant) => variant.size);
      await client.query(
        `UPDATE product_sizes SET quantity = 0
          WHERE product_id = $1 AND NOT (size = ANY($2::text[]))`,
        [id, selectedSizes]
      );
      for (const variant of changes.sizes) {
        await client.query(
          `INSERT INTO product_sizes (product_id, size, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, size) DO UPDATE SET quantity = EXCLUDED.quantity`,
          [id, variant.size, variant.quantity]
        );
      }
    } else if (Object.hasOwn(changes, 'stock')) {
      await client.query(
        `UPDATE product_sizes SET quantity = CASE WHEN size = 'ONE_SIZE' THEN $2 ELSE 0 END
          WHERE product_id = $1`,
        [id, changes.stock]
      );
      await client.query(
        `INSERT INTO product_sizes (product_id, size, quantity) VALUES ($1, 'ONE_SIZE', $2)
         ON CONFLICT (product_id, size) DO UPDATE SET quantity = EXCLUDED.quantity`,
        [id, changes.stock]
      );
    }
    if (sizeStock !== undefined) {
      await client.query(
        `INSERT INTO inventory (product_id, quantity, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (product_id) DO UPDATE
           SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
        [id, sizeStock]
      );
    }
    if (Object.hasOwn(changes, 'reorderLevel')) {
      await client.query(
        `INSERT INTO inventory (product_id, quantity, reorder_level, updated_at)
         VALUES ($1, COALESCE((SELECT stock_quantity FROM products WHERE id = $1), 0), $2, NOW())
         ON CONFLICT (product_id) DO UPDATE
           SET reorder_level = EXCLUDED.reorder_level, updated_at = NOW()`,
        [id, changes.reorderLevel]
      );
    }
    const inventory = await client.query(
      'SELECT quantity, reorder_level FROM inventory WHERE product_id = $1',
      [id]
    );
    const quantity = inventory.rows[0]?.quantity ?? result.rows[0].stock_quantity;
    const updated = await client.query(
      `SELECT ${productColumns}
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.id = $1`,
      [id]
    );
    return {
      ...updated.rows[0],
      description: changes.description ?? updated.rows[0].description ?? '',
      stock: quantity,
      quantity,
      reorder_level: inventory.rows[0]?.reorder_level ?? 10
    };
  });
}

export async function deactivateProduct(id) {
  const result = await query(
    'UPDATE products SET active = FALSE, updated_at = NOW() WHERE id = $1 AND active = TRUE RETURNING id',
    [id]
  );
  return result.rowCount > 0;
}

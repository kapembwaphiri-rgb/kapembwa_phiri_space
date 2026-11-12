import { query, withTransaction } from '../config/db.js';

const productColumns = `
  p.*,
  COALESCE(to_jsonb(p)->>'description', '') AS description,
  COALESCE(i.quantity, p.stock_quantity, 0) AS stock,
  COALESCE(i.quantity, p.stock_quantity, 0) AS quantity,
  COALESCE(i.reorder_level, 10) AS reorder_level
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
      ORDER BY p.name, p.id`,
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
    const result = await client.query(
      `INSERT INTO products
         (id, sku, name, description, category, price, image_url, stock_quantity, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), NOW())
       RETURNING *`,
      [
        product.id, product.sku, product.name, product.description, product.category,
        product.price, product.imageUrl, product.stock
      ]
    );
    await client.query(
      `INSERT INTO inventory (product_id, quantity, reorder_level, updated_at)
       VALUES ($1, $2, $3, NOW())`,
      [product.id, product.stock, product.reorderLevel]
    );
    return { ...result.rows[0], description: product.description, stock: product.stock, quantity: product.stock, reorder_level: product.reorderLevel };
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

    if (Object.hasOwn(changes, 'stock')) {
      values.push(changes.stock);
      assignments.push(`stock_quantity = $${values.length}`);
    }
    if (!assignments.length && !Object.hasOwn(changes, 'reorderLevel')) {
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

    if (Object.hasOwn(changes, 'stock')) {
      await client.query(
        `INSERT INTO inventory (product_id, quantity, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (product_id) DO UPDATE
           SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
        [id, changes.stock]
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
    return {
      ...result.rows[0],
      description: changes.description ?? result.rows[0].description ?? '',
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

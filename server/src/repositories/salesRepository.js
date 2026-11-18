import { query } from '../config/db.js';

export async function createSaleWithProducts(client, sale, items) {
  await client.query(
    `INSERT INTO sales (id, receipt_number, cashier_id, subtotal, discount_total, tax_total, total, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED', NOW())`,
    [sale.id, sale.receiptNumber, sale.cashierId, sale.subtotal, sale.discount, sale.tax, sale.total]
  );
  const updatedStock = new Map();
  for (const item of items) {
    await client.query(
      `INSERT INTO sale_items (id, sale_id, product_id, size, quantity, unit_price, line_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [item.saleItemId, sale.id, item.id, item.size, item.quantity, item.price, item.lineTotal]
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
    await client.query(
      'UPDATE products SET stock_quantity = $2 WHERE id = $1',
      [item.id, stock]
    );
    await client.query(
      `INSERT INTO inventory (product_id, quantity, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (product_id) DO UPDATE
         SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
      [item.id, stock]
    );
    updatedStock.set(item.id, stock);
  }
  await client.query(
    `INSERT INTO payments (id, sale_id, order_id, method, amount, reference, status, created_at)
     VALUES ($1, $2, NULL, $3, $4, $5, 'PAID', NOW())`,
    [sale.paymentId, sale.id, sale.payment.method, sale.total, sale.payment.reference]
  );
  return {
    sale: {
      id: sale.id,
      receiptNumber: sale.receiptNumber,
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: sale.total,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        lineTotal: item.lineTotal
      })),
      payment: sale.payment,
      createdAt: new Date().toISOString()
    },
    stock: [...updatedStock].map(([productId, stockQuantity]) => ({ productId, stockQuantity }))
  };
}

export async function findSaleForReturn(client, saleId) {
  const result = await client.query('SELECT id FROM sales WHERE id = $1 FOR UPDATE', [saleId]);
  return result.rows[0] || null;
}

export async function returnSaleItem(client, saleId, item) {
  const sold = await client.query(
    `SELECT si.product_id, si.size, si.quantity, si.unit_price,
            COALESCE(ps.quantity, 0) AS stock
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN product_sizes ps ON ps.product_id = si.product_id AND ps.size = si.size
      WHERE si.sale_id = $1 AND si.product_id = $2 AND si.size = $3
      FOR UPDATE OF p, si, ps`,
    [saleId, item.productId, item.size]
  );
  const line = sold.rows[0];
  if (!line || item.quantity < 1 || item.quantity > Number(line.quantity)) return null;

  await client.query(
    'UPDATE product_sizes SET quantity = quantity + $3 WHERE product_id = $1 AND size = $2',
    [item.productId, item.size, item.quantity]
  );
  const aggregateResult = await client.query(
    'SELECT COALESCE(SUM(quantity), 0)::integer AS quantity FROM product_sizes WHERE product_id = $1',
    [item.productId]
  );
  const stock = aggregateResult.rows[0].quantity;
  await client.query(
    'UPDATE products SET stock_quantity = $2 WHERE id = $1',
    [item.productId, stock]
  );
  await client.query(
    `INSERT INTO inventory (product_id, quantity, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (product_id) DO UPDATE
       SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
    [item.productId, stock]
  );
  return {
    productId: item.productId,
    stockQuantity: stock,
    amount: Number(line.unit_price) * item.quantity
  };
}

export async function createReturn(client, record) {
  await client.query(
    `INSERT INTO returns (id, sale_id, user_id, reason, amount, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [record.id, record.saleId, record.userId, record.reason, record.amount]
  );
}

export async function getSaleById(id) {
  const result = await query('SELECT id FROM sales WHERE id = $1', [id]);
  return result.rows[0] || null;
}

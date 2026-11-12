import { query } from '../config/db.js';

export async function createSaleWithProducts(client, sale, items) {
  await client.query(
    `INSERT INTO sales (id, receipt_number, cashier_id, subtotal, discount_total, tax_total, total, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED', NOW())`,
    [sale.id, sale.receiptNumber, sale.cashierId, sale.subtotal, sale.discount, sale.tax, sale.total]
  );
  for (const item of items) {
    await client.query(
      `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, line_total)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [item.saleItemId, sale.id, item.id, item.quantity, item.price, item.lineTotal]
    );
    const stock = item.stock - item.quantity;
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
        quantity: item.quantity,
        lineTotal: item.lineTotal
      })),
      payment: sale.payment,
      createdAt: new Date().toISOString()
    },
    stock: items.map((item) => ({
      productId: item.id,
      stockQuantity: item.stock - item.quantity
    }))
  };
}

export async function findSaleForReturn(client, saleId) {
  const result = await client.query('SELECT id FROM sales WHERE id = $1 FOR UPDATE', [saleId]);
  return result.rows[0] || null;
}

export async function returnSaleItem(client, saleId, item) {
  const sold = await client.query(
    `SELECT si.product_id, si.quantity, si.unit_price,
            COALESCE(i.quantity, p.stock_quantity, 0) AS stock
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       LEFT JOIN inventory i ON i.product_id = p.id
      WHERE si.sale_id = $1 AND si.product_id = $2
      FOR UPDATE OF p, si`,
    [saleId, item.productId]
  );
  const line = sold.rows[0];
  if (!line || item.quantity < 1 || item.quantity > Number(line.quantity)) return null;

  const stock = Number(line.stock) + item.quantity;
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

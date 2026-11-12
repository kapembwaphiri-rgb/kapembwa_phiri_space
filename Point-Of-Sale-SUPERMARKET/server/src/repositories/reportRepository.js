import { query } from '../config/db.js';

export async function getDailySummary() {
  const [sales, orders, stock, topProduct] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(total), 0)::numeric AS total_sales,
              COUNT(*)::integer AS transactions
         FROM sales
        WHERE status = 'COMPLETED' AND created_at >= date_trunc('day', NOW())`
    ),
    query(
      `SELECT COALESCE(SUM(total), 0)::numeric AS total_orders,
              COUNT(*)::integer AS order_count
         FROM orders
        WHERE status IN ('PROCESSING', 'PAID')
          AND created_at >= date_trunc('day', NOW())`
    ),
    query('SELECT COUNT(*)::integer AS low_stock FROM inventory WHERE quantity <= reorder_level'),
    query(
      `SELECT product_name, SUM(quantity)::integer AS sold
         FROM (
           SELECT p.name AS product_name, si.quantity
             FROM sale_items si
             JOIN sales s ON s.id = si.sale_id
             JOIN products p ON p.id = si.product_id
            WHERE s.status = 'COMPLETED' AND s.created_at >= date_trunc('day', NOW())
           UNION ALL
           SELECT p.name AS product_name, oi.quantity
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             JOIN products p ON p.id = oi.product_id
            WHERE o.status IN ('PROCESSING', 'PAID')
              AND o.created_at >= date_trunc('day', NOW())
         ) daily_items
        GROUP BY product_name
        ORDER BY sold DESC, product_name
        LIMIT 1`
    )
  ]);
  return {
    totalSales: Number(sales.rows[0].total_sales) + Number(orders.rows[0].total_orders),
    orders: Number(sales.rows[0].transactions) + Number(orders.rows[0].order_count),
    lowStock: Number(stock.rows[0].low_stock),
    topProduct: topProduct.rows[0]?.product_name || 'Awaiting data'
  };
}

import { query } from '../config/db.js';

const dashboardRanges = {
  '7d': { bucket: 'day', offset: '6 days', step: '1 day' },
  '30d': { bucket: 'day', offset: '29 days', step: '1 day' },
  '12m': { bucket: 'month', offset: '11 months', step: '1 month' }
};

function percentageChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getSellerDashboard(range = '7d') {
  const selectedRange = dashboardRanges[range] || dashboardRanges['7d'];
  const [sales, counts, chart, products, orderStatuses] = await Promise.all([
    query(
      `WITH activity AS (
         SELECT total, created_at FROM sales WHERE status = 'COMPLETED'
         UNION ALL
         SELECT total, created_at FROM orders WHERE status IN ('PROCESSING', 'PAID', 'COMPLETED')
       ),
       recognized_revenue AS (
         SELECT total, created_at FROM sales WHERE status = 'COMPLETED'
         UNION ALL
         SELECT total, created_at FROM orders WHERE status IN ('PAID', 'COMPLETED')
       )
       SELECT
         COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('day', NOW())), 0)::numeric AS today,
         COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('day', NOW()) - INTERVAL '1 day'
                                      AND created_at < date_trunc('day', NOW())), 0)::numeric AS previous_day,
         COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('week', NOW())), 0)::numeric AS week,
         COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
                                      AND created_at < date_trunc('week', NOW())), 0)::numeric AS previous_week,
         COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0)::numeric AS month,
         COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
                                      AND created_at < date_trunc('month', NOW())), 0)::numeric AS previous_month
       FROM activity`
    ),
    query(
      `SELECT
         (SELECT COUNT(*)::integer FROM products WHERE active = TRUE) AS products,
         (SELECT COUNT(*)::integer FROM products WHERE active = TRUE AND stock_quantity <= 0) AS out_of_stock,
         (SELECT COUNT(*)::integer FROM customer_accounts WHERE active = TRUE) AS active_customers,
         (SELECT COUNT(*)::integer FROM customer_accounts
           WHERE active = TRUE AND created_at >= date_trunc('week', NOW())) AS new_customers_week,
         (SELECT COUNT(*)::integer FROM orders WHERE status IN ('PROCESSING', 'PENDING')) AS pending_orders,
         (SELECT COUNT(*)::integer FROM sales WHERE status = 'COMPLETED')
           + (SELECT COUNT(*)::integer FROM orders WHERE status IN ('PAID', 'COMPLETED')) AS completed_orders,
         (SELECT COUNT(*)::integer FROM orders WHERE status IN ('CANCELLED', 'CANCELED', 'REJECTED'))
           + (SELECT COUNT(*)::integer FROM sales WHERE status = 'VOID') AS cancelled_orders,
         (SELECT COUNT(DISTINCT sale_id)::integer FROM returns) AS returned_orders,
         (SELECT COALESCE(SUM(total), 0)::numeric FROM sales WHERE status = 'COMPLETED')
           + (SELECT COALESCE(SUM(total), 0)::numeric FROM orders WHERE status IN ('PAID', 'COMPLETED')) AS total_revenue,
         (SELECT COUNT(*)::integer FROM inventory WHERE quantity <= reorder_level) AS low_stock`
    ),
    query(
      `WITH activity AS (
         SELECT total, created_at FROM sales WHERE status = 'COMPLETED'
         UNION ALL
         SELECT total, created_at FROM orders WHERE status IN ('PROCESSING', 'PAID', 'COMPLETED')
       ),
       periods AS (
         SELECT generate_series(
           date_trunc($1, NOW()) - $2::interval,
           date_trunc($1, NOW()),
           $3::interval
         ) AS bucket
       )
       SELECT periods.bucket,
              COALESCE(SUM(activity.total), 0)::numeric AS sales
         FROM periods
         LEFT JOIN activity ON date_trunc($1, activity.created_at) = periods.bucket
        GROUP BY periods.bucket
        ORDER BY periods.bucket`,
      [selectedRange.bucket, selectedRange.offset, selectedRange.step]
    ),
    query(
      `WITH item_activity AS (
         SELECT si.product_id, si.quantity, si.line_total AS revenue
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id AND s.status = 'COMPLETED'
         UNION ALL
         SELECT oi.product_id, oi.quantity, oi.line_total AS revenue
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id AND o.status IN ('PROCESSING', 'PAID', 'COMPLETED')
       )
       SELECT p.id, p.name, p.category, p.image_url, p.stock_quantity,
              COALESCE(SUM(item_activity.quantity), 0)::integer AS units_sold,
              COALESCE(SUM(item_activity.revenue), 0)::numeric AS revenue,
              COALESCE((
                SELECT json_agg(json_build_object('size', ps.size, 'quantity', ps.quantity)
                  ORDER BY CASE ps.size
                    WHEN 'XS' THEN 1 WHEN 'S' THEN 2 WHEN 'M' THEN 3 WHEN 'L' THEN 4
                    WHEN 'XL' THEN 5 WHEN 'XXL' THEN 6 ELSE 7 END)
                  FROM product_sizes ps
                 WHERE ps.product_id = p.id
              ), '[]'::json) AS sizes
         FROM products p
         LEFT JOIN item_activity ON item_activity.product_id = p.id
        WHERE p.active = TRUE
        GROUP BY p.id
        ORDER BY units_sold DESC, p.name
        LIMIT 20`
    ),
    query(
      `SELECT status, COUNT(*)::integer AS count
         FROM orders
        GROUP BY status
        ORDER BY count DESC, status`
    )
  ]);
  const currentSales = Number(sales.rows[0].today);
  const weeklySales = Number(sales.rows[0].week);
  const monthlySales = Number(sales.rows[0].month);
  return {
    metrics: {
      salesToday: currentSales,
      salesThisWeek: weeklySales,
      salesThisMonth: monthlySales,
      totalRevenue: Number(counts.rows[0].total_revenue),
      pendingOrders: Number(counts.rows[0].pending_orders),
      completedOrders: Number(counts.rows[0].completed_orders),
      cancelledOrders: Number(counts.rows[0].cancelled_orders),
      returnedOrders: Number(counts.rows[0].returned_orders),
      totalProducts: Number(counts.rows[0].products),
      outOfStockProducts: Number(counts.rows[0].out_of_stock),
      lowStockProducts: Number(counts.rows[0].low_stock),
      activeCustomers: Number(counts.rows[0].active_customers),
      newCustomersThisWeek: Number(counts.rows[0].new_customers_week)
    },
    trends: {
      today: percentageChange(currentSales, Number(sales.rows[0].previous_day)),
      week: percentageChange(weeklySales, Number(sales.rows[0].previous_week)),
      month: percentageChange(monthlySales, Number(sales.rows[0].previous_month))
    },
    salesSeries: chart.rows.map((row) => ({
      bucket: row.bucket,
      sales: Number(row.sales)
    })),
    products: products.rows.map((row) => ({
      ...row,
      stock_quantity: Number(row.stock_quantity),
      units_sold: Number(row.units_sold),
      revenue: Number(row.revenue)
    })),
    orderStatuses: orderStatuses.rows.map((row) => ({
      status: row.status,
      count: Number(row.count)
    }))
  };
}

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

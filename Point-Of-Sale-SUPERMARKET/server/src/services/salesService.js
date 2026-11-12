import { randomUUID } from 'node:crypto';
import { withTransaction } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { createPayment } from '../../models/paymentFactory.js';
import * as salesRepository from '../repositories/salesRepository.js';
import { calculatePromotion } from './discountService.js';

const methods = new Set(['CASH', 'CARD', 'MOBILE_MONEY', 'QR']);

export async function createSale({ items, cashierId, paymentMethod, discountPercent, reference }) {
  if (!methods.has(paymentMethod)) throw new HttpError(400, 'Unsupported payment method.');
  const quantities = new Map();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  }
  const requestedItems = [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
  const id = randomUUID();

  return withTransaction(async (client) => {
    const payment = createPayment(paymentMethod, 0, reference);
    const sale = {
      id,
      receiptNumber: `CW-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 8).toUpperCase()}`,
      cashierId,
      items: requestedItems.map((item) => ({ ...item, saleItemId: randomUUID() })),
      paymentId: randomUUID()
    };

    const productRows = await client.query(
      `SELECT p.*, COALESCE(i.quantity, p.stock_quantity, 0) AS quantity,
              COALESCE(i.reorder_level, 10) AS reorder_level
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.id = ANY($1::uuid[]) AND p.active = TRUE
        ORDER BY p.id
        FOR UPDATE OF p`,
      [requestedItems.map((item) => item.productId)]
    );
    const productMap = new Map(productRows.rows.map((product) => [product.id, product]));
    const normalized = requestedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new HttpError(404, 'One or more products were not found.');
      if (Number(product.quantity) < item.quantity) {
        throw new HttpError(409, `Not enough stock available for ${product.name}.`);
      }
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        quantity: item.quantity,
        price: Number(product.price),
        taxRate: Number(product.tax_rate || 0),
        lineTotal: Math.round(Number(product.price) * item.quantity * 100) / 100,
        stock: Number(product.quantity),
        saleItemId: sale.items.find((line) => line.productId === item.productId).saleItemId
      };
    });
    const promotion = calculatePromotion(normalized);
    const appliedDiscount = discountPercent === undefined
      ? promotion.discount
      : Math.round(promotion.subtotal * Number(discountPercent) / 100 * 100) / 100;
    const tax = Math.round(normalized.reduce((sum, item) => {
      const discountShare = promotion.subtotal
        ? appliedDiscount * (item.lineTotal / promotion.subtotal)
        : 0;
      return sum + (item.lineTotal - discountShare) * item.taxRate / 100;
    }, 0) * 100) / 100;
    sale.subtotal = promotion.subtotal;
    sale.discount = appliedDiscount;
    sale.tax = tax;
    sale.total = Math.round((sale.subtotal - sale.discount + tax) * 100) / 100;
    sale.payment = { ...payment, amount: sale.total };

    const result = await salesRepository.createSaleWithProducts(client, sale, normalized);
    if (result.error === 'not_found') throw new HttpError(404, 'One or more products were not found.');
    if (result.error === 'insufficient_stock') {
      throw new HttpError(409, `Not enough stock available for ${result.productName}.`);
    }
    return { sale: result.sale, stock: result.stock, promotionApplied: promotion.promotionApplied };
  });
}

export async function processReturn({ saleId, userId, reason, items }) {
  return withTransaction(async (client) => {
    const sale = await salesRepository.findSaleForReturn(client, saleId);
    if (!sale) throw new HttpError(404, 'Sale not found.');
    let amount = 0;
    const stock = [];
    const quantities = new Map();
    for (const item of items) {
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    }
    for (const [productId, quantity] of quantities) {
      const item = { productId, quantity };
      const result = await salesRepository.returnSaleItem(client, saleId, item);
      if (!result) throw new HttpError(400, 'Return quantity is invalid.');
      amount += result.amount;
      stock.push({ productId: result.productId, stockQuantity: result.stockQuantity });
    }
    const id = randomUUID();
    await salesRepository.createReturn(client, {
      id,
      saleId,
      userId,
      reason,
      amount: Math.round(amount * 100) / 100
    });
    return { return: { id, saleId, status: 'REFUNDED', amount }, stock };
  });
}

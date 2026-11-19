import { randomUUID } from 'node:crypto';
import { withTransaction } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import * as orderRepository from '../repositories/orderRepository.js';
import { calculatePromotion } from './discountService.js';

const paymentMethods = new Set(['CARD', 'AIRTEL_MONEY', 'MTN_MOBILE_MONEY', 'CASH_ON_DELIVERY']);

function calculateTax(items, subtotal, discount) {
  if (!subtotal || !discount) {
    return Math.round(items.reduce((sum, item) => {
      return sum + Number(item.price) * Number(item.quantity) * Number(item.tax_rate || 0) / 100;
    }, 0) * 100) / 100;
  }
  const tax = items.reduce((sum, item) => {
    const lineTotal = Number(item.price) * Number(item.quantity);
    const lineDiscount = discount * (lineTotal / subtotal);
    return sum + (lineTotal - lineDiscount) * Number(item.tax_rate || 0) / 100;
  }, 0);
  return Math.round(tax * 100) / 100;
}

export async function checkout({ cartId, customer, paymentMethod, accountId = null }) {
  if (!paymentMethods.has(paymentMethod)) {
    throw new HttpError(400, 'Choose a supported payment method.');
  }
  if (paymentMethod !== 'CASH_ON_DELIVERY') {
    throw new HttpError(503, 'Online payments are not configured. Choose cash on delivery.');
  }
  const customerName = typeof customer?.name === 'string' ? customer.name.trim() : '';
  if (customerName.length < 2 || customerName.length > 120) {
    throw new HttpError(400, 'Customer name is required.');
  }

  return withTransaction(async (client) => {
    const cart = await orderRepository.getCartForUpdate(client, cartId);
    if (!cart) throw new HttpError(404, 'Cart not found.');

    const itemCount = await orderRepository.getCartItemCount(client, cartId);
    if (!itemCount) throw new HttpError(400, 'Your cart is empty.');

    const items = await orderRepository.getItemsForCheckout(client, cartId);
    if (items.length !== Number(itemCount)) {
      throw new HttpError(409, 'One or more products in your cart are no longer available.');
    }
    const unavailable = items.find((item) => Number(item.stock_quantity) < Number(item.quantity));
    if (unavailable) {
      throw new HttpError(409, `Not enough ${unavailable.size} stock available for ${unavailable.name}.`);
    }

    const promotion = calculatePromotion(items);
    const tax = calculateTax(items, promotion.subtotal, promotion.discount);
    const total = Math.round((promotion.total + tax) * 100) / 100;
    const id = randomUUID();
    const paymentReference = `CHI-${randomUUID()}`;
    const order = {
      id,
      orderNumber: `CW-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 8).toUpperCase()}`,
      customerId: await orderRepository.createCustomer(client, {
        id: randomUUID(),
        name: customerName,
        email: customer.email?.trim() || null,
        phone: customer.phone?.trim() || '',
        address: customer.address?.trim() || ''
      }),
      accountId,
      cartId,
      paymentMethod,
      status: 'PROCESSING',
      paymentStatus: 'PENDING',
      paymentId: randomUUID(),
      paymentReference,
      subtotal: promotion.subtotal,
      discount: promotion.discount,
      tax,
      total,
      items: items.map((item) => ({
        ...item,
        orderItemId: randomUUID(),
        price: Number(item.price),
        lineTotal: Math.round(Number(item.price) * Number(item.quantity) * 100) / 100
      }))
    };

    await orderRepository.createOrder(client, order);
    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        status: order.status,
        paymentReference,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        total,
        promotionApplied: promotion.promotionApplied,
        eligibleQuantity: promotion.eligibleQuantity,
        items: order.items.map(({ id: productId, name, category, size, quantity, price, lineTotal }) => ({
          productId,
          name,
          category,
          size,
          quantity: Number(quantity),
          price,
          lineTotal
        }))
      },
      paymentRequired: false
    };
  });
}

export async function getOrder(id, user) {
  const accountId = user?.role === 'CUSTOMER' ? user.id : null;
  const order = await orderRepository.getOrder(id, accountId);
  if (!order) throw new HttpError(404, 'Order not found.');
  return { order };
}

export async function listOrdersForAccount(accountId) {
  return { orders: await orderRepository.listOrdersForAccount(accountId) };
}

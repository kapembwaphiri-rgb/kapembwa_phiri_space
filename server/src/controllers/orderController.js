import * as orderService from '../services/orderService.js';

export async function checkout(req, res, next) {
  try {
    const customer = req.body.customer || { name: req.body.customerName };
    if (req.user.role === 'CUSTOMER') customer.email = req.user.email;
    const result = await orderService.checkout({
      cartId: req.body.cartId,
      customer,
      paymentMethod: req.body.paymentMethod,
      accountId: req.user.role === 'CUSTOMER' ? req.user.id : null
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req, res, next) {
  try {
    res.json(await orderService.getOrder(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
}

export async function listOrders(req, res, next) {
  try {
    res.json(await orderService.listOrdersForAccount(req.user.id));
  } catch (error) {
    next(error);
  }
}

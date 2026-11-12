import * as orderService from '../services/orderService.js';

export async function checkout(req, res, next) {
  try {
    const customer = req.body.customer || { name: req.body.customerName };
    const result = await orderService.checkout({
      cartId: req.body.cartId,
      customer,
      paymentMethod: req.body.paymentMethod
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req, res, next) {
  try {
    res.json(await orderService.getOrder(req.params.id));
  } catch (error) {
    next(error);
  }
}

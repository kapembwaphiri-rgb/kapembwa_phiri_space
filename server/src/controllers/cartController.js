import * as cartService from '../services/cartService.js';

export async function getCart(req, res, next) {
  try {
    res.json(await cartService.getCart(req.query.cartId));
  } catch (error) {
    next(error);
  }
}

export async function addItem(req, res, next) {
  try {
    res.status(200).json(await cartService.addItem(
      req.body.cartId,
      req.body.productId,
      req.body.quantity,
      req.body.size || 'ONE_SIZE'
    ));
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req, res, next) {
  try {
    res.json(await cartService.updateItem(
      req.body.cartId,
      req.body.productId,
      req.body.quantity,
      req.body.size || 'ONE_SIZE'
    ));
  } catch (error) {
    next(error);
  }
}

export async function removeItem(req, res, next) {
  try {
    res.json(await cartService.removeItem(req.body.cartId, req.body.productId, req.body.size || 'ONE_SIZE'));
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req, res, next) {
  try {
    res.json(await cartService.clearCart(req.body.cartId));
  } catch (error) {
    next(error);
  }
}

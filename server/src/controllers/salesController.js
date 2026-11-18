import * as salesService from '../services/salesService.js';

export async function createSale(req, res, next) {
  try {
    const result = await salesService.createSale({
      items: req.body.items,
      cashierId: req.user.id,
      paymentMethod: req.body.paymentMethod,
      discountPercent: req.body.discountPercent,
      reference: req.body.reference
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createReturn(req, res, next) {
  try {
    const result = await salesService.processReturn({
      saleId: req.body.saleId,
      userId: req.user.id,
      reason: req.body.reason,
      items: req.body.items
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

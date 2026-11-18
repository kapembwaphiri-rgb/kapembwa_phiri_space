import * as authService from '../services/authService.js';

export async function login(req, res, next) {
  try {
    res.json(await authService.login(req.body.email, req.body.password));
  } catch (error) {
    next(error);
  }
}

export async function registerCustomer(req, res, next) {
  try {
    res.status(201).json(await authService.registerCustomer(req.body));
  } catch (error) {
    next(error);
  }
}

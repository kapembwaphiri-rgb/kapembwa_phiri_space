import * as reportRepository from '../repositories/reportRepository.js';

export async function getSellerDashboard(req, res, next) {
  try {
    res.json(await reportRepository.getSellerDashboard(req.query.range || '7d'));
  } catch (error) {
    next(error);
  }
}

export async function getSummary(_req, res, next) {
  try {
    res.json(await reportRepository.getDailySummary());
  } catch (error) {
    next(error);
  }
}

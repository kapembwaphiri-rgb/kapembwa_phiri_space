import * as reportRepository from '../repositories/reportRepository.js';

export async function getSummary(_req, res, next) {
  try {
    res.json(await reportRepository.getDailySummary());
  } catch (error) {
    next(error);
  }
}

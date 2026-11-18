import { Router } from 'express';
import { query } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/errorHandler.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();
router.get(
  '/dashboard',
  requireAuth,
  requireRole('MANAGER', 'SUPER_ADMIN'),
  query('range').optional().isIn(['7d', '30d', '12m']),
  validateRequest,
  reportController.getSellerDashboard
);
router.get('/summary', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), reportController.getSummary);
export default router;

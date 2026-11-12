import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();
router.get('/summary', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), reportController.getSummary);
export default router;

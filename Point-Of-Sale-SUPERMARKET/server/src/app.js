import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { errorHandler, HttpError } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import { query } from './config/db.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new HttpError(403, 'Origin is not allowed.'));
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.info(JSON.stringify({
      event: 'http_request',
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    }));
  });
  next();
});

app.get('/api/health', async (_req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'postgresql' });
  } catch (error) {
    next(error);
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reports', reportRoutes);
app.use((_req, _res, next) => next(new HttpError(404, 'Route not found.')));
app.use(errorHandler);

export default app;

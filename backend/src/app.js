import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import { sendSuccess } from './utils/response.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

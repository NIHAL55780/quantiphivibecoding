import { Router } from 'express';

import * as subscriptionController from '../controllers/subscriptionController.js';

const router = Router();

router.get('/metrics', subscriptionController.getDashboardMetrics);

export default router;

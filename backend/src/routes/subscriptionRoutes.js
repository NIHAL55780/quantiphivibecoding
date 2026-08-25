import { Router } from 'express';

import * as subscriptionController from '../controllers/subscriptionController.js';

const router = Router();

router.get('/', subscriptionController.listSubscriptions);
router.post('/', subscriptionController.createSubscription);
router.patch('/:id/status', subscriptionController.updateSubscriptionStatus);
router.delete('/:id', subscriptionController.deleteSubscription);

export default router;

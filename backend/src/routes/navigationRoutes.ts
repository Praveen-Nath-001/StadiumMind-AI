import { Router } from 'express';
import * as navigationController from '../controllers/navigationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Routes secure navigation data and compute routes
router.get('/nodes', authenticateToken, navigationController.getNodes);
router.get('/edges', authenticateToken, navigationController.getEdges);
router.post('/route', authenticateToken, navigationController.calculateRoute);

export default router;

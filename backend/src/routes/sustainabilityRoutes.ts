import { Router } from 'express';
import * as sustainabilityController from '../controllers/sustainabilityController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/metrics', authenticateToken, sustainabilityController.getSustainabilityMetrics);
router.post('/audit', authenticateToken, requireRole([Role.OPERATOR, Role.ADMIN]), sustainabilityController.runSustainabilityAudit);

export default router;

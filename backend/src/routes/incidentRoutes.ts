import { Router } from 'express';
import * as incidentController from '../controllers/incidentController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.post('/', authenticateToken, incidentController.reportIncident);
router.get('/', authenticateToken, requireRole([Role.OPERATOR, Role.VOLUNTEER, Role.ADMIN]), incidentController.getIncidents);
router.patch('/:id', authenticateToken, requireRole([Role.OPERATOR, Role.VOLUNTEER, Role.ADMIN]), incidentController.updateIncidentStatus);

export default router;

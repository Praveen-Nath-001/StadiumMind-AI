import { Router } from 'express';
import * as crowdController from '../controllers/crowdController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/status', authenticateToken, crowdController.getCrowdStatus);
router.get('/briefing', authenticateToken, requireRole([Role.OPERATOR, Role.ADMIN]), crowdController.getAIBriefing);
router.post('/simulate', authenticateToken, requireRole([Role.OPERATOR, Role.ADMIN]), crowdController.runSimulationTick);
router.post('/chat', authenticateToken, crowdController.chatAssistant);
router.post('/chat-stream', authenticateToken, crowdController.chatAssistantStream);

export default router;

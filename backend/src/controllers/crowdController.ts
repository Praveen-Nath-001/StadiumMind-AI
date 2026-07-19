import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import AIService from '../services/ai/aiService';
import TelemetrySimulator from '../utils/simulator';
import { io } from '../server';

const fanChatSchema = z.object({
  query: z.string().min(1),
  conversationId: z.string().optional(),
});

export const getCrowdStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await prisma.crowdZone.findMany({
      orderBy: { zoneName: 'asc' },
    });
    res.status(200).json(status);
  } catch (err) {
    next(err);
  }
};

export const getAIBriefing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const zones = await prisma.crowdZone.findMany();
    const activeIncidents = await prisma.incident.findMany({
      where: { status: { in: ['REPORTED', 'DISPATCHED'] } },
    });

    const briefing = await AIService.generateOperationsBriefing(zones, activeIncidents);
    res.status(200).json(briefing);
  } catch (err) {
    next(err);
  }
};

export const runSimulationTick = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedZones = await TelemetrySimulator.simulateCrowdTick();
    const updatedTransit = await TelemetrySimulator.simulateTransitTick();
    const sustainability = await TelemetrySimulator.simulateSustainabilityTick();

    // Broadcast live telemetry update via Socket.IO
    if (updatedZones.length > 0) io.emit('telemetry:crowd', updatedZones);
    if (updatedTransit.length > 0) io.emit('telemetry:transit', updatedTransit);
    if (sustainability) io.emit('telemetry:sustainability', sustainability);

    res.status(200).json({
      message: 'Simulation tick executed successfully',
      crowdZones: updatedZones,
      transit: updatedTransit,
      sustainability,
    });
  } catch (err) {
    next(err);
  }
};

export const chatAssistant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = fanChatSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Solve AI Query via Gemini API Service
    const aiResult = await AIService.answerFanQuery(userId, validated.query);

    // Save conversation history to the DB
    let conversationId: string;

    if (!validated.conversationId) {
      const conv = await prisma.aIConversation.create({
        data: {
          userId,
          language: aiResult.detectedLanguage,
        },
      });
      conversationId = conv.id;
    } else {
      conversationId = validated.conversationId;
    }

    // Save messages
    await prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: validated.query,
        detectedLang: aiResult.detectedLanguage,
      },
    });

    await prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResult.response,
        detectedLang: aiResult.detectedLanguage,
      },
    });

    res.status(200).json({
      conversationId,
      detectedLanguage: aiResult.detectedLanguage,
      response: aiResult.response,
    });
  } catch (err) {
    next(err);
  }
};

export const chatAssistantStream = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Run streaming content generation
    await AIService.answerFanQueryStream(query, (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    next(err);
  }
};

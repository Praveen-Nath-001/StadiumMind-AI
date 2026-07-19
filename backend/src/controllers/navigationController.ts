import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import GraphEngine from '../services/navigation/graphEngine';
import AIService from '../services/ai/aiService';
import { AppError } from '../middleware/error';

const routeQuerySchema = z.object({
  startNode: z.string().min(1),
  endNode: z.string().min(1),
  mode: z.enum(['FASTEST', 'LEAST_CROWDED', 'WHEELCHAIR_ACCESSIBLE', 'FAMILY_FRIENDLY']).default('FASTEST'),
});

export const getNodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nodes = await prisma.routeNode.findMany();
    res.status(200).json(nodes);
  } catch (err) {
    next(err);
  }
};

export const getEdges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const edges = await prisma.routeEdge.findMany();
    res.status(200).json(edges);
  } catch (err) {
    next(err);
  }
};

export const calculateRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = routeQuerySchema.parse(req.body);

    // Solve route mathematically using Dijkstra
    const routeResult = await GraphEngine.calculateRoute(
      validated.startNode,
      validated.endNode,
      validated.mode
    );

    // Enhance route explanation using Google Gemini 2.5 Flash
    const aiExplanation = await AIService.explainRoute(
      routeResult.path,
      validated.mode
    );

    res.status(200).json({
      path: routeResult.path,
      distanceMeters: routeResult.distance,
      estimatedTimeMin: routeResult.estimatedTimeMin,
      mode: validated.mode,
      aiExplanation,
    });
  } catch (err: any) {
    next(err);
  }
};

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import AIService from '../services/ai/aiService';
import { AppError } from '../middleware/error';

export const getSustainabilityMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await prisma.sustainabilityMetric.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    if (!metrics) {
      return res.status(200).json({
        energyUsageKwh: 0,
        wasteKg: 0,
        waterLiters: 0,
        emissionsCo2Kg: 0,
        foodWasteKg: 0,
        aiInsights: 'No telemetry metrics recorded yet.',
      });
    }

    res.status(200).json(metrics);
  } catch (err) {
    next(err);
  }
};

export const runSustainabilityAudit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await prisma.sustainabilityMetric.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    if (!metrics) {
      throw new AppError('No telemetry logs logged. Cannot compile carbon audit.', 404);
    }

    // Call Gemini 2.5 Flash Sustainability Auditor via AI service
    const auditResult = await AIService.auditSustainability(metrics);

    // Update the record with the generated AI insights
    const updated = await prisma.sustainabilityMetric.update({
      where: { id: metrics.id },
      data: {
        aiInsights: JSON.stringify({
          carbonAudit: auditResult.carbonAudit,
          recommendations: auditResult.optimizationRecommendations,
        }),
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId || null,
        action: 'SUSTAINABILITY_AUDIT_COMPILED',
        details: { metricsId: metrics.id },
        ipAddress: req.ip,
      },
    });

    res.status(200).json({
      metricsId: metrics.id,
      carbonAudit: auditResult.carbonAudit,
      recommendations: auditResult.optimizationRecommendations,
    });
  } catch (err) {
    next(err);
  }
};

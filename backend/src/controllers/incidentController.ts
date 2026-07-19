import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import AIService from '../services/ai/aiService';
import { io } from '../server';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';

const reportSchema = z.object({
  type: z.string().min(2),
  severity: z.nativeEnum(IncidentSeverity).default(IncidentSeverity.MEDIUM),
  zone: z.string().min(1),
  description: z.string().min(5),
});

export const reportIncident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = reportSchema.parse(req.body);

    // AI incident emergency plan compilation via Google Gemini 2.5 Flash
    const aiAnalysis = await AIService.analyzeEmergency(
      validated.type,
      validated.severity,
      validated.zone,
      validated.description
    );

    // Save incident to the database
    const incident = await prisma.incident.create({
      data: {
        type: validated.type,
        severity: validated.severity,
        zone: validated.zone,
        description: validated.description,
        status: IncidentStatus.REPORTED,
        aiSummary: aiAnalysis.summary,
        aiResponse: {
          volunteerInstructions: aiAnalysis.volunteerInstructions,
          publicAnnouncement: aiAnalysis.publicAnnouncement,
          nearestExit: aiAnalysis.nearestExit,
        },
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId || null,
        action: 'EMERGENCY_REPORTED',
        details: { incidentId: incident.id, type: incident.type, severity: incident.severity },
        ipAddress: req.ip,
      },
    });

    // Broadcast emergency incident event immediately over sockets to the operations console
    io.emit('incident:new', incident);

    res.status(201).json({
      message: 'Incident reported and processed successfully by AI',
      incident,
    });
  } catch (err) {
    next(err);
  }
};

export const getIncidents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(incidents);
  } catch (err) {
    next(err);
  }
};

export const updateIncidentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(IncidentStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status transition parameter' });
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: { status },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId || null,
        action: 'EMERGENCY_STATUS_UPDATED',
        details: { incidentId: incident.id, status: incident.status },
        ipAddress: req.ip,
      },
    });

    io.emit('incident:update', incident);

    res.status(200).json({
      message: 'Incident status updated successfully',
      incident,
    });
  } catch (err) {
    next(err);
  }
};

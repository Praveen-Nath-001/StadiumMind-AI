import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';
import * as jwt from '../src/utils/jwt';
import { Role } from '@prisma/client';

// Mock DB
jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    routeNode: {
      findMany: jest.fn(),
    },
    routeEdge: {
      findMany: jest.fn(),
    },
    crowdZone: {
      findMany: jest.fn(),
    },
  },
}));

// Mock AI Service calls to prevent live network dependency in tests
jest.mock('../src/services/ai/aiService', () => ({
  __esModule: true,
  AIService: {
    answerFanQuery: jest.fn().mockResolvedValue({
      response: 'Mocked AI answer',
      detectedLanguage: 'en',
    }),
    explainRoute: jest.fn().mockResolvedValue('Mocked route explanation'),
  },
  default: {
    answerFanQuery: jest.fn().mockResolvedValue({
      response: 'Mocked AI answer',
      detectedLanguage: 'en',
    }),
    explainRoute: jest.fn().mockResolvedValue('Mocked route explanation'),
  },
}));

describe('REST API Controller Integrations', () => {
  let authToken = '';

  beforeAll(() => {
    // Generate valid test token
    const tokens = jwt.generateTokens('user-uuid-123', 'fan@stadiummind.ai', Role.FAN);
    authToken = tokens.accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Routes', () => {
    it('should login valid users successfully', async () => {
      const mockUser = {
        id: 'user-uuid-123',
        email: 'fan@stadiummind.ai',
        name: 'Jane Fan',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv', // mocked hash
        role: Role.FAN,
      };

      // Mock bcrypt compare inside controller
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'fan@stadiummind.ai', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.user.email).toBe('fan@stadiummind.ai');
    });
  });

  describe('Navigation API Endpoints', () => {
    it('should reject unauthenticated navigation queries', async () => {
      const res = await request(app)
        .post('/api/navigation/route')
        .send({ startNode: 'Gate A', endNode: 'Section 101', mode: 'FASTEST' });

      expect(res.status).toBe(401);
    });

    it('should compute navigation route for authenticated requests', async () => {
      const mockNodes = [
        { name: 'Gate A', latitude: 25.0, longitude: -80.0, isAccessible: true, metadata: null },
        { name: 'Section 101', latitude: 25.1, longitude: -80.1, isAccessible: true, metadata: null },
      ];
      const mockEdges = [
        { fromNode: 'Gate A', toNode: 'Section 101', distance: 100, weightModifier: 1.0, isAccessible: true },
      ];
      const mockZones = [
        { zoneName: 'Gate A', currentDensity: 0.1, queueLength: 0, occupancyCount: 10, status: 'NORMAL' },
      ];

      (prisma.routeNode.findMany as jest.Mock).mockResolvedValue(mockNodes);
      (prisma.routeEdge.findMany as jest.Mock).mockResolvedValue(mockEdges);
      (prisma.crowdZone.findMany as jest.Mock).mockResolvedValue(mockZones);

      const res = await request(app)
        .post('/api/navigation/route')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ startNode: 'Gate A', endNode: 'Section 101', mode: 'FASTEST' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('path');
      expect(res.body.path).toEqual(['Gate A', 'Section 101']);
    });
  });

  describe('Crowd Status API Endpoints', () => {
    it('should fetch crowd status correctly', async () => {
      const mockZones = [
        { zoneName: 'Gate A', currentDensity: 0.25, queueLength: 5, occupancyCount: 120, status: 'NORMAL' },
      ];
      (prisma.crowdZone.findMany as jest.Mock).mockResolvedValue(mockZones);

      const res = await request(app)
        .get('/api/crowd/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].zoneName).toBe('Gate A');
    });
  });
});

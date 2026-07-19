"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
const db_1 = __importDefault(require("../src/config/db"));
const jwt = __importStar(require("../src/utils/jwt"));
const client_1 = require("@prisma/client");
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
        const tokens = jwt.generateTokens('user-uuid-123', 'fan@stadiummind.ai', client_1.Role.FAN);
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
                role: client_1.Role.FAN,
            };
            // Mock bcrypt compare inside controller
            const bcrypt = require('bcryptjs');
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
            db_1.default.user.findUnique.mockResolvedValue(mockUser);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({ email: 'fan@stadiummind.ai', password: 'password123' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('tokens');
            expect(res.body.user.email).toBe('fan@stadiummind.ai');
        });
    });
    describe('Navigation API Endpoints', () => {
        it('should reject unauthenticated navigation queries', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
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
            db_1.default.routeNode.findMany.mockResolvedValue(mockNodes);
            db_1.default.routeEdge.findMany.mockResolvedValue(mockEdges);
            db_1.default.crowdZone.findMany.mockResolvedValue(mockZones);
            const res = await (0, supertest_1.default)(app_1.default)
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
            db_1.default.crowdZone.findMany.mockResolvedValue(mockZones);
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/crowd/status')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].zoneName).toBe('Gate A');
        });
    });
});
//# sourceMappingURL=api.test.js.map
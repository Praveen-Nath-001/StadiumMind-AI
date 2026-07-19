"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphEngine_1 = __importDefault(require("../src/services/navigation/graphEngine"));
const db_1 = __importDefault(require("../src/config/db"));
jest.mock('../src/config/db', () => ({
    __esModule: true,
    default: {
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
describe('Graph Engine Router Solver', () => {
    const mockNodes = [
        { name: 'Gate A', latitude: 25.0, longitude: -80.0, isAccessible: true, metadata: null },
        { name: 'Section 101', latitude: 25.1, longitude: -80.1, isAccessible: true, metadata: null },
        { name: 'Section 102', latitude: 25.2, longitude: -80.2, isAccessible: false, metadata: null }, // not accessible
    ];
    const mockEdges = [
        { fromNode: 'Gate A', toNode: 'Section 101', distance: 100, weightModifier: 1.0, isAccessible: true },
        { fromNode: 'Section 101', toNode: 'Gate A', distance: 100, weightModifier: 1.0, isAccessible: true },
        { fromNode: 'Gate A', toNode: 'Section 102', distance: 50, weightModifier: 1.0, isAccessible: false },
        { fromNode: 'Section 102', toNode: 'Gate A', distance: 50, weightModifier: 1.0, isAccessible: false },
        { fromNode: 'Section 101', toNode: 'Section 102', distance: 60, weightModifier: 1.0, isAccessible: false },
        { fromNode: 'Section 102', toNode: 'Section 101', distance: 60, weightModifier: 1.0, isAccessible: false },
    ];
    const mockZones = [
        { zoneName: 'Gate A', currentDensity: 0.2, queueLength: 2, occupancyCount: 50, status: 'NORMAL' },
        { zoneName: 'Section 101', currentDensity: 0.9, queueLength: 0, occupancyCount: 900, status: 'CRITICAL' },
        { zoneName: 'Section 102', currentDensity: 0.1, queueLength: 0, occupancyCount: 10, status: 'NORMAL' },
    ];
    beforeEach(() => {
        jest.clearAllMocks();
        db_1.default.routeNode.findMany.mockResolvedValue(mockNodes);
        db_1.default.routeEdge.findMany.mockResolvedValue(mockEdges);
        db_1.default.crowdZone.findMany.mockResolvedValue(mockZones);
    });
    it('should find the fastest path between accessible nodes', async () => {
        const result = await graphEngine_1.default.calculateRoute('Gate A', 'Section 101', 'FASTEST');
        expect(result.path).toEqual(['Gate A', 'Section 101']);
        expect(result.distance).toBe(100);
    });
    it('should bypass non-accessible nodes when WHEELCHAIR_ACCESSIBLE mode is specified', async () => {
        await expect(graphEngine_1.default.calculateRoute('Gate A', 'Section 102', 'WHEELCHAIR_ACCESSIBLE')).rejects.toThrow('No available route found');
    });
    it('should throw an error if nodes are unreachable', async () => {
        // Modify mock data to sever paths
        db_1.default.routeEdge.findMany.mockResolvedValue([]);
        await expect(graphEngine_1.default.calculateRoute('Gate A', 'Section 101', 'FASTEST')).rejects.toThrow('No available route found');
    });
});
//# sourceMappingURL=graphEngine.test.js.map
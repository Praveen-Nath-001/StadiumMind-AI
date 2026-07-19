import prisma from '../../config/db';
import logger from '../../utils/logger';

interface Node {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isAccessible: boolean;
}

interface Edge {
  fromNode: string;
  toNode: string;
  distance: number;
  weightModifier: number;
  isAccessible: boolean;
}

export class GraphEngine {
  /**
   * Solves shortest path using Dijkstra's algorithm
   */
  public static async calculateRoute(
    startName: string,
    endName: string,
    mode: 'FASTEST' | 'LEAST_CROWDED' | 'WHEELCHAIR_ACCESSIBLE' | 'FAMILY_FRIENDLY'
  ): Promise<{
    path: string[];
    distance: number;
    estimatedTimeMin: number;
  }> {
    // 1. Fetch nodes and edges from database
    const dbNodes = await prisma.routeNode.findMany();
    const dbEdges = await prisma.routeEdge.findMany();
    const dbZones = await prisma.crowdZone.findMany();

    // Map zone density for easy lookup
    const densityMap = new Map<string, number>();
    dbZones.forEach((z) => {
      densityMap.set(z.zoneName, z.currentDensity);
    });

    // 2. Validate start & end existence
    const startNode = dbNodes.find((n) => n.name.toLowerCase() === startName.toLowerCase());
    const endNode = dbNodes.find((n) => n.name.toLowerCase() === endName.toLowerCase());

    if (!startNode || !endNode) {
      throw new Error(`Invalid navigation parameters. Node not found: ${!startNode ? startName : endName}`);
    }

    // 3. Filter Nodes and Edges based on Accessibility
    let filteredNodes = dbNodes;
    let filteredEdges = dbEdges;

    if (mode === 'WHEELCHAIR_ACCESSIBLE') {
      filteredNodes = dbNodes.filter((n) => n.isAccessible);
      filteredEdges = dbEdges.filter((e) => e.isAccessible);
    }

    // Build Adjacency List with dynamic weights
    const adjacencyList = new Map<string, Array<{ to: string; weight: number }>>();
    filteredNodes.forEach((n) => adjacencyList.set(n.name, []));

    filteredEdges.forEach((e) => {
      const from = e.fromNode;
      const to = e.toNode;

      // Check if from and to nodes are in our filtered set
      if (!adjacencyList.has(from) || !adjacencyList.has(to)) return;

      // Calculate dynamic weight modifier
      let weight = e.distance * e.weightModifier;

      if (mode === 'LEAST_CROWDED') {
        const toDensity = densityMap.get(to) || 0.0;
        // Significantly augment weight for congested targets
        weight *= (1.0 + toDensity * 8.0);
      } else if (mode === 'FAMILY_FRIENDLY') {
        const toDensity = densityMap.get(to) || 0.0;
        // Mildly augment weight for congested nodes, prefer wider/open paths
        weight *= (1.0 + toDensity * 3.0);
      }

      adjacencyList.get(from)!.push({ to, weight });
    });

    // 4. Run Dijkstra
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    filteredNodes.forEach((n) => {
      distances.set(n.name, Infinity);
      previous.set(n.name, null);
      unvisited.add(n.name);
    });

    distances.set(startNode.name, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let minNode: string | null = null;
      let minDistance = Infinity;

      unvisited.forEach((nodeName) => {
        const dist = distances.get(nodeName)!;
        if (dist < minDistance) {
          minDistance = dist;
          minNode = nodeName;
        }
      });

      if (minNode === null || minDistance === Infinity) {
        break; // remaining nodes are unreachable
      }

      if (minNode === endNode.name) {
        break; // found destination
      }

      unvisited.delete(minNode);

      const neighbors = adjacencyList.get(minNode) || [];
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.to)) continue;

        const newDist = distances.get(minNode)! + neighbor.weight;
        if (newDist < distances.get(neighbor.to)!) {
          distances.set(neighbor.to, newDist);
          previous.set(neighbor.to, minNode);
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = endNode.name;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    // Verify path was found
    if (path[0] !== startNode.name) {
      throw new Error(`No available route found from ${startName} to ${endName} under ${mode} constraints.`);
    }

    // Calculate final actual physical distance (sum of standard distances)
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = dbEdges.find((e) => e.fromNode === path[i] && e.toNode === path[i + 1]);
      totalDistance += edge ? edge.distance : 50; // fallback if missing
    }

    // Walking speed: ~1.4 meters/sec -> ~84 meters/min
    const estimatedTimeMin = Math.max(1, Math.round(totalDistance / 80));

    return {
      path,
      distance: totalDistance,
      estimatedTimeMin,
    };
  }
}
export default GraphEngine;

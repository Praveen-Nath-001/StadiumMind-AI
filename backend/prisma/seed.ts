import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed script...');

  // 1. Create Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@stadiummind.ai' },
    update: {},
    create: {
      email: 'admin@stadiummind.ai',
      name: 'Operations Commander',
      passwordHash,
      role: Role.OPERATOR,
    },
  });

  const volunteerUser = await prisma.user.upsert({
    where: { email: 'volunteer@stadiummind.ai' },
    update: {},
    create: {
      email: 'volunteer@stadiummind.ai',
      name: 'John Volunteer',
      passwordHash,
      role: Role.VOLUNTEER,
    },
  });

  const fan = await prisma.user.upsert({
    where: { email: 'fan@stadiummind.ai' },
    update: {},
    create: {
      email: 'fan@stadiummind.ai',
      name: 'Jane Fan',
      passwordHash,
      role: Role.FAN,
    },
  });

  // Create VolunteerInfo
  await prisma.volunteerInfo.upsert({
    where: { userId: volunteerUser.id },
    update: {},
    create: {
      userId: volunteerUser.id,
      status: 'IDLE',
      currentZone: 'Gate A',
      specialties: ['MEDICAL', 'MULTILINGUAL'],
    },
  });

  console.log('Users seeded successfully.');

  // 2. Create Crowd Zones
  const zones = [
    { name: 'Gate A', density: 0.25, queue: 5, count: 120, status: 'NORMAL' },
    { name: 'Gate B', density: 0.75, queue: 45, count: 450, status: 'CONGESTED' },
    { name: 'Gate C', density: 0.40, queue: 12, count: 180, status: 'NORMAL' },
    { name: 'Section 101', density: 0.60, queue: 0, count: 600, status: 'NORMAL' },
    { name: 'Section 102', density: 0.95, queue: 0, count: 950, status: 'CRITICAL' },
    { name: 'Section 103', density: 0.50, queue: 0, count: 500, status: 'NORMAL' },
    { name: 'Section 104', density: 0.30, queue: 0, count: 300, status: 'NORMAL' },
    { name: 'Food Court A', density: 0.85, queue: 35, count: 340, status: 'CONGESTED' },
    { name: 'Restrooms East', density: 0.90, queue: 15, count: 45, status: 'CONGESTED' },
    { name: 'Medical Center', density: 0.10, queue: 1, count: 5, status: 'NORMAL' },
  ];

  for (const z of zones) {
    await prisma.crowdZone.upsert({
      where: { zoneName: z.name },
      update: {
        currentDensity: z.density,
        queueLength: z.queue,
        occupancyCount: z.count,
        status: z.status,
      },
      create: {
        zoneName: z.name,
        currentDensity: z.density,
        queueLength: z.queue,
        occupancyCount: z.count,
        status: z.status,
      },
    });
  }

  console.log('Crowd zones seeded successfully.');

  // 3. Create Navigation Nodes & Edges
  // Nodes representing stadium locations for routing simulation
  const nodes = [
    { name: 'Gate A', lat: 25.7900, lng: -80.2100, isAccessible: true, metadata: { type: 'gate', description: 'Main Entrance Gate A' } },
    { name: 'Gate B', lat: 25.7920, lng: -80.2080, isAccessible: true, metadata: { type: 'gate', description: 'Entrance Gate B' } },
    { name: 'Gate C', lat: 25.7910, lng: -80.2120, isAccessible: true, metadata: { type: 'gate', description: 'Entrance Gate C' } },
    { name: 'Concourse West', lat: 25.7905, lng: -80.2095, isAccessible: true, metadata: { type: 'concourse', description: 'West Walkway' } },
    { name: 'Concourse East', lat: 25.7915, lng: -80.2090, isAccessible: true, metadata: { type: 'concourse', description: 'East Walkway' } },
    { name: 'Section 101', lat: 25.7902, lng: -80.2092, isAccessible: true, metadata: { type: 'section', description: 'Seating Section 101' } },
    { name: 'Section 102', lat: 25.7908, lng: -80.2088, isAccessible: false, metadata: { type: 'section', description: 'Seating Section 102 - Stairs Only' } },
    { name: 'Section 103', lat: 25.7912, lng: -80.2094, isAccessible: true, metadata: { type: 'section', description: 'Seating Section 103' } },
    { name: 'Section 104', lat: 25.7918, lng: -80.2085, isAccessible: true, metadata: { type: 'section', description: 'Seating Section 104' } },
    { name: 'Food Court A', lat: 25.7906, lng: -80.2102, isAccessible: true, metadata: { type: 'facility', description: 'Main Food Plaza' } },
    { name: 'Restrooms East', lat: 25.7914, lng: -80.2082, isAccessible: true, metadata: { type: 'facility', description: 'ADA Restrooms East' } },
    { name: 'Medical Center', lat: 25.7901, lng: -80.2105, isAccessible: true, metadata: { type: 'medical', description: 'First Aid Station' } },
  ];

  for (const n of nodes) {
    await prisma.routeNode.upsert({
      where: { name: n.name },
      update: {
        latitude: n.lat,
        longitude: n.lng,
        isAccessible: n.isAccessible,
        metadata: n.metadata,
      },
      create: {
        name: n.name,
        latitude: n.lat,
        longitude: n.lng,
        isAccessible: n.isAccessible,
        metadata: n.metadata,
      },
    });
  }

  // Clear edges to avoid duplicate constraints on seeding
  await prisma.routeEdge.deleteMany({});

  // Edges connecting nodes
  const edges = [
    // Gate A connections
    { fromNode: 'Gate A', toNode: 'Concourse West', distance: 100, isAccessible: true },
    { fromNode: 'Gate A', toNode: 'Medical Center', distance: 50, isAccessible: true },
    // Gate B connections
    { fromNode: 'Gate B', toNode: 'Concourse East', distance: 80, isAccessible: true },
    // Gate C connections
    { fromNode: 'Gate C', toNode: 'Concourse West', distance: 90, isAccessible: true },
    // Concourse West links
    { fromNode: 'Concourse West', toNode: 'Section 101', distance: 40, isAccessible: true },
    { fromNode: 'Concourse West', toNode: 'Section 102', distance: 60, isAccessible: false }, // Stairs only
    { fromNode: 'Concourse West', toNode: 'Food Court A', distance: 50, isAccessible: true },
    { fromNode: 'Concourse West', toNode: 'Medical Center', distance: 120, isAccessible: true },
    { fromNode: 'Concourse West', toNode: 'Concourse East', distance: 150, isAccessible: true },
    // Concourse East links
    { fromNode: 'Concourse East', toNode: 'Section 103', distance: 45, isAccessible: true },
    { fromNode: 'Concourse East', toNode: 'Section 104', distance: 50, isAccessible: true },
    { fromNode: 'Concourse East', toNode: 'Restrooms East', distance: 30, isAccessible: true },
  ];

  // Bidirectional connections
  for (const e of edges) {
    await prisma.routeEdge.create({
      data: {
        fromNode: e.fromNode,
        toNode: e.toNode,
        distance: e.distance,
        isAccessible: e.isAccessible,
      },
    });
    // Create reverse direction
    await prisma.routeEdge.create({
      data: {
        fromNode: e.toNode,
        toNode: e.fromNode,
        distance: e.distance,
        isAccessible: e.isAccessible,
      },
    });
  }

  console.log('Navigation nodes & edges seeded successfully.');

  // 4. Create Transit Options
  const transitOptions = [
    { type: 'METRO', name: 'Metrorail Orange Line', status: 'NORMAL', waitTimeMin: 6, capacityPct: 65 },
    { type: 'BUS', name: 'Downtown Shuttle Loop Express', status: 'DELAYED', waitTimeMin: 22, capacityPct: 90 },
    { type: 'WALKING', name: 'Pedestrian Parkway West', status: 'NORMAL', waitTimeMin: 0, capacityPct: 15 },
    { type: 'TAXI', name: 'Taxi Stand Row A', status: 'CONGESTED', waitTimeMin: 18, capacityPct: 80 },
    { type: 'RIDESHARE', name: 'Rideshare Zone North', status: 'NORMAL', waitTimeMin: 10, capacityPct: 70 },
  ];

  await prisma.transportOption.deleteMany({});
  for (const t of transitOptions) {
    await prisma.transportOption.create({
      data: t,
    });
  }
  console.log('Transit options seeded successfully.');

  // 5. Create Sustainability Metrics
  await prisma.sustainabilityMetric.deleteMany({});
  await prisma.sustainabilityMetric.create({
    data: {
      energyUsageKwh: 4520.5,
      wasteKg: 1200.0,
      waterLiters: 15000.0,
      emissionsCo2Kg: 2850.4,
      foodWasteKg: 350.2,
      aiInsights: 'Optimized lighting arrays in Section 100-200. Cooling efficiency at peak. Recycling diverted 65% of waste.',
    },
  });
  console.log('Sustainability metrics seeded successfully.');

  console.log('Seed database execution complete.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

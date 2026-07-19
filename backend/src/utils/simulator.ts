import prisma from '../config/db';
import logger from './logger';

export class TelemetrySimulator {
  /**
   * Randomly fluctuates crowd density and queues.
   */
  public static async simulateCrowdTick(): Promise<any[]> {
    try {
      const zones = await prisma.crowdZone.findMany();
      const updatedZones = [];

      for (const zone of zones) {
        // Exclude specific medical/administrative areas from excessive crowd spikes unless manual simulation overrides it.
        const isFocalZone = ['Gate B', 'Section 102', 'Food Court A', 'Restrooms East'].includes(zone.zoneName);

        let deltaDensity = (Math.random() - 0.5) * 0.15; // fluctuate density by max 15%
        let newDensity = Math.max(0.05, Math.min(1.0, zone.currentDensity + deltaDensity));

        // Let's set some default peaks
        if (isFocalZone && Math.random() > 0.7) {
          newDensity = Math.min(1.0, newDensity + 0.1);
        }

        let newQueue = zone.queueLength;
        if (newDensity > 0.8) {
          newQueue = Math.min(100, zone.queueLength + Math.floor(Math.random() * 5));
        } else if (newDensity < 0.4) {
          newQueue = Math.max(0, zone.queueLength - Math.floor(Math.random() * 3));
        } else {
          newQueue = Math.max(0, zone.queueLength + (Math.random() > 0.5 ? 1 : -1));
        }

        const newCount = Math.round(newDensity * (zone.zoneName.startsWith('Section') ? 1000 : 500));

        let status = 'NORMAL';
        if (newDensity >= 0.9) status = 'CRITICAL';
        else if (newDensity >= 0.7) status = 'CONGESTED';

        const updated = await prisma.crowdZone.update({
          where: { id: zone.id },
          data: {
            currentDensity: parseFloat(newDensity.toFixed(2)),
            queueLength: newQueue,
            occupancyCount: newCount,
            status,
          },
        });
        updatedZones.push(updated);
      }

      logger.debug('Simulated crowd telemetry tick successfully executed.');
      return updatedZones;
    } catch (e: any) {
      logger.error(`Telemetry simulation crowd tick error: ${e.message}`);
      return [];
    }
  }

  /**
   * Fluctuates transit options times/capacities.
   */
  public static async simulateTransitTick(): Promise<any[]> {
    try {
      const transitOptions = await prisma.transportOption.findMany();
      const updatedTransit = [];

      for (const t of transitOptions) {
        let waitDelta = Math.random() > 0.5 ? 1 : -1;
        let newWait = Math.max(2, Math.min(60, t.waitTimeMin + waitDelta));

        let capDelta = Math.random() > 0.5 ? 5 : -5;
        let newCap = Math.max(10, Math.min(100, t.capacityPct + capDelta));

        let status = 'NORMAL';
        if (newWait > 20) status = 'CONGESTED';
        if (newWait > 35) status = 'DELAYED';

        const updated = await prisma.transportOption.update({
          where: { id: t.id },
          data: {
            waitTimeMin: newWait,
            capacityPct: newCap,
            status,
          },
        });
        updatedTransit.push(updated);
      }
      logger.debug('Simulated transit telemetry tick successfully executed.');
      return updatedTransit;
    } catch (e: any) {
      logger.error(`Telemetry simulation transit tick error: ${e.message}`);
      return [];
    }
  }

  /**
   * Increases utility usages incrementally.
   */
  public static async simulateSustainabilityTick(): Promise<any> {
    try {
      const lastMetric = await prisma.sustainabilityMetric.findFirst({
        orderBy: { timestamp: 'desc' },
      });

      const baseEnergy = lastMetric ? lastMetric.energyUsageKwh : 4000;
      const baseWaste = lastMetric ? lastMetric.wasteKg : 1000;
      const baseWater = lastMetric ? lastMetric.waterLiters : 12000;
      const baseEmissions = lastMetric ? lastMetric.emissionsCo2Kg : 2500;
      const baseFoodWaste = lastMetric ? lastMetric.foodWasteKg : 300;

      const incrementEnergy = parseFloat((Math.random() * 5).toFixed(2));
      const incrementWaste = parseFloat((Math.random() * 2).toFixed(2));
      const incrementWater = parseFloat((Math.random() * 15).toFixed(2));
      const incrementFoodWaste = parseFloat((Math.random() * 0.5).toFixed(2));
      const incrementEmissions = parseFloat((incrementEnergy * 0.6).toFixed(2)); // correlation factor

      const updated = await prisma.sustainabilityMetric.create({
        data: {
          energyUsageKwh: parseFloat((baseEnergy + incrementEnergy).toFixed(2)),
          wasteKg: parseFloat((baseWaste + incrementWaste).toFixed(2)),
          waterLiters: parseFloat((baseWater + incrementWater).toFixed(2)),
          emissionsCo2Kg: parseFloat((baseEmissions + incrementEmissions).toFixed(2)),
          foodWasteKg: parseFloat((baseFoodWaste + incrementFoodWaste).toFixed(2)),
          aiInsights: 'Utility consumption updated via live telemetry stream.',
        },
      });

      logger.debug('Simulated sustainability tick successfully executed.');
      return updated;
    } catch (e: any) {
      logger.error(`Telemetry simulation sustainability tick error: ${e.message}`);
      return null;
    }
  }
}
export default TelemetrySimulator;

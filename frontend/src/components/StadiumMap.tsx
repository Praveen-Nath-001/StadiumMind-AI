import React, { useEffect, useState } from 'react';
import useAccessibility from '../hooks/useAccessibility';
import logger from '../utils/logger'; // we can create a simple logger or console.log. Let's create a utility logger or use console.

interface Node {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isAccessible: boolean;
  metadata?: any;
}

interface StadiumMapProps {
  nodes: Node[];
  highlightPath?: string[]; // array of node names representing resolved path
  crowdZones?: Array<{ zoneName: string; currentDensity: number; status: string }>;
  onNodeSelect?: (nodeName: string) => void;
}

export default function StadiumMap({
  nodes,
  highlightPath = [],
  crowdZones = [],
  onNodeSelect,
}: StadiumMapProps) {
  const { speak } = useAccessibility();
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [polyLine, setPolyLine] = useState<any>(null);
  const [circles, setCircles] = useState<any[]>([]);

  useEffect(() => {
    // Dynamically load Leaflet client-side
    const L = require('leaflet');

    // Setup map
    const map = L.map('stadium-map-container', {
      center: [25.7908, -80.2095], // Centered at Hard Rock Stadium Miami coordinates
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark Map tiles from CartoDB (perfect for dark mode theme)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    setMapInstance(map);

    return () => {
      map.remove();
    };
  }, []);

  // Update nodes on the map
  useEffect(() => {
    if (!mapInstance || nodes.length === 0) return;

    const L = require('leaflet');

    // Clear old markers
    markers.forEach((m) => m.remove());
    const newMarkers: any[] = [];

    nodes.forEach((n) => {
      // Determine color based on accessibility / type
      const isPart = highlightPath.includes(n.name);
      const isStart = highlightPath[0] === n.name;
      const isEnd = highlightPath[highlightPath.length - 1] === n.name;

      let color = '#FFD700'; // Brand Gold
      if (isStart) color = '#00F2FE'; // Neon cyan for start
      if (isEnd) color = '#FF2E93'; // Crimson for end
      else if (!n.isAccessible) color = '#7F1D1D'; // Dark red for inaccessible

      const markerHtml = `
        <div style="
          background-color: ${color};
          width: 16px;
          height: 16px;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 8px ${color};
          cursor: pointer;
        "></div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const m = L.marker([n.latitude, n.longitude], { icon: customIcon })
        .addTo(mapInstance)
        .bindTooltip(
          `<strong>${n.name}</strong><br/>${
            n.isAccessible ? '♿ Wheelchair Accessible' : '⚠ Stairs Only'
          }`,
          { permanent: false, direction: 'top' }
        );

      if (onNodeSelect) {
        m.on('click', () => {
          onNodeSelect(n.name);
          speak(`Selected node ${n.name}`);
        });
      }

      newMarkers.push(m);
    });

    setMarkers(newMarkers);
  }, [mapInstance, nodes, highlightPath]);

  // Update Highlight Route Polyline
  useEffect(() => {
    if (!mapInstance || nodes.length === 0) return;

    const L = require('leaflet');

    // Remove old polyline
    if (polyLine) {
      polyLine.remove();
    }

    if (highlightPath.length < 2) return;

    // Resolve coordinates of highlight paths
    const latlngs: any[] = [];
    highlightPath.forEach((nodName) => {
      const match = nodes.find((n) => n.name.toLowerCase() === nodName.toLowerCase());
      if (match) {
        latlngs.push([match.latitude, match.longitude]);
      }
    });

    if (latlngs.length >= 2) {
      const pl = L.polyline(latlngs, {
        color: '#00F2FE', // Neon Cyan route line
        weight: 6,
        opacity: 0.8,
        dashArray: '8, 8', // Animated dash effect
      }).addTo(mapInstance);

      // Fit bounds to show route
      mapInstance.fitBounds(pl.getBounds(), { padding: [40, 40] });
      setPolyLine(pl);
    }
  }, [mapInstance, highlightPath, nodes]);

  // Update Dynamic Crowd Densities (Heatmap / Queue Circles)
  useEffect(() => {
    if (!mapInstance || nodes.length === 0 || crowdZones.length === 0) return;

    const L = require('leaflet');

    // Clear old circles
    circles.forEach((c) => c.remove());
    const newCircles: any[] = [];

    crowdZones.forEach((z) => {
      // Find node coordinate for the zone
      const nodeMatch = nodes.find((n) => n.name.toLowerCase() === z.zoneName.toLowerCase());
      if (!nodeMatch) return;

      const density = z.currentDensity;
      let circleColor = '#10B981'; // Green (NORMAL)
      if (z.status === 'CONGESTED') circleColor = '#F59E0B'; // Orange
      if (z.status === 'CRITICAL') circleColor = '#EF4444'; // Red

      // Draw crowd heat circle
      const c = L.circle([nodeMatch.latitude, nodeMatch.longitude], {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.25,
        radius: 25 + density * 30, // scale size based on density
      }).addTo(mapInstance);

      newCircles.push(c);
    });

    setCircles(newCircles);
  }, [mapInstance, crowdZones, nodes]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-glass border border-white/10">
      <div id="stadium-map-container" className="w-full h-full min-h-[400px] bg-brand-dark" />
      <div className="absolute bottom-4 left-4 z-[9999] glass-panel p-3 rounded-lg text-xs space-y-1.5 border border-white/10 pointer-events-none">
        <p className="font-bold text-white mb-1">Telemetry Status Map Legend</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#10B981] border border-white/20" />
          <span className="text-brand-textMuted">Normal Load</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#F59E0B] border border-white/20" />
          <span className="text-brand-textMuted">Congested</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EF4444] border border-white/20" />
          <span className="text-brand-textMuted">Critical Safety Level</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00F2FE] border border-white/20" />
          <span className="text-brand-textMuted">Active Navigation Path</span>
        </div>
      </div>
    </div>
  );
}

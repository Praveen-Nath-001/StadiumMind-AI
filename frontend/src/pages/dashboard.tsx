import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import api from '../services/api';
import useAccessibility from '../hooks/useAccessibility';
import { io } from 'socket.io-client';
import { 
  Activity, 
  AlertTriangle, 
  Award, 
  Zap, 
  BarChart3, 
  Map, 
  ShieldAlert, 
  Play, 
  Compass, 
  PlusCircle 
} from 'lucide-react';

const StadiumMap = dynamic(() => import('../components/StadiumMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] flex items-center justify-center bg-brand-card text-brand-textMuted rounded-2xl animate-pulse">
      Loading Control Map Layer...
    </div>
  ),
});

export default function OperationsDashboard() {
  const router = useRouter();
  const { speak } = useAccessibility();

  // State
  const [nodes, setNodes] = useState<any[]>([]);
  const [crowdZones, setCrowdZones] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [sustainability, setSustainability] = useState<any>(null);
  
  // AI Operations Briefing
  const [aiBriefing, setAiBriefing] = useState<string>('Generating latest operational telemetry summary...');
  const [aiActions, setAiActions] = useState<string[]>([]);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // New incident report form
  const [showReportForm, setShowReportForm] = useState(false);
  const [newIncident, setNewIncident] = useState({
    type: 'MEDICAL',
    severity: 'MEDIUM',
    zone: 'Gate A',
    description: '',
  });
  const [reportingLoading, setReportingLoading] = useState(false);

  // Load baseline statistics and telemetry
  useEffect(() => {
    const accessToken = localStorage.getItem('sm_access_token');
    const role = localStorage.getItem('sm_user_role');

    if (!accessToken) {
      router.push('/login');
      return;
    }

    if (role !== 'OPERATOR' && role !== 'ADMIN') {
      router.push('/'); // redirect non-operators to Fan PWA
      return;
    }

    const loadData = async () => {
      try {
        const nodesRes = await api.get('/navigation/nodes');
        setNodes(nodesRes.data);

        const crowdRes = await api.get('/crowd/status');
        setCrowdZones(crowdRes.data);

        const incidentsRes = await api.get('/incidents');
        setIncidents(incidentsRes.data);

        const metricsRes = await api.get('/sustainability/metrics');
        setSustainability(metricsRes.data);

        // Load baseline briefing
        fetchBriefing();
      } catch (err) {
        console.error('Failed to load operations dashboard baseline data', err);
      }
    };
    loadData();

    // Setup Websocket connections
    const socketURL = typeof window !== 'undefined' && window.location.hostname.endsWith('loca.lt')
      ? 'https://sour-rooms-slide.loca.lt'
      : 'http://localhost:5000';
    const socket = io(socketURL);

    socket.on('telemetry:crowd', (updatedZones) => {
      setCrowdZones(updatedZones);
    });

    socket.on('telemetry:sustainability', (updatedMetrics) => {
      setSustainability(updatedMetrics);
    });

    socket.on('incident:new', (incident) => {
      setIncidents((prev) => [incident, ...prev]);
      speak(`New Alert: ${incident.type} reported in ${incident.zone}. Operations briefing update queued.`);
      // Refresh briefing automatically on incident
      fetchBriefing();
    });

    socket.on('incident:update', (updatedIncident) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === updatedIncident.id ? updatedIncident : i))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch AI operational briefing recommendations
  const fetchBriefing = async () => {
    setBriefingLoading(true);
    try {
      const res = await api.get('/crowd/briefing');
      setAiBriefing(res.data.briefing);
      setAiActions(res.data.actions);
    } catch (err) {
      console.error(err);
      setAiBriefing('Failed to compile operational briefing automatically.');
    } finally {
      setBriefingLoading(false);
    }
  };

  // Trigger manual simulation telemetry update tick (useful for test runs)
  const triggerTelemetryTick = async () => {
    speak('Forcing simulated telemetry update tick.');
    try {
      await api.post('/crowd/simulate');
      // Update local state values right away
      const crowdRes = await api.get('/crowd/status');
      setCrowdZones(crowdRes.data);
      
      const metricsRes = await api.get('/sustainability/metrics');
      setSustainability(metricsRes.data);

      fetchBriefing();
    } catch (err) {
      console.error(err);
    }
  };

  // Submit manual incident report
  const submitIncidentReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.description) return;

    setReportingLoading(true);
    speak('Submitting incident report. Processing dynamic AI strategies.');

    try {
      await api.post('/incidents', newIncident);
      setNewIncident({
        type: 'MEDICAL',
        severity: 'MEDIUM',
        zone: 'Gate A',
        description: '',
      });
      setShowReportForm(false);
      // Wait socket update triggers
    } catch (err) {
      console.error(err);
      speak('Failed to file incident. Check connection endpoints.');
    } finally {
      setReportingLoading(false);
    }
  };

  // Resolve active incidents
  const resolveIncident = async (id: string) => {
    speak('Resolving incident.');
    try {
      await api.patch(`/incidents/${id}`, { status: 'RESOLVED' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070F] text-brand-text">
      {/* Ops Header Banner */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-crimson to-brand-accent flex items-center justify-center text-brand-dark font-black text-lg shadow-glow">
            HQ
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-white">Operations Command Center</h1>
            <p className="text-xs text-brand-crimson font-bold uppercase tracking-wider">StadiumMind AI Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={triggerTelemetryTick}
            className="flex items-center gap-2 bg-brand-card hover:bg-brand-card/85 text-white border border-white/10 text-xs font-bold px-3 py-2 rounded-lg"
            title="Force telemetry updates manually"
          >
            <Play size={14} className="text-brand-emerald" />
            Force telemetry Tick
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="bg-brand-dark hover:bg-brand-card text-brand-textMuted border border-white/10 text-xs font-bold px-3 py-2 rounded-lg"
          >
            Switch to Fan Companion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Row 1: High Level Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-brand-textMuted font-semibold">Active Incidents</p>
              <h4 className="text-2xl font-bold text-white mt-1 font-heading">
                {incidents.filter((i) => i.status !== 'RESOLVED').length}
              </h4>
            </div>
            <ShieldAlert size={28} className="text-brand-crimson" />
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-brand-textMuted font-semibold">Critical Crowd Zones</p>
              <h4 className="text-2xl font-bold text-white mt-1 font-heading">
                {crowdZones.filter((z) => z.status === 'CRITICAL').length}
              </h4>
            </div>
            <Activity size={28} className="text-brand-accent" />
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-brand-textMuted font-semibold">Total Carbon Offset Est.</p>
              <h4 className="text-2xl font-bold text-white mt-1 font-heading">
                {sustainability ? `${sustainability.emissionsCo2Kg} kg` : '0 kg'}
              </h4>
            </div>
            <Zap size={28} className="text-brand-teal" />
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-brand-textMuted font-semibold">Security Alert Status</p>
              <h4 className="text-sm font-extrabold text-brand-emerald mt-1 font-heading tracking-widest uppercase">
                {incidents.some((i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED') ? 'CRITICAL EVAC' : 'SECURE'}
              </h4>
            </div>
            <Activity size={28} className="text-brand-emerald" />
          </div>
        </section>

        {/* Row 2: Maps and Incident Feeds */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Map Layer */}
          <div className="lg:col-span-8 glass-panel p-5 rounded-2xl border border-white/10 flex flex-col min-h-[450px]">
            <h3 className="text-lg font-bold text-white flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <span className="flex items-center gap-2">
                <Map size={18} className="text-brand-crimson" />
                Crowd Density & Incident Hotspots
              </span>
            </h3>

            <div className="flex-1 w-full relative">
              <StadiumMap
                nodes={nodes}
                crowdZones={crowdZones}
                highlightPath={[]}
              />
            </div>
          </div>

          {/* Incident reporting / dispatcher console */}
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-white/10 flex flex-col h-[450px]">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert size={18} className="text-brand-crimson" />
                Crisis Feed
              </h3>
              <button
                onClick={() => setShowReportForm(!showReportForm)}
                className="text-brand-accent hover:text-yellow-400 text-xs flex items-center gap-1 font-semibold"
              >
                <PlusCircle size={14} /> File Incident
              </button>
            </div>

            {/* New Incident Overlay Form */}
            {showReportForm ? (
              <form onSubmit={submitIncidentReport} className="space-y-3 text-xs bg-brand-dark p-4 rounded-xl border border-white/10">
                <h4 className="font-bold text-brand-accent">Log Incident Report</h4>
                <div>
                  <label className="block text-brand-textMuted mb-0.5 font-semibold">Incident Type</label>
                  <select
                    value={newIncident.type}
                    onChange={(e) => setNewIncident((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-brand-card border border-white/15 px-2 py-1.5 rounded text-white"
                  >
                    <option value="MEDICAL">Medical Emergency</option>
                    <option value="FIRE">Fire Hazard</option>
                    <option value="SECURITY">Security / Altercation</option>
                    <option value="LOST_CHILD">Lost Child</option>
                    <option value="CROWD_STAMPEDE">Crowd Stampede</option>
                    <option value="WEATHER">Extreme Weather</option>
                  </select>
                </div>

                <div>
                  <label className="block text-brand-textMuted mb-0.5 font-semibold">Severity</label>
                  <select
                    value={newIncident.severity}
                    onChange={(e) => setNewIncident((prev) => ({ ...prev, severity: e.target.value }))}
                    className="w-full bg-brand-card border border-white/15 px-2 py-1.5 rounded text-white"
                  >
                    <option value="LOW">Low Alert</option>
                    <option value="MEDIUM">Medium Alert</option>
                    <option value="HIGH">High Alert</option>
                    <option value="CRITICAL">Critical Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-brand-textMuted mb-0.5 font-semibold">Zone</label>
                  <select
                    value={newIncident.zone}
                    onChange={(e) => setNewIncident((prev) => ({ ...prev, zone: e.target.value }))}
                    className="w-full bg-brand-card border border-white/15 px-2 py-1.5 rounded text-white"
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.name}>{n.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-brand-textMuted mb-0.5 font-semibold">Details / Description</label>
                  <textarea
                    value={newIncident.description}
                    onChange={(e) => setNewIncident((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full bg-brand-card border border-white/15 px-2 py-1.5 rounded text-white"
                    placeholder="Provide details about emergency..."
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="py-1 px-3 bg-brand-dark hover:bg-brand-card text-brand-textMuted rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportingLoading}
                    className="py-1 px-4 bg-brand-crimson text-white rounded font-semibold"
                  >
                    {reportingLoading ? 'Filing...' : 'Submit Alert'}
                  </button>
                </div>
              </form>
            ) : (
              // Incident Scroll Feed
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {incidents.length === 0 ? (
                  <p className="text-xs text-brand-textMuted text-center mt-8">No current incidents reported.</p>
                ) : (
                  incidents.map((i) => (
                    <div
                      key={i.id}
                      className={`p-3 rounded-xl border flex flex-col space-y-2 text-xs ${
                        i.status === 'RESOLVED'
                          ? 'bg-brand-dark/20 border-white/5 opacity-55'
                          : i.severity === 'CRITICAL'
                          ? 'bg-red-900/10 border-red-500/30'
                          : 'bg-brand-card border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <strong className="text-white">{i.type}</strong>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            i.severity === 'CRITICAL'
                              ? 'bg-red-500 text-white'
                              : 'bg-brand-accent/20 text-brand-accent'
                          }`}
                        >
                          {i.severity}
                        </span>
                      </div>
                      
                      <p className="text-brand-textMuted">{i.description}</p>
                      
                      {i.aiSummary && (
                        <div className="bg-brand-dark/60 p-2.5 rounded border border-white/5 space-y-1">
                          <p className="font-bold text-brand-teal text-[10px]">AI Strategic Evac Route plan:</p>
                          <p className="text-[10px] italic leading-normal text-brand-text">Exit via: {i.aiResponse?.nearestExit}</p>
                          <p className="text-[10px] leading-normal text-brand-text">{i.aiResponse?.volunteerInstructions}</p>
                        </div>
                      )}

                      {i.status !== 'RESOLVED' && (
                        <button
                          onClick={() => resolveIncident(i.id)}
                          className="mt-2 text-brand-emerald hover:underline font-bold text-right ml-auto block"
                        >
                          Mark as Resolved
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {/* Row 3: AI Operations Briefing Panel */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12 glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-brand-teal" />
                AI Command Briefing Board
              </h3>
              <button
                onClick={fetchBriefing}
                disabled={briefingLoading}
                className="text-xs text-brand-teal hover:underline font-semibold"
              >
                {briefingLoading ? 'Synthesizing...' : 'Refresh AI Analysis'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-2">
                <strong className="text-brand-accent text-xs block uppercase tracking-wider">Operational Summary:</strong>
                <p className="text-sm text-brand-text leading-relaxed">
                  {aiBriefing}
                </p>
              </div>

              <div className="lg:col-span-4 p-4 bg-brand-dark/50 border border-white/5 rounded-xl space-y-2.5">
                <strong className="text-brand-teal text-xs block uppercase tracking-wider">AI Prioritized Action Steps:</strong>
                <ul className="list-disc pl-4 text-xs text-brand-textMuted space-y-1.5">
                  {aiActions.length === 0 ? (
                    <li>Stadium status is completely within normal operating thresholds.</li>
                  ) : (
                    aiActions.map((act, index) => <li key={index}>{act}</li>)
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

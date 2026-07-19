import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import api from '../services/api';
import useAccessibility from '../hooks/useAccessibility';
import { io } from 'socket.io-client';
import { 
  Navigation, 
  MapPin, 
  Accessibility, 
  MessageSquare, 
  Volume2, 
  Mic, 
  LogOut, 
  Compass, 
  Activity, 
  AlertTriangle, 
  Flame, 
  User, 
  Globe 
} from 'lucide-react';

// Dynamically import Leaflet Map to ensure window object is client-side only
const StadiumMap = dynamic(() => import('../components/StadiumMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-brand-card text-brand-textMuted rounded-2xl animate-pulse">
      Loading Interactive Map Layer...
    </div>
  ),
});

export default function FanCompanion() {
  const router = useRouter();
  const {
    highContrast,
    toggleHighContrast,
    largeText,
    toggleLargeText,
    textToSpeech,
    toggleTextToSpeech,
    speak,
    speechToTextSupport,
    isListening,
    startListening,
    stopListening
  } = useAccessibility();

  // State
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('');
  const [nodes, setNodes] = useState<any[]>([]);
  const [crowdZones, setCrowdZones] = useState<any[]>([]);
  const [transitOptions, setTransitOptions] = useState<any[]>([]);
  
  // Navigation Routing Selection
  const [startNode, setStartNode] = useState('Gate A');
  const [endNode, setEndNode] = useState('Section 101');
  const [navMode, setNavMode] = useState<'FASTEST' | 'LEAST_CROWDED' | 'WHEELCHAIR_ACCESSIBLE' | 'FAMILY_FRIENDLY'>('FASTEST');
  const [calculatedRoute, setCalculatedRoute] = useState<{
    path: string[];
    distanceMeters: number;
    estimatedTimeMin: number;
    aiExplanation: string;
  } | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  // Chat Box state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: 'Welcome to StadiumMind AI Assistant! Ask me any questions in your language regarding Gates, Parking, Seats, Restrooms, or emergency procedures.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  // Load profile and baseline telemetry data
  useEffect(() => {
    const accessToken = localStorage.getItem('sm_access_token');
    if (!accessToken) {
      router.push('/login');
      return;
    }

    setUserName(localStorage.getItem('sm_user_name') || 'Fan User');
    setRole(localStorage.getItem('sm_user_role') || 'FAN');

    // Fetch baseline values
    const fetchBaseData = async () => {
      try {
        const nodesRes = await api.get('/navigation/nodes');
        setNodes(nodesRes.data);

        const crowdRes = await api.get('/crowd/status');
        setCrowdZones(crowdRes.data);

        // Fetch transit options
        const transitRes = await api.get('/sustainability/metrics');
        // Let's get static options or simulate. We can get transit from backend simulator too.
      } catch (err) {
        console.error('Failed to load baseline stadium elements', err);
      }
    };
    fetchBaseData();

    // Establish WebSocket Connection
    const socketURL = typeof window !== 'undefined' && window.location.hostname.endsWith('loca.lt')
      ? 'https://sour-rooms-slide.loca.lt'
      : 'http://localhost:5000';
    const socket = io(socketURL);

    socket.on('telemetry:crowd', (updatedZones) => {
      setCrowdZones(updatedZones);
    });

    socket.on('telemetry:transit', (updatedTransit) => {
      setTransitOptions(updatedTransit);
    });

    socket.on('incident:new', (incident) => {
      speak(`Emergency Alert! ${incident.type} reported in ${incident.zone}. Dynamic exit directions calculated.`);
      // Set emergency banner or redirect path to exit
      setStartNode(incident.zone);
      setEndNode('Gate A');
      setNavMode('FASTEST');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Solve route calculations
  const calculateDirections = async () => {
    setRoutingLoading(true);
    speak(`Solving best route from ${startNode} to ${endNode}`);
    try {
      const res = await api.post('/navigation/route', {
        startNode,
        endNode,
        mode: navMode,
      });
      setCalculatedRoute(res.data);
      speak(res.data.aiExplanation);
    } catch (err: any) {
      console.error(err);
      speak('Routing lookup failed. Ensure start and end gates are valid.');
    } finally {
      setRoutingLoading(false);
    }
  };

  // Submit Chat query to Gemini Assistant
  const submitChat = async (inputQuery?: string) => {
    const query = inputQuery || chatInput;
    if (!query.trim()) return;

    setChatMessages((prev) => [...prev, { role: 'user', content: query }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post('/crowd/chat', {
        query,
        conversationId,
      });

      setConversationId(res.data.conversationId);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
      speak(res.data.response);
    } catch (e: any) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Connection timed out. Please query again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSpeechInput = () => {
    if (isListening) {
      stopListening();
    } else {
      speak("Listening...");
      startListening((text) => {
        setChatInput(text);
        submitChat(text);
      });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#05070F] text-brand-text">
      {/* Top Premium Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-teal to-brand-accent flex items-center justify-center text-brand-dark font-black text-lg shadow-glow">
            SM
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-white">StadiumMind AI</h1>
            <p className="text-xs text-brand-accent">FIFA World Cup 2026 Companion</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-xs text-brand-textMuted bg-brand-card px-3 py-1.5 rounded-full border border-white/5">
            Logged as: <strong className="text-brand-accent">{userName} ({role})</strong>
          </span>

          {/* Quick Access to Ops Dashboard if Admin */}
          {(role === 'OPERATOR' || role === 'ADMIN') && (
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-brand-teal hover:bg-teal-400 text-brand-dark text-xs font-bold px-3 py-1.5 rounded"
            >
              Control Panel
            </button>
          )}

          <button
            onClick={handleLogout}
            className="text-brand-textMuted hover:text-white p-2"
            aria-label="Logout user session"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: Accessibility Widgets & Smart Navigation Controls */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Accessibility Adjuster (WCAG 2.2 compliant controls) */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <Accessibility size={18} className="text-brand-teal" />
              Accessibility Assist (WCAG)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={toggleHighContrast}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                  highContrast 
                    ? 'bg-white text-black border-white' 
                    : 'bg-brand-dark text-white border-white/10 hover:bg-brand-card'
                }`}
              >
                High Contrast
              </button>
              <button
                onClick={toggleLargeText}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                  largeText 
                    ? 'bg-white text-black border-white' 
                    : 'bg-brand-dark text-white border-white/10 hover:bg-brand-card'
                }`}
              >
                Large Text Mode
              </button>
              <button
                onClick={toggleTextToSpeech}
                className={`col-span-2 py-2.5 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${
                  textToSpeech 
                    ? 'bg-brand-accent text-brand-dark border-brand-accent shadow-glow' 
                    : 'bg-brand-dark text-white border-white/10 hover:bg-brand-card'
                }`}
              >
                <Volume2 size={16} />
                Text-to-Speech (Reader)
              </button>
            </div>
          </div>

          {/* Navigation Planner */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <Compass size={18} className="text-brand-teal" />
              Smart Graph Navigation
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-brand-textMuted mb-1 font-semibold">Start Location</label>
                <select
                  value={startNode}
                  onChange={(e) => setStartNode(e.target.value)}
                  className="w-full bg-brand-dark border border-white/10 px-3 py-2 text-sm text-white rounded-lg"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.name}>{n.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-brand-textMuted mb-1 font-semibold">Destination Location</label>
                <select
                  value={endNode}
                  onChange={(e) => setEndNode(e.target.value)}
                  className="w-full bg-brand-dark border border-white/10 px-3 py-2 text-sm text-white rounded-lg"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.name}>{n.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-brand-textMuted mb-1 font-semibold">Navigation Mode</label>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {['FASTEST', 'LEAST_CROWDED', 'WHEELCHAIR_ACCESSIBLE', 'FAMILY_FRIENDLY'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setNavMode(mode as any)}
                      className={`p-2 border rounded font-semibold text-center uppercase ${
                        navMode === mode
                          ? 'bg-brand-accent text-brand-dark border-brand-accent font-bold'
                          : 'bg-brand-dark border-white/10 text-brand-textMuted hover:bg-brand-card'
                      }`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={calculateDirections}
                disabled={routingLoading}
                className="w-full bg-brand-teal hover:bg-teal-400 text-brand-dark font-bold py-2.5 rounded-lg text-sm transition-all shadow-glow mt-4"
              >
                {routingLoading ? 'Calculating Path...' : 'Plan Route'}
              </button>
            </div>

            {/* AI route analysis display */}
            {calculatedRoute && (
              <div className="mt-4 p-4 bg-brand-dark/50 border border-brand-teal/20 rounded-xl space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-brand-teal">Distance: {calculatedRoute.distanceMeters}m</span>
                  <span className="text-brand-accent">Est. Walking: {calculatedRoute.estimatedTimeMin} min</span>
                </div>
                <div className="text-xs text-brand-text leading-relaxed mt-2 border-t border-white/5 pt-2">
                  <strong className="text-brand-accent block mb-1">AI Route Guidance:</strong>
                  {calculatedRoute.aiExplanation}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Center: Interactive Leaflet Map Layer */}
        <section className="lg:col-span-5 flex flex-col space-y-6">
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex-1 flex flex-col">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
              <Compass size={18} className="text-brand-teal" />
              Live Telemetry Map View
            </h3>
            
            <div className="flex-1 w-full min-h-[400px] relative">
              <StadiumMap
                nodes={nodes}
                highlightPath={calculatedRoute?.path || []}
                crowdZones={crowdZones}
                onNodeSelect={(name) => {
                  // select starting node
                  setStartNode(name);
                }}
              />
            </div>
          </div>
        </section>

        {/* Right Hand: AI Fan Assistant Multilingual Chat & Simulated Transit options */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Universal Fan Companion Chat Box */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col h-[400px]">
            <h3 className="text-lg font-bold text-white flex items-center justify-between border-b border-white/5 pb-2 mb-2">
              <span className="flex items-center gap-2">
                <MessageSquare size={18} className="text-brand-teal" />
                AI Assistant
              </span>
              <span className="text-[10px] text-brand-accent flex items-center gap-1 font-normal bg-brand-accent/10 px-2 py-0.5 rounded">
                <Globe size={12} /> Multilingual
              </span>
            </h3>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3 text-xs scrollbar-thin">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-brand-teal/15 text-brand-text border border-brand-teal/20 ml-auto'
                      : 'bg-brand-dark/70 text-brand-text border border-white/5'
                  }`}
                >
                  <p className="leading-relaxed">{msg.content}</p>
                </div>
              ))}
              {chatLoading && (
                <div className="bg-brand-dark/50 text-brand-textMuted border border-white/5 p-2 rounded-lg text-center animate-pulse">
                  AI is typing...
                </div>
              )}
            </div>

            {/* Input Actions */}
            <div className="flex gap-1.5 mt-auto">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitChat()}
                placeholder="Ask: Where is Gate A?"
                className="flex-1 bg-brand-dark border border-white/10 px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-brand-teal text-white"
              />
              
              {speechToTextSupport && (
                <button
                  onClick={handleSpeechInput}
                  className={`p-2 rounded-lg border transition-all ${
                    isListening
                      ? 'bg-brand-crimson text-white border-brand-crimson animate-ping'
                      : 'bg-brand-dark border-white/10 text-brand-textMuted hover:text-white'
                  }`}
                  title="Speech commands / Speak question"
                >
                  <Mic size={14} />
                </button>
              )}

              <button
                onClick={() => submitChat()}
                className="bg-brand-accent hover:bg-yellow-400 text-brand-dark font-bold px-3 py-2 rounded-lg text-xs"
              >
                Send
              </button>
            </div>
          </div>

          {/* Simulated Transit Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between border-b border-white/5 pb-2">
              <span className="flex items-center gap-2">
                <Activity size={18} className="text-brand-teal" />
                Live Transit Hub
              </span>
              <span className="text-[9px] text-brand-textMuted bg-green-500/20 px-2 py-0.5 rounded-full font-bold">Simulated</span>
            </h3>

            <div className="space-y-3">
              {transitOptions.length === 0 ? (
                <p className="text-xs text-brand-textMuted">Waiting for telemetry tick...</p>
              ) : (
                transitOptions.map((t) => (
                  <div key={t.id} className="p-3 bg-brand-dark/50 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{t.name}</p>
                      <p className="text-[10px] text-brand-textMuted">Type: {t.type} | Load: {t.capacityPct}%</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${t.status === 'NORMAL' ? 'text-brand-emerald' : 'text-brand-crimson'}`}>{t.waitTimeMin} min</p>
                      <p className="text-[9px] uppercase tracking-wider text-brand-textMuted">{t.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

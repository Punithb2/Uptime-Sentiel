import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Settings, 
  Clock, 
  Globe, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert,
  Zap,
  Save,
  BarChart2,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { api } from '../lib/api';
import { DetailSkeleton } from '../components/Skeletons';
import { useToast } from '../components/ToastContext';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.status === 'UP';
    return (
      <div className="rounded-xl bg-slate-900/95 border border-white/10 p-3 shadow-2xl backdrop-blur-xl text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="font-bold text-white">{isUp ? 'Operational' : 'Failure'}</span>
          {data.statusCode && (
            <span className="font-mono text-slate-400">[{data.statusCode}]</span>
          )}
        </div>
        <p className="font-mono text-sm font-bold text-blue-400">
          {data.latency} <span className="text-xs font-normal text-slate-400">ms latency</span>
        </p>
        <p className="text-[10px] text-slate-400">{label}</p>
        {data.errorMessage && (
          <p className="text-[11px] text-rose-300 font-medium pt-1 border-t border-white/5">
            {data.errorMessage}
          </p>
        )}
      </div>
    );
  }
  return null;
}

export default function MonitorDetails() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  // Form state
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editInterval, setEditInterval] = useState(60);
  const [editTimeout, setEditTimeout] = useState(10);
  const [editThreshold, setEditThreshold] = useState(2);
  const [editStatusCodes, setEditStatusCodes] = useState('');
  const [editMethod, setEditMethod] = useState('GET');
  const [editHeaders, setEditHeaders] = useState('');
  const [editBody, setEditBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProbing, setIsProbing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get(`/services/${id}/history`);
      setData(res.data);
      
      // Populate the form the first time
      if (!editName) {
        setEditName(res.data.service.name);
        setEditUrl(res.data.service.url);
        setEditInterval(res.data.service.check_interval_seconds);
        setEditTimeout(res.data.service.timeout_seconds || 10);
        setEditThreshold(res.data.service.failure_threshold || 2);
        
        const codes = res.data.service.expected_status_codes;
        setEditStatusCodes(codes ? codes.join(', ') : '');
        setEditMethod(res.data.service.method || 'GET');
        setEditHeaders(res.data.service.headers ? JSON.stringify(res.data.service.headers, null, 2) : '');
        setEditBody(res.data.service.body || '');
      }
    } catch {
      setError('Failed to load monitor details.');
    } finally {
      setLoading(false);
    }
  }, [id, editName]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
    const timer = setInterval(fetchHistory, 15000);
    return () => clearInterval(timer);
  }, [fetchHistory]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    
    const parsedStatusCodes = editStatusCodes.trim() 
      ? editStatusCodes.split(',').map(code => Number(code.trim())).filter(code => !isNaN(code))
      : null;

    let parsedHeaders = null;
    if (editHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(editHeaders);
      } catch {
        setError('Invalid JSON format in custom headers field.');
        return;
      }
    }

    try {
      setIsSaving(true);
      await api.patch(`/services/${id}`, {
        name: editName,
        url: editUrl,
        check_interval_seconds: Number(editInterval),
        timeout_seconds: Number(editTimeout),
        failure_threshold: Number(editThreshold),
        expected_status_codes: parsedStatusCodes,
        method: editMethod,
        headers: parsedHeaders,
        body: editBody
      });
      showToast('Monitor configuration saved.');
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update monitor.');
      showToast('Could not save configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImmediateCheck = async () => {
    setIsProbing(true);
    try {
      await api.post(`/services/${id}/check-now`);
      showToast('Immediate health probe dispatched.');
      setTimeout(fetchHistory, 1500);
    } catch {
      showToast('Could not trigger check.', 'error');
    } finally {
      setTimeout(() => setIsProbing(false), 800);
    }
  };

  const chartData = (data?.checks || []).slice().reverse().map(c => ({
    time: new Date(c.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    latency: c.latency_ms || 0,
    status: c.status,
    statusCode: c.status_code,
    errorMessage: c.error_message
  }));

  const checksList = data?.checks || [];
  const latencies = checksList.map(c => c.latency_ms || 0);
  const sumLatencies = latencies.reduce((acc, curr) => acc + curr, 0);
  const upCount = checksList.filter(c => c.status === 'UP').length;
  const stats = {
    avg: checksList.length ? Math.round(sumLatencies / checksList.length) : 0,
    min: latencies.length ? Math.min(...latencies) : 0,
    max: latencies.length ? Math.max(...latencies) : 0,
    count: checksList.length,
    upCount,
    rate: checksList.length ? Math.round((upCount / checksList.length) * 100) : 100
  };

  if (loading) return <DetailSkeleton />;
  if (error && !data) return <div className="p-8 text-rose-400">{error}</div>;

  const { service, incidents = [] } = data;
  const isUp = service.status === 'UP';
  const isPaused = service.status === 'PAUSED';

  return (
    <div className="page-enter max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header Card */}
      <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-white/10">
        <div className="flex items-start gap-4">
          <Link 
            to="/monitors" 
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
            title="Back to Monitors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-white">{service.name}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                isPaused 
                  ? 'bg-slate-800 text-slate-400 border border-slate-700' 
                  : isUp 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {isPaused ? <Clock className="h-3.5 w-3.5" /> : isUp ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {service.status}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {service.method || 'GET'}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
              <a 
                href={service.url} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-1 font-mono hover:text-blue-400 transition"
              >
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <span>{service.url}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Every {service.check_interval_seconds}s
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Threshold: {service.failure_threshold || 2} strikes
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleImmediateCheck}
            disabled={isProbing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-semibold border border-white/10 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isProbing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Probe Now</span>
          </button>
        </div>
      </div>

      {/* 4 Core Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Current Latency
          </span>
          <div className="text-2xl font-black text-white font-mono flex items-center gap-1">
            {service.last_latency_ms || 0} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 font-medium">Latest telemetry response</p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Avg Latency (100 Checks)
          </span>
          <div className="text-2xl font-black text-blue-400 font-mono flex items-center gap-1">
            {stats.avg} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Min: {stats.min}ms • Max: {stats.max}ms</p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Reliability
          </span>
          <div className="text-2xl font-black text-emerald-400">
            {stats.rate}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{stats.upCount} of {stats.count} checks passed</p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Incidents Recorded
          </span>
          <div className={`text-2xl font-black ${incidents.length > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {incidents.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Historical downtime events</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button 
          type="button"
          onClick={() => setActiveTab('overview')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'overview' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          <span>Telemetry & Latency Graph</span>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('settings')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'settings' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Endpoint Configuration</span>
        </button>
      </div>

      {/* Tab: Overview / Chart */}
      {activeTab === 'overview' && (
        <div className="space-y-6 fade-enter">
          {/* Latency Area Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" /> Response Latency Curve (Last 100 Checks)
                </h2>
                <p className="text-xs text-slate-400">Milliseconds response duration over time</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Latency
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-400/50" /> Avg ({stats.avg}ms)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickMargin={10} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    unit="ms" 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={stats.avg} stroke="#818cf8" strokeDasharray="3 3" opacity={0.6} />
                  <Area 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#latencyGradient)" 
                    activeDot={{ r: 5, fill: '#60a5fa', stroke: '#1e3a8a', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incidents Table / Card List */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" /> Incident Timeline for {service.name}
            </h2>

            {incidents.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-300">Clean Incident Record</p>
                <p className="text-xs text-slate-400">No downtime incidents recorded for this endpoint.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <div 
                    key={inc.id} 
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      inc.is_open 
                        ? 'border-rose-500/40 bg-rose-950/20' 
                        : 'border-white/5 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${inc.is_open ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                        {inc.is_open ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wider ${inc.is_open ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {inc.is_open ? 'Active Outage' : 'Resolved'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium mt-0.5">{inc.cause || 'Target unreachable'}</p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      <div>Started: {new Date(inc.started_at).toLocaleString()}</div>
                      {inc.resolved_at && (
                        <div className="text-emerald-400">Resolved: {new Date(inc.resolved_at).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Settings Form */}
      {activeTab === 'settings' && (
        <div className="glass-card rounded-2xl p-6 max-w-3xl fade-enter">
          <h2 className="text-lg font-bold text-white mb-2">Endpoint Configuration</h2>
          <p className="text-xs text-slate-400 mb-6">
            Fine-tune monitoring parameters, custom request headers, payloads, and alert rules.
          </p>

          {error && <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs">{error}</div>}
          
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Service Name
                </label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  required 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Target URL
                </label>
                <input 
                  type="url" 
                  value={editUrl} 
                  onChange={(e) => setEditUrl(e.target.value)} 
                  required 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                  <span>Check Interval (Seconds)</span>
                  <span className="font-mono text-[10px] text-blue-400 font-normal">
                    {editInterval >= 3600
                      ? `${(editInterval / 3600).toFixed(1)}h (${editInterval}s)`
                      : editInterval >= 60
                      ? `${(editInterval / 60).toFixed(1)}m (${editInterval}s)`
                      : `${editInterval}s`}
                  </span>
                </label>
                <input 
                  type="number" 
                  min="60" 
                  max="86400"
                  value={editInterval} 
                  onChange={(e) => setEditInterval(e.target.value)} 
                  required 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" 
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: '1m', val: 60 },
                    { label: '3m', val: 180 },
                    { label: '5m', val: 300 },
                    { label: '10m', val: 600 },
                    { label: '15m', val: 900 },
                    { label: '30m', val: 1800 },
                    { label: '1h', val: 3600 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setEditInterval(p.val)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition ${
                        Number(editInterval) === p.val
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Request Timeout (Seconds)
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="60" 
                  value={editTimeout} 
                  onChange={(e) => setEditTimeout(e.target.value)} 
                  required 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" /> Advanced Protocol Details
              </h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">HTTP Method</label>
                <select 
                  value={editMethod} 
                  onChange={(e) => setEditMethod(e.target.value)}
                  className="w-full md:w-1/3 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GET">GET (Standard Ping)</option>
                  <option value="HEAD">HEAD (Fast / Headers Only)</option>
                  <option value="POST">POST (API Payload)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">HTTP Headers (JSON)</label>
                <textarea 
                  rows="3"
                  placeholder='{"Authorization": "Bearer token123", "Content-Type": "application/json"}'
                  value={editHeaders}
                  onChange={(e) => setEditHeaders(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 font-mono text-xs rounded-xl px-3.5 py-2 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editMethod !== 'GET' && editMethod !== 'DELETE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Request Body</label>
                  <textarea 
                    rows="3"
                    placeholder='{"ping": "pong"}'
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 font-mono text-xs rounded-xl px-3.5 py-2 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-blue-400" /> Alert Thresholds
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Consecutive Failure Threshold</label>
                  <p className="text-[11px] text-slate-400 mb-2">Number of consecutive failures required before opening an incident.</p>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={editThreshold} 
                    onChange={(e) => setEditThreshold(e.target.value)} 
                    required 
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Expected Status Codes</label>
                  <p className="text-[11px] text-slate-400 mb-2">Comma separated list (e.g. 200, 201, 302). Empty defaults to 2xx/3xx.</p>
                  <input 
                    type="text" 
                    placeholder="e.g. 200, 201" 
                    value={editStatusCodes} 
                    onChange={(e) => setEditStatusCodes(e.target.value)} 
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-end">
              <button 
                type="submit" 
                disabled={isSaving} 
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving Changes…' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

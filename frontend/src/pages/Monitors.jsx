import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Globe, 
  Clock, 
  AlertTriangle, 
  Pause, 
  Play, 
  RefreshCw, 
  Server, 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  Eye, 
  EyeOff,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../lib/api';
import { MonitorGridSkeleton } from '../components/Skeletons';
import { useToast } from '../components/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';

function formatInterval(sec) {
  if (!sec) return '60s';
  if (sec < 60) return `${sec}s`;
  if (sec % 3600 === 0) return `${sec / 3600}h (${sec}s)`;
  if (sec % 60 === 0) return `${sec / 60}m (${sec}s)`;
  return `${sec}s`;
}

function MethodBadge({ method = 'GET' }) {
  const m = method.toUpperCase();
  const colors = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PATCH: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    DELETE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${colors[m] || colors.GET}`}>
      {m}
    </span>
  );
}

function ServiceCard({ data, onDelete, onAction, onToggleVisibility }) {
  const { service, uptime_percentage, recent_checks, active_incident } = data;
  const latestCheck = recent_checks?.[0];
  const isPending = service.status === 'PENDING';
  const isPaused = service.status === 'PAUSED';
  const isUp = service.status === 'UP';
  const displayChecks = [...(recent_checks || [])].slice(0, 30).reverse();

  const [hoveredCheck, setHoveredCheck] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      await onAction(service.id, 'check-now');
    } finally {
      setTimeout(() => setIsChecking(false), 800);
    }
  };

  return (
    <div className={`glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative group ${
      isPaused ? 'opacity-80 border-slate-700/50' : isUp ? 'hover:border-emerald-500/40' : 'border-rose-500/40 bg-rose-950/15'
    }`}>
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MethodBadge method={service.method || 'GET'} />
              <Link 
                to={`/monitors/${service.id}`} 
                className="font-bold text-white text-base hover:text-blue-400 transition truncate block"
              >
                {service.name}
              </Link>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <a 
                href={service.url} 
                target="_blank" 
                rel="noreferrer" 
                className="hover:text-blue-400 font-mono text-[11px] truncate transition"
              >
                {service.url}
              </a>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {isPaused ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                <Pause className="h-3 w-3" /> Paused
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Clock className="h-3 w-3 animate-spin" /> Pending
              </span>
            ) : isUp ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
                Downtime
              </span>
            )}
          </div>
        </div>

        {/* Active Incident Callout */}
        {active_incident && (
          <div className="mb-4 bg-rose-950/40 border border-rose-500/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold mb-1">
              <AlertTriangle className="h-3.5 w-3.5" /> ONGOING INCIDENT
            </div>
            <p className="text-rose-200 text-xs font-medium line-clamp-2">
              {active_incident.cause || 'Target unreachable or returned non-expected status.'}
            </p>
          </div>
        )}

        {/* Metric Gauges */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              24h Uptime
            </span>
            <div className={`text-lg font-black ${
              uptime_percentage >= 99 ? 'text-emerald-400' : uptime_percentage >= 95 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {isPending ? '—' : `${uptime_percentage}%`}
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Latency
            </span>
            <div className="text-lg font-mono font-bold text-white flex items-center gap-1">
              {isPending || isPaused ? '—' : `${latestCheck?.latency_ms || service.last_latency_ms || 0}`}
              <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
          </div>
        </div>

        {/* 30-Check Sparkline with Custom Popover */}
        <div className="space-y-1.5 mb-2 relative">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
            <span>Check History (Last 30)</span>
            <span className="font-mono">{formatInterval(service.check_interval_seconds)} interval</span>
          </div>

          <div className="flex items-center gap-0.5 h-7 p-1 rounded-lg bg-slate-900/70 border border-white/5 relative">
            {isPending && !isPaused && displayChecks.length === 0 ? (
              <div className="w-full h-full bg-slate-700/30 rounded animate-pulse" />
            ) : (
              displayChecks.map((check, idx) => {
                const isCheckUp = check.status === 'UP';
                return (
                  <button
                    key={check.id || idx}
                    type="button"
                    onMouseEnter={() => setHoveredCheck(check)}
                    onMouseLeave={() => setHoveredCheck(null)}
                    aria-label={`Check at ${check.checked_at}`}
                    className={`flex-1 h-full rounded-[2px] transition-transform hover:scale-y-125 hover:z-10 focus:outline-none ${
                      isCheckUp ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'
                    }`}
                  />
                );
              })
            )}

            {Array.from({ length: Math.max(0, 30 - displayChecks.length) }).map((_, idx) => (
              <div key={`empty-${idx}`} className="flex-1 h-full bg-slate-800/40 rounded-[2px]" />
            ))}
          </div>

          {/* Floating Hover Tooltip */}
          {hoveredCheck && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-14 z-30 pointer-events-none rounded-xl bg-slate-900/95 border border-white/10 p-2 shadow-2xl backdrop-blur-xl text-center whitespace-nowrap fade-enter">
              <div className="flex items-center justify-center gap-2 text-xs font-bold">
                <span className={`inline-block h-2 w-2 rounded-full ${hoveredCheck.status === 'UP' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={hoveredCheck.status === 'UP' ? 'text-emerald-400' : 'text-rose-400'}>
                  {hoveredCheck.status}
                </span>
                <span className="font-mono text-white">{hoveredCheck.latency_ms}ms</span>
                {hoveredCheck.status_code && (
                  <span className="text-[10px] text-slate-400 font-mono">[{hoveredCheck.status_code}]</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {new Date(hoveredCheck.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card Action Controls Footer */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={handleCheckNow} 
            title="Probe now" 
            className="p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-blue-400 transition"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {isPaused ? (
            <button 
              type="button"
              onClick={() => onAction(service.id, 'resume')} 
              title="Resume monitor" 
              className="p-2 rounded-lg text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition"
            >
              <Play className="h-4 w-4" />
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => onAction(service.id, 'pause')} 
              title="Pause monitor" 
              className="p-2 rounded-lg text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 transition"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}

          <button 
            type="button"
            onClick={() => onToggleVisibility(service.id, service.is_public)} 
            title={service.is_public ? 'Visible on Public Status Page' : 'Hidden from Public Status Page'} 
            className={`p-2 rounded-lg transition ${service.is_public ? 'text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'}`}
          >
            {service.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>

          <Link
            to={`/monitors/${service.id}`}
            title="Configure monitor"
            className="p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        <button 
          type="button"
          onClick={() => onDelete(service.id)} 
          className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition flex items-center gap-1 text-xs"
          title="Delete monitor"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
}

export default function Monitors() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  // Registration State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [interval, setInterval] = useState(60);
  const [isCustomInterval, setIsCustomInterval] = useState(false);
  const [customValue, setCustomValue] = useState('10');
  const [customUnit, setCustomUnit] = useState('minutes');
  const [actionError, setActionError] = useState('');

  // Advanced Network State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [expectedCodes, setExpectedCodes] = useState('');
  const [timeoutVal, setTimeoutVal] = useState('10');
  const [threshold, setThreshold] = useState('2');
  const [isCreating, setIsCreating] = useState(false);
  
  // Dialog State
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get('/services/dashboard/summary');
      return res.data;
    },
    refetchInterval: 15000, 
  });

  const handleAddService = async (e) => {
    e.preventDefault();
    setActionError('');

    let parsedHeaders = null;
    if (headers.trim()) {
      try {
        parsedHeaders = JSON.parse(headers);
      } catch {
        setActionError('Invalid JSON format in Headers field.');
        return;
      }
    }

    const parsedStatusCodes = expectedCodes.trim() 
      ? expectedCodes.split(',').map(code => Number(code.trim())).filter(code => !isNaN(code))
      : null;

    try {
      setIsCreating(true);
      await api.post('/services/', { 
        name, 
        url, 
        check_interval_seconds: Number(interval),
        method,
        headers: parsedHeaders,
        body,
        expected_status_codes: parsedStatusCodes,
        timeout_seconds: Number(timeoutVal),
        failure_threshold: Number(threshold)
      });
      
      setName('');
      setUrl('');
      setInterval(60);
      setIsCustomInterval(false);
      setCustomValue('10');
      setCustomUnit('minutes');
      setMethod('GET');
      setHeaders('');
      setBody('');
      setExpectedCodes('');
      setTimeoutVal('10');
      setThreshold('2');
      setShowAdvanced(false);
      setIsFormOpen(false);

      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      showToast('Monitor registered! Probing endpoint now.');
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to add service.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteService = async (id) => {
    const previousSummary = queryClient.getQueryData(['dashboardSummary']);
    queryClient.setQueryData(['dashboardSummary'], (current) => current ? {
      ...current,
      stats: { ...current.stats, total_monitors: Math.max(0, current.stats.total_monitors - 1) },
      services: current.services.filter((item) => item.service.id !== id),
    } : current);

    try {
      setIsDeleting(true);
      await api.delete(`/services/${id}`);
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      showToast('Monitor permanently deleted.');
      setPendingDeleteId(null);
    } catch {
      queryClient.setQueryData(['dashboardSummary'], previousSummary);
      showToast('Could not remove the monitor.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleServiceAction = async (id, action) => {
    const previousSummary = queryClient.getQueryData(['dashboardSummary']);
    const nextStatus = action === 'pause' ? 'PAUSED' : action === 'resume' || action === 'check-now' ? 'PENDING' : null;
    
    if (nextStatus) {
      queryClient.setQueryData(['dashboardSummary'], (current) => current ? {
        ...current,
        services: current.services.map((item) => item.service.id === id ? {
          ...item,
          service: { ...item.service, status: nextStatus, is_active: action !== 'pause' },
        } : item),
      } : current);
    }

    try {
      await api.post(`/services/${id}/${action}`);
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      showToast(action === 'pause' ? 'Monitor paused.' : action === 'resume' ? 'Monitor resumed.' : 'Probe dispatched.');
    } catch {
      queryClient.setQueryData(['dashboardSummary'], previousSummary);
      showToast(`Could not perform ${action}.`, 'error');
    }
  };

  const handleToggleVisibility = async (id, currentStatus) => {
    const previousSummary = queryClient.getQueryData(['dashboardSummary']);
    queryClient.setQueryData(['dashboardSummary'], (current) => current ? {
      ...current,
      services: current.services.map((item) => item.service.id === id ? {
        ...item,
        service: { ...item.service, is_public: !currentStatus },
      } : item),
    } : current);

    try {
      await api.patch(`/services/${id}/visibility`, { is_public: !currentStatus });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      showToast(currentStatus ? 'Monitor is now private.' : 'Monitor is now public on your status page.');
    } catch {
      queryClient.setQueryData(['dashboardSummary'], previousSummary);
      showToast('Could not update visibility.', 'error');
    }
  };

  // Filtered and Sorted Services
  const allServices = summary?.services || [];
  const filteredServices = allServices.filter(({ service }) => {
    const matchesSearch = 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.url.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'UP') return service.status === 'UP';
    if (statusFilter === 'DOWN') return service.status === 'DOWN';
    if (statusFilter === 'PAUSED') return service.status === 'PAUSED';
    return true;
  });

  if (sortBy === 'LATENCY_DESC') {
    filteredServices.sort((a, b) => (b.service.last_latency_ms || 0) - (a.service.last_latency_ms || 0));
  } else if (sortBy === 'LATENCY_ASC') {
    filteredServices.sort((a, b) => (a.service.last_latency_ms || 0) - (b.service.last_latency_ms || 0));
  } else if (sortBy === 'UPTIME_DESC') {
    filteredServices.sort((a, b) => (b.uptime_percentage || 0) - (a.uptime_percentage || 0));
  } else if (sortBy === 'UPTIME_ASC') {
    filteredServices.sort((a, b) => (a.uptime_percentage || 0) - (b.uptime_percentage || 0));
  } else if (sortBy === 'NAME') {
    filteredServices.sort((a, b) => a.service.name.localeCompare(b.service.name));
  }

  const counts = {
    all: allServices.length,
    up: allServices.filter(s => s.service.status === 'UP').length,
    down: allServices.filter(s => s.service.status === 'DOWN').length,
    paused: allServices.filter(s => s.service.status === 'PAUSED').length,
  };

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Quick Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Server className="h-5 w-5" />
            </div>
            Monitored Endpoints
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status, latency metrics, and automated failure detection
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all duration-200"
        >
          <Plus className={`h-4 w-4 transition-transform duration-200 ${isFormOpen ? 'rotate-45' : ''}`} />
          <span>{isFormOpen ? 'Close Form' : 'Register Endpoint'}</span>
        </button>
      </div>

      {/* Streamlined Register New Endpoint Collapsible Form */}
      {isFormOpen && (
        <div className="glass-panel rounded-2xl p-6 border-blue-500/30 fade-enter shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-white">Register New Target Endpoint</h2>
            </div>
            <button 
              type="button" 
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>

          {actionError && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-medium">
              {actionError}
            </div>
          )}

          <form onSubmit={handleAddService} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Service Name
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Production API" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Target Endpoint URL
                </label>
                <input 
                  type="url" 
                  required 
                  placeholder="https://api.example.com/health" 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono text-xs" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Check Frequency</span>
                  <span className="font-mono text-[10px] text-blue-400 font-normal">
                    {interval}s
                  </span>
                </label>
                <div className="space-y-2">
                  <select
                    value={isCustomInterval ? 'custom' : interval}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomInterval(true);
                        const num = Number(customValue) || 10;
                        const mult = customUnit === 'hours' ? 3600 : customUnit === 'minutes' ? 60 : 1;
                        setInterval(Math.max(10, Math.min(86400, num * mult)));
                      } else {
                        setIsCustomInterval(false);
                        setInterval(Number(e.target.value));
                      }
                    }}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value={10}>10s (High-Frequency)</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds (1 min)</option>
                    <option value={180}>3 minutes</option>
                    <option value={300}>5 minutes</option>
                    <option value={600}>10 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={1800}>30 minutes</option>
                    <option value={3600}>1 hour</option>
                    <option value="custom">⚙️ Custom Frequency...</option>
                  </select>

                  {isCustomInterval && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl fade-enter">
                      <input
                        type="number"
                        min={customUnit === 'seconds' ? 10 : 1}
                        max={customUnit === 'hours' ? 24 : customUnit === 'minutes' ? 1440 : 86400}
                        placeholder={customUnit === 'seconds' ? 'e.g. 45' : 'e.g. 10'}
                        value={customValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomValue(val);
                          const num = Number(val) || 0;
                          const mult = customUnit === 'hours' ? 3600 : customUnit === 'minutes' ? 60 : 1;
                          setInterval(Math.max(10, Math.min(86400, num * mult)));
                        }}
                        className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <select
                        value={customUnit}
                        onChange={(e) => {
                          const newUnit = e.target.value;
                          setCustomUnit(newUnit);
                          const num = Number(customValue) || 0;
                          const mult = newUnit === 'hours' ? 3600 : newUnit === 'minutes' ? 60 : 1;
                          setInterval(Math.max(10, Math.min(86400, num * mult)));
                        }}
                        className="bg-slate-950/80 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="seconds">Sec</option>
                        <option value="minutes">Min</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition py-1"
              >
                <Settings className="w-3.5 h-3.5 text-blue-400" />
                {showAdvanced ? 'Hide Advanced HTTP Config' : 'Show Advanced HTTP Config (Headers, Payload, Codes)'}
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvanced && (
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 fade-enter">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">HTTP Method</label>
                    <select 
                      value={method} 
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Expected Status Codes (Optional)</label>
                    <input 
                      type="text"
                      placeholder="e.g. 200, 201 (leave blank for any 2xx/3xx)"
                      value={expectedCodes}
                      onChange={(e) => setExpectedCodes(e.target.value)}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Custom Headers (JSON)</label>
                    <textarea 
                      rows="2"
                      placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 font-mono text-xs rounded-xl px-3 py-2 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {method !== 'GET' && method !== 'DELETE' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Payload Body</label>
                      <textarea 
                        rows="2"
                        placeholder='{"health": "ping"}'
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 font-mono text-xs rounded-xl px-3 py-2 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="flex gap-4 md:col-span-2">
                    <div className="w-1/2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Timeout (Sec)</label>
                      <input 
                        type="number" min="1" max="60"
                        value={timeoutVal}
                        onChange={(e) => setTimeoutVal(e.target.value)}
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Failure Threshold</label>
                      <input 
                        type="number" min="1" max="10"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <button 
                type="submit" 
                disabled={isCreating} 
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
              >
                {isCreating && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {isCreating ? 'Deploying Monitor…' : 'Start Monitoring'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search, Filter & Sort Toolbar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/70 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('UP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              statusFilter === 'UP'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-white/5'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Operational ({counts.up})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DOWN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              statusFilter === 'DOWN'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-rose-400 hover:bg-white/5'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Down ({counts.down})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PAUSED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'PAUSED'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Paused ({counts.paused})
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="DEFAULT">Default Order</option>
            <option value="NAME">Name (A-Z)</option>
            <option value="LATENCY_DESC">Highest Latency</option>
            <option value="LATENCY_ASC">Lowest Latency</option>
            <option value="UPTIME_DESC">Highest Uptime</option>
            <option value="UPTIME_ASC">Lowest Uptime</option>
          </select>
        </div>
      </div>

      {/* Monitors Grid */}
      <div>
        {isLoading && !summary ? (
          <MonitorGridSkeleton />
        ) : filteredServices.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
              <Server className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No monitors matched your criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              {searchQuery ? `No results found for "${searchQuery}".` : 'Try clearing your active status filters.'}
            </p>
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredServices.map((data) => (
              <ServiceCard 
                key={data.service.id} 
                data={data} 
                onDelete={setPendingDeleteId}
                onAction={handleServiceAction}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Remove this monitor endpoint?"
        description="All recorded latency history, checks, and past incident events for this service will be permanently deleted. This action cannot be reversed."
        confirmLabel="Remove monitor"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => handleDeleteService(pendingDeleteId)}
        isPending={isDeleting}
      />
    </div>
  );
}

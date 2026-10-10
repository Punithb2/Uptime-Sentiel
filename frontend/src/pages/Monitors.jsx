import { useState} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Globe, Clock, CheckCircle, XCircle, HelpCircle, AlertTriangle, Pause, Play, RefreshCw, Server } from 'lucide-react';
import { api } from '../lib/api';

function ServiceCard({ data, onDelete, onAction }) {
  const { service, uptime_percentage, recent_checks, active_incident } = data;
  const latestCheck = recent_checks[0];
  const isPending = service.status === "PENDING";
  const isPaused = service.status === "PAUSED";
  const isUp = service.status === "UP";
  const displayChecks = [...recent_checks].slice(0, 30).reverse();

  return (
    <div className={`bg-gray-800 border ${isPaused ? 'border-gray-700/50 opacity-75' : 'border-gray-700'} rounded-xl p-5 shadow-sm flex flex-col justify-between transition-all`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <Link to={`/monitors/${service.id}`} className="hover:text-blue-400 transition-colors">
            <h3 className="font-semibold text-white text-base truncate pr-2">{service.name}</h3>
          </Link>
          {isPaused ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
              <Pause className="h-3 w-3" /> Paused
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <HelpCircle className="h-3 w-3" /> Pending
            </span>
          ) : isUp ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-3 w-3" /> Operational
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <XCircle className="h-3 w-3" /> Downtime
            </span>
          )}
        </div>

        {active_incident && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 animate-pulse">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
              <AlertTriangle className="h-4 w-4" /> ACTIVE INCIDENT
            </div>
            <div className="text-red-300/80 text-[11px]">
              {active_incident.cause || 'Service is unreachable'}
            </div>
          </div>
        )}

        <div className="space-y-2 text-xs text-gray-400 mb-5">
          <div className="flex items-center gap-2 truncate">
            <Globe className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            <a href={service.url} target="_blank" rel="noreferrer" className="hover:text-blue-400 truncate">{service.url}</a>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            <span>Checks every {service.check_interval_seconds}s</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-gray-500 text-[10px] uppercase font-semibold mb-1">Uptime (24h)</div>
            <div className="text-white font-medium">{isPending ? '...' : `${uptime_percentage}%`}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-gray-500 text-[10px] uppercase font-semibold mb-1">Current Latency</div>
            <div className="text-white font-medium">
              {isPending || isPaused ? '...' : `${latestCheck?.latency_ms || service.last_latency_ms || 0} ms`}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
            <span>Check History</span>
            <span>Latest</span>
          </div>
          <div className="flex items-center gap-0.5 h-6 overflow-hidden opacity-80">
            {isPending && !isPaused ? (
              <div className="w-full h-full bg-gray-700/30 rounded-sm animate-pulse" />
            ) : (
              displayChecks.map((check, idx) => (
                <div
                  key={check.id || idx}
                  title={`${new Date(check.checked_at).toLocaleTimeString()} - ${check.status} (${check.latency_ms}ms)`}
                  className={`flex-1 h-full rounded-sm ${check.status === 'UP' ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
              ))
            )}
            {Array.from({ length: Math.max(0, 30 - displayChecks.length) }).map((_, idx) => (
              <div key={`empty-${idx}`} className="flex-1 h-full bg-gray-700/30 rounded-sm" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-700/60 flex justify-between items-center">
        <div className="flex gap-3">
          <button onClick={() => onAction(service.id, 'check-now')} title="Check Now" className="text-gray-400 hover:text-blue-400 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          {isPaused ? (
            <button onClick={() => onAction(service.id, 'resume')} title="Resume" className="text-gray-400 hover:text-emerald-400 transition-colors">
              <Play className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={() => onAction(service.id, 'pause')} title="Pause" className="text-gray-400 hover:text-yellow-400 transition-colors">
              <Pause className="h-4 w-4" />
            </button>
          )}
        </div>
        <button onClick={() => onDelete(service.id)} className="text-gray-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}

export default function Monitors() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [interval, setInterval] = useState(60);
  const [actionError, setActionError] = useState(''); // Renamed to avoid clashing with query error

  // TanStack Query automatically handles fetching, caching, and background polling!
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get('/services/dashboard/summary');
      return res.data;
    },
    refetchInterval: 15000, // Poll every 15s in the background
  });

  const handleAddService = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post('/services/', { name, url, check_interval_seconds: Number(interval) });
      setName('');
      setUrl('');
      setInterval(60);
      // Instantly tell the cache that the data is old, forcing a background refetch
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to add service.');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm("Are you sure you want to delete this monitor? All history will be lost.")) return;
    try {
      await api.delete(`/services/${id}`);
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch (err) {
      console.error(err);
      setActionError('Failed to delete service.');
    }
  };

  const handleServiceAction = async (id, action) => {
    try {
      await api.post(`/services/${id}/${action}`);
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch (err) {
      console.error(`Failed to ${action} service`, err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Server className="h-6 w-6 text-blue-500" /> Monitor Management
        </h1>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-400" /> Register New Endpoint
        </h2>
        {actionError && <div className="mb-4 bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">{actionError}</div>}
        <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Service Name</label>
            <input type="text" required placeholder="e.g. Production API" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">Target URL</label>
            <input type="url" required placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Interval (Sec)</label>
            <div className="flex gap-2">
              <input type="number" min="10" required value={interval} onChange={(e) => setInterval(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Add</button>
            </div>
          </div>
        </form>
      </div>

      <div>
        {isLoading && !summary && <span className="text-sm text-gray-400">Loading monitors...</span>}
        {!isLoading && summary?.services?.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-8 text-center text-gray-400">No services monitored yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary?.services?.map((data) => (
              <ServiceCard 
                key={data.service.id} 
                data={data} 
                onDelete={handleDeleteService} 
                onAction={handleServiceAction} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
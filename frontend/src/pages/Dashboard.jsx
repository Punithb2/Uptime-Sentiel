import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus, Trash2, Globe, Clock, CheckCircle, XCircle, HelpCircle, LogOut, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

function ServiceCard({ service, onDelete }) {
  const [metrics, setMetrics] = useState({ uptime_percentage: 100, recent_checks: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get(`/services/${service.id}/checks`);
        setMetrics(res.data);
      } catch (err) {
        console.error('Failed to fetch metrics for service:', service.id);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    // Poll for new metrics based on the service's check interval (minimum 10s)
    const timer = setInterval(fetchMetrics, Math.max(service.check_interval_seconds * 1000, 10000));
    return () => clearInterval(timer);
  }, [service.id, service.check_interval_seconds]);

  const latestCheck = metrics.recent_checks[0];
  const isPending = !latestCheck;
  const isUp = latestCheck?.status === "UP";
  const activeIncident = metrics.incidents?.find(inc => inc.is_open);

  // Reverse checks so the oldest is on the left, newest on the right
  const displayChecks = [...metrics.recent_checks].slice(0, 30).reverse();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-gray-600 transition-colors">
      <div>
        {/* Header & Live Status Badge */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-base truncate pr-2">{service.name}</h3>
          {isPending ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
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

        {/* Active Incident Banner (NEW CODE) */}
        {activeIncident && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 animate-pulse">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
             <AlertTriangle className="h-4 w-4" /> ACTIVE INCIDENT
            </div>
            <div className="text-red-300/80 text-[11px]">
              {activeIncident.cause || 'Service is unreachable'}
              <div className="mt-1 text-red-400/60 font-mono">
                Began: {new Date(activeIncident.started_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* URL and Interval Info */}
        <div className="space-y-2 text-xs text-gray-400 mb-5">
          <div className="flex items-center gap-2 truncate">
            <Globe className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            <a href={service.url} target="_blank" rel="noreferrer" className="hover:text-blue-400 truncate">
              {service.url}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            <span>Checks every {service.check_interval_seconds}s</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-gray-500 text-[10px] uppercase font-semibold mb-1">Uptime (24h)</div>
            <div className="text-white font-medium">{loading ? '...' : `${metrics.uptime_percentage}%`}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-gray-500 text-[10px] uppercase font-semibold mb-1">Current Latency</div>
            <div className="text-white font-medium">
              {isPending || loading ? '...' : `${latestCheck?.latency_ms || 0} ms`}
            </div>
          </div>
        </div>

        {/* Visual Check Ribbon */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
            <span>Check History</span>
            <span>Latest</span>
          </div>
          <div className="flex items-center gap-[2px] h-6 overflow-hidden">
            {isPending && !loading ? (
              <div className="w-full h-full bg-gray-700/30 rounded-sm animate-pulse" />
            ) : (
              displayChecks.map((check, idx) => (
                <div
                  key={check.id || idx}
                  title={`${new Date(check.checked_at).toLocaleTimeString()} - ${check.status} (${check.latency_ms}ms)`}
                  className={`flex-1 h-full rounded-sm transition-opacity hover:opacity-75 ${
                    check.status === 'UP' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
              ))
            )}
            {/* Fill empty space if fewer than 30 checks exist */}
            {Array.from({ length: Math.max(0, 30 - displayChecks.length) }).map((_, idx) => (
              <div key={`empty-${idx}`} className="flex-1 h-full bg-gray-700/30 rounded-sm" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-700/60 flex justify-end">
        <button
          onClick={() => onDelete(service.id)}
          className="text-gray-400 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [services, setServices] = useState([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [interval, setInterval] = useState(60);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/services/');
        setServices(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/');
        } else {
          setError('Failed to fetch services.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [navigate]);

  const handleAddService = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/services/', { name, url, check_interval_seconds: Number(interval) });
      setServices((prev) => [...prev, res.data]);
      setName('');
      setUrl('');
      setInterval(60);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add service.');
    }
  };

  const handleDeleteService = async (id) => {
    try {
      await api.delete(`/services/${id}`);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError('Failed to delete service.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="border-b border-gray-800 bg-gray-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="h-7 w-7 text-blue-500" />
          <span className="text-xl font-bold tracking-tight text-white">Sentinel</span>
        </div>
        <button
          onClick={() => { localStorage.removeItem('token'); navigate('/'); }}
          className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-400" /> Register New Endpoint
          </h2>
          {error && <div className="mb-4 bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">{error}</div>}
          
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
          <h2 className="text-xl font-bold text-white mb-4">Monitored Endpoints</h2>
          {loading ? (
            <div className="text-gray-400 text-sm">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-8 text-center text-gray-400">No services monitored yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} onDelete={handleDeleteService} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
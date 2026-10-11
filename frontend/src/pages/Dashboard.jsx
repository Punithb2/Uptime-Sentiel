import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  LayoutDashboard, 
  Activity, 
  Server, 
  Clock, 
  Zap, 
  ShieldCheck, 
  Plus, 
  RefreshCw
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DashboardSkeleton } from '../components/Skeletons';
import { useToast } from '../components/ToastContext';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: summary, isLoading, isFetching } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get('/services/dashboard/summary');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const degradedServices = summary?.services?.filter(s => s.service.status === 'DOWN') || [];
  const operationalCount = summary?.stats?.up_monitors || 0;
  const totalMonitors = summary?.stats?.total_monitors || 0;
  const hasOutage = degradedServices.length > 0;
  const healthRate = totalMonitors > 0 ? Math.round((operationalCount / totalMonitors) * 100) : 100;

  const handleImmediateCheck = async (serviceId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/services/${serviceId}/check-now`);
      showToast('Immediate health probe dispatched.');
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch {
      showToast('Could not trigger immediate check.', 'error');
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Platform Telemetry
                {isFetching && (
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" title="Updating live" />
                )}
              </h1>
              <p className="text-xs text-slate-400">Real-time health monitoring & multi-endpoint status</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/monitors"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Add Monitor</span>
          </Link>
        </div>
      </div>

      {/* Hero Health Showcase Banner */}
      <div 
        className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 backdrop-blur-xl transition-all duration-300 ${
          hasOutage 
            ? 'border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-slate-900/80 shadow-[0_0_35px_-10px_rgba(244,63,94,0.25)]' 
            : 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/90 to-slate-900/80 shadow-[0_0_35px_-10px_rgba(16,185,129,0.2)]'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              hasOutage ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
            }`}>
              {hasOutage ? (
                <AlertTriangle className="h-7 w-7 animate-pulse" />
              ) : (
                <>
                  <span className="radar-ping absolute inline-flex h-full w-full rounded-2xl bg-emerald-400 opacity-60" />
                  <ShieldCheck className="h-7 w-7" />
                </>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {hasOutage ? `${degradedServices.length} Outage Detected` : 'All Endpoints Operational'}
                </h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  hasOutage 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {healthRate}% Availability
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300 max-w-xl">
                {hasOutage 
                  ? 'One or more of your registered services are failing consecutive health checks. Immediate action is recommended.'
                  : 'Sentinel worker is continuously polling your services. No downtime incidents recorded across active monitors.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <Link 
              to="/incidents"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition hover:text-white flex items-center gap-1.5"
            >
              Incident Logs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div 
          className={`absolute -right-20 -bottom-20 h-64 w-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
            hasOutage ? 'bg-rose-500' : 'bg-emerald-500'
          }`} 
        />
      </div>

      {/* 5 Core Telemetry Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Monitors */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">{summary?.stats?.total_monitors || 0}</div>
            <p className="text-[11px] text-slate-400 mt-1">Configured targets</p>
          </div>
        </div>

        {/* Operational */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Operational</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">{summary?.stats?.up_monitors || 0}</div>
            <p className="text-[11px] text-emerald-500/80 mt-1">Healthy responses</p>
          </div>
        </div>

        {/* Down / Alerts */}
        <div className={`glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between ${
          (summary?.stats?.down_monitors || 0) > 0 ? 'border-rose-500/40 bg-rose-950/20' : ''
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Disrupted</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black ${
              (summary?.stats?.down_monitors || 0) > 0 ? 'text-rose-400' : 'text-slate-200'
            }`}>
              {summary?.stats?.down_monitors || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Active incidents</p>
          </div>
        </div>

        {/* Paused */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paused</span>
            <div className="p-1.5 rounded-lg bg-slate-700/30 text-slate-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-200">{summary?.stats?.paused_monitors || 0}</div>
            <p className="text-[11px] text-slate-400 mt-1">Standby status</p>
          </div>
        </div>

        {/* Avg Latency */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Avg Latency</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-blue-400">
              {summary?.stats?.average_latency_ms || 0} <span className="text-xs font-medium text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Cross-network speed</p>
          </div>
        </div>
      </div>

      {/* Attention Required / Active Incidents Section */}
      {hasOutage && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Disrupted Endpoints Requiring Attention
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {degradedServices.map(({ service, active_incident }) => (
              <div 
                key={service.id} 
                className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 backdrop-blur-md shadow-lg shadow-rose-950/30 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white text-base">{service.name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-sm">{service.url}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                      OFFLINE
                    </span>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-rose-500/20">
                    <p className="text-xs font-medium text-rose-300">
                      Reason: {active_incident?.cause || 'Service unresponsive / unreachable'}
                    </p>
                    {active_incident?.started_at && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Started: {new Date(active_incident.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-rose-500/20">
                  <button 
                    onClick={(e) => handleImmediateCheck(service.id, e)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-white transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Probe Now
                  </button>
                  <Link 
                    to={`/monitors/${service.id}`}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-md shadow-rose-600/30"
                  >
                    Investigate
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitored Services Telemetry Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" /> Infrastructure Health Summary
            </h2>
            <p className="text-xs text-slate-400">Live 24h reliability metrics across all endpoints</p>
          </div>
          <Link 
            to="/monitors" 
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
          >
            Manage all monitors <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {summary?.services?.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Server className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No services registered yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              Start monitoring your APIs, microservices, websites, or edge nodes in real time.
            </p>
            <Link 
              to="/monitors" 
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
            >
              Add First Monitor
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-2xl border overflow-hidden">
            <div className="divide-y divide-white/5">
              {summary?.services?.slice(0, 6).map(({ service, uptime_percentage, recent_checks }) => {
                const latestCheck = recent_checks?.[0];
                const isUp = service.status === 'UP';
                const isPaused = service.status === 'PAUSED';

                return (
                  <div 
                    key={service.id} 
                    className="p-4 sm:px-6 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPaused 
                          ? 'bg-slate-800 text-slate-400 ring-1 ring-white/10' 
                          : isUp 
                          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
                      }`}>
                        {isPaused ? <Clock className="h-4 w-4" /> : isUp ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <Link 
                          to={`/monitors/${service.id}`} 
                          className="font-bold text-white text-sm hover:text-blue-400 transition truncate block"
                        >
                          {service.name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                          <span className="font-mono text-[11px] truncate">{service.url}</span>
                          <span>•</span>
                          <span>{service.check_interval_seconds}s interval</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end sm:self-center shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">24h Uptime</span>
                        <span className={`text-sm font-bold ${
                          uptime_percentage >= 99 ? 'text-emerald-400' : uptime_percentage >= 95 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {uptime_percentage}%
                        </span>
                      </div>

                      <div className="text-right w-20">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Ping</span>
                        <span className="text-sm font-mono font-medium text-slate-200">
                          {isPaused ? '—' : `${latestCheck?.latency_ms || service.last_latency_ms || 0} ms`}
                        </span>
                      </div>

                      <Link 
                        to={`/monitors/${service.id}`}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                        title="View monitor analytics"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

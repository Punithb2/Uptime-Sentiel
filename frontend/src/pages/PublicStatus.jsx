import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  RefreshCw,
  Server
} from 'lucide-react';
import { api } from '../lib/api';
import { PublicStatusSkeleton } from '../components/Skeletons';

export default function PublicStatus() {
  const { slug } = useParams();
  const [countdown, setCountdown] = useState(30);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['publicStatus', slug],
    queryFn: async () => {
      const res = await api.get(`/services/status/public/${slug}`);
      return res.data;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) return <PublicStatusSkeleton />;
  if (error) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-6 text-center">
        <div className="glass-card rounded-2xl p-8 max-w-md">
          <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">Status Page Unavailable</h2>
          <p className="text-xs text-slate-400">
            This public status page is either private or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const services = data?.services || [];
  const incidents = data?.incidents || [];
  const hasOutage = services.some(s => s.status === 'DOWN');
  const operationalCount = services.filter(s => s.status === 'UP').length;
  const overallReliability = services.length > 0 
    ? Math.round((operationalCount / services.length) * 100) 
    : 100;

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-500/20 selection:text-blue-300">
      <div className="max-w-3xl mx-auto space-y-8 page-enter">
        {/* Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <Activity className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-[#090D16]"></span>
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">System Service Status</h1>
              <p className="text-xs text-slate-400">Live infrastructure performance & availability</p>
            </div>
          </div>

          {/* Real-time countdown badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="rounded-xl bg-slate-900/80 border border-white/5 px-3 py-1.5 flex items-center gap-2 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="radar-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-mono text-slate-300">Auto-refresh: {countdown}s</span>
              <button
                type="button"
                onClick={() => { refetch(); setCountdown(30); }}
                title="Refresh status now"
                className="text-slate-400 hover:text-white transition ml-1"
              >
                <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Global Status Banner */}
        <div 
          className={`relative overflow-hidden rounded-2xl border p-6 sm:p-7 backdrop-blur-xl transition-all ${
            hasOutage 
              ? 'border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-slate-900/80 shadow-[0_0_35px_-10px_rgba(244,63,94,0.25)]' 
              : 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/90 to-slate-900/80 shadow-[0_0_35px_-10px_rgba(16,185,129,0.2)]'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              hasOutage ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
            }`}>
              {hasOutage ? <AlertTriangle className="h-6 w-6 animate-pulse" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${hasOutage ? 'text-rose-300' : 'text-emerald-300'}`}>
                {hasOutage ? 'Active Service Disruption' : 'All Systems Operational'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {hasOutage 
                  ? 'Our engineering team is actively investigating degraded service performance.'
                  : `${overallReliability}% uptime observed across all active production endpoints.`}
              </p>
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="glass-card rounded-2xl border overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Monitored Components</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{services.length} services active</span>
          </div>

          <div className="divide-y divide-white/5">
            {services.map((service) => {
              const isUp = service.status === 'UP';
              return (
                <div key={service.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {isUp ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <span className="font-semibold text-white text-sm">{service.name}</span>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold uppercase tracking-wider block ${
                      isUp ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {service.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {service.uptime_24h}% (24h)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Past Incidents Timeline */}
        {incidents.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" /> Incident Timeline
            </h3>

            <div className="space-y-3">
              {incidents.map((incident) => (
                <div 
                  key={incident.id}
                  className={`glass-card rounded-2xl p-5 border ${
                    incident.is_open ? 'border-rose-500/40 bg-rose-950/20' : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      incident.is_open ? 'text-rose-400' : 'text-slate-300'
                    }`}>
                      {incident.is_open ? 'Ongoing Incident' : 'Resolved Incident'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(incident.started_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium">{incident.cause}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 pb-4 text-xs text-slate-400 border-t border-white/5">
          <p>Powered by <span className="font-bold text-slate-200">UptimeSentinel</span> Infrastructure Monitoring</p>
        </footer>
      </div>
    </div>
  );
}

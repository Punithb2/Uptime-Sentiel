import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Globe, 
  ArrowRight, 
  ShieldCheck,
  History
} from 'lucide-react';
import { api } from '../lib/api';
import { ListSkeleton } from '../components/Skeletons';

export default function Incidents() {
  const [filterState, setFilterState] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'RESOLVED'

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['globalIncidents'],
    queryFn: async () => {
      const res = await api.get('/services/dashboard/incidents');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString([], { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const calculateDuration = (start, end) => {
    const endTime = end ? new Date(end) : new Date();
    const diffMs = endTime - new Date(start);
    const diffMins = Math.max(1, Math.round(diffMs / 60000));
    
    if (diffMins < 60) return `${diffMins}m`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const filteredIncidents = useMemo(() => {
    if (filterState === 'ACTIVE') return incidents.filter(i => i.is_open);
    if (filterState === 'RESOLVED') return incidents.filter(i => !i.is_open);
    return incidents;
  }, [incidents, filterState]);

  const activeCount = useMemo(() => incidents.filter(i => i.is_open).length, [incidents]);
  const resolvedCount = useMemo(() => incidents.filter(i => !i.is_open).length, [incidents]);

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <History className="h-5 w-5" />
            </div>
            Incident Operations Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical audit log of all system downtime and automated recoveries
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/5">
          <button
            type="button"
            onClick={() => setFilterState('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterState === 'ALL' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filterState === 'ACTIVE' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('RESOLVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filterState === 'RESOLVED' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Incident Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Active Disruptions</span>
            <span className={`text-2xl font-black ${activeCount > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
              {activeCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Resolved Incidents</span>
            <span className="text-2xl font-black text-emerald-400">
              {resolvedCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">System Resilience</span>
            <span className="text-2xl font-black text-blue-400">
              {incidents.length > 0 ? `${Math.round((resolvedCount / incidents.length) * 100)}%` : '100%'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Incidents Timeline */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : filteredIncidents.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {filterState === 'ACTIVE' ? 'No active incidents' : 'Zero Incidents Recorded'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {filterState === 'ACTIVE' 
              ? 'All endpoints are currently responding within expected latency thresholds.' 
              : 'Your infrastructure has maintained 100% continuous uptime without outages.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => {
            const isOpen = incident.is_open;
            return (
              <div 
                key={incident.id} 
                className={`glass-card rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
                  isOpen 
                    ? 'border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/20' 
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                    isOpen ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isOpen ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <Link 
                        to={`/monitors/${incident.service_id}`} 
                        className="text-white font-bold text-base hover:text-blue-400 transition truncate"
                      >
                        {incident.service_name}
                      </Link>

                      {isOpen ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-rose-500 text-white px-2.5 py-0.5 rounded-full animate-pulse">
                          Active Outage
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Resolved
                        </span>
                      )}
                    </div>

                    <p className={`text-xs font-medium mb-3 ${isOpen ? 'text-rose-300' : 'text-slate-300'}`}>
                      {incident.cause || 'Service unresponsive / unreachable'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Globe className="h-3 w-3 text-slate-400" /> {incident.service_url}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" /> 
                        Started: {formatDate(incident.started_at)}
                      </span>
                      {incident.resolved_at && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> 
                          Recovered: {formatDate(incident.resolved_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 border-white/5 pt-4 md:pt-0 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-0.5">
                      Downtime Duration
                    </span>
                    <span className="text-sm font-mono font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-lg border border-white/5">
                      {calculateDuration(incident.started_at, incident.resolved_at)}
                    </span>
                  </div>

                  <Link 
                    to={`/monitors/${incident.service_id}`} 
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                  >
                    <span>View Monitor</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

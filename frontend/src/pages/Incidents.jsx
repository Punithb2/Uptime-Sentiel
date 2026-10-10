import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, Globe, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

export default function Incidents() {
  const { data: incidents, isLoading} = useQuery({
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
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-500" /> Incident History
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl h-24 animate-pulse"></div>
          ))}
        </div>
      ) : incidents?.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-emerald-500/10 p-4 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">Clean Slate</h3>
          <p className="text-gray-400">No incidents have been recorded. Your services are running perfectly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div 
              key={incident.id} 
              className={`border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                incident.is_open 
                  ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg mt-1 ${incident.is_open ? 'bg-red-500/20' : 'bg-gray-700'}`}>
                  {incident.is_open ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/monitors/${incident.service_id}`} className="text-white font-semibold text-lg hover:text-blue-400 transition-colors">
                      {incident.service_name}
                    </Link>
                    {incident.is_open && (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                        Active
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mb-2 ${incident.is_open ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                    {incident.cause || 'Service unresponsive'}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> {incident.service_url}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> 
                      Started: {formatDate(incident.started_at)}
                    </span>
                    {incident.resolved_at && (
                      <span className="flex items-center gap-1 text-emerald-500/70">
                        <CheckCircle className="h-3.5 w-3.5" /> 
                        Resolved: {formatDate(incident.resolved_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col items-center justify-between gap-3 md:text-right border-t md:border-t-0 border-gray-700 pt-4 md:pt-0">
                <div className="text-sm">
                  <span className="text-gray-500 block text-xs uppercase font-semibold mb-0.5">Duration</span>
                  <span className="text-white font-medium">{calculateDuration(incident.started_at, incident.resolved_at)}</span>
                </div>
                <Link 
                  to={`/monitors/${incident.service_id}`} 
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View Monitor <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
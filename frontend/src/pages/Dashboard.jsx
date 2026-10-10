import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Dashboard() {

  // Use TanStack Query to share the cache with the Monitors page
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get('/services/dashboard/summary');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const degradedServices = summary?.services?.filter(s => s.service.status === 'DOWN') || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6 text-blue-500" /> Platform Overview
      </h1>

      {/* Global Stats Header with Skeleton Loading */}
      {isLoading && !summary ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 p-4 rounded-xl h-22 animate-pulse"></div>
          ))}
        </div>
      ) : summary?.stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-gray-400 text-xs font-medium uppercase mb-1">Total Monitors</div>
            <div className="text-2xl font-bold text-white">{summary.stats.total_monitors}</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-emerald-500 text-xs font-medium uppercase mb-1">Operational</div>
            <div className="text-2xl font-bold text-emerald-400">{summary.stats.up_monitors}</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-red-500 text-xs font-medium uppercase mb-1">Down / Alerts</div>
            <div className="text-2xl font-bold text-red-400">{summary.stats.down_monitors}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-gray-400 text-xs font-medium uppercase mb-1">Paused</div>
            <div className="text-2xl font-bold text-gray-300">{summary.stats.paused_monitors}</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-blue-400 text-xs font-medium uppercase mb-1">Avg Latency</div>
            <div className="text-2xl font-bold text-blue-400">{summary.stats.average_latency_ms} ms</div>
          </div>
        </div>
      ) : null}

      {/* Active Issues Section */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Attention Required</h2>
        
        {isLoading && !summary ? (
           <div className="bg-gray-800 border border-gray-700 rounded-xl h-32 animate-pulse"></div>
        ) : degradedServices.length > 0 ? (
          <div className="space-y-3">
            {degradedServices.map(data => (
              <div key={data.service.id} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-red-500/20 p-2 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{data.service.name}</h3>
                    <p className="text-red-400 text-sm">{data.active_incident?.cause || 'Service is currently unreachable'}</p>
                  </div>
                </div>
                <Link to={`/monitors/${data.service.id}`} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-lg transition-colors">
                  View Details
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <div className="bg-emerald-500/10 p-3 rounded-full mb-3">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-emerald-400 font-medium mb-1">All Systems Operational</h3>
            <p className="text-gray-400 text-sm max-w-md">No services are currently experiencing downtime. Your infrastructure is healthy.</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-800">
        <Link to="/monitors" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium">
          Manage all monitors <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
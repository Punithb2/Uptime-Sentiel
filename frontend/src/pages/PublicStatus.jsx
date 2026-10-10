import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../lib/api';

export default function PublicStatus() {
  const { userId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['publicStatus', userId],
    queryFn: async () => {
      const res = await api.get(`/services/status/public/${userId}`);
      return res.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Loading status...</div>;
  if (error) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-400">Status page not found or unavailable.</div>;

  const hasOutage = data.services.some(s => s.status === 'DOWN');

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-12">
          <Activity className="h-12 w-12 text-blue-500 mb-4" />
          <h1 className="text-3xl font-bold text-white">System Status</h1>
        </div>

        {/* Global Status Banner */}
        <div className={`p-6 rounded-xl border flex items-center gap-4 ${hasOutage ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          {hasOutage ? <AlertTriangle className="h-8 w-8 text-red-500" /> : <CheckCircle className="h-8 w-8 text-emerald-500" />}
          <div>
            <h2 className={`text-xl font-bold ${hasOutage ? 'text-red-400' : 'text-emerald-400'}`}>
              {hasOutage ? 'Some systems are experiencing issues' : 'All Systems Operational'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">Refreshed automatically every 30 seconds.</p>
          </div>
        </div>

        {/* Services List */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
            <h3 className="font-semibold text-white">Current Service Status</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {data.services.map(service => (
              <div key={service.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {service.status === 'UP' ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
                  <span className="font-medium text-white">{service.name}</span>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${service.status === 'UP' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {service.status}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{service.uptime_24h}% uptime (24h)</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident History */}
        {data.incidents.length > 0 && (
          <div className="pt-8">
            <h3 className="text-lg font-semibold text-white mb-6">Past Incidents</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-700">
              {data.incidents.map(incident => (
                <div key={incident.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-gray-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${incident.is_open ? 'bg-red-500' : 'bg-gray-700'}`}>
                    {incident.is_open ? <AlertTriangle className="h-4 w-4 text-white" /> : <Clock className="h-4 w-4 text-gray-400" />}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-gray-800 border border-gray-700 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium text-sm ${incident.is_open ? 'text-red-400' : 'text-white'}`}>
                        {incident.is_open ? 'Active Outage' : 'Resolved'}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(incident.started_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{incident.cause}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Activity, Settings, Clock, Globe, AlertTriangle, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';

export default function MonitorDetails() {
  const { id } = useParams();
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
  const [updateMsg, setUpdateMsg] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get(`/services/${id}/history`);
      setData(res.data);
      
      // Only populate the form the first time it loads
      if (!editName) {
        setEditName(res.data.service.name);
        setEditUrl(res.data.service.url);
        setEditInterval(res.data.service.check_interval_seconds);
        setEditTimeout(res.data.service.timeout_seconds || 10);
        setEditThreshold(res.data.service.failure_threshold || 2);
        
        // Convert array like [200, 201] to string "200, 201" for the input field
        const codes = res.data.service.expected_status_codes;
        setEditStatusCodes(codes ? codes.join(', ') : '');
      }
    } catch (err) {
      console.error(err);
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
    setUpdateMsg('');
    setError('');
    
    // Parse the comma-separated string back into an array of integers
    const parsedStatusCodes = editStatusCodes.trim() 
      ? editStatusCodes.split(',').map(code => Number(code.trim())).filter(code => !isNaN(code))
      : null;

    try {
      await api.patch(`/services/${id}`, {
        name: editName,
        url: editUrl,
        check_interval_seconds: Number(editInterval),
        timeout_seconds: Number(editTimeout),
        failure_threshold: Number(editThreshold),
        expected_status_codes: parsedStatusCodes
      });
      setUpdateMsg('Monitor updated successfully!');
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update monitor.');
    }
  };

  if (loading) return <div className="p-8 text-gray-400">Loading monitor data...</div>;
  if (error && !data) return <div className="p-8 text-red-400">{error}</div>;

  const { service, checks, incidents } = data;
  
  const chartData = [...checks].reverse().map(c => ({
    time: new Date(c.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    latency: c.latency_ms || 0,
    status: c.status
  }));

  const isUp = service.status === "UP";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
        <Link to="/monitors" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{service.name}</h1>
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full ${isUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {isUp ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} 
              {service.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Globe className="h-4 w-4" /> {service.url}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Every {service.check_interval_seconds}s</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
        >
          <Activity className="h-4 w-4 inline mr-2" /> Analytics & History
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
        >
          <Settings className="h-4 w-4 inline mr-2" /> Configuration
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Response Time (Last 100 Checks)</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} tickMargin={10} />
                  <YAxis stroke="#9CA3AF" fontSize={12} unit="ms" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#60A5FA' }}
                  />
                  <Line type="monotone" dataKey="latency" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#60A5FA' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Incidents</h2>
            {incidents.length === 0 ? (
              <p className="text-gray-400 text-sm">No incidents recorded recently.</p>
            ) : (
              <div className="space-y-3">
                {incidents.map(inc => (
                  <div key={inc.id} className="p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                      {inc.is_open ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <CheckCircle className="h-5 w-5 text-emerald-500" />}
                      <div>
                        <span className="text-white font-medium">{inc.is_open ? 'Ongoing Outage' : 'Resolved'}</span>
                        <p className="text-gray-400 text-xs mt-0.5">{inc.cause}</p>
                      </div>
                    </div>
                    <div className="text-right text-gray-500 text-xs">
                      <div>Started: {new Date(inc.started_at).toLocaleString()}</div>
                      {inc.resolved_at && <div>Resolved: {new Date(inc.resolved_at).toLocaleString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Monitor Configuration</h2>
          {error && <div className="mb-4 bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">{error}</div>}
          {updateMsg && <div className="mb-4 bg-emerald-500/10 border border-emerald-500 text-emerald-400 p-3 rounded-lg text-sm">{updateMsg}</div>}
          
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Service Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Target URL</label>
                <input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Check Interval (Seconds)</label>
                <input type="number" min="10" value={editInterval} onChange={(e) => setEditInterval(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Request Timeout (Seconds)</label>
                <input type="number" min="1" max="60" value={editTimeout} onChange={(e) => setEditTimeout(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700/50">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-blue-400" /> Alert Conditions
              </h3>
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Failure Threshold</label>
                  <p className="text-xs text-gray-500 mb-2">How many consecutive failures before opening an incident?</p>
                  <input type="number" min="1" max="10" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} required className="w-full md:w-1/2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Expected Status Codes (Optional)</label>
                  <p className="text-xs text-gray-500 mb-2">Comma-separated list (e.g. 200, 201, 302). Leave blank to accept any 2xx or 3xx code.</p>
                  <input type="text" placeholder="e.g. 200, 201" value={editStatusCodes} onChange={(e) => setEditStatusCodes(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700 mt-6">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Bell, User as UserIcon, Save, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function Settings() {
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
  });

  useEffect(() => {
    if (user && !webhookUrl && user.webhook_url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWebhookUrl(user.webhook_url);
    }
  }, [user, webhookUrl]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.patch('/auth/me', { webhook_url: webhookUrl });
      setSuccessMsg('Settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-6 py-8 text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between border-b border-gray-800 pb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-blue-500" /> Platform Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Sidebar Navigation (Visual Only for now) */}
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/20">
            <Bell className="h-4 w-4" /> Alert Preferences
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg text-sm font-medium transition-colors cursor-not-allowed opacity-50">
            <UserIcon className="h-4 w-4" /> Account Profile
          </button>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Incident Webhooks</h2>
            <p className="text-sm text-gray-400 mb-6">Connect a Slack or Discord webhook to receive instant notifications when a monitor goes down.</p>
            
            {successMsg && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address (Read-only)</label>
                <input 
                  type="text" 
                  value={user?.email || ''} 
                  disabled 
                  className="w-full bg-gray-900 border border-gray-700 text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Webhook URL</label>
                <input 
                  type="url" 
                  placeholder="https://hooks.slack.com/services/..." 
                  value={webhookUrl} 
                  onChange={(e) => setWebhookUrl(e.target.value)} 
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
                <p className="text-xs text-gray-500 mt-2">Leave blank to disable webhook alerts.</p>
              </div>
              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
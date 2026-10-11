import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Bell, User, Shield, Key, Trash2, Save, Mail, Globe, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [isPublicEnabled, setIsPublicEnabled] = useState(false);

  // Notification State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifError, setNotifError] = useState('');

  // Profile State
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      // FIXED: Pointing to the correct /auth/me backend route
      const res = await api.get('/auth/me'); 
      return res.data;
    }
  });

  // Standardize the state update to clear the lint error safely
  useEffect(() => {
  if (user) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebhookUrl(prev => prev || user.webhook_url || '');
    setEmail(prev => prev || user.email || '');
    setIsPublicEnabled(user.is_public_page_enabled || false);
  }
}, [user]);

  const handleSaveWebhook = async (e) => {
    e.preventDefault();
    setNotifMsg('');
    setNotifError('');
    try {
      // FIXED: Using the unified /auth/me PATCH endpoint we built earlier
      await api.patch('/auth/me', { webhook_url: webhookUrl });
      setNotifMsg('Webhook configuration saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    } catch (err) {
      setNotifError(err.response?.data?.detail || 'Failed to save webhook.');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');

    const updateData = {};
    if (email !== user?.email) updateData.email = email;
    
    if (newPassword) {
      if (!currentPassword) {
        setProfileError('You must provide your current password to set a new one.');
        return;
      }
      updateData.current_password = currentPassword;
      updateData.new_password = newPassword;
    }

    if (Object.keys(updateData).length === 0) {
      setProfileMsg('No changes made.');
      return;
    }

    try {
      // FIXED: Pointing to /auth/me
      await api.patch('/auth/me', updateData);
      setProfileMsg('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile.');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "DANGER: Are you absolutely sure you want to delete your account? This will permanently erase all your monitors, check history, and incidents. This action CANNOT be undone."
    );
    if (!confirmDelete) return;

    try {
      // FIXED: Pointing to /auth/me
      await api.delete('/auth/me');
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to delete account.');
    }
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-8">
        <SettingsIcon className="h-6 w-6 text-blue-500" /> Platform Settings
      </h1>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700/50">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2"><User className="w-4 h-4" /> Account Profile</div>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notifications' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</div>
        </button>
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" /> Security & Profile
            </h2>

            {profileMsg && <div className="mb-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg text-sm">{profileMsg}</div>}
            {profileError && <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">{profileError}</div>}

            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700/50">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Change Password (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        type="password"
                        placeholder="Required if changing password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        type="password"
                        placeholder="Leave blank to keep current"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Public Status Page Toggle */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-400" /> Public Status Page
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={isPublicEnabled}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setIsPublicEnabled(newValue);
                    try {
                      await api.patch('/auth/me', { is_public_page_enabled: newValue });
                      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
                    } catch (err) {
                      console.error("Failed to toggle public page", err);
                      setIsPublicEnabled(!newValue); // revert on failure
                    }
                  }}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Publish a live, unauthenticated dashboard showing the uptime of your public monitors to your customers.
            </p>

            {isPublicEnabled && user?.public_slug && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-center justify-between">
                <code className="text-sm text-green-400">
                  {window.location.origin}/status/{user.public_slug}
                </code>
                <a 
                  href={`/status/${user.public_slug}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  title="View Public Page"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Danger Zone
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Permanently delete your account, all monitors, and check history. This action cannot be reversed.
            </p>
            <button 
              onClick={handleDeleteAccount} 
              className="bg-red-600/90 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors border border-red-500/50 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm animate-in fade-in duration-200">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" /> Alert Destinations
          </h2>
          
          {notifMsg && <div className="mb-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg text-sm">{notifMsg}</div>}
          {notifError && <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">{notifError}</div>}

          <form onSubmit={handleSaveWebhook} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Global Webhook URL (Slack/Discord)</label>
              <p className="text-xs text-gray-500 mb-3">
                Sentinel will send a JSON payload with a `content` field to this URL whenever a service goes down or recovers.
              </p>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                <Save className="h-4 w-4" /> Save Webhook
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
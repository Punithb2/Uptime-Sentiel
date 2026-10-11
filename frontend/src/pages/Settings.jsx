import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, 
  Bell, 
  User, 
  Shield, 
  Key, 
  Trash2, 
  Save, 
  Mail, 
  Globe, 
  ExternalLink,
  Copy,
  Check,
  Lock
} from 'lucide-react';
import { api } from '../lib/api';
import { SettingsSkeleton } from '../components/Skeletons';
import { useToast } from '../components/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Settings() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [isPublicEnabled, setIsPublicEnabled] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Notification State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifError, setNotifError] = useState('');

  // Profile State
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  
  // Danger Zone
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get('/auth/me'); 
      return res.data;
    }
  });

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWebhookUrl(prev => prev || user.webhook_url || '');
      setEmail(prev => prev || user.email || '');
      setIsPublicEnabled(user.is_public_page_enabled || false);
    }
  }, [user]);

  const handleCopyLink = () => {
    if (!user?.public_slug) return;
    const url = `${window.location.origin}/status/${user.public_slug}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    showToast('Public status page URL copied to clipboard.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveWebhook = async (e) => {
    e.preventDefault();
    setNotifError('');
    setIsSavingWebhook(true);
    try {
      await api.patch('/auth/me', { webhook_url: webhookUrl });
      showToast('Webhook alert preferences saved.');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    } catch (err) {
      setNotifError(err.response?.data?.detail || 'Failed to save webhook.');
      showToast('Could not save webhook configuration.', 'error');
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError('');

    const updateData = {};
    if (email !== user?.email) updateData.email = email;
    
    if (newPassword) {
      if (!currentPassword) {
        setProfileError('Your current password is required to change password.');
        return;
      }
      updateData.current_password = currentPassword;
      updateData.new_password = newPassword;
    }

    if (Object.keys(updateData).length === 0) {
      showToast('No profile changes detected.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await api.patch('/auth/me', updateData);
      showToast('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile.');
      showToast('Could not update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await api.delete('/auth/me');
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to delete account.');
      showToast('Could not delete account.', 'error');
      setIsDeleting(false);
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <SettingsIcon className="h-5 w-5" />
          </div>
          Platform & Account Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage credentials, notification webhooks, and public customer status pages
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Security & Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'notifications'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alert Destinations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('status_page')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'status_page'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Public Status Page</span>
        </button>
      </div>

      {/* TAB: PROFILE & SECURITY */}
      {activeTab === 'profile' && (
        <div className="space-y-6 fade-enter">
          <div className="glass-card rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" /> Account Security Credentials
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Update login email and change authentication password.
            </p>

            {profileError && <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-medium">{profileError}</div>}

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-400" /> Change Password (Optional)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Current Password</label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        placeholder="Required only to change password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">New Password</label>
                    <div className="relative">
                      <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        placeholder="Leave blank to keep unchanged"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button 
                  type="submit" 
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
                >
                  <Save className="h-4 w-4" />
                  {isSavingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="glass-card rounded-2xl p-6 border-rose-500/30 bg-rose-950/15">
            <h2 className="text-base font-bold text-rose-400 mb-1 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Danger Zone
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Permanently delete this account, all registered monitors, and health check history.
            </p>
            <button 
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* TAB: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="glass-card rounded-2xl p-6 shadow-sm fade-enter space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Webhook Alert Dispatcher</h2>
              <p className="text-xs text-slate-400">Receive instant outage notifications in Slack, Discord, or custom servers</p>
            </div>
          </div>
          
          {notifError && <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-medium">{notifError}</div>}

          <form onSubmit={handleSaveWebhook} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Global Webhook URL (Slack / Discord / Custom)
              </label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/services/..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-2">
                Sentinel automatically sends an HTTP POST with JSON format <code className="bg-slate-800 px-1 py-0.5 rounded text-blue-300">{"{ content: '...' }"}</code> whenever an endpoint goes down or recovers.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={isSavingWebhook}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
              >
                <Save className="h-4 w-4" />
                {isSavingWebhook ? 'Saving…' : 'Save Webhook Destination'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: PUBLIC STATUS PAGE */}
      {activeTab === 'status_page' && (
        <div className="glass-card rounded-2xl p-6 shadow-sm fade-enter space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Public Customer Status Page</h2>
                <p className="text-xs text-slate-400">Share your live system reliability and past incident history</p>
              </div>
            </div>

            {/* Toggle switch */}
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
                    showToast(newValue ? 'Public status page activated.' : 'Public status page deactivated.');
                  } catch {
                    setIsPublicEnabled(!newValue);
                    showToast('Could not update status page preference.', 'error');
                  }
                }}
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
            </label>
          </div>

          <p className="text-xs text-slate-300">
            When enabled, customers can view real-time uptime of any monitor you set to <strong>Public</strong> without needing an account.
          </p>

          {isPublicEnabled && user?.public_slug ? (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Shareable Public URL
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/status/${user.public_slug}`}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-400 select-all"
                />

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition"
                  title="Copy link"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>

                <a
                  href={`/status/${user.public_slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition"
                  title="Open in new tab"
                >
                  <span>Preview</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-xs text-slate-400">
              Toggle the switch above to generate your public URL.
            </div>
          )}
        </div>
      )}

      {/* Delete Account Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Permanently delete your Sentinel account?"
        description="All monitoring jobs, latency telemetry, incident records, and alert webhook configs will be erased permanently. This action cannot be reversed."
        confirmLabel="Delete Account Permanently"
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        isPending={isDeleting}
      />
    </div>
  );
}

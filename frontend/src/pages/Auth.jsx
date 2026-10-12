import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Lock, Mail, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);
        
        const res = await api.post('/auth/login', params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        queryClient.clear();
        localStorage.setItem('token', res.data.access_token);
        navigate('/dashboard');
      } else {
        const res = await api.post('/auth/register', { email, password });
        queryClient.clear();
        localStorage.setItem('token', res.data.access_token);
        navigate('/dashboard');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError('Invalid format: ' + detail[0].msg);
      } else {
        setError(detail || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-500/20 selection:text-blue-300">
      {/* Background radial ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center relative z-10 page-enter">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-xl shadow-blue-500/30 mb-4 ring-1 ring-white/20">
          <Activity className="h-7 w-7" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="radar-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-[#090D16]"></span>
          </span>
        </div>

        <h1 className="text-center text-3xl font-extrabold tracking-tight text-white">
          Sentinel
        </h1>
        <p className="mt-1 text-center text-xs text-slate-400">
          Enterprise Uptime Monitoring & Automated Alerting Mesh
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 page-enter">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-2xl">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-white">
              {isLogin ? 'Sign in to your account' : 'Create your Sentinel account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isLogin ? 'Access your live monitoring dashboards' : 'Start monitoring your endpoints in seconds'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs text-center font-medium fade-enter">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:cursor-wait disabled:opacity-70 shadow-lg shadow-blue-500/25 transition-all duration-200"
            >
              {isSubmitting && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              <span>{isSubmitting ? 'Authenticating…' : isLogin ? 'Sign in' : 'Create Account'}</span>
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              {isLogin ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

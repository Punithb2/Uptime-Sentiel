import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { RouteSkeleton } from './components/Skeletons';
import { ThemeProvider } from './components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

// 1. Lazy load all pages so they only download when the user clicks them
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Monitors = lazy(() => import('./pages/Monitors'));
const MonitorDetails = lazy(() => import('./pages/MonitorDetails'));
const Incidents = lazy(() => import('./pages/Incidents'));
const Settings = lazy(() => import('./pages/Settings'));
const PublicStatus = lazy(() => import('./pages/PublicStatus'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 10000 },
  },
});

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
}

// 2. Add a 404 Not Found Component
const NotFound = () => (
  <div className="min-h-screen app-bg flex flex-col items-center justify-center text-center px-6">
    <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
      <span className="text-2xl font-black">404</span>
    </div>
    <h1 className="text-2xl font-bold text-white mb-2">Endpoint Not Found</h1>
    <p className="text-sm text-slate-400 mb-6 max-w-sm">
      The route you requested does not exist or has been relocated.
    </p>
    <Link 
      to="/dashboard" 
      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition"
    >
      Return to Dashboard
    </Link>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
        <ToastProvider>
        <BrowserRouter>
          {/* Wrap Routes in Suspense to handle the lazy loading state */}
          <Suspense fallback={<RouteSkeleton />}>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/status/:slug" element={<PublicStatus />} />
              
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/monitors" element={<Monitors />} />
                <Route path="/monitors/:id" element={<MonitorDetails />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* 3. The Catch-all Route for unknown URLs */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';

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

// A simple loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-500">
    Loading module...
  </div>
);

// 2. Add a 404 Not Found Component
const NotFound = () => (
  <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center px-6">
    <h1 className="text-6xl font-bold text-gray-700 mb-4">404</h1>
    <p className="text-xl text-gray-400 mb-8">This page does not exist or was moved.</p>
    <a href="/dashboard" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
      Return to Dashboard
    </a>
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Wrap Routes in Suspense to handle the lazy loading state */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/status/:userId" element={<PublicStatus />} />
            
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
    </QueryClientProvider>
  );
}
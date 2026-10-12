import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient.js';
import { useAuth } from '../lib/authStore.js';
import { refreshSession } from '../lib/api.js';
import { startLenis, stopLenis } from '../lib/lenis.js';
import { connectSocket, disconnectSocket } from '../lib/socket.js';
import { Toaster } from '../components/ui/Feedback.jsx';
import { AppRoutes } from './routes.jsx';
import { RealtimeBridge } from './RealtimeBridge.jsx';

function Boot() {
  const accessToken = useAuth((s) => s.accessToken);

  // restore session from the httpOnly refresh cookie
  useEffect(() => {
    refreshSession().catch(() => useAuth.getState().clear());
  }, []);

  // smooth scroll
  useEffect(() => {
    startLenis();
    return stopLenis;
  }, []);

  // realtime connection follows the session
  useEffect(() => {
    if (accessToken) connectSocket();
    else disconnectSocket();
  }, [accessToken]);

  return (
    <>
      <RealtimeBridge />
      <AppRoutes />
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Boot />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

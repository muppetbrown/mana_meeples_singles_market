// apps/web/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShopPage from '@/features/shop/ShopPage';
import Login from '@/features/admin/Login';
import Dashboard from '@/features/admin/Dashboard';
import { ToastProvider } from '@/shared/ui/Toast';

// Create a client outside the component to avoid recreating on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - increase from 1 min for better caching
      gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data longer (formerly cacheTime in v4)
      retry: 2, // Retry failed requests twice before giving up
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Prevent refetch on tab focus (better UX)
      refetchOnReconnect: true, // Do refetch when connection is restored
      refetchOnMount: false, // Don't refetch if data is fresh
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
      retryDelay: 1000, // 1 second delay between mutation retries
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Routes>
            <Route path="/" element={<ShopPage />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/login" element={<Login />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
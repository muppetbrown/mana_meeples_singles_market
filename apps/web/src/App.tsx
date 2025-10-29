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
      staleTime: 60_000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
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
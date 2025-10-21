// apps/web/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShopPage } from '@/features/shop';
import { Dashboard, Login } from '@/features/admin';

function App() {
  return (
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
  );
}

export default App;

/**
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<ShopPage />} />
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/login" element={<Login />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
*/
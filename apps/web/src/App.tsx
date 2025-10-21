// apps/web/src/App.tsx
import { ShopPage } from '@/features/shop';
import { Dashboard, Login } from '@/features/admin';

// Accessible loading spinner
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-600 font-medium">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<ShopPage />} />
      <Route path="/admin" element={<Dashboard />} />
      <Route path="/admin/login" element={<Login />} />
    </Routes>
  );
}

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
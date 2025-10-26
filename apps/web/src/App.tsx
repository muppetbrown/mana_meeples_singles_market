// apps/web/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShopPage } from '@/features/shop/components';
import { Dashboard, Login } from '@/features/admin/components';

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
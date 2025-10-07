import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TCGShop from './components/TCGShop';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <BrowserRouter basename="/shop">
      <Routes>
        <Route path="/" element={<TCGShop />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
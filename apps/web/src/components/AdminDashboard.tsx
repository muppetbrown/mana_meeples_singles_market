import { useState, useEffect } from 'react';
import { Package, DollarSign, ShoppingCart, Loader2, LogOut } from 'lucide-react';
import { api } from '@/config/api';

import CurrencySelector from './CurrencySelector';
import UnifiedCardsTab from './admin/UnifiedCardsTab';
import OrdersTab from './admin/OrdersTab';
import AnalyticsTab from './admin/AnalyticsTab';

const AdminDashboard = () => {
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'all-cards' | 'analytics' | 'orders'>('inventory');
  const [currency, setCurrency] = useState<'USD' | 'CAD'>('USD');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.auth/checkAuth();
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          window.location.href = '/admin/login';
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/admin/login';
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCurrencyChange = (newCurrency: 'USD' | 'CAD') => {
    setCurrency(newCurrency);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="inline-block animate-spin h-12 w-12 text-blue-600" />
        <span className="ml-3 text-slate-600">Checking authentication...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            
            <div className="flex items-center gap-3">
              <CurrencySelector
                currency={currency}
                onCurrencyChange={handleCurrencyChange}
              />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap border ${
                activeTab === 'inventory'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 border-transparent'
              }`}
              aria-label="Inventory tab"
              aria-current={activeTab === 'inventory' ? 'page' : undefined}
            >
              <Package className="w-5 h-5" />
              Inventory
            </button>

            <button
              onClick={() => setActiveTab('all-cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap border ${
                activeTab === 'all-cards'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 border-transparent'
              }`}
              aria-label="All Cards tab"
              aria-current={activeTab === 'all-cards' ? 'page' : undefined}
            >
              <Package className="w-5 h-5" />
              All Cards
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap border ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 border-transparent'
              }`}
              aria-label="Analytics tab"
              aria-current={activeTab === 'analytics' ? 'page' : undefined}
            >
              <DollarSign className="w-5 h-5" />
              Analytics
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap border ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 border-transparent'
              }`}
              aria-label="Orders tab"
              aria-current={activeTab === 'orders' ? 'page' : undefined}
            >
              <ShoppingCart className="w-5 h-5" />
              Orders
            </button>
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'inventory' && <UnifiedCardsTab mode="inventory" />}
        {activeTab === 'all-cards' && <UnifiedCardsTab mode="all" />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'orders' && <OrdersTab />}
      </main>
    </div>
  );
};

export default AdminDashboard;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, DollarSign, ShoppingCart, Loader2, LogOut } from 'lucide-react';

import CurrencySelector from './CurrencySelector';
import UnifiedCardsTab from './admin/UnifiedCardsTab';
import OrdersTab from './admin/OrdersTab';
import AnalyticsTab from './admin/AnalyticsTab';
import { API_URL } from '../config/api';

const getAdminHeaders = () => ({
  'Content-Type': 'application/json'
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const [currency, setCurrency] = useState({ symbol: 'NZ$', rate: 1.0, code: 'NZD' });

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/admin/auth/check`, {
          credentials: 'include',
          headers: getAdminHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
          } else {
            navigate('/admin/login');
          }
        } else {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/admin/login');
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleCurrencyChange = (newCurrency: any) => {
    setCurrency(newCurrency);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/admin/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
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
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
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
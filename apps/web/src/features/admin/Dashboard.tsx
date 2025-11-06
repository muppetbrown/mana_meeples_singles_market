// apps/web/src/features/admin/components/Dashboard.tsx
import { useState, useEffect } from 'react';
import { Package, DollarSign, ShoppingCart, Loader2, LogOut, BookOpen, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api';
import CurrencySelector from '@/shared/ui/CurrencySelector';

import UnifiedCardsTab from './components/Cards/CardsTab';
import OrdersTab from './components//Orders/OrdersTab';
import AnalyticsTab from './components/Analytics/AnalyticsTab';
import InstructionsTab from './components/InstructionsTab';
import VariationBadgesTab from './components/VariationBadges/VariationBadgesTab';
import PriceManagementHeaderButtons from './components/PriceManagementHeaderButtons';
import ImportSetModal from './components/Import/ImportSetModal';

interface Currency {
  code: string;
  symbol: string;
  label: string;
  rate: number;
}

const Dashboard = () => {
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'all-cards' | 'analytics' | 'orders' | 'instructions' | 'variation-badges'>('inventory');
  const [currency, setCurrency] = useState<Currency>({
    code: 'NZD',
    symbol: 'NZ$',
    label: 'New Zealand Dollar (NZD)',
    rate: 1.64 // NZD rate from USD base (prices stored in USD)
  });
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await api.get<{ authenticated?: boolean; user?: unknown }>(ENDPOINTS.AUTH.ADMIN_CHECK);
        if (auth?.authenticated === true || auth?.user) {
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
      await api.post(ENDPOINTS.AUTH.LOGOUT);
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
  };

  const handlePriceOperationComplete = (result: any, buttonType: string) => {
    console.log('Price operation complete:', buttonType, result);
    alert(`✅ Price operation complete!\n\nUpdated: ${result.updated}\nSkipped: ${result.skipped}\nFailed: ${result.failed}`);
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    // Refresh the cards tab if we're on it
    if (activeTab === 'all-cards' || activeTab === 'inventory') {
      window.location.reload(); // Simple refresh for now
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                aria-label="Import set"
              >
                <Download className="w-4 h-4" />
                Import Set
              </button>
              <div className="h-6 w-px bg-slate-300" />
              <PriceManagementHeaderButtons
                onOperationComplete={handlePriceOperationComplete}
              />
              <div className="h-6 w-px bg-slate-300" />
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
              <Package className="w-4 h-4" />
              Inventory Management
            </button>

            <button
              onClick={() => setActiveTab('all-cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap border ${
                activeTab === 'all-cards'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 border-transparent'
              }`}
              aria-label="All cards tab"
              aria-current={activeTab === 'all-cards' ? 'page' : undefined}
            >
              <Package className="w-4 h-4" />
              All Cards Database
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
              <DollarSign className="w-4 h-4" />
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
              <ShoppingCart className="w-4 h-4" />
              Orders
            </button>

            <button
              onClick={() => setActiveTab('instructions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap border ${
                activeTab === 'instructions'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 border-transparent'
              }`}
              aria-label="Instructions tab"
              aria-current={activeTab === 'instructions' ? 'page' : undefined}
            >
              <BookOpen className="w-4 h-4" />
              Instructions
            </button>

            <button
              onClick={() => setActiveTab('variation-badges')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap border ${
                activeTab === 'variation-badges'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 border-transparent'
              }`}
              aria-label="Variation Overrides tab"
              aria-current={activeTab === 'variation-badges' ? 'page' : undefined}
            >
              <Package className="w-4 h-4" />
              Variation Overrides
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'inventory' && <UnifiedCardsTab mode="inventory" />}
        {activeTab === 'all-cards' && <UnifiedCardsTab mode="all" />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'orders' && <OrdersTab currency={currency} />}
        {activeTab === 'instructions' && <InstructionsTab />}
        {activeTab === 'variation-badges' && <VariationBadgesTab />}
      </main>

      {/* Import Set Modal */}
      <ImportSetModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default Dashboard;
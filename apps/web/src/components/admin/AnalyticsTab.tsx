import React, { useState, useEffect, useCallback } from 'react';
import { Package, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '@/config/api';

// -------------------- Types --------------------
export type InventoryItem = {
  game_name: string;
  quality: string;
  stock_quantity: number;
  price: number;
  price_source?: string | null;
};

export type AnalyticsByGame = Record<string, { count: number; value: number; stock: number }>;
export type AnalyticsByQuality = Record<string, { count: number; value: number }>;
export type AnalyticsByPriceSource = Record<string, number>;

export type AnalyticsStats = {
  totalCards: number; // unique inventory rows
  totalValue: number; // NZD
  totalStock: number; // total units
  lowStock: number; // 1..3
  outOfStock: number; // 0
  byGame: AnalyticsByGame;
  byQuality: AnalyticsByQuality;
  byPriceSource: AnalyticsByPriceSource;
};

const nzd = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });

const AnalyticsTab: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.admin.getInventory();
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = (await response.json()) as { inventory?: InventoryItem[] };
      const inventory: InventoryItem[] = data.inventory ?? [];

      const base: AnalyticsStats = {
        totalCards: inventory.length,
        totalValue: 0,
        totalStock: 0,
        lowStock: 0,
        outOfStock: 0,
        byGame: {},
        byQuality: {},
        byPriceSource: {},
      };

      const stats = inventory.reduce<AnalyticsStats>((acc, item) => {
        const value = item.stock_quantity * item.price;

        acc.totalValue += value;
        acc.totalStock += item.stock_quantity;

        if (item.stock_quantity === 0) acc.outOfStock += 1;
        else if (item.stock_quantity <= 3) acc.lowStock += 1;

        // byGame
        const g = acc.byGame[item.game_name] ?? { count: 0, value: 0, stock: 0 };
        g.count += 1;
        g.value += value;
        g.stock += item.stock_quantity;
        acc.byGame[item.game_name] = g;

        // byQuality
        const q = acc.byQuality[item.quality] ?? { count: 0, value: 0 };
        q.count += 1;
        q.value += value;
        acc.byQuality[item.quality] = q;

        // byPriceSource
        const src = (item.price_source ?? 'manual').toLowerCase();
        acc.byPriceSource[src] = (acc.byPriceSource[src] ?? 0) + 1;

        return acc;
      }, base);

      setAnalytics(stats);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" aria-hidden="true" />
        <span className="ml-3">Loading analytics…</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12" role="status" aria-live="polite">
        <p className="text-slate-500">Failed to load analytics</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
          <p className="text-slate-600 mt-1">Business insights and metrics</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
          aria-label="Refresh analytics"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total Value</span>
            <DollarSign className="w-5 h-5 text-green-600" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{nzd.format(analytics.totalValue)}</div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total Stock</span>
            <Package className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{analytics.totalStock}</div>
          <p className="text-xs text-slate-500 mt-1">{analytics.totalCards} unique items</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Low Stock</span>
            <AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold text-amber-600">{analytics.lowStock}</div>
          <p className="text-xs text-slate-500 mt-1">Items need restocking</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Out of Stock</span>
            <Package className="w-5 h-5 text-red-600" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold text-red-600">{analytics.outOfStock}</div>
          <p className="text-xs text-slate-500 mt-1">Items unavailable</p>
        </div>
      </div>

      {/* Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Game */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-slate-900 mb-4">By Game</h3>
          <div className="space-y-3">
            {Object.entries(analytics.byGame).map(([game, data]) => (
              <div key={game}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700">{game}</span>
                  <span className="font-medium text-slate-900">{data.count} items</span>
                </div>
                <div className="text-xs text-slate-500">{nzd.format(data.value)} • {data.stock} units</div>
              </div>
            ))}
          </div>
        </div>

        {/* By Quality */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-slate-900 mb-4">By Quality</h3>
          <div className="space-y-3">
            {Object.entries(analytics.byQuality).map(([quality, data]) => (
              <div key={quality} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{quality}</span>
                <div className="text-right">
                  <div className="font-medium text-slate-900">{data.count} items</div>
                  <div className="text-xs text-slate-500">{nzd.format(data.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Price Source */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Price Sources</h3>
          <div className="space-y-3">
            {Object.entries(analytics.byPriceSource).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 capitalize">{source}</span>
                <span className="font-medium text-slate-900">{count} items</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
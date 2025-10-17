import React, { useState, useEffect, useCallback } from 'react';
import { Package, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AnalyticsTab = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/inventory`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      const inventory = data.inventory || [];

      // Calculate analytics
      const stats = {
        totalCards: inventory.length,
        totalValue: inventory.reduce((sum: any, item: any) => sum + (item.stock_quantity * item.price), 0),
        totalStock: inventory.reduce((sum: any, item: any) => sum + item.stock_quantity, 0),
        lowStock: inventory.filter((item: any) => item.stock_quantity > 0 && item.stock_quantity <= 3).length,
        outOfStock: inventory.filter((item: any) => item.stock_quantity === 0).length,
        
        // Breakdowns
        byGame: {},
        byQuality: {},
        byPriceSource: {}
      };

      // Group by game
      inventory.forEach((item: any) => {

        if (!stats.byGame[item.game_name]) {

          stats.byGame[item.game_name] = { count: 0, value: 0, stock: 0 };
        }

        stats.byGame[item.game_name].count++;

        stats.byGame[item.game_name].value += item.stock_quantity * item.price;

        stats.byGame[item.game_name].stock += item.stock_quantity;
      });

      // Group by quality
      inventory.forEach((item: any) => {

        if (!stats.byQuality[item.quality]) {

          stats.byQuality[item.quality] = { count: 0, value: 0 };
        }

        stats.byQuality[item.quality].count++;

        stats.byQuality[item.quality].value += item.stock_quantity * item.price;
      });

      // Group by price source
      inventory.forEach((item: any) => {
        const source = item.price_source || 'manual';

        if (!stats.byPriceSource[source]) {

          stats.byPriceSource[source] = 0;
        }

        stats.byPriceSource[source]++;
      });


      setAnalytics(stats);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Failed to load analytics</p>
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total Value</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900">
            // @ts-expect-error TS(2339): Property 'totalValue' does not exist on type 'neve... Remove this comment to see the full error message
            NZ${analytics.totalValue.toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total Stock</span>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900">
            // @ts-expect-error TS(2339): Property 'totalStock' does not exist on type 'neve... Remove this comment to see the full error message
            {analytics.totalStock}
          </div>
          // @ts-expect-error TS(2339): Property 'totalCards' does not exist on type 'neve... Remove this comment to see the full error message
          <p className="text-xs text-slate-500 mt-1">{analytics.totalCards} unique items</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Low Stock</span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-amber-600">
            // @ts-expect-error TS(2339): Property 'lowStock' does not exist on type 'never'... Remove this comment to see the full error message
            {analytics.lowStock}
          </div>
          <p className="text-xs text-slate-500 mt-1">Items need restocking</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Out of Stock</span>
            <Package className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">
            // @ts-expect-error TS(2339): Property 'outOfStock' does not exist on type 'neve... Remove this comment to see the full error message
            {analytics.outOfStock}
          </div>
          <p className="text-xs text-slate-500 mt-1">Items unavailable</p>
        </div>
      </div>

      {/* Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Game */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-slate-900 mb-4">By Game</h3>
          <div className="space-y-3">
            // @ts-expect-error TS(2339): Property 'byGame' does not exist on type 'never'.
            {Object.entries(analytics.byGame).map(([game, data]) => (
              <div key={game}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700">{game}</span>
                  // @ts-expect-error TS(2571): Object is of type 'unknown'.
                  <span className="font-medium text-slate-900">{data.count} items</span>
                </div>
                <div className="text-xs text-slate-500">
                  // @ts-expect-error TS(2571): Object is of type 'unknown'.
                  NZ${data.value.toFixed(2)} • {data.stock} units
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Quality */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-slate-900 mb-4">By Quality</h3>
          <div className="space-y-3">
            // @ts-expect-error TS(2339): Property 'byQuality' does not exist on type 'never... Remove this comment to see the full error message
            {Object.entries(analytics.byQuality).map(([quality, data]) => (
              <div key={quality} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{quality}</span>
                <div className="text-right">
                  // @ts-expect-error TS(2571): Object is of type 'unknown'.
                  <div className="font-medium text-slate-900">{data.count} items</div>
                  // @ts-expect-error TS(2571): Object is of type 'unknown'.
                  <div className="text-xs text-slate-500">NZ${data.value.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Price Source */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Price Sources</h3>
          <div className="space-y-3">
            // @ts-expect-error TS(2339): Property 'byPriceSource' does not exist on type 'n... Remove this comment to see the full error message
            {Object.entries(analytics.byPriceSource).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 capitalize">{source}</span>
                // @ts-expect-error TS(2746): This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
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
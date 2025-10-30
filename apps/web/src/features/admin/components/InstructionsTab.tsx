// apps/web/src/features/admin/components/InstructionsTab.tsx
import React from 'react';
import { DollarSign, Zap, Package, MousePointer, BookOpen, AlertCircle } from 'lucide-react';

/**
 * Instructions Tab Component
 * Displays comprehensive instructions for Price Management operations
 */
const InstructionsTab: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">Price Management Instructions</h2>
        </div>
        <p className="text-slate-600">
          This guide explains how to use the price management features available in the admin dashboard.
          Use the buttons in the header to perform bulk price operations.
        </p>
      </div>

      {/* Price Management Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Available Price Operations</h3>
        </div>

        <div className="space-y-6">
          {/* Initialize Prices */}
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <h4 className="text-lg font-semibold text-slate-900">1. Initialize Prices</h4>
            </div>
            <p className="text-slate-700 mb-2">
              <strong>Purpose:</strong> Create pricing records for cards that currently have no price data.
            </p>
            <p className="text-slate-600 mb-2">
              <strong>When to use:</strong> After importing new cards from Scryfall or when you need to populate prices for cards without pricing information.
            </p>
            <p className="text-slate-600 mb-2">
              <strong>Location:</strong> Header button (blue, with lightning bolt icon)
            </p>
            <div className="bg-blue-50 rounded-lg p-3 mt-3">
              <p className="text-sm text-blue-900">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                <li>Fetches current market prices from Scryfall for all cards without pricing</li>
                <li>Creates new card_pricing records in the database</li>
                <li>Does not overwrite existing prices</li>
                <li>Processes cards in batches of 50 for optimal performance</li>
              </ul>
            </div>
          </div>

          {/* Refresh Inventory */}
          <div className="border-l-4 border-green-500 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-green-600" />
              <h4 className="text-lg font-semibold text-slate-900">2. Refresh Inventory Prices</h4>
            </div>
            <p className="text-slate-700 mb-2">
              <strong>Purpose:</strong> Update pricing for cards that are currently in stock.
            </p>
            <p className="text-slate-600 mb-2">
              <strong>When to use:</strong> Regularly (weekly/monthly) to keep your inventory prices aligned with current market values.
            </p>
            <p className="text-slate-600 mb-2">
              <strong>Location:</strong> Header button (green, with package icon)
            </p>
            <div className="bg-green-50 rounded-lg p-3 mt-3">
              <p className="text-sm text-green-900">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-green-800 mt-2 space-y-1 ml-4 list-disc">
                <li>Fetches updated prices from Scryfall for all cards with inventory</li>
                <li>Updates existing card_pricing records</li>
                <li>Updates inventory item prices to reflect current market rates</li>
                <li>Helps maintain competitive pricing on your storefront</li>
              </ul>
            </div>
          </div>

          {/* Per-Card Refresh */}
          <div className="border-l-4 border-purple-500 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="w-5 h-5 text-purple-600" />
              <h4 className="text-lg font-semibold text-slate-900">3. Per-Card Price Refresh</h4>
            </div>
            <p className="text-slate-700 mb-2">
              <strong>Purpose:</strong> Update pricing for a single specific card.
            </p>
            <p className="text-slate-600 mb-2">
              <strong>When to use:</strong> When adding a card to inventory or when you want to update just one card's price.
            </p>
            <p className="text-slate-600 mb-2">
              <strong>Location:</strong> Inside the "Add to Inventory" modal in the All Cards Database tab
            </p>
            <div className="bg-purple-50 rounded-lg p-3 mt-3">
              <p className="text-sm text-purple-900">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-purple-800 mt-2 space-y-1 ml-4 list-disc">
                <li>Available when viewing card details in the modal</li>
                <li>Fetches the latest price for that specific card variation</li>
                <li>Updates the price field in the form automatically</li>
                <li>Ideal for real-time price checking before listing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="text-xl font-semibold text-slate-900">Best Practices</h3>
        </div>

        <div className="space-y-3 text-slate-700">
          <div className="flex gap-3">
            <span className="text-blue-600 font-bold mt-1">1.</span>
            <div>
              <strong>Initialize first, refresh regularly:</strong> Use "Initialize Prices" after importing new cards, then use "Refresh Inventory" periodically to keep prices current.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-blue-600 font-bold mt-1">2.</span>
            <div>
              <strong>Scryfall IDs are required:</strong> Both bulk operations require cards to have Scryfall IDs. Make sure to import cards using the Scryfall import feature.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-blue-600 font-bold mt-1">3.</span>
            <div>
              <strong>Monitor operation results:</strong> After each operation completes, check the results notification to see how many cards were updated, skipped, or failed.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-blue-600 font-bold mt-1">4.</span>
            <div>
              <strong>Price operations can take time:</strong> Large operations may take several minutes to complete. Don't navigate away from the page while an operation is running.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-blue-600 font-bold mt-1">5.</span>
            <div>
              <strong>Use per-card refresh for precision:</strong> When you need to update a single card immediately, use the per-card refresh in the modal rather than running a full bulk operation.
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Technical Details</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <p><strong>Price Source:</strong> All prices are fetched from Scryfall's public API</p>
          <p><strong>Batch Size:</strong> Operations process cards in batches of 50 to optimize performance</p>
          <p><strong>Rate Limiting:</strong> Built-in delays prevent API rate limit issues</p>
          <p><strong>Finish Types:</strong> Supports foil, nonfoil, and etched finishes</p>
          <p><strong>Currency:</strong> Prices are stored and displayed in your selected currency (default: NZD)</p>
        </div>
      </div>
    </div>
  );
};

export default InstructionsTab;

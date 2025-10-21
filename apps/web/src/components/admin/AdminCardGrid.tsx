// apps/web/src/components/admin/AdminCardGrid.tsx
import React, { useState } from 'react';
import { Plus, Package, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import OptimizedImage from '../OptimizedImage';
import type { ApiCard as Card, ApiCardVariation as CardVariation } from '@/types';

// ---------- Types ----------
interface AdminCardGridProps {
  cards: Card[];
  mode?: 'all' | 'inventory';
  viewMode?: 'grid' | 'list';
  onAddToInventory?: (card: Card, variation: CardVariation) => void;
}

// ---------- Helper Functions ----------
const getTreatmentColor = (treatment: string): string => {
  const colors: Record<string, string> = {
    STANDARD: 'bg-slate-100 text-slate-700 border-slate-300',
    BORDERLESS: 'bg-purple-100 text-purple-700 border-purple-300',
    EXTENDED_ART: 'bg-blue-100 text-blue-700 border-blue-300',
    SHOWCASE: 'bg-pink-100 text-pink-700 border-pink-300',
    PROMO: 'bg-amber-100 text-amber-700 border-amber-300',
    EXTENDED: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  };
  return colors[treatment] || 'bg-gray-100 text-gray-700 border-gray-300';
};

const getFinishBadge = (finish: string): string => {
  return finish === 'foil'
    ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border-amber-300'
    : 'bg-slate-100 text-slate-600 border-slate-300';
};

// ---------- Card Component ----------
const AdminCardItem: React.FC<{
  card: Card;
  onAddToInventory?: (card: Card, variation: CardVariation) => void;
}> = ({ card, onAddToInventory }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors overflow-hidden">
      {/* Card Image */}
      <div className="aspect-[2.5/3.5] bg-slate-100 relative overflow-hidden">
        {card.image_url ? (
          <OptimizedImage
            src={card.image_url}
            alt={card.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-slate-300" />
          </div>
        )}
        
        {/* Stock Badge */}
        {card.total_stock > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
            {card.total_stock} in stock
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-4 space-y-3">
        {/* Name and Number */}
        <div>
          <h3 className="font-semibold text-slate-900 line-clamp-2 min-h-[2.5rem]">
            {card.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
            <span>#{card.card_number}</span>
            <span>•</span>
            <span className="line-clamp-1">{card.set_name}</span>
          </div>
          {card.rarity && (
            <div className="text-xs text-slate-500 mt-1">{card.rarity}</div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">{card.variation_count} variations</span>
          </div>
        </div>

        {/* Variations Expandable Section */}
        {card.variations && card.variations.length > 0 && (
          <div className="border-t border-slate-200 pt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              <span>Variations ({card.variations.length})</span>
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expanded && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {card.variations.map((variation, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs rounded border ${getTreatmentColor(variation.treatment)}`}>
                          {variation.treatment}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded border ${getFinishBadge(variation.finish)}`}>
                          {variation.finish}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Stock: {variation.stock || 0}
                      </div>
                    </div>

                    {onAddToInventory && variation.stock === 0 && (
                      <button
                        onClick={() => onAddToInventory(card, variation)}
                        className="ml-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        title="Add to inventory"
                        aria-label={`Add ${card.name} ${variation.variation_label} to inventory`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Add Button (for cards with no variations) */}
        {onAddToInventory && (!card.variations || card.variations.length === 0) && (
          <button
            onClick={() => {
              // Create a default variation for adding
              const defaultVariation: CardVariation = {
                card_id: card.id,
                variation_label: 'Standard',
                treatment: 'STANDARD',
                finish: 'regular',
                inventory_count: 0,
                stock: 0,
              };
              onAddToInventory(card, defaultVariation);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add to Inventory
          </button>
        )}
      </div>
    </article>
  );
};

// ---------- Main Grid Component ----------
const AdminCardGrid: React.FC<AdminCardGridProps> = ({ 
  cards, 
  mode = 'all',
  onAddToInventory 
}) => {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card) => (
        <AdminCardItem
          key={card.id}
          card={card}
          onAddToInventory={mode === 'inventory' ? undefined : onAddToInventory}
        />
      ))}
    </div>
  );
};

export default AdminCardGrid;
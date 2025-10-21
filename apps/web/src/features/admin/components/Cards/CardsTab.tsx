// apps/web/src/components/admin/UnifiedCardsTab.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Download, LayoutGrid, List } from 'lucide-react';
import { api, API_BASE } from '@/lib/api';
import { useShopFilters } from '../../hooks/useShopFilters';
import CardSearchBar from '../CardSearchBar';
import EmptyState from '../EmptyState';
import CardSkeleton from '../skeletons/CardSkeleton';
import AddToInventoryModal from './AddToInventoryModal';
import AdminCardGrid from './AdminCardGrid';
import { Package } from 'lucide-react';
import type { 
  Card,
  CardVariation,
} from '@/types';

// ---------- Types ----------
type AddModalData = { card: Card; variation: CardVariation };

type AddFormData = {
  quality: string;
  foil_type: string;
  price: string;
  stock_quantity: number;
  language: string;
};

interface UnifiedCardsTabProps { 
  mode?: 'all' | 'inventory'; 
}

// ---------- Component ----------
const UnifiedCardsTab: React.FC<UnifiedCardsTabProps> = ({ mode = 'all' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // View mode state (list is default for admin)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Modal state for adding to inventory
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalData, setAddModalData] = useState<AddModalData | null>(null);
  const [addFormData, setAddFormData] = useState<AddFormData>({
    quality: 'Near Mint',
    foil_type: 'Regular',
    price: '',
    stock_quantity: 1,
    language: 'English',
  });
  const [saving, setSaving] = useState(false);

  // Get URL params
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const selectedTreatment = searchParams.get('treatment') || 'all';
  
  const isInventoryMode = mode === 'inventory';

  // ✅ REUSE useShopFilters hook (already extracted and working)
  const {
    games,
    sets,
    filterOptions,
    loading: filtersLoading,
    error: filtersError
  } = useShopFilters(API_BASE, selectedGame);

  // ---------- URL State Management (copied from TCGShop) ----------
  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  const handleSearchChange = useCallback((value: string) => {
    updateParam('search', value);
  }, [updateParam]);

  const handleGameChange = useCallback((game: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (game && game !== 'all') {
        newParams.set('game', game);
      } else {
        newParams.delete('game');
      }
      newParams.delete('set'); // Clear set when game changes
      return newParams;
    });
  }, [setSearchParams]);

  const handleSetChange = useCallback((set: string) => {
    updateParam('set', set);
  }, [updateParam]);

  // Additional filters configuration (following TCGShop pattern)
  const additionalFilters = {
    treatment: {
      value: selectedTreatment,
      onChange: (value: string) => updateParam('treatment', value),
      label: 'Treatment',
      options: filterOptions.treatments.map(t => ({ value: t.value, label: t.label })),
    },
  };

  // ---------- Data Fetching ----------
  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('limit', '1000');
      
      // Add game filter
      if (selectedGame && selectedGame !== 'all') {
        const game = games.find(g => g.name === selectedGame);
        if (game?.id) {
          params.set('game_id', String(game.id));
        }
      }
      
      // Add set filter
      if (selectedSet && selectedSet !== 'all') {
        const set = sets.find(s => s.name === selectedSet);
        if (set?.id) {
          params.set('set_id', String(set.id));
        }
      }
      
      // Add search term
      if (searchTerm && searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      
      // Add treatment filter
      if (selectedTreatment && selectedTreatment !== 'all') {
        params.set('treatment', selectedTreatment);
      }

      const url = `/cards/cards?${params.toString()}`;
      const data = await api.get<{ cards?: Card[] }>(url);
      setCards(data?.cards ?? []);
    } catch (err) {
      console.error('Error fetching cards:', err);
      setCards([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  }, [selectedGame, selectedSet, searchTerm, selectedTreatment, games, sets]);

  // Fetch cards when dependencies change
  useEffect(() => {
    if (games.length > 0) {
      fetchCards();
    }
  }, [fetchCards, games]);

  // ---------- Derived Data ----------
  const filteredCards = useMemo(() => {
    if (!isInventoryMode) return cards;
    // In inventory mode, only show cards with stock
    return cards.filter(c => Boolean(c?.has_inventory) && Number(c?.total_stock) > 0);
  }, [cards, isInventoryMode]);

  // Group cards by card_number for proper display
  const groupedCards = useMemo(() => {
    const groups = new Map<string, Card[]>();
    
    filteredCards.forEach(card => {
      const key = `${card.set_name}-${card.card_number}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card);
    });
    
    // Convert to array and merge cards with same card_number
    return Array.from(groups.values()).map(cardGroup => {
      if (cardGroup.length === 1) return cardGroup[0];
      
      // Merge multiple cards into one with combined variations
      const baseCard = cardGroup[0];
      const allVariations = cardGroup.flatMap(c => c.variations || []);
      
      return {
        ...baseCard,
        variations: allVariations,
        variation_count: allVariations.length,
        total_stock: allVariations.reduce((sum, v) => sum + (v.stock || 0), 0),
        has_inventory: allVariations.some(v => (v.stock || 0) > 0),
      };
    });
  }, [filteredCards]);

  const totalStock = useMemo(
    () => groupedCards.reduce((sum, c) => sum + (c.total_stock || 0), 0),
    [groupedCards]
  );
  
  const totalVariations = useMemo(
    () => groupedCards.reduce((sum, c) => sum + (c.variation_count || 0), 0),
    [groupedCards]
  );

  // ---------- Modal Actions ----------
  const openAddModal = useCallback((card: Card, variation: CardVariation) => {
    setAddModalData({ card, variation });
    setAddFormData({
      quality: 'Near Mint',
      foil_type: variation.finish === 'foil' ? 'Foil' : 'Regular',
      price: '',
      stock_quantity: 1,
      language: 'English',
    });
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setAddModalData(null);
    setAddFormData({
      quality: 'Near Mint',
      foil_type: 'Regular',
      price: '',
      stock_quantity: 1,
      language: 'English',
    });
  }, []);

  const handleAddToInventory = useCallback(async () => {
    if (!addModalData) return;
    
    setSaving(true);
    try {
      await api.post('/admin/inventory', {
        card_id: addModalData.variation.card_id,
        quality: addFormData.quality,
        foil_type: addFormData.foil_type,
        price: parseFloat(addFormData.price) || 0,
        stock_quantity: Number(addFormData.stock_quantity) || 0,
        language: addFormData.language,
      });
      
      await fetchCards();
      closeAddModal();
      alert(`✅ ${addModalData.card.name} added to inventory successfully!`);
    } catch (e) {
      console.error('Error adding to inventory:', e);
      alert(`❌ Error: ${e instanceof Error ? e.message : 'Failed to add to inventory'}`);
    } finally {
      setSaving(false);
    }
  }, [addModalData, addFormData, fetchCards, closeAddModal]);

  // ---------- CSV Export ----------
  const handleExport = useCallback(() => {
    try {
      const getUniqueTreatments = (variations: CardVariation[]) =>
        Array.from(new Set((variations ?? []).map(v => v.treatment)));
      
      const getUniqueFinishes = (variations: CardVariation[]) =>
        Array.from(new Set((variations ?? []).map(v => v.finish)));

      const csv = [
        ['Card Name', 'Number', 'Set', 'Rarity', 'Treatments', 'Finishes', 'Stock', 'Variations'].join(','),
        ...groupedCards.map(c => [
          `"${(c.name || '').replace(/"/g, '""')}"`, // Proper CSV escaping
          c.card_number || '',
          `"${(c.set_name || '').replace(/"/g, '""')}"`,
          c.rarity || '',
          getUniqueTreatments(c.variations ?? []).join(';'),
          getUniqueFinishes(c.variations ?? []).join(';'),
          c.total_stock || 0,
          c.variation_count || 0,
        ].join(',')),
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${isInventoryMode ? 'inventory' : 'all-cards'}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export CSV. Please try again.');
    }
  }, [groupedCards, isInventoryMode]);

  // ---------- Render ----------
  if (filtersError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">Error loading filters</p>
        <p className="text-red-600 text-sm mt-2">{filtersError}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">Error loading cards</p>
        <p className="text-red-600 text-sm mt-2">{error}</p>
        <button 
          onClick={fetchCards} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isInventoryMode ? 'Inventory Management' : 'All Cards Database'}
          </h2>
          <p className="text-slate-600 mt-1">
            {groupedCards.length} cards • {totalVariations} variations
            {isInventoryMode && ` • ${totalStock} in stock`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 hidden sm:inline">View:</span>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                aria-pressed={viewMode === 'list'}
                aria-label="Switch to list view"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                aria-pressed={viewMode === 'grid'}
                aria-label="Switch to grid view"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <button 
            onClick={fetchCards}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh cards"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleExport}
            disabled={filteredCards.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export to CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ✅ REUSE CardSearchBar Component */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <CardSearchBar
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          selectedGame={selectedGame}
          onGameChange={handleGameChange}
          selectedSet={selectedSet}
          onSetChange={handleSetChange}
          games={games}
          sets={sets}
          additionalFilters={additionalFilters}
          apiUrl={API_BASE}
          debounceMs={300}
          minSearchLength={2}
          showAutocomplete={false} // Disable for admin simplicity
        />
      </div>

      {/* Loading State */}
      {(loading || filtersLoading) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Cards Display */}
      {!loading && !filtersLoading && (
        <>
          {groupedCards.length > 0 ? (
            <AdminCardGrid
              cards={groupedCards}
              mode={mode}
              viewMode={viewMode}
              onAddToInventory={isInventoryMode ? undefined : openAddModal}
            />
          ) : (
            <EmptyState
              icon={Package}
              title={isInventoryMode ? "No inventory items" : "No cards found"}
              message={isInventoryMode 
                ? "Start by adding cards to your inventory" 
                : "Try adjusting your search filters"}
            />
          )}
        </>
      )}

      {/* Add to Inventory Modal */}
      {showAddModal && addModalData && (
        <AddToInventoryModal
          card={addModalData.card}
          variation={addModalData.variation}
          formData={addFormData}
          onFormChange={setAddFormData}
          onSave={handleAddToInventory}
          onClose={closeAddModal}
          saving={saving}
        />
      )}
    </div>
  );
};

export default UnifiedCardsTab;
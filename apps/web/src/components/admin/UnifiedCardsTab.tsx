import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Download } from 'lucide-react';
import { api } from '@/config/api';

// ---------- Types ----------
interface CardVariation {
  card_id: number;
  variation_label: string;
  treatment: string;
  finish: string;
  inventory_count: number;
  stock: number;
}

interface Card {
  id: number;
  name: string;
  card_number: string;
  set_name: string;
  rarity?: string;
  image_url?: string;
  variation_count: number;
  total_stock: number;
  has_inventory: boolean;
  variations: CardVariation[];
}

interface Game { id: number; name: string; }
interface CardSet { id: number; name: string; }
interface SearchSuggestion { name: string; set_name: string; card_number: string; image_url?: string; }

interface AddModalData { card: Card; variation: CardVariation; }
interface AddFormData {
  quality: string;
  foil_type: string;
  price: string;
  stock_quantity: number;
  language: string;
}

interface UnifiedCardsTabProps { mode?: 'all' | 'inventory'; }

// ---------- Component ----------
const UnifiedCardsTab: React.FC<UnifiedCardsTabProps> = ({ mode = 'all' }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [cards, setCards] = useState<Card[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [availableSets, setAvailableSets] = useState<CardSet[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set<string>());
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [addModalData, setAddModalData] = useState<AddModalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState<AddFormData>({
    quality: 'Near Mint',
    foil_type: 'Regular',
    price: '',
    stock_quantity: 1,
    language: 'English',
  });
  const [saving, setSaving] = useState(false);

  // URL state
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const filterTreatment = searchParams.get('treatment') || 'all';

  // debounce + cancellation
  const abortController = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isInventoryMode = mode === 'inventory';

  // ---------- Helpers ----------
  const getGameIdFromName = useCallback((gameName: string): number | null => {
    if (!games?.length) return null;
    const found = games.find(g => g.name === gameName);
    return found ? found.id : null;
  }, [games]);

  const getUniqueTreatments = (variations: CardVariation[]): string[] =>
    Array.from(new Set((variations ?? []).map(v => v.treatment)));

  const getUniqueFinishes = (variations: CardVariation[]): string[] =>
    Array.from(new Set((variations ?? []).map(v => v.finish)));

  const toggleCard = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getTreatmentColor = (treatment: string) => {
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

  const getFinishBadge = (finish: string) =>
    finish === 'foil'
      ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border-amber-300'
      : 'bg-slate-100 text-slate-600 border-slate-300';

  // ---------- Data fetchers (via shared api client) ----------
  const fetchGames = useCallback(async () => {
    try {
      const data = await api.get<{ games: Game[] }>('/games');
      setGames(data?.games ?? []);
    } catch (e) {
      console.error('Error fetching games:', e);
      setGames([]);
    }
  }, []);

  const fetchSets = useCallback(async () => {
    if (selectedGame === 'all') {
      setAvailableSets([]);
      return;
    }
    const gameId = getGameIdFromName(selectedGame);
    if (!gameId) {
      setAvailableSets([]);
      return;
    }

    try {
      const sets = await api.get<CardSet[]>(`/sets?game_id=${String(gameId)}`);
      setAvailableSets(sets ?? []); // ✅ actually update state
    } catch (e) {
      console.error('Error fetching sets:', e);
      setAvailableSets([]);
    }
  }, [selectedGame, getGameIdFromName]);

  const fetchCards = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(1000) });
      if (selectedGame !== 'all') {
        const gameId = getGameIdFromName(selectedGame);
        if (gameId) params.append('game_id', String(gameId));
      }
      if (selectedSet !== 'all') params.append('set_name', selectedSet);
      if (filterTreatment !== 'all') params.append('treatment', filterTreatment);
      if (searchTerm) params.append('search', searchTerm);

      const data = await api.get<{ cards: Card[] }>(`/admin/all-cards?${params.toString()}`);
      setCards(data?.cards ?? []);
    } catch (e) {
      console.error('Error fetching cards:', e);
      setCards([]);
      setError(e instanceof Error ? e.message : 'Failed to fetch cards');
    }
  }, [selectedGame, selectedSet, filterTreatment, searchTerm, getGameIdFromName]);

  // ---------- Search (debounced) ----------
  const handleSearchChange = useCallback(
    (value: string) => {
      // Update URL immediately
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        value ? next.set('search', value) : next.delete('search');
        return next;
      });

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (abortController.current) abortController.current.abort();

      if (value.length < 2) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          abortController.current = new AbortController();
          // NOTE: our api client may not accept a RequestInit; avoid typing hacks that break builds
          const data = await api.get<{ suggestions: SearchSuggestion[] }>(
            `/search/autocomplete?q=${encodeURIComponent(value)}`
          );
          setSearchSuggestions(data?.suggestions ?? []);
          setShowSuggestions((data?.suggestions?.length ?? 0) > 0);
          setSelectedSuggestionIndex(-1);
        } catch (err) {
          // swallow AbortError and log others
          if ((err as any)?.name !== 'AbortError') console.error('Autocomplete error:', err);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    },
    [setSearchParams]
  );

  // ---------- Effects ----------
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (abortController.current) abortController.current.abort();
    };
  }, []);

  useEffect(() => {
    fetchGames();
    fetchCards();
  }, [fetchGames, fetchCards]);

  useEffect(() => {
    fetchSets();
    // Reset set filter when game changes
    if (selectedSet !== 'all') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('set', 'all');
        return next;
      });
    }
  }, [selectedGame, fetchSets, selectedSet, setSearchParams]);

  // ---------- Derived ----------
  const filteredCards = useMemo(() => {
    if (!isInventoryMode) return cards;
    return cards.filter(card => card.has_inventory && card.total_stock > 0);
  }, [cards, isInventoryMode]);

  const totalStock = useMemo(
    () => filteredCards.reduce((sum, c) => sum + c.total_stock, 0),
    [filteredCards]
  );
  const totalVariations = useMemo(
    () => filteredCards.reduce((sum, c) => sum + c.variation_count, 0),
    [filteredCards]
  );

  // ---------- Inventory modal actions ----------
  const openAddModal = (card: Card, variation: CardVariation) => {
    setAddModalData({ card, variation });
    setAddFormData({
      quality: 'Near Mint',
      foil_type: variation.finish === 'foil' ? 'Foil' : 'Regular',
      price: '',
      stock_quantity: 1,
      language: 'English',
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddModalData(null);
    setAddFormData({
      quality: 'Near Mint',
      foil_type: 'Regular',
      price: '',
      stock_quantity: 1,
      language: 'English',
    });
  };

  const handleAddToInventory = async () => {
    if (!addModalData) return;
    setSaving(true);
    try {
      await api.post('/admin/inventory', {
        card_id: addModalData.variation.card_id,
        quality: addFormData.quality,
        foil_type: addFormData.foil_type,
        price: parseFloat(addFormData.price) || 0,
        stock_quantity: Number.isFinite(addFormData.stock_quantity)
          ? addFormData.stock_quantity
          : 0,
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
  };

  // ---------- Render ----------
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">Error loading cards</p>
        <p className="text-red-600 text-sm mt-2">{error}</p>
        <button onClick={fetchCards} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          Try Again
        </button>
      </div>
    );
  }

  // (skeleton omitted for brevity)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isInventoryMode ? 'Inventory Management' : 'All Cards Database'}
          </h2>
          <p className="text-slate-600 mt-1">
            {filteredCards.length} cards • {totalVariations} variations
            {isInventoryMode && ` • ${totalStock} in stock`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCards} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              const csv = [
                ['Card Name','Number','Set','Rarity','Treatments','Finishes','Stock','Variations'].join(','),
                ...filteredCards.map(c => [
                  `"${c.name}"`,
                  c.card_number,
                  c.set_name,
                  c.rarity ?? '',
                  getUniqueTreatments(c.variations).join(';'),
                  getUniqueFinishes(c.variations).join(';'),
                  c.total_stock,
                  c.variation_count,
                ].join(',')),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${isInventoryMode ? 'inventory' : 'all-cards'}-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters (search, game, set, treatment) */}
      {/* ... keep your existing JSX; it already compiles with the types above ... */}

      {/* Cards list + modal */}
      {/* ... keep your existing JSX; types are satisfied now ... */}
    </div>
  );
};

export default UnifiedCardsTab;

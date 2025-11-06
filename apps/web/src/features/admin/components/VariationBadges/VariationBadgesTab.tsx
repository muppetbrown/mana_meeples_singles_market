/**
 * VARIATION OVERRIDES MANAGEMENT TAB
 *
 * Allows admins to manage two types of overrides:
 * 1. Treatment Filter Overrides - affect filter dropdowns (treatment only)
 * 2. Variation Badge Overrides - affect card badges (full variation)
 */

import { useState, useEffect } from 'react';
import { Loader2, Settings, Pencil, Check, X, AlertCircle, RefreshCw, Trash2, Plus, Filter, Tag } from 'lucide-react';
import { api, ENDPOINTS } from '@/lib/api';

interface TreatmentOverride {
  id: number;
  treatment: string;
  display_text: string;
  notes: string | null;
  active: boolean;
}

interface VariationCombination {
  treatment: string | null;
  finish: string | null;
  border_color: string | null;
  frame_effect: string | null;
  promo_type: string | null;
  count: number;
  auto_generated_text: string;
  override?: {
    id: number;
    display_text: string;
    notes: string | null;
    active: boolean;
  };
}

export default function VariationBadgesTab() {
  // Treatment Override State
  const [treatmentOverrides, setTreatmentOverrides] = useState<TreatmentOverride[]>([]);
  const [availableTreatments, setAvailableTreatments] = useState<string[]>([]);
  const [editingTreatmentId, setEditingTreatmentId] = useState<number | null>(null);
  const [editTreatmentText, setEditTreatmentText] = useState('');
  const [editTreatmentNotes, setEditTreatmentNotes] = useState('');
  const [addingTreatment, setAddingTreatment] = useState(false);
  const [newTreatment, setNewTreatment] = useState('');
  const [newTreatmentText, setNewTreatmentText] = useState('');
  const [newTreatmentNotes, setNewTreatmentNotes] = useState('');

  // Variation Override State
  const [loading, setLoading] = useState(true);
  const [combinations, setCombinations] = useState<VariationCombination[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [gameFilter, setGameFilter] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    loadTreatmentOverrides();
    loadCombinations();
    loadOrphanedCount();
  }, [gameFilter]);

  // ============================================================================
  // TREATMENT OVERRIDE FUNCTIONS
  // ============================================================================

  const loadTreatmentOverrides = async () => {
    try {
      // Get all treatment-level overrides
      const overrides = await api.get<any[]>(ENDPOINTS.ADMIN.VARIATION_OVERRIDES);
      const treatmentOnly = overrides.filter(o =>
        o.treatment && !o.finish && !o.border_color && !o.frame_effect && !o.promo_type
      );
      setTreatmentOverrides(treatmentOnly);

      // Get all available treatments from cards table
      const url = gameFilter
        ? `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/combinations?game_id=${gameFilter}`
        : `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/combinations`;
      const combos = await api.get<VariationCombination[]>(url);
      const uniqueTreatments = [...new Set(combos.map(c => c.treatment).filter(Boolean))] as string[];
      setAvailableTreatments(uniqueTreatments);
    } catch (error) {
      console.error('Failed to load treatment overrides:', error);
    }
  };

  const startAddingTreatment = () => {
    setAddingTreatment(true);
    setNewTreatment('');
    setNewTreatmentText('');
    setNewTreatmentNotes('');
  };

  const cancelAddingTreatment = () => {
    setAddingTreatment(false);
    setNewTreatment('');
    setNewTreatmentText('');
    setNewTreatmentNotes('');
  };

  const saveTreatmentOverride = async () => {
    try {
      if (!newTreatment || !newTreatmentText) {
        alert('Treatment and display text are required');
        return;
      }

      await api.post(ENDPOINTS.ADMIN.VARIATION_OVERRIDES, {
        game_id: gameFilter,
        treatment: newTreatment,
        finish: null,
        border_color: null,
        frame_effect: null,
        promo_type: null,
        display_text: newTreatmentText,
        notes: newTreatmentNotes || null
      });

      await loadTreatmentOverrides();
      cancelAddingTreatment();
    } catch (error) {
      console.error('Failed to create treatment override:', error);
      alert('Failed to create override. Please try again.');
    }
  };

  const startEditingTreatment = (override: TreatmentOverride) => {
    setEditingTreatmentId(override.id);
    setEditTreatmentText(override.display_text);
    setEditTreatmentNotes(override.notes || '');
  };

  const cancelEditingTreatment = () => {
    setEditingTreatmentId(null);
    setEditTreatmentText('');
    setEditTreatmentNotes('');
  };

  const updateTreatmentOverride = async (id: number) => {
    try {
      await api.put(`${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/${id}`, {
        display_text: editTreatmentText,
        notes: editTreatmentNotes || null
      });

      await loadTreatmentOverrides();
      cancelEditingTreatment();
    } catch (error) {
      console.error('Failed to update treatment override:', error);
      alert('Failed to update override. Please try again.');
    }
  };

  const deleteTreatmentOverride = async (id: number, treatment: string) => {
    if (!confirm(`Are you sure you want to delete the override for "${treatment}"? The filter will revert to auto-generated text.`)) {
      return;
    }

    try {
      await api.delete(`${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/${id}`);
      await loadTreatmentOverrides();
    } catch (error) {
      console.error('Failed to delete treatment override:', error);
      alert('Failed to delete override. Please try again.');
    }
  };

  // ============================================================================
  // VARIATION OVERRIDE FUNCTIONS
  // ============================================================================


  const loadCombinations = async () => {
    try {
      setLoading(true);
      const url = gameFilter
        ? `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/combinations?game_id=${gameFilter}`
        : `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/combinations`;

      console.log('🔄 Loading combinations from:', url);
      const data = await api.get<VariationCombination[]>(url);
      console.log('✅ Received combinations:', data?.length || 0);
      console.log('📊 Sample data:', data?.slice(0, 3));
      setCombinations(data || []);
    } catch (error) {
      console.error('Failed to load variation combinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrphanedCount = async () => {
    try {
      const url = gameFilter
        ? `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/orphaned?game_id=${gameFilter}`
        : `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/orphaned`;

      const data = await api.get<any[]>(url);
      setOrphanedCount(data?.length || 0);
    } catch (error) {
      console.error('Failed to load orphaned count:', error);
      setOrphanedCount(0);
    }
  };

  const cleanupOrphanedOverrides = async () => {
    if (!confirm(`Are you sure you want to delete ${orphanedCount} orphaned override${orphanedCount !== 1 ? 's' : ''}? These are overrides for variations that no longer exist in the cards table.`)) {
      return;
    }

    try {
      setCleaningUp(true);
      const url = gameFilter
        ? `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/orphaned?game_id=${gameFilter}`
        : `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/orphaned`;

      const result = await api.delete<{ success: boolean; message: string; count: number }>(url);

      alert(result.message || `Deleted ${result.count} orphaned overrides`);

      // Reload data
      await loadCombinations();
      await loadOrphanedCount();
    } catch (error) {
      console.error('Failed to cleanup orphaned overrides:', error);
      alert('Failed to cleanup orphaned overrides. Please try again.');
    } finally {
      setCleaningUp(false);
    }
  };

  const getCombinationKey = (combo: VariationCombination): string => {
    return `${combo.treatment}|${combo.finish}|${combo.border_color}|${combo.frame_effect}|${combo.promo_type}`;
  };

  const startEditing = (combo: VariationCombination) => {
    const key = getCombinationKey(combo);
    setEditingId(key);
    setEditText(combo.override?.display_text || combo.auto_generated_text);
    setEditNotes(combo.override?.notes || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
    setEditNotes('');
  };

  const saveOverride = async (combo: VariationCombination) => {
    try {
      if (combo.override) {
        // Update existing override
        await api.put(`${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/${combo.override.id}`, {
          display_text: editText,
          notes: editNotes || null
        });
      } else {
        // Create new override
        await api.post(ENDPOINTS.ADMIN.VARIATION_OVERRIDES, {
          game_id: gameFilter,
          treatment: combo.treatment,
          finish: combo.finish,
          border_color: combo.border_color,
          frame_effect: combo.frame_effect,
          promo_type: combo.promo_type,
          display_text: editText,
          notes: editNotes || null
        });
      }

      await loadCombinations();
      cancelEditing();
    } catch (error) {
      console.error('Failed to save override:', error);
      alert('Failed to save override. Please try again.');
    }
  };

  const deleteOverride = async (overrideId: number) => {
    if (!confirm('Are you sure you want to delete this override? The badge will revert to auto-generated text.')) {
      return;
    }

    try {
      await api.delete(`${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/${overrideId}`);
      await loadCombinations();
    } catch (error) {
      console.error('Failed to delete override:', error);
      alert('Failed to delete override. Please try again.');
    }
  };

  const filteredCombinations = combinations.filter(combo => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      combo.auto_generated_text.toLowerCase().includes(searchLower) ||
      combo.override?.display_text.toLowerCase().includes(searchLower) ||
      combo.treatment?.toLowerCase().includes(searchLower) ||
      combo.finish?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Loading variation combinations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Variation Overrides
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage how variations appear in filters and on cards
          </p>
        </div>
        <div className="flex items-center gap-2">
          {orphanedCount > 0 && (
            <button
              onClick={cleanupOrphanedOverrides}
              disabled={cleaningUp}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Delete orphaned overrides"
            >
              <Trash2 className="w-4 h-4" />
              Clean Up ({orphanedCount})
            </button>
          )}
          <button
            onClick={() => {
              loadTreatmentOverrides();
              loadCombinations();
              loadOrphanedCount();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh all data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Orphaned Overrides Warning */}
      {orphanedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-900">Orphaned Overrides Found</h3>
              <p className="text-sm text-amber-800 mt-1">
                {orphanedCount} override{orphanedCount !== 1 ? 's' : ''} exist for variations that no longer appear in the cards table.
                These overrides won't be used and can be safely removed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          SECTION 1: TREATMENT FILTER OVERRIDES
          ======================================================================== */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Treatment Filter Overrides
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Control how treatments appear in filter dropdowns (e.g., change "Borderless Inverted" to "Borderless")
            </p>
          </div>
          {!addingTreatment && (
            <button
              onClick={startAddingTreatment}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Override
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Treatment Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Display As
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {/* Add New Treatment Row */}
              {addingTreatment && (
                <tr className="bg-green-50">
                  <td className="px-6 py-4">
                    <select
                      value={newTreatment}
                      onChange={(e) => setNewTreatment(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select treatment...</option>
                      {availableTreatments
                        .filter(t => !treatmentOverrides.find(o => o.treatment === t))
                        .map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))
                      }
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={newTreatmentText}
                      onChange={(e) => setNewTreatmentText(e.target.value)}
                      placeholder="Display text..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={newTreatmentNotes}
                      onChange={(e) => setNewTreatmentNotes(e.target.value)}
                      placeholder="Notes (optional)..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveTreatmentOverride}
                        className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelAddingTreatment}
                        className="text-slate-600 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Existing Treatment Overrides */}
              {treatmentOverrides.length === 0 && !addingTreatment && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Filter className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <div className="text-lg font-medium">No treatment overrides</div>
                    <div className="text-sm">Click "Add Override" to customize filter dropdown text</div>
                  </td>
                </tr>
              )}
              {treatmentOverrides.map((override) => {
                const isEditing = editingTreatmentId === override.id;
                return (
                  <tr key={override.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">
                      {override.treatment}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTreatmentText}
                          onChange={(e) => setEditTreatmentText(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <span className="text-sm font-medium text-blue-900">
                          {override.display_text}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTreatmentNotes}
                          onChange={(e) => setEditTreatmentNotes(e.target.value)}
                          placeholder="Notes (optional)..."
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <span className="text-sm text-slate-600">
                          {override.notes || <span className="text-slate-400 italic">—</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateTreatmentOverride(override.id)}
                            className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditingTreatment}
                            className="text-slate-600 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditingTreatment(override)}
                            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTreatmentOverride(override.id, override.treatment)}
                            className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================
          SECTION 2: VARIATION BADGE OVERRIDES
          ======================================================================== */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Variation Badge Overrides
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Control how specific variation combinations appear on card badges
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search variations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600">Total Variations</div>
            <div className="text-2xl font-semibold text-slate-900">{combinations.length}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600">Overridden</div>
            <div className="text-2xl font-semibold text-blue-900">
              {combinations.filter(c => c.override).length}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600">Using Auto-Generated</div>
            <div className="text-2xl font-semibold text-slate-900">
              {combinations.filter(c => !c.override).length}
            </div>
          </div>
        </div>
      </div>

      {/* Combinations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Treatment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Finish
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Border
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Frame
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Promo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Auto-Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Display Text
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredCombinations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <div className="text-lg font-medium">No variations found</div>
                    <div className="text-sm">Try adjusting your search or filters</div>
                  </td>
                </tr>
              ) : (
                filteredCombinations.map((combo) => {
                  const key = getCombinationKey(combo);
                  const isEditing = editingId === key;

                  return (
                    <tr key={key} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {combo.treatment || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {combo.finish || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {combo.border_color || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {combo.frame_effect || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {combo.promo_type || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {combo.count} cards
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {combo.auto_generated_text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Custom display text..."
                            />
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Notes (optional)..."
                            />
                          </div>
                        ) : combo.override ? (
                          <div>
                            <span className="text-sm font-medium text-blue-900 bg-blue-50 px-2 py-1 rounded">
                              {combo.override.display_text}
                            </span>
                            {combo.override.notes && (
                              <div className="text-xs text-slate-500 mt-1">{combo.override.notes}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Using auto-generated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveOverride(combo)}
                              className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-slate-600 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => startEditing(combo)}
                              className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {combo.override && (
                              <button
                                onClick={() => deleteOverride(combo.override!.id)}
                                className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                title="Delete override"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-2">Understanding the Two Types of Overrides</h3>

            <div className="mb-3">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Treatment Filter Overrides:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Affect how treatments appear in filter dropdowns site-wide</li>
                <li>• Example: Change "BORDERLESS_INVERTED" to "Borderless" in filters</li>
                <li>• Select a treatment from dropdown and set custom display text</li>
                <li>• Only one override per treatment</li>
              </ul>
            </div>

            <div className="mb-3">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Variation Badge Overrides:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Affect how specific variation combinations appear on card badges</li>
                <li>• Example: "BORDERLESS_INVERTED + foil" could show as "Borderless Foil"</li>
                <li>• Edit any variation to customize its badge text</li>
                <li>• Each unique combination (treatment/finish/border/frame/promo) can have its own override</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Actions:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click "Refresh" to reload all data from the database</li>
                <li>• Click "Clean Up" to remove orphaned overrides (overrides for variations that no longer exist)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

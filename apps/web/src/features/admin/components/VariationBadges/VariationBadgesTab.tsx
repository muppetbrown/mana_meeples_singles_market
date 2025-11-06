/**
 * VARIATION BADGES MANAGEMENT TAB
 *
 * Allows admins to view and override auto-generated variation badge text
 */

import { useState, useEffect } from 'react';
import { Loader2, Settings, Pencil, Check, X, AlertCircle } from 'lucide-react';
import { api, ENDPOINTS } from '@/lib/api';

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
  const [loading, setLoading] = useState(true);
  const [combinations, setCombinations] = useState<VariationCombination[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [gameFilter, setGameFilter] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCombinations();
  }, [gameFilter]);

  const loadCombinations = async () => {
    try {
      setLoading(true);
      const url = gameFilter
        ? `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/combinations?game_id=${gameFilter}`
        : `${ENDPOINTS.ADMIN.VARIATION_OVERRIDES}/combinations`;

      const data = await api.get<VariationCombination[]>(url);
      setCombinations(data || []);
    } catch (error) {
      console.error('Failed to load variation combinations:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Variation Badge Management
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Customize how variation badges are displayed throughout the system
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
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
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
            <h3 className="text-sm font-medium text-blue-900 mb-1">How it works</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Variations are auto-generated from card data (treatment, finish, border)</li>
              <li>• Click the edit icon to create a custom override for any variation</li>
              <li>• Overrides apply system-wide to all matching cards</li>
              <li>• Delete an override to revert back to auto-generated text</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

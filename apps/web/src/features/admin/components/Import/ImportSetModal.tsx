/**
 * ImportSetModal Component
 *
 * Modal for importing card sets from external sources (Scryfall, etc.)
 * Future-proofed to support multiple games (MTG, Pokemon, One Piece, etc.)
 */

import React, { useState, useEffect } from 'react';
import { X, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api, ENDPOINTS } from '@/lib/api';

interface Game {
  code: string;
  name: string;
  supported: boolean;
  hint?: string;
}

interface ImportSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ImportSetModal: React.FC<ImportSetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [setCode, setSetCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    imported: number;
    updated: number;
    skipped: number;
  } | null>(null);

  // Load supported games when modal opens
  useEffect(() => {
    if (isOpen) {
      loadGames();
    }
  }, [isOpen]);

  const loadGames = async () => {
    try {
      const response = await api.get<{ games: Game[] }>(ENDPOINTS.ADMIN.IMPORT_GAMES);
      setGames(response.games || []);

      // Auto-select first supported game
      const firstSupported = response.games?.find(g => g.supported);
      if (firstSupported) {
        setSelectedGame(firstSupported.code);
      }
    } catch (err) {
      console.error('Failed to load games:', err);
      setError('Failed to load available games');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGame || !setCode.trim()) {
      setError('Please select a game and enter a set code');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{
        success: boolean;
        setId: number;
        stats: {
          imported: number;
          updated: number;
          variations: number;
          skipped: number;
        };
      }>(ENDPOINTS.ADMIN.IMPORT_SET, {
        game: selectedGame,
        setCode: setCode.trim(),
      });

      if (response.success) {
        setSuccess({
          imported: response.stats.imported,
          updated: response.stats.updated,
          skipped: response.stats.skipped,
        });

        // Call success callback after a short delay to show the success message
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import set';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedGame('');
      setSetCode('');
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  const selectedGameInfo = games.find(g => g.code === selectedGame);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Import Card Set</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Game Selection */}
          <div>
            <label htmlFor="game" className="block text-sm font-medium text-slate-700 mb-2">
              Card Game
            </label>
            <select
              id="game"
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">Select a game...</option>
              {games.map((game) => (
                <option
                  key={game.code}
                  value={game.code}
                  disabled={!game.supported}
                >
                  {game.name} {!game.supported && '(Coming Soon)'}
                </option>
              ))}
            </select>
          </div>

          {/* Set Code Input */}
          <div>
            <label htmlFor="setCode" className="block text-sm font-medium text-slate-700 mb-2">
              Set Code
            </label>
            <input
              id="setCode"
              type="text"
              value={setCode}
              onChange={(e) => setSetCode(e.target.value.toUpperCase())}
              disabled={loading}
              placeholder="e.g., BLB, FDN, DSK"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed uppercase"
              required
              maxLength={20}
            />
            {selectedGameInfo?.hint && (
              <p className="mt-2 text-sm text-slate-600">
                {selectedGameInfo.hint}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Import Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Import Successful!</p>
                <p className="text-sm text-green-700 mt-1">
                  Imported: {success.imported} | Updated: {success.updated} | Skipped: {success.skipped}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedGame || !setCode.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Import Set
                </>
              )}
            </button>
          </div>
        </form>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">Importing cards...</p>
              <p className="text-xs text-slate-600 mt-1">This may take a few moments</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportSetModal;

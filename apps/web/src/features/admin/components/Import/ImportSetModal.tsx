/**
 * ImportSetModal Component
 *
 * Modal for importing card sets from external sources (Scryfall, etc.)
 * Future-proofed to support multiple games (MTG, Pokemon, One Piece, etc.)
 *
 * Features real-time progress tracking via Server-Sent Events (SSE)
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api, ENDPOINTS } from '@/lib/api';

interface Game {
  code: string;
  name: string;
  supported: boolean;
  hint?: string;
}

interface ImportProgress {
  stage: 'fetching' | 'processing' | 'analyzing' | 'complete' | 'error';
  message: string;
  currentCard?: number;
  totalCards?: number;
  imported?: number;
  updated?: number;
  skipped?: number;
  percentage?: number;
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
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

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

  // Cleanup SSE connection on unmount or modal close
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const connectToProgressStream = (jobId: string) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new SSE connection
    const eventSource = new EventSource(ENDPOINTS.ADMIN.IMPORT_PROGRESS(jobId));
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update progress
        if (data.progress) {
          setProgress(data.progress);
        }

        // Handle completion
        if (data.status === 'completed' && data.result) {
          setSuccess({
            imported: data.result.imported,
            updated: data.result.updated,
            skipped: data.result.skipped,
          });
          setLoading(false);

          // Call success callback after a short delay
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            }
          }, 2000);

          // Close SSE connection
          eventSource.close();
        }

        // Handle errors
        if (data.status === 'failed') {
          setError(data.error || 'Import failed');
          setLoading(false);
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      eventSource.close();

      // Only show error if we haven't already completed/failed
      if (loading && !success && !error) {
        setError('Lost connection to import progress. The import may still be running.');
        setLoading(false);
      }
    };
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
    setProgress(null);

    try {
      // Start the import and get job ID
      const response = await api.post<{
        success: boolean;
        jobId: string;
      }>(ENDPOINTS.ADMIN.IMPORT_SET, {
        game: selectedGame,
        setCode: setCode.trim(),
      });

      if (response.success && response.jobId) {
        // Connect to progress stream
        connectToProgressStream(response.jobId);
      } else {
        throw new Error('Failed to start import job');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import set';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setSelectedGame('');
      setSetCode('');
      setError(null);
      setSuccess(null);
      setProgress(null);
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

        {/* Loading Overlay with Progress */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center rounded-lg">
            <div className="w-full max-w-sm px-8">
              <div className="text-center mb-6">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">
                  {progress?.message || 'Importing cards...'}
                </p>
                {progress?.currentCard && progress?.totalCards && (
                  <p className="text-xs text-slate-600 mt-1">
                    Processing card {progress.currentCard} of {progress.totalCards}
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress?.percentage || 0}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span className="capitalize">{progress?.stage || 'Starting...'}</span>
                  <span>{progress?.percentage || 0}%</span>
                </div>
                {progress && (progress.imported !== undefined || progress.updated !== undefined || progress.skipped !== undefined) && (
                  <div className="text-xs text-slate-600 text-center pt-2">
                    {progress.imported !== undefined && `Imported: ${progress.imported}`}
                    {progress.updated !== undefined && ` | Updated: ${progress.updated}`}
                    {progress.skipped !== undefined && ` | Skipped: ${progress.skipped}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportSetModal;

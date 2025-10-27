// apps/web/src/components/KeyboardShortcutsModal.tsx
import { X, Keyboard } from 'lucide-react';

/**
 * Keyboard Shortcuts Help Modal Component
 * Displays available keyboard shortcuts for improved accessibility and power user experience
 */
interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal = ({
  isOpen,
  onClose
}: KeyboardShortcutsProps) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation',
      shortcuts: [
        { key: 'Tab', description: 'Navigate through interactive elements' },
        { key: 'Shift + Tab', description: 'Navigate backwards through elements' },
        { key: 'Enter', description: 'Activate buttons and links' },
        { key: 'Space', description: 'Activate buttons and checkboxes' },
        { key: 'Esc', description: 'Close modals and dropdowns' }
      ]
    },
    {
      category: 'Search',
      shortcuts: [
        { key: '/', description: 'Focus search input' },
        { key: '↑ ↓', description: 'Navigate search suggestions' },
        { key: 'Enter', description: 'Select highlighted suggestion' },
        { key: 'Esc', description: 'Close search suggestions' }
      ]
    },
    {
      category: 'Filters',
      shortcuts: [
        { key: 'f', description: 'Toggle mobile filters panel' },
        { key: 'g', description: 'Switch between grid and list view' },
        { key: 'c', description: 'Open shopping cart' },
        { key: 'r', description: 'Reset all filters' }
      ]
    },
    {
      category: 'Cart',
      shortcuts: [
        { key: 'a', description: 'Add focused item to cart' },
        { key: '+', description: 'Increase item quantity' },
        { key: '-', description: 'Decrease item quantity' },
        { key: 'Delete', description: 'Remove item from cart' }
      ]
    },
    {
      category: 'General',
      shortcuts: [
        { key: '?', description: 'Show this help dialog' },
        { key: 'Ctrl + K', description: 'Quick search (command palette)' },
        { key: 'Alt + C', description: 'Change currency' }
      ]
    }
  ];

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-labelledby="shortcuts-title"
      aria-describedby="shortcuts-description"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Keyboard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-xl font-bold text-slate-900">
                Keyboard Shortcuts
              </h2>
              <p id="shortcuts-description" className="text-sm text-slate-600">
                Use these shortcuts to navigate more efficiently
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            aria-label="Close keyboard shortcuts help"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {shortcuts.map(({ category, shortcuts: categoryShortcuts }) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map(({ key, description }) => (
                  <div
                    key={`${category}-${key}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
                  >
                    <span className="text-slate-700">{description}</span>
                    <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono bg-slate-100 border border-slate-300 rounded-md text-slate-800 min-w-[2.5rem] justify-center">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div>
              <strong className="text-slate-900">Tip:</strong> Press{' '}
              <kbd className="px-1.5 py-0.5 text-xs bg-slate-200 border border-slate-300 rounded font-mono">
                ?
              </kbd>{' '}
              anytime to open this help dialog
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
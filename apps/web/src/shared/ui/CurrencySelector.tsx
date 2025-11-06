// apps/web/src/components/CurrencySelector.tsx
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Info, InfoIcon, RefreshCw } from 'lucide-react';
import type { Currency } from '@/types';
import { useCurrency } from '@/features/hooks/useCurrency';
import { FEATURES } from '@/lib/constants';

interface CurrencySelectorCurrency extends Currency {
  flag?: string;
  lastUpdated?: string;
}

interface CurrencySelectorProps {
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  className?: string;
}

// Currency flags mapping
const CURRENCY_FLAGS: Record<string, string> = {
  NZD: '🇳🇿',
  USD: '🇺🇸',
  AUD: '🇦🇺',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
};

const CurrencySelector = ({
  currency,
  onCurrencyChange,
  className = ""
}: CurrencySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Use the currency hook to get live exchange rates
  const { currencies: liveCurrencies, isLoading, lastUpdated } = useCurrency(currency.code);

  // Convert live currencies to selector format with flags
  const currencies: CurrencySelectorCurrency[] = liveCurrencies.map(curr => ({
    code: curr.code,
    symbol: curr.symbol,
    label: `${curr.name} (${curr.code})`,
    rate: curr.rate,
    flag: CURRENCY_FLAGS[curr.code] || '💱',
  }));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (dropdownRef.current && target && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencySelect = (selectedCurrency: CurrencySelectorCurrency) => {
    if (onCurrencyChange) {
      // Convert to standard Currency format by omitting the extra fields
      const { flag, lastUpdated, ...currency } = selectedCurrency;
      onCurrencyChange(currency);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      default:
        // No action for other keys
        break;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="bg-mm-forest hover:bg-mm-darkForest text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors focus:ring-2 focus:ring-mm-forest focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Current currency: ${currency.code}. Click to change currency`}
      >
        {/* Flag Icon */}
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-sm">
          {currencies.find(c => c.code === currency.code)?.flag || '💱'}
        </div>

        {/* Currency Code */}
        <span className="font-medium">{currency.code}</span>

        {/* Approximate indicator for non-NZD currencies */}
        {currency.code !== 'NZD' && (
          <InfoIcon
            className="w-3 h-3 text-yellow-400"
            aria-label="Exchange rates are approximate and may not reflect current market values"
          />
        )}
        <span className="sr-only">Exchange rates are approximate</span>

        {/* Chevron */}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-mm-warmAccent py-1 min-w-[120px] z-50"
          role="menu"
          aria-orientation="vertical"
        >
          {currencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => handleCurrencySelect(curr)}
              className={`flex items-center gap-3 px-4 py-2 hover:bg-mm-tealLight cursor-pointer transition-colors text-mm-darkForest font-medium w-full text-left ${
                currency.code === curr.code ? 'bg-mm-tealLight hover:bg-mm-tealLight' : ''
              }`}
              role="menuitem"
            >
              {/* Flag Icon */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-lg">
                {curr.flag}
              </div>

              {/* Currency Code */}
              <span>{curr.code}</span>
            </button>
          ))}

          {/* Disclaimer and status */}
          <div className="border-t border-mm-warmAccent mt-1 pt-2 px-4 pb-2">
            {isLoading ? (
              <p className="text-xs text-mm-teal flex items-center gap-1">
                <RefreshCw className="w-3 h-3 flex-shrink-0 animate-spin" aria-hidden="true" />
                <span>Updating rates...</span>
              </p>
            ) : FEATURES.AUTO_CURRENCY_UPDATE && lastUpdated ? (
              <p className="text-xs text-mm-teal flex items-center gap-1">
                <Info className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                <span>
                  Live rates updated {new Date(lastUpdated).toLocaleDateString()}
                </span>
              </p>
            ) : (
              <p className="text-xs text-mm-teal flex items-center gap-1">
                <Info className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                <span>Exchange rates are approximate</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
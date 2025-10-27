// apps/web/src/components/CurrencySelector.tsx
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Info, InfoIcon } from 'lucide-react';

interface Currency {
  code: string;
  symbol: string;
  label: string;
  rate: number;
  flag?: string;
  lastUpdated?: string;
}

interface CurrencySelectorProps {
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  className?: string;
}

const CurrencySelector = ({
  currency,
  onCurrencyChange,
  className = ""
}: CurrencySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currencies = [
    {
      code: 'NZD',
      symbol: 'NZ$',
      label: 'New Zealand Dollar (NZD)',
      rate: 1.0,
      flag: '🇳🇿',
      lastUpdated: '2024-01-01' // Static date to indicate these are approximate
    },
    {
      code: 'USD',
      symbol: '$',
      label: 'US Dollar (USD)',
      rate: 0.625,
      flag: '🇺🇸',
      lastUpdated: '2024-01-01' // Static date to indicate these are approximate
    }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {

      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencySelect = (selectedCurrency: Currency) => {
    if (onCurrencyChange) {
      onCurrencyChange(selectedCurrency);
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

          {/* Disclaimer for approximate rates */}
          <div className="border-t border-mm-warmAccent mt-1 pt-2 px-4 pb-2">
            <p className="text-xs text-mm-teal flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span>Exchange rates are approximate (Jan 2024)</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
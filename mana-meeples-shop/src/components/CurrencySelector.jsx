import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CurrencySelector = ({ currency, onCurrencyChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currencies = [
    {
      code: 'USD',
      symbol: '$',
      label: 'US Dollar (USD)',
      rate: 1.0,
      flag: '🇺🇸'
    },
    {
      code: 'NZD',
      symbol: 'NZ$',
      label: 'New Zealand Dollar (NZD)',
      rate: 1.6,
      flag: '🇳🇿'
    }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencySelect = (selectedCurrency) => {
    if (onCurrencyChange) {
      onCurrencyChange(selectedCurrency);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
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
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

        {/* Chevron */}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[120px] z-50"
          role="menu"
          aria-orientation="vertical"
        >
          {currencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => handleCurrencySelect(curr)}
              className={`flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors text-slate-900 font-medium w-full text-left ${
                currency.code === curr.code ? 'bg-blue-50 hover:bg-blue-100' : ''
              }`}
              role="menuitem"
              aria-checked={currency.code === curr.code}
            >
              {/* Flag Icon */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-lg">
                {curr.flag}
              </div>

              {/* Currency Code */}
              <span>{curr.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
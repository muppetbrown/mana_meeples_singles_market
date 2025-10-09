import React from 'react';
import { ChevronDown } from 'lucide-react';

const CurrencySelector = ({ currency, onCurrencyChange, className = "" }) => {
  const currencies = [
    { code: 'USD', symbol: '$', label: 'US Dollar (USD)', rate: 1.0 },
    { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar (NZD)', rate: 1.6 }
  ];

  const handleCurrencyChange = (event) => {
    const selectedCurrency = currencies.find(c => c.code === event.target.value);
    if (selectedCurrency && onCurrencyChange) {
      onCurrencyChange(selectedCurrency);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label htmlFor="currency-selector" className="sr-only">
        Select Currency
      </label>
      <div className="relative">
        <select
          id="currency-selector"
          value={currency.code}
          onChange={handleCurrencyChange}
          className="appearance-none bg-white border-2 border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-colors cursor-pointer"
          aria-label={`Current currency: ${currency.code}. Select different currency`}
        >
          {currencies.map(curr => (
            <option key={curr.code} value={curr.code}>
              {curr.symbol} {curr.code}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      </div>

      {currency.code !== 'USD' && (
        <div className="absolute top-full left-0 mt-1 text-xs text-slate-500 whitespace-nowrap bg-white px-2 py-1 rounded shadow-sm border border-slate-200 z-10">
          Rate: 1 USD = {currency.rate} {currency.code}
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
import React from 'react';
import { Filter, ChevronDown } from 'lucide-react';

interface MobileFilterButtonProps {
  showMobileFilters: boolean;
  setShowMobileFilters: (show: boolean) => void;
}

export const MobileFilterButton: React.FC<MobileFilterButtonProps> = ({
  showMobileFilters,
  setShowMobileFilters
}) => {
  return (
    <div className="lg:hidden mb-4">
      <button
        onClick={() => setShowMobileFilters(true)}
        className="w-full flex items-center justify-between gap-3 bg-white border-2 border-mm-forest rounded-mm-md px-4 py-2.5 font-semibold transition-colors duration-300 hover:bg-mm-tealLight focus:bg-mm-tealLight shadow-sm"
        aria-label="Open filters and search panel"
        aria-expanded={showMobileFilters}
      >
        <Filter className="w-5 h-5 text-mm-teal flex-shrink-0" />
        <span className="font-medium text-mm-forest flex-1 text-left">Filters & Search</span>
        <ChevronDown className="w-4 h-4 text-mm-teal flex-shrink-0" />
      </button>
    </div>
  );
};

export default MobileFilterButton;
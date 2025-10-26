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
        className="btn-mm-secondary w-full"
        aria-label="Open filters and search panel"
        aria-expanded={showMobileFilters}
      >
        <Filter className="w-5 h-5 text-mm-teal" />
        <span className="font-medium text-mm-forest">Filters & Search</span>
        <ChevronDown className="w-4 h-4 text-mm-teal ml-auto" />
      </button>
    </div>
  );
};

export default MobileFilterButton;
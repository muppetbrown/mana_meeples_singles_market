import React from 'react';
import PropTypes from 'prop-types';
import { LayoutGrid } from 'lucide-react';

/**
 * Section Header Component
 * Displays section title with optional count and grid indicator
 * @param {string} title - The section title
 * @param {number} count - Number of items in the section
 * @param {boolean} isGrid - Whether this is for a grid layout
 */
const SectionHeader = ({ title, count, isGrid = false }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {isGrid && <LayoutGrid className="w-5 h-5 text-slate-600" />}
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {count !== undefined && (
          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-full">
            {count} {count === 1 ? 'card' : 'cards'}
          </span>
        )}
      </div>
    </div>
  );
};

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number,
  isGrid: PropTypes.bool,
};

SectionHeader.defaultProps = {
  isGrid: false,
};

export default SectionHeader;
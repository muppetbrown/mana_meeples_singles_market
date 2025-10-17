import React from 'react';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'prop... Remove this comment to see the full error message
import PropTypes from 'prop-types';
import { LayoutGrid } from 'lucide-react';

/**
 * Section Header Component
 * Displays section title with optional count and grid indicator
 * @param {string} title - The section title
 * @param {number} count - Number of items in the section
 * @param {boolean} isGrid - Whether this is for a grid layout
 */
const SectionHeader = ({
  title,
  count,
  isGrid = false
}: any) => {
  return (
    <div className="section-mm-gradient mb-6">
      <div className="flex items-center gap-3">
        {isGrid && <LayoutGrid className="w-5 h-5 text-mm-teal" />}
        <h2 className="text-xl font-bold text-mm-forest">{title}</h2>
        {count !== undefined && (
          <span className="px-3 py-1 bg-mm-tealLight text-mm-teal text-sm font-medium rounded-full">
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
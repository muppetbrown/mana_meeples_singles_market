// apps/web/src/components/common/SectionHeader.tsx
import React from 'react';
import { LayoutGrid } from 'lucide-react';

type Props = {
  title: string;
  count?: number;
  isGrid?: boolean;
  className?: string;
};

const SectionHeader: React.FC<Props> = ({ title, count, isGrid = false, className }) => {
  return (
    <div className={`section-mm-gradient mb-6 ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        {isGrid && <LayoutGrid className="w-5 h-5 text-mm-teal" aria-hidden="true" />}
        <h2 className="text-xl font-bold text-mm-forest">{title}</h2>
        {typeof count === 'number' && (
          <span className="px-3 py-1 bg-mm-tealLight text-mm-teal text-sm font-medium rounded-full" aria-live="polite">
            {count} {count === 1 ? 'card' : 'cards'}
          </span>
        )}
      </div>
    </div>
  );
};

export default SectionHeader;

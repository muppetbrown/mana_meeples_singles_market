interface ActiveFiltersProps {
  filters: SearchFilters;
  onClearFilter: (key: string, value: string) => void;
  onClearAll: () => void;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = (props) => {
  // Extract active filters badges from ShopPage
};
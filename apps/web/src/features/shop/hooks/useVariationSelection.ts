export function useVariationSelection(cards: StorefrontCard[]) {
  const [selections, setSelections] = useState<Record<number, string>>({});

  const selectVariation = useCallback((cardId: number, varKey: string) => {
    setSelections(prev => ({ ...prev, [cardId]: varKey }));
  }, []);

  const getSelected = useCallback((cardId: number) => {
    return selections[cardId];
  }, [selections]);

  // Clear selections for cards that no longer exist
  useEffect(() => {
    const currentIds = new Set(cards.map(c => c.id));
    setSelections(prev => {
      const filtered: Record<number, string> = {};
      Object.entries(prev).forEach(([id, key]) => {
        if (currentIds.has(Number(id))) {
          filtered[Number(id)] = key;
        }
      });
      return filtered;
    });
  }, [cards]);

  return { selections, selectVariation, getSelected };
}
export function useCardFetching(
  filters: SearchFilters,
  games: Game[],
  sets: Set[]
) {
  const [cards, setCards] = useState<StorefrontCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract fetch logic from ShopPage
    const fetchCards = async () => {
      setLoading(true);
      try {
        // ... fetch implementation
        setCards(fetchedCards);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (games.length > 0) {
      fetchCards();
    }
  }, [filters, games, sets]);

  return { cards, loading, error };
}
interface ShopHeaderProps {
  cart: Cart;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onCartClick: () => void;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({
  cart,
  currency,
  onCurrencyChange,
  onCartClick
}) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      {/* Header content - extract from ShopPage */}
    </header>
  );
};
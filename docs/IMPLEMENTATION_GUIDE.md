# TCG Singles Platform - Complete Implementation Guide

## 📋 Phase 1: Foundation Setup (Week 1)

### Day 1-2: Environment & Database
- [ ] Set up PostgreSQL database
- [ ] Create `.env` file with all required variables
- [ ] Run database migrations (schema from backend artifact)
- [ ] Set up database backup strategy
- [ ] Configure database connection pooling
- [ ] Add database indexes for performance

```bash
# Quick start commands
createdb tcg_singles
psql tcg_singles < database/schema.sql
npm install
npm run migrate
```

### Day 3-4: Backend API
- [ ] Set up Express.js server
- [ ] Implement all REST endpoints
- [ ] Add authentication middleware (JWT recommended)
- [ ] Set up CORS properly
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Set up error logging (Sentry recommended)

### Day 5-7: Frontend Integration
- [ ] Build React components from artifacts
- [ ] Connect frontend to backend API
- [ ] Implement cart persistence (use React state, NOT localStorage)
- [ ] Add loading states and error handling
- [ ] Test responsive design on multiple devices
- [ ] Run accessibility audit

---

## 📊 Phase 2: Data Population (Week 2)

### Initial Data Import Strategy

#### Option A: Bulk CSV Import (Fastest)
```bash
# Prepare your CSV with columns:
# name,number,set_code,game_code,rarity,quality,price,stock,cost

node scripts/bulk-import.js inventory.csv
```

#### Option B: API Integration (Most Automated)
```javascript
// For Magic: The Gathering
await PriceService.syncMTGCardsFromScryfall('BLB'); // Bloomburrow
await PriceService.syncMTGCardsFromScryfall('MH3'); // Modern Horizons 3

// For Pokemon
await PriceService.syncPokemonCards('sv3'); // Obsidian Flames

// Then update prices
await PriceService.updatePricesFromTCGPlayer(cardIds);
```

#### Option C: Manual Entry (Best for Small Inventory)
Use the admin dashboard to add cards one by one.

### Data Quality Checklist
- [ ] All card images loading correctly
- [ ] Prices match current market values
- [ ] Stock counts accurate
- [ ] SKUs unique and consistent
- [ ] Set codes standardized
- [ ] Quality grades consistent

---

## 🎨 Phase 3: Customization (Week 3)

### Branding Your Shop

#### 1. Update Theme Colors
```javascript
// In your main component
const theme = {
  primary: '#YOUR_BRAND_COLOR',
  secondary: '#YOUR_SECONDARY_COLOR',
  // ... other colors
};
```

#### 2. Add Your Logo
```jsx
// In header section
<img src="/your-logo.png" alt="Your Store Name" className="h-8" />
```

#### 3. Custom Domain Setup
```nginx
# nginx configuration
server {
  listen 80;
  server_name your-domain.com;
  
  location /api {
    proxy_pass http://localhost:3000;
  }
  
  location / {
    root /var/www/tcg-shop;
    try_files $uri $uri/ /index.html;
  }
}
```

### Embedding on Your Website

#### For WordPress:
```php
// Use the shortcode from the embed guide
[tcg_shop game="all" theme="light"]
```

#### For Static Sites:
```html
<script src="https://your-domain.com/embed.js"></script>
<div id="tcg-shop"></div>
```

#### For Shopify:
1. Create a new page
2. Switch to HTML mode
3. Paste embed iframe code
4. Save and publish

---

## 💳 Phase 4: Payment Integration (Week 4)

### Stripe Setup Steps

1. **Create Stripe Account**
   - Sign up at stripe.com
   - Verify your business
   - Get API keys

2. **Add Stripe Keys to .env**
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. **Set Up Webhook**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhook/stripe`
   - Select events: `checkout.session.completed`
   - Copy webhook secret to `.env`

4. **Test Payment Flow**
   - Use test cards: 4242 4242 4242 4242
   - Verify order creation
   - Check inventory updates
   - Test email confirmations

### Alternative: PayPal Integration
```javascript
// Add PayPal SDK
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"></script>

// Render PayPal button
paypal.Buttons({
  createOrder: (data, actions) => {
    return fetch('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({ items: cartItems })
    }).then(res => res.json())
      .then(order => order.id);
  },
  onApprove: (data, actions) => {
    return actions.order.capture().then(details => {
      // Order completed
    });
  }
}).render('#paypal-button-container');
```

---

## 🔄 Phase 5: Automation (Ongoing)

### Automated Price Updates

#### Daily Price Sync (Cron Job)
```javascript
// Add to your cron jobs
const cron = require('node-cron');

// Every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Starting daily price update...');
  
  const items = await db.query(`
    SELECT DISTINCT tcgplayer_id 
    FROM card_inventory 
    WHERE price_source = 'api_tcgplayer'
  `);
  
  await PriceService.updatePricesFromTCGPlayer(
    items.rows.map(r => r.tcgplayer_id)
  );
  
  console.log('Price update completed');
});
```

### Low Stock Alerts
```javascript
// Email admin when stock is low
cron.schedule('0 9 * * *', async () => {
  const lowStock = await db.query(`
    SELECT card_name, stock_quantity, low_stock_threshold
    FROM card_inventory
    WHERE stock_quantity <= low_stock_threshold
  `);
  
  if (lowStock.rows.length > 0) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'Low Stock Alert',
      body: `You have ${lowStock.rows.length} items low in stock`
    });
  }
});
```

### Weekly Sales Report
```javascript
// Every Monday at 9 AM
cron.schedule('0 9 * * 1', async () => {
  const weeklyStats = await db.query(`
    SELECT 
      COUNT(*) as orders,
      SUM(total) as revenue
    FROM orders
    WHERE created_at > NOW() - INTERVAL '7 days'
    AND status = 'completed'
  `);
  
  await sendWeeklyReport(weeklyStats.rows[0]);
});
```

---

## 📈 Scaling to New Games

### Adding a New TCG Game (Step-by-Step)

#### 1. Add Game to Database
```sql
INSERT INTO games (name, code, active)
VALUES ('Disney Lorcana', 'lorcana', true);
```

#### 2. Add Sets for the Game
```sql
INSERT INTO card_sets (game_id, name, code, release_date)
VALUES 
  ((SELECT id FROM games WHERE code = 'lorcana'), 
   'The First Chapter', 'TFC', '2023-08-18'),
  ((SELECT id FROM games WHERE code = 'lorcana'), 
   'Rise of the Floodborn', 'ROTF', '2023-11-17');
```

#### 3. Import Card Data

##### Option A: Manual CSV Import
```csv
name,number,set_code,rarity,price,stock,quality
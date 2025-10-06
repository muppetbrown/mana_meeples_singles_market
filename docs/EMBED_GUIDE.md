# TCG Singles Platform - Complete Integration Guide

## 🚀 Quick Start - Embed on Any Website

### Method 1: Direct Embed (Simplest)

Add this code to your website where you want the shop to appear:

```html
<!-- Add to your <head> section -->
<link rel="stylesheet" href="https://cdn.tailwindcss.com">

<!-- Add where you want the shop to display -->
<div id="tcg-shop-root"></div>

<!-- Add before closing </body> tag -->
<script type="module">
  import TCGShop from 'https://your-domain.com/tcg-shop.js';
  
  const config = {
    apiUrl: 'https://your-api.com/api',
    theme: {
      primaryColor: '#2563eb',
      backgroundColor: '#f8fafc'
    },
    features: {
      enableCart: true,
      enableFilters: true,
      enableSearch: true
    }
  };
  
  const shop = new TCGShop('tcg-shop-root', config);
  shop.render();
</script>
```

### Method 2: iframe Embed (Most Secure)

```html
<iframe 
  src="https://your-domain.com/shop"
  width="100%"
  height="800px"
  frameborder="0"
  style="border: none; border-radius: 12px;"
  title="TCG Singles Shop"
></iframe>
```

### Method 3: WordPress Plugin

```php
<?php
/*
Plugin Name: TCG Singles Shop
Description: Embed TCG singles shop on any page with shortcode [tcg_shop]
Version: 1.0
*/

function tcg_shop_shortcode($atts) {
    $atts = shortcode_atts([
        'game' => 'all',
        'set' => 'all',
        'theme' => 'light'
    ], $atts);
    
    wp_enqueue_script('tcg-shop', 
        'https://your-domain.com/tcg-shop.js', 
        [], '1.0', true);
    
    return '<div class="tcg-shop-container" 
                 data-game="' . esc_attr($atts['game']) . '"
                 data-set="' . esc_attr($atts['set']) . '"
                 data-theme="' . esc_attr($atts['theme']) . '"></div>';
}
add_shortcode('tcg_shop', 'tcg_shop_shortcode');
?>
```

Usage: `[tcg_shop game="Magic: The Gathering" set="Bloomburrow"]`

### Method 4: React Component (For React Apps)

```jsx
import TCGShop from '@your-company/tcg-shop-react';

function App() {
  return (
    <div>
      <TCGShop
        apiUrl="https://your-api.com/api"
        initialGame="Magic: The Gathering"
        onAddToCart={(item) => console.log('Added:', item)}
        onCheckout={(cart) => console.log('Checkout:', cart)}
        theme={{
          primaryColor: '#2563eb',
          fontFamily: 'Inter, sans-serif'
        }}
      />
    </div>
  );
}
```

---

## 🛠️ Backend Setup

### 1. Database Setup (PostgreSQL)

```bash
# Install PostgreSQL
# Create database
createdb tcg_singles

# Run migrations (see backend-structure artifact for full schema)
psql tcg_singles < schema.sql
```

### 2. Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tcg_singles

# API Keys
TCGPLAYER_API_KEY=your_tcgplayer_key
POKEMON_TCG_API_KEY=your_pokemon_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_PUBLISHABLE_KEY=your_stripe_public_key

# Server
PORT=3000
NODE_ENV=production
API_URL=https://api.your-domain.com

# CORS
ALLOWED_ORIGINS=https://your-website.com,https://www.your-website.com

# Session
SESSION_SECRET=your_random_secret_here
```

### 3. Install Dependencies

```bash
npm install express pg cors dotenv stripe
npm install node-cron # For automated price updates
npm install helmet # For security
npm install express-rate-limit # For API rate limiting
```

### 4. Server Setup (server.js)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { router } = require('./api');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());

// Routes
app.use('/api', router);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TCG Singles API running on port ${PORT}`);
});
```

---

## 📊 Data Import & Management

### Adding a New Game

```sql
INSERT INTO games (name, code, active)
VALUES ('Lorcana', 'lorcana', true);
```

### Adding a New Set

```sql
INSERT INTO card_sets (game_id, name, code, release_date)
VALUES (
  (SELECT id FROM games WHERE code = 'mtg'),
  'Bloomburrow',
  'BLB',
  '2024-08-02'
);
```

### Bulk Import Cards (CSV)

Create `import.js`:

```javascript
const csv = require('csv-parser');
const fs = require('fs');

async function importCards(csvPath) {
  const cards = [];
  
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      cards.push({
        name: row.name,
        number: row.number,
        set_code: row.set_code,
        rarity: row.rarity,
        price: parseFloat(row.price),
        stock: parseInt(row.stock),
        quality: row.quality || 'Near Mint'
      });
    })
    .on('end', async () => {
      for (const card of cards) {
        // Insert card and inventory
        const cardResult = await db.query(
          `INSERT INTO cards (game_id, set_id, name, card_number, rarity)
           VALUES (
             (SELECT game_id FROM card_sets WHERE code = $1),
             (SELECT id FROM card_sets WHERE code = $1),
             $2, $3, $4
           )
           ON CONFLICT (set_id, card_number) DO UPDATE
           SET name = EXCLUDED.name
           RETURNING id`,
          [card.set_code, card.name, card.number, card.rarity]
        );
        
        await db.query(
          `INSERT INTO card_inventory (card_id, quality, stock_quantity, price, price_source)
           VALUES ($1, $2, $3, $4, 'manual')
           ON CONFLICT (card_id, quality) DO UPDATE
           SET stock_quantity = EXCLUDED.stock_quantity,
               price = EXCLUDED.price`,
          [cardResult.rows[0].id, card.quality, card.stock, card.price]
        );
      }
      
      console.log(`Imported ${cards.length} cards`);
    });
}

// Run: node import.js path/to/cards.csv
importCards(process.argv[2]);
```

CSV Format:
```csv
name,number,set_code,rarity,price,stock,quality
Ral Monsoon Mage,215,BLB,Mythic Rare,24.99,8,Near Mint
Charizard ex,125,OBF,Ultra Rare,89.99,3,Near Mint
```

---

## 🔄 API Integration Options

### Option 1: TCGPlayer Price API

```javascript
// Auto-update prices daily
const updateTCGPlayerPrices = async () => {
  const cards = await db.query(
    'SELECT id, tcgplayer_id FROM card_inventory WHERE price_source = $1',
    ['api_tcgplayer']
  );
  
  for (const card of cards.rows) {
    const response = await fetch(
      `https://api.tcgplayer.com/pricing/product/${card.tcgplayer_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TCGPLAYER_API_KEY}`
        }
      }
    );
    
    const data = await response.json();
    
    await db.query(
      'UPDATE card_inventory SET price = $1, last_price_update = NOW() WHERE id = $2',
      [data.lowPrice, card.id]
    );
  }
};
```

### Option 2: Manual Price Upload (Admin Panel)

```javascript
// Bulk price update endpoint
app.post('/api/admin/prices/bulk', async (req, res) => {
  const { updates } = req.body;
  // updates = [{ sku: 'ABC123', price: 24.99 }, ...]
  
  for (const update of updates) {
    await db.query(
      'UPDATE card_inventory SET price = $1, price_source = $2 WHERE sku = $3',
      [update.price, 'manual', update.sku]
    );
  }
  
  res.json({ success: true, updated: updates.length });
});
```

### Option 3: Hybrid Approach (Recommended)

```javascript
// Use API prices as base, allow manual overrides
const getPrice = async (inventoryId) => {
  const result = await db.query(
    `SELECT price, price_source, last_price_update 
     FROM card_inventory WHERE id = $1`,
    [inventoryId]
  );
  
  const item = result.rows[0];
  
  // If manual override, use that
  if (item.price_source === 'manual') {
    return item.price;
  }
  
  // If API price is stale (>24 hours), refresh
  const hoursSinceUpdate = 
    (Date.now() - new Date(item.last_price_update)) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > 24) {
    await refreshPriceFromAPI(inventoryId);
  }
  
  return item.price;
};
```

---

## 🎨 Customization Options

### Theme Configuration

```javascript
const customTheme = {
  colors: {
    primary: '#2563eb',      // Main action color
    secondary: '#64748b',    // Secondary elements
    success: '#10b981',      // Success states
    danger: '#ef4444',       // Error states
    background: '#ffffff',   // Background color
    surface: '#f8fafc',      // Card backgrounds
    text: '#1e293b',         // Primary text
    textMuted: '#64748b'     // Secondary text
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    }
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  },
  spacing: {
    cardGap: '1.5rem',
    containerPadding: '1rem'
  }
};
```

### Custom Filters

```javascript
// Add custom filter fields to your configuration
const customFilters = [
  {
    id: 'foil',
    label: 'Foil Type',
    type: 'select',
    options: ['Standard', 'Foil', 'Etched Foil', 'Cold Foil']
  },
  {
    id: 'language',
    label: 'Language',
    type: 'select',
    options: ['English', 'Japanese', 'German', 'French', 'Spanish']
  },
  {
    id: 'signed',
    label: 'Artist Signed',
    type: 'checkbox',
    default: false
  },
  {
    id: 'price_trend',
    label: 'Price Trend',
    type: 'select',
    options: ['All', 'Rising', 'Falling', 'Stable']
  }
];
```

### Layout Options

```javascript
const layoutConfig = {
  // Grid layout
  gridColumns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 4
  },
  
  // Card display style
  cardStyle: 'modern', // 'modern', 'compact', 'detailed'
  
  // Show/hide elements
  showElements: {
    search: true,
    filters: true,
    sorting: true,
    pagination: true,
    cardImages: true,
    stockCount: true,
    rarity: true,
    setInfo: true,
    quickView: true
  },
  
  // Pagination
  itemsPerPage: 20,
  paginationStyle: 'numbers', // 'numbers', 'loadMore', 'infinite'
};
```

---

## 💳 Payment Integration (Stripe)

### Frontend Checkout Integration

```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY);

async function handleCheckout(cartItems) {
  const stripe = await stripePromise;
  
  // Create checkout session
  const response = await fetch('/api/checkout/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cartItems.map(item => ({
        inventory_id: item.id,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      }))
    })
  });
  
  const session = await response.json();
  
  // Redirect to Stripe Checkout
  const result = await stripe.redirectToCheckout({
    sessionId: session.id
  });
  
  if (result.error) {
    console.error(result.error.message);
  }
}
```

### Backend Stripe Setup

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create checkout session
app.post('/api/checkout/create-session', async (req, res) => {
  try {
    const { items } = req.body;
    
    // Verify stock and calculate total
    const lineItems = [];
    for (const item of items) {
      const stockCheck = await db.query(
        'SELECT stock_quantity, price, card_name FROM card_inventory WHERE id = $1',
        [item.inventory_id]
      );
      
      if (stockCheck.rows[0].stock_quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${stockCheck.rows[0].card_name}` 
        });
      }
      
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: stockCheck.rows[0].card_name,
            images: [item.image_url]
          },
          unit_amount: Math.round(stockCheck.rows[0].price * 100) // Stripe uses cents
        },
        quantity: item.quantity
      });
    }
    
    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
      metadata: {
        items: JSON.stringify(items.map(i => ({ 
          inventory_id: i.inventory_id, 
          quantity: i.quantity 
        })))
      }
    });
    
    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook to handle successful payment
app.post('/api/webhook/stripe', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const items = JSON.parse(session.metadata.items);
      
      // Create order and update inventory
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        
        // Create order
        const orderResult = await client.query(
          `INSERT INTO orders (
            customer_email, 
            total, 
            status, 
            payment_intent_id
          ) VALUES ($1, $2, 'paid', $3) RETURNING id`,
          [session.customer_email, session.amount_total / 100, session.payment_intent]
        );
        
        const orderId = orderResult.rows[0].id;
        
        // Create order items and reduce stock
        for (const item of items) {
          const cardInfo = await client.query(
            'SELECT card_name, quality, price FROM card_inventory WHERE id = $1',
            [item.inventory_id]
          );
          
          await client.query(
            `INSERT INTO order_items (
              order_id, 
              inventory_id, 
              card_name, 
              quality, 
              quantity, 
              unit_price, 
              total_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              orderId,
              item.inventory_id,
              cardInfo.rows[0].card_name,
              cardInfo.rows[0].quality,
              item.quantity,
              cardInfo.rows[0].price,
              cardInfo.rows[0].price * item.quantity
            ]
          );
          
          await client.query(
            'UPDATE card_inventory SET stock_quantity = stock_quantity - $1 WHERE id = $2',
            [item.quantity, item.inventory_id]
          );
        }
        
        await client.query('COMMIT');
        
        // Send confirmation email (implement your email service)
        // await sendOrderConfirmation(session.customer_email, orderId);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Order creation failed:', error);
      } finally {
        client.release();
      }
    }
    
    res.json({ received: true });
  }
);
```

---

## 📱 Mobile App Integration

### React Native Component

```javascript
import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Text, 
  StyleSheet 
} from 'react-native';

const TCGShopMobile = ({ apiUrl }) => {
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  
  useEffect(() => {
    fetchCards();
  }, [search]);
  
  const fetchCards = async () => {
    const response = await fetch(
      `${apiUrl}/cards?search=${search}&limit=50`
    );
    const data = await response.json();
    setCards(data.cards);
  };
  
  const addToCart = (card) => {
    setCart([...cart, card]);
  };
  
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search cards..."
        value={search}
        onChangeText={setSearch}
      />
      
      <FlatList
        data={cards}
        keyExtractor={(item) => `${item.id}-${item.quality}`}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.cardImage}
              resizeMode="contain"
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardPrice}>${item.price}</Text>
              <Text style={styles.cardStock}>Stock: {item.stock_quantity}</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.addButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16
  },
  searchInput: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardImage: {
    width: 80,
    height: 112,
    borderRadius: 6
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between'
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb'
  },
  cardStock: {
    fontSize: 12,
    color: '#64748b'
  },
  addButton: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold'
  }
});

export default TCGShopMobile;
```

---

## 🔍 Advanced Search Features

### Fuzzy Search Implementation

```javascript
// Install: npm install fuse.js
const Fuse = require('fuse.js');

app.get('/api/cards/search', async (req, res) => {
  const { query } = req.query;
  
  // Fetch all cards (or use caching)
  const allCards = await db.query(
    'SELECT id, name, card_number, description FROM cards'
  );
  
  // Configure fuzzy search
  const fuse = new Fuse(allCards.rows, {
    keys: ['name', 'card_number', 'description'],
    threshold: 0.3,
    includeScore: true
  });
  
  const results = fuse.search(query);
  
  res.json({
    results: results.map(r => r.item),
    count: results.length
  });
});
```

### Autocomplete Endpoint

```javascript
app.get('/api/cards/autocomplete', async (req, res) => {
  const { q } = req.query;
  
  const suggestions = await db.query(
    `SELECT DISTINCT name, image_url 
     FROM cards 
     WHERE name ILIKE $1 
     LIMIT 10`,
    [`${q}%`]
  );
  
  res.json(suggestions.rows);
});
```

---

## 📊 Analytics & Tracking

### Track Popular Cards

```sql
CREATE TABLE card_views (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id),
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_ip VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_card_views_card ON card_views(card_id, viewed_at);
```

```javascript
// Track card views
app.post('/api/analytics/view', async (req, res) => {
  const { card_id } = req.body;
  const user_ip = req.ip;
  const user_agent = req.headers['user-agent'];
  
  await db.query(
    'INSERT INTO card_views (card_id, user_ip, user_agent) VALUES ($1, $2, $3)',
    [card_id, user_ip, user_agent]
  );
  
  res.json({ tracked: true });
});

// Get trending cards
app.get('/api/analytics/trending', async (req, res) => {
  const trending = await db.query(
    `SELECT 
      c.id, 
      c.name, 
      COUNT(cv.id) as view_count
     FROM cards c
     JOIN card_views cv ON cv.card_id = c.id
     WHERE cv.viewed_at > NOW() - INTERVAL '7 days'
     GROUP BY c.id, c.name
     ORDER BY view_count DESC
     LIMIT 10`
  );
  
  res.json(trending.rows);
});
```

---

## 🔒 Security Best Practices

### API Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP'
});

// Stricter limiter for checkout
const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many checkout attempts'
});

app.use('/api/', apiLimiter);
app.use('/api/checkout/', checkoutLimiter);
```

### Input Validation

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/orders',
  [
    body('customer_email').isEmail().normalizeEmail(),
    body('items').isArray({ min: 1, max: 50 }),
    body('items.*.inventory_id').isInt({ min: 1 }),
    body('items.*.quantity').isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Process order...
  }
);
```

### SQL Injection Prevention

```javascript
// ALWAYS use parameterized queries
// ✅ GOOD
const result = await db.query(
  'SELECT * FROM cards WHERE name = $1',
  [userInput]
);

// ❌ BAD - Never do this!
const result = await db.query(
  `SELECT * FROM cards WHERE name = '${userInput}'`
);
```

---

## 🚀 Deployment

### Docker Setup

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/tcg_singles
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=tcg_singles
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Deployment Commands

```bash
# Build and deploy
docker-compose up -d

# View logs
docker-compose logs -f api

# Run migrations
docker-compose exec api npm run migrate

# Backup database
docker-compose exec db pg_dump -U postgres tcg_singles > backup.sql
```

---

## 📖 API Documentation Example

### GET /api/cards

**Description:** Retrieve cards with filtering and pagination

**Parameters:**
- `game_id` (optional): Filter by game ID
- `set_id` (optional): Filter by set ID
- `search` (optional): Search card names/numbers
- `quality` (optional): Filter by quality
- `min_price` (optional): Minimum price filter
- `max_price` (optional): Maximum price filter
- `sort_by` (optional): Sort field (name/price/stock)
- `sort_order` (optional): asc/desc
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "cards": [
    {
      "id": 1,
      "name": "Ral, Monsoon Mage",
      "game_name": "Magic: The Gathering",
      "set_name": "Bloomburrow",
      "card_number": "215",
      "quality": "Near Mint",
      "price": 24.99,
      "stock_quantity": 8,
      "image_url": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

## ✅ Launch Checklist

- [ ] Database schema created and migrated
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Stripe integration configured and tested
- [ ] Price API integration working (if using)
- [ ] Initial inventory imported
- [ ] Embed code tested on target website
- [ ] Mobile responsive design verified
- [ ] Accessibility audit passed (WCAG AA minimum)
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Error logging setup
- [ ] Backup strategy in place
- [ ] SSL certificate installed
- [ ] Terms of service and privacy policy added
- [ ] Customer support contact method established

---

## 🆘 Support & Maintenance

### Monitoring
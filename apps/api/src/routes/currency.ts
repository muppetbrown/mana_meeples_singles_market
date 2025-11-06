// apps/api/src/routes/currency.ts
import express from "express";
import type { Request, Response } from "express";
import { getExchangeRates, clearExchangeRatesCache } from "../services/currencyService.js";

const router = express.Router();

/**
 * Request logging for currency routes
 */
router.use((req: Request, _res: Response, next: express.NextFunction) => {
  console.log(`💱 CURRENCY ${req.method} ${req.originalUrl || req.url} - ${new Date().toISOString()}`);
  next();
});

/**
 * GET /api/currency/rates
 * Returns current exchange rates for all supported currencies
 * Rates are cached for 1 hour to minimize API calls
 */
router.get("/rates", async (_req: Request, res: Response) => {
  try {
    console.log("📊 Fetching exchange rates");
    const result = await getExchangeRates();

    res.status(200).json({
      success: true,
      rates: result.rates,
      lastUpdated: result.lastUpdated,
      cached: result.cached,
      expiresIn: 60 * 60 * 1000, // 1 hour in milliseconds
    });
  } catch (error) {
    console.error("❌ Failed to fetch exchange rates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch exchange rates",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    });
  }
});

/**
 * POST /api/currency/refresh
 * Clears the cached exchange rates and fetches fresh ones
 * This endpoint can be used for manual refresh or testing
 */
router.post("/refresh", async (_req: Request, res: Response) => {
  try {
    console.log("🔄 Refreshing exchange rates");
    clearExchangeRatesCache();
    const result = await getExchangeRates();

    res.status(200).json({
      success: true,
      message: "Exchange rates refreshed",
      rates: result.rates,
      lastUpdated: result.lastUpdated,
    });
  } catch (error) {
    console.error("❌ Failed to refresh exchange rates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh exchange rates",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    });
  }
});

export default router;

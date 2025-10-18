import express, { Request, Response } from "express";
import { db } from "../lib/db"; // adjust import if your pool lives elsewhere

const router = express.Router();

/**
 * Build WHERE clause from query scope.
 */
function applyCardScope(where: string[], params: any[], scope: any = {}): void {
  const { game_id, set_id } = scope;
  if (game_id) {
    where.push(`c.game_id = $${params.length + 1}`);
    params.push(game_id);
  }
  if (set_id) {
    where.push(`c.set_id = $${params.length + 1}`);
    params.push(set_id);
  }
}

/**
 * Generic query helper
 */
async function runFilterQuery(
  res: Response,
  sql: string,
  params: any[],
  label: string
) {
  try {
    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (err: any) {
    console.error(`❌ Error fetching ${label}:`, err);
    res.status(500).json({ error: `Failed to fetch ${label}` });
  }
}

// === Treatments ===
router.get("/treatments", async (req: Request, res: Response) => {
  const params: any[] = [];
  const where: string[] = ["c.treatment IS NOT NULL"];
  applyCardScope(where, params, req.query);

  const sql = `
    SELECT c.treatment AS value, c.treatment AS label, COUNT(DISTINCT c.id) AS count
    FROM cards c
    JOIN card_inventory i ON i.card_id = c.id
    WHERE ${where.join(" AND ")}
    GROUP BY c.treatment
    ORDER BY count DESC, c.treatment;
  `;
  await runFilterQuery(res, sql, params, "treatments");
});

// === Rarities ===
router.get("/rarities", async (req: Request, res: Response) => {
  const params: any[] = [];
  const where: string[] = ["c.rarity IS NOT NULL"];
  applyCardScope(where, params, req.query);

  const sql = `
    SELECT c.rarity AS value, c.rarity AS label, COUNT(DISTINCT c.id) AS count
    FROM cards c
    JOIN card_inventory i ON i.card_id = c.id
    WHERE ${where.join(" AND ")}
    GROUP BY c.rarity
    ORDER BY count DESC, c.rarity;
  `;
  await runFilterQuery(res, sql, params, "rarities");
});

// === Qualities ===
router.get("/qualities", async (req: Request, res: Response) => {
  const params: any[] = [];
  const where: string[] = ["i.quality IS NOT NULL"];
  applyCardScope(where, params, req.query);

  const sql = `
    SELECT i.quality AS value, i.quality AS label, COUNT(DISTINCT i.id) AS count
    FROM card_inventory i
    JOIN cards c ON c.id = i.card_id
    WHERE ${where.join(" AND ")}
    GROUP BY i.quality
    ORDER BY count DESC, i.quality;
  `;
  await runFilterQuery(res, sql, params, "qualities");
});

// === Foil types ===
router.get("/foil-types", async (req: Request, res: Response) => {
  const params: any[] = [];
  const where: string[] = ["i.foil_type IS NOT NULL"];
  applyCardScope(where, params, req.query);

  const sql = `
    SELECT i.foil_type AS value, i.foil_type AS label, COUNT(DISTINCT i.id) AS count
    FROM card_inventory i
    JOIN cards c ON c.id = i.card_id
    WHERE ${where.join(" AND ")}
    GROUP BY i.foil_type
    ORDER BY count DESC, i.foil_type;
  `;
  await runFilterQuery(res, sql, params, "foil types");
});

// === Languages ===
router.get("/languages", async (req: Request, res: Response) => {
  const params: any[] = [];
  const where: string[] = ["i.language IS NOT NULL"];
  applyCardScope(where, params, req.query);

  const sql = `
    SELECT i.language AS value, i.language AS label, COUNT(DISTINCT i.id) AS count
    FROM card_inventory i
    JOIN cards c ON c.id = i.card_id
    WHERE ${where.join(" AND ")}
    GROUP BY i.language
    ORDER BY count DESC, i.language;
  `;
  await runFilterQuery(res, sql, params, "languages");
});

// === Card count ===
router.get("/count", async (req: Request, res: Response) => {
  const params: any[] = [];
  const where: string[] = ["1=1"];
  applyCardScope(where, params, req.query);

  const sql = `
    SELECT COUNT(DISTINCT c.id) AS count
    FROM cards c
    JOIN card_inventory i ON i.card_id = c.id
    WHERE ${where.join(" AND ")};`;

  try {
    const rows = await db.query(sql, params);
    res.json({ count: parseInt((rows[0] as any).count, 10) });
  } catch (err: any) {
    console.error("Error counting cards:", err);
    res.status(500).json({ error: "Failed to count cards" });
  }
});

export default router;

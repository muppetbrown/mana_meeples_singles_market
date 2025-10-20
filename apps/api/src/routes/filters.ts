// apps/api/src/routes/filters.ts
import { z } from "zod";

/** CSV helper: allow ?foo=A,B or ?foo=A&foo=B */
export const csv = <T extends z.ZodTypeAny>(item: T) =>
  z.union([
    item.array(),
    z
      .string()
      .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
      .pipe(item.array()),
  ]).optional();

/** Pagination with coercion */
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(24),
  sort: z.string().min(1).max(64).optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
});

/** Facet filters with coercion + canonicalization */
export const CardFiltersQuery = z.object({
  game_id: z.coerce.number().int().positive().optional(),
  set_id: z.coerce.number().int().positive().optional(),
  // facets (uppercase to match DB canonical codes)
  treatment: csv(z.string().transform((s) => s.toUpperCase())),
  border_color: csv(z.string().transform((s) => s.toUpperCase())),
  finish: csv(z.string().transform((s) => s.toUpperCase())),
  promo_type: csv(z.string().transform((s) => s.toUpperCase())),
  frame_effect: csv(z.string().transform((s) => s.toUpperCase())),
  // price filters (if used)
  min_price: z.coerce.number().nonnegative().optional(),
  max_price: z.coerce.number().nonnegative().optional(),
  // search
  q: z.string().trim().min(1).max(100).optional(),
  // stock toggle
  in_stock: z.coerce.boolean().optional(),
});

/** Combined schema commonly used by list endpoints */
export const CardsIndexQuery = PaginationQuery.merge(CardFiltersQuery);

export type CardFilters = z.infer<typeof CardFiltersQuery>;
export type CardsIndex = z.infer<typeof CardsIndexQuery>;

/**
 * Parse and validate query params with coercion.
 * Returns `{ data, error }` so callers can decide how to respond.
 */
export function parseCardFilters(
  query: unknown
): { data?: CardFilters; error?: z.typeToFlattenedError<any> } {
  const parsed = CardFiltersQuery.safeParse(query);
  if (!parsed.success) return { error: parsed.error.flatten() };

  // Ensure min/max price are consistent if both present
  const { min_price, max_price } = parsed.data;
  if (min_price != null && max_price != null && min_price > max_price) {
    return {
      error: {
        formErrors: ["min_price cannot be greater than max_price"],
        fieldErrors: {},
      },
    };
  }

  return { data: parsed.data };
}

/**
 * Build SQL WHERE/JOIN/params from filters.
 * `cardAlias` lets you use 'c' (recommended) when querying `cards c`.
 */
export function buildFilterSQL(
  cardAlias: string,
  filters: CardFilters
): { where: string[]; joins: string[]; params: any[] } {
  const where: string[] = [];
  const joins: string[] = [];
  const params: any[] = [];

  const c = cardAlias;

  if (filters.game_id != null) {
    params.push(filters.game_id);
    where.push(`${c}.game_id = $${params.length}`);
  }

  if (filters.set_id != null) {
    params.push(filters.set_id);
    where.push(`${c}.set_id = $${params.length}`);
  }

  if (filters.q) {
    params.push(filters.q);
    // Uses GIN index on cards.search_tsv
    where.push(`${c}.search_tsv @@ plainto_tsquery('english', $${params.length})`);
  }

  // Facet arrays → ANY($n)
  if (filters.treatment && filters.treatment.length) {
    params.push(filters.treatment);
    where.push(`${c}.treatment = ANY($${params.length})`);
  }
  if (filters.border_color && filters.border_color.length) {
    params.push(filters.border_color);
    where.push(`${c}.border_color = ANY($${params.length})`);
  }
  if (filters.finish && filters.finish.length) {
    params.push(filters.finish);
    where.push(`${c}.finish = ANY($${params.length})`);
  }
  if (filters.promo_type && filters.promo_type.length) {
    params.push(filters.promo_type);
    where.push(`${c}.promo_type = ANY($${params.length})`);
  }
  if (filters.frame_effect && filters.frame_effect.length) {
    params.push(filters.frame_effect);
    where.push(`${c}.frame_effect = ANY($${params.length})`);
  }

  // Prices (adjust to your pricing table/view)
  if (filters.min_price != null || filters.max_price != null) {
    joins.push(`LEFT JOIN card_pricing cp ON cp.card_id = ${c}.id`);
    if (filters.min_price != null) {
      params.push(filters.min_price);
      where.push(`cp.price >= $${params.length}`);
    }
    if (filters.max_price != null) {
      params.push(filters.max_price);
      where.push(`cp.price <= $${params.length}`);
    }
  }

  if (filters.in_stock) {
    // Leverage partial index on card_inventory(stock > 0)
    joins.push(
      `JOIN card_inventory ci ON ci.card_id = ${c}.id AND ci.stock > 0`
    );
  }

  return { where, joins, params };
}

/**
 * Build ORDER BY / LIMIT / OFFSET safely from pagination options.
 * Only allow whitelisted sort columns to avoid SQL injection.
 */
export function buildPagingSQL(
  cardAlias: string,
  paging: z.infer<typeof PaginationQuery>,
  sortWhitelist: Record<string, string> = {
    name: `${cardAlias}.name`,
    number: `${cardAlias}.card_number`,
    price: `COALESCE(cp.price, 0)`,
    set: `${cardAlias}.set_id`,
  }
): { orderBy: string; limitOffset: string; extraJoins: string[] } {
  const extraJoins: string[] = [];
  let orderByCol = sortWhitelist.name; // default to name

  if (paging.sort && sortWhitelist[paging.sort]) {
    orderByCol = sortWhitelist[paging.sort];
    if (paging.sort === "price") {
      // Ensure pricing is joined if sorting by price
      extraJoins.push(`LEFT JOIN card_pricing cp ON cp.card_id = ${cardAlias}.id`);
    }
  }

  const orderBy = `ORDER BY ${orderByCol} ${paging.order}`;
  const limitOffset = `LIMIT ${paging.per_page} OFFSET ${(paging.page - 1) * paging.per_page}`;

  return { orderBy, limitOffset, extraJoins };
}

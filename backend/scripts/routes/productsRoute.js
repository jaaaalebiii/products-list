import { Router } from "express";
import pool from "../../src/db/pool.js";

const router = Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function getProducts(req, res) {
  const rawLimit = req.query.limit;

  let limit;

  if (rawLimit === undefined) {
    limit = DEFAULT_LIMIT;
  } else {
    limit = parseInt(rawLimit, 10);

    if (isNaN(limit)) {
      return res.status(400).json({
        error: `"limit" must be a number. Received: "${rawLimit}"`,
      });
    }

    if (limit < 1) {
      return res.status(400).json({
        error: `"limit" must be at least 1. Received: ${limit}`,
      });
    }

    if (limit > MAX_LIMIT) {
      return res.status(400).json({
        error: `"limit" cannot exceed ${MAX_LIMIT}. Received: ${limit}`,
      });
    }
  }

  const rawCursorUpdatedAt = req.query.cursorUpdatedAt;
  const rawCursorId = req.query.cursorId;

  // The cursor needs both sort columns to resume pagination deterministically.
  const hasCursor =
    rawCursorUpdatedAt !== undefined || rawCursorId !== undefined;
  const hasFullCursor =
    rawCursorUpdatedAt !== undefined && rawCursorId !== undefined;

  if (hasCursor && !hasFullCursor) {
    return res.status(400).json({
      error: "Cursor requires both cursorUpdatedAt and cursorId.",
    });
  }

  let cursorId;

  if (hasFullCursor) {
    cursorId = parseInt(rawCursorId, 10);

    if (isNaN(cursorId)) {
      return res.status(400).json({
        error: `"cursorId" must be a number. Received: "${rawCursorId}"`,
      });
    }

    const parsedCursorDate = new Date(rawCursorUpdatedAt);

    if (isNaN(parsedCursorDate)) {
      return res.status(400).json({
        error: `"cursorUpdatedAt" must be a valid ISO timestamp. Received: "${rawCursorUpdatedAt}"`,
      });
    }
  }
  const category = req.query.category?.trim() || null;
  try {
    const conditions = [];
    const queryParams = [];

    const nextParam = (value) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    if (hasFullCursor) {
      const p1 = nextParam(rawCursorUpdatedAt);
      const p2 = nextParam(cursorId);
      conditions.push(`(updated_at, id) < (${p1}, ${p2})`);
    }

    if (category) {
      const p = nextParam(category);
      conditions.push(`category = ${p}`);
    }

    // Row-value comparison matches ORDER BY updated_at DESC, id DESC.
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const limitParam = nextParam(limit);

    const queryText = `
  SELECT *
  FROM   products
  ${whereClause}
  ORDER  BY updated_at DESC, id DESC
  LIMIT  ${limitParam}
`;

    const { rows } = await pool.query(queryText, queryParams);

    const lastRow = rows[rows.length - 1];

    // The last row becomes the cursor for the next page in descending order.
    const nextCursor =
      rows.length === limit && lastRow
        ? {
            cursorUpdatedAt: new Date(lastRow.updated_at).toISOString(),
            cursorId: lastRow.id,
          }
        : null;

    return res.status(200).json({
      data: rows,
      meta: {
        limit,
        count: rows.length,
        nextCursor,
      },
    });
  } catch (err) {
    console.error("[GET /products] Database error:", err);

    return res.status(500).json({
      error: "An unexpected error occurred. Please try again later.",
    });
  }
}

router.get("/", getProducts);

export default router;

# Product Browser API

Backend take-home assignment for CodeVector.

## Overview

This project implements a product browsing API over a dataset of 200,000 products.

Features:

- Cursor-based pagination
- Category filtering
- PostgreSQL database
- Efficient indexing
- Seed script for generating 200,000 products
- Optional frontend for browsing products

The API returns products ordered by:

```sql
ORDER BY updated_at DESC, id DESC
```

so the newest products appear first.

---

## Tech Stack

Backend:
- Node.js
- Express.js
- PostgreSQL (Neon)
- pg

Frontend:
- HTML
- CSS
- Vanilla JavaScript

Hosting:
- Render
- Neon

---

## Database Schema

Products table:

| Column | Type |
|----------|----------|
| id | SERIAL PRIMARY KEY |
| name | TEXT |
| category | TEXT |
| price | NUMERIC |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

## Why Cursor Pagination?

Offset pagination becomes slower as offsets grow because PostgreSQL must scan and discard rows before returning results.

Example:

```sql
SELECT *
FROM products
ORDER BY updated_at DESC
OFFSET 100000
LIMIT 20;
```

Cursor pagination avoids this problem by using the last seen row as a bookmark:

```sql
WHERE (updated_at, id) < ($1, $2)
ORDER BY updated_at DESC, id DESC
LIMIT $3
```

Benefits:

- Consistent performance
- No duplicate rows while browsing
- No skipped rows while new products are added
- Index-friendly

---

## Indexes

Primary pagination index:

```sql
CREATE INDEX idx_products_updated_id
ON products(updated_at DESC, id DESC);
```

Category filter index:

```sql
CREATE INDEX idx_products_category_updated_id
ON products(category, updated_at DESC, id DESC);
```

These indexes support both sorting and filtering efficiently.

---

## API

### Get Products

```http
GET /products
```

Query parameters:

| Parameter | Description |
|------------|------------|
| limit | Number of products to return |
| category | Optional category filter |
| cursorUpdatedAt | Cursor timestamp |
| cursorId | Cursor id |

Example:

```http
GET /products?limit=20&category=Electronics
```

Response:

```json
{
  "data": [],
  "meta": {
    "limit": 20,
    "count": 20,
    "nextCursor": {
      "cursorUpdatedAt": "2026-06-21T10:14:08.798Z",
      "cursorId": 197079
    }
  }
}
```

---

## Seeding

Generate products:

```bash
node scripts/seed.js
```

The seed script creates 200,000 products with:

- Random names
- Random categories
- Random prices
- Random created_at timestamps
- Random updated_at timestamps

Products are inserted in batches for performance.

---

## Running Locally

Install dependencies:

```bash
npm install
```

Create:

```env
DATABASE_URL=your_neon_connection_string
```

Run:

```bash
npm run dev
```

Server:

```text
http://localhost:3000
```

---

## Testing

The API was tested for:

- Cursor pagination
- Category filtering
- Invalid query parameters
- Pagination consistency during data changes

To test consistency:

1. Request page 1
2. Insert a new product with a newer timestamp
3. Request page 2 using the previous cursor
4. Verify no duplicate products appear

---

## Future Improvements

With more time I would add:

- Automated tests
- API documentation (Swagger/OpenAPI)
- Docker support
- Full-text product search
- Better monitoring and logging

---

## AI Usage

AI tools were used to:

- Discuss pagination strategies
- Review code structure
- Explain PostgreSQL concepts

All code was reviewed, tested, and modified manually.

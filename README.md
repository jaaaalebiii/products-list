# Products List

A scalable product browsing application built for the CodeVector Backend Take-Home Assignment.

## Live Demo

**Frontend:** https://products-list-lyart.vercel.app/

**Backend API:** https://products-list-5zgd.onrender.com/

**GitHub Repository:** https://github.com/jaaaalebiii/products-list

---

## Project Overview

This project implements a product catalog system containing **200,000 products** with support for:

* Cursor-based pagination
* Category filtering
* PostgreSQL-backed storage
* Efficient indexing
* Bulk data generation and seeding
* Responsive frontend for browsing products

Products are always returned in descending order of recency:

```sql
ORDER BY updated_at DESC, id DESC
```

This ensures newer products appear first while maintaining deterministic ordering.

---

## Architecture

```text
Frontend (HTML/CSS/JavaScript)
            │
            ▼
     Express.js API
            │
            ▼
 PostgreSQL (Neon)
```

### Hosting

* Frontend: Vercel
* Backend: Render
* Database: Neon PostgreSQL

---

## Tech Stack

### Backend

* Node.js
* Express.js
* PostgreSQL
* pg
* dotenv

### Frontend

* HTML
* CSS
* Vanilla JavaScript

### Infrastructure

* Render
* Neon
* Vercel

---

## Database Schema

### products

| Column     | Type               |
| ---------- | ------------------ |
| id         | SERIAL PRIMARY KEY |
| name       | TEXT               |
| category   | TEXT               |
| price      | NUMERIC            |
| created_at | TIMESTAMP          |
| updated_at | TIMESTAMP          |

---

## Why Cursor Pagination?

The assignment required pagination that remains correct while data is changing.

Traditional offset pagination:

```sql
SELECT *
FROM products
ORDER BY updated_at DESC
OFFSET 100000
LIMIT 20;
```

has two drawbacks:

1. Performance degrades as offsets grow.
2. Inserts or updates between requests can cause duplicate or skipped records.

Instead, this project uses cursor pagination:

```sql
WHERE (updated_at, id) < ($1, $2)
ORDER BY updated_at DESC, id DESC
LIMIT $3
```

The cursor consists of:

* updated_at
* id

Using both fields guarantees stable ordering even when multiple products share the same timestamp.

### Benefits

* Consistent query performance
* Index-friendly
* No duplicate records while browsing
* No skipped records when new products are inserted
* Deterministic ordering

---

## Indexing Strategy

Primary pagination index:

```sql
CREATE INDEX idx_products_updated_id
ON products(updated_at DESC, id DESC);
```

Category filtering index:

```sql
CREATE INDEX idx_products_category_updated_id
ON products(category, updated_at DESC, id DESC);
```

These indexes allow PostgreSQL to efficiently support both pagination and filtered queries.

---

## API

### Get Products

```http
GET /products
```

### Query Parameters

| Parameter       | Description                  |
| --------------- | ---------------------------- |
| limit           | Number of products to return |
| category        | Optional category filter     |
| cursorUpdatedAt | Cursor timestamp             |
| cursorId        | Cursor identifier            |

### Example

```http
GET /products?limit=20&category=Electronics
```

### Example Response

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

## Data Generation & Seeding

A custom seed script generates **200,000 products** with:

* Random names
* Random categories
* Random prices
* Random creation timestamps
* Random update timestamps

To improve insertion performance:

* Products are generated in memory
* Inserts are batched
* Bulk inserts are used instead of row-by-row operations
* Transactions ensure consistency

Run:

```bash
node scripts/seed.js
```

---

## Running Locally

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file:

```env
DATABASE_URL=your_neon_connection_string
```

### Start Development Server

```bash
npm run dev
```

### Production

```bash
npm start
```

Server runs on:

```text
http://localhost:3000
```

---

## Testing

The implementation was tested for:

* Pagination correctness
* Category filtering
* Invalid query parameters
* Cursor validation
* Large dataset performance
* Data consistency while browsing

### Consistency Test

1. Request Page 1
2. Insert a newer product
3. Request Page 2 using the original cursor
4. Verify that no duplicate records appear
5. Verify that no products are skipped

This validates the primary requirement of the assignment.

---

## Future Improvements

Given additional time, I would add:

* Automated integration tests
* OpenAPI / Swagger documentation
* Docker support
* Full-text product search
* Request logging and monitoring
* Rate limiting
* CI/CD workflows

---

## AI Usage

AI tools (Claude and ChatGPT) were used to:

* Discuss pagination approaches
* Review architecture decisions
* Explain PostgreSQL indexing concepts
* Validate implementation choices

All generated code was reviewed, modified, tested, and debugged manually. The final implementation, deployment, testing, and architectural decisions were verified independently.

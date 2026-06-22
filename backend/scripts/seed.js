import pkg from "pg";
const { Pool } = pkg;

import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TOTAL_PRODUCTS = 200000;

const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Books",
  "Home & Kitchen",
  "Sports",
  "Toys",
  "Beauty",
  "Automotive",
  "Grocery",
  "Office Supplies",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice(min = 4.99, max = 999.99) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomDate(start = new Date("2020-01-01"), end = new Date()) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function generateProduct(index) {
  const category = randomItem(CATEGORIES);
  const createdAt = randomDate();

  // updated_at must be >= created_at.
  const updatedAt = randomDate(createdAt, new Date());

  return {
    name: `${category} Product ${index + 1}`,
    category,
    price: randomPrice(),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function buildBulkInsert(products) {
  const COLUMNS = ["name", "category", "price", "created_at", "updated_at"];
  const COL_COUNT = COLUMNS.length;

  const valuePlaceholders = products
    .map(
      (_, rowIndex) =>
        `(${COLUMNS.map(
          (_, colIndex) => `$${rowIndex * COL_COUNT + colIndex + 1}`
        ).join(", ")})`
    )
    .join(",\n    ");

  const text = `
    INSERT INTO products (${COLUMNS.join(", ")})
    VALUES
    ${valuePlaceholders}
  `;

  const values = products.flatMap((p) => [
    p.name,
    p.category,
    p.price,
    p.created_at,
    p.updated_at,
  ]);

  return { text, values };
}

async function seed() {
  console.log(`\n  Seeding ${TOTAL_PRODUCTS} products…\n`);

  const products = Array.from({ length: TOTAL_PRODUCTS }, (_, i) =>
    generateProduct(i)
  );

  // PostgreSQL caps bind parameters per statement, so chunking keeps each insert safe.
  const CHUNK_SIZE = 500;
  const chunks = [];
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    chunks.push(products.slice(i, i + CHUNK_SIZE));
  }

  const client = await pool.connect();

  try {
    // Use one client so the whole seed runs in a single transaction.
    await client.query("BEGIN");

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const { text, values } = buildBulkInsert(chunk);

      await client.query(text, values);

      console.log(
        `   Inserted chunk ${chunkIndex + 1}/${chunks.length} ` +
          `(rows ${chunkIndex * CHUNK_SIZE + 1}–${Math.min(
            (chunkIndex + 1) * CHUNK_SIZE,
            TOTAL_PRODUCTS
          )})`
      );
    }

    await client.query("COMMIT");
    console.log(`\n  Done! ${TOTAL_PRODUCTS} products inserted.\n`);
  } catch (err) {
    // Roll back on error to avoid partial seed data.
    await client.query("ROLLBACK");
    console.error("\n  Seed failed — transaction rolled back.\n", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

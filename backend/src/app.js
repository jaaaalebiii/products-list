import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db/pool.js";
import productsRouter from "../scripts/routes/productsRoute.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(cors());


app.use(express.static(path.resolve(__dirname, "..")));

app.use("/products", productsRouter);

app.get("/", (req, res) => {
  res.json({
    message: "Products API is running",
    endpoint: "/products",
  });
});

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      status: "error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

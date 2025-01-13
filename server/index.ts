import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import handler from "../api/generate-thesis"; // Import the handler from generate-thesis.ts
import { vercelAdapter } from "../utils/vercel-adapter"; // Import the vercelAdapter

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Define __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Log environment variables
console.log("Environment Variables:");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("SERPER_API_KEY:", process.env.SERPER_API_KEY);

// Register API route with vercelAdapter
app.post("/api/generate-thesis", vercelAdapter(handler));

// Serve static files from the client/dist directory
const distPath = path.resolve(__dirname, "../client/dist");
app.use(express.static(distPath));

// Fallback to index.html for any other requests
app.get("*", (req, res) => {
  console.log(`Serving static file for path: ${req.path}`);
  res.sendFile(path.resolve(distPath, "index.html"));
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
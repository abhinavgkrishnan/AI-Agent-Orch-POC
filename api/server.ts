import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import path from "path";
import { fileURLToPath } from "url";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { log } from "../server/vite";

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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Register API routes
console.log("Registering API routes...");
registerRoutes(app);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error("Error:", err);
  res.status(status).json({ message });
});

// Serve static files from the dist directory
const distPath = path.resolve(__dirname, "../client/dist");
app.use(express.static(distPath));

// Fallback to index.html for any other requests
app.get("*", (req, res) => {
  console.log(`Serving static file for path: ${req.path}`);
  res.sendFile(path.resolve(distPath, "index.html"));
});

// Export the Express app as a Vercel serverless function
export default (req: VercelRequest, res: VercelResponse) => {
  app(req, res);
};
